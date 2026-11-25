const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 700px)");
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const MS = { open: 240, close: 200, fade: 160 };
const SVG = "http://www.w3.org/2000/svg";
const PLAY = "M6 3 17 10 6 17Z";
const CORNERS = "M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9";
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(d, viewBox) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", d);
  svg.append(path);
  return svg;
}

function contain(rect, w, h) {
  const s = Math.min(rect.width / w, rect.height / h);
  return { x: rect.left + (rect.width - w * s) / 2, y: rect.top + (rect.height - h * s) / 2, w: w * s };
}

const seen = (rect) => rect && rect.width > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;

export function zoomButton(className) {
  const button = make("button", className);
  button.type = "button";
  button.setAttribute("aria-label", "view large");
  button.dataset.tip = "view large";
  button.append(icon(CORNERS, "0 0 14 14"));
  button.addEventListener("pointerdown", (event) => event.stopPropagation());
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") event.stopPropagation();
  });
  return button;
}

export function createLightbox({ onOpen = () => {} } = {}) {
  const root = make("div", "lb");
  root.hidden = true;
  root.tabIndex = -1;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  const back = make("div", "lb-back");
  const stage = make("div", "lb-stage");
  const img = make("img", "lb-img");
  img.alt = "";
  img.draggable = false;
  const play = make("button", "t-play lb-play");
  play.type = "button";
  play.hidden = true;
  const playText = make("span");
  play.append(icon(PLAY, "0 0 20 20"), playText);
  stage.append(img, play);
  const cap = make("p", "lb-cap");
  const left = make("span");
  const right = make("span");
  cap.append(left, right);
  root.append(back, stage, cap);
  document.body.append(root);

  let s = null;
  let token = 0;
  let touch = null;
  let swiped = false;

  function fill(parent, segments) {
    parent.replaceChildren(
      ...segments.map(([text, className = ""]) => {
        if (className === "lb-apply") {
          const button = make("button", "lb-apply", text);
          button.type = "button";
          return button;
        }
        return className ? make("span", className, text) : document.createTextNode(text);
      }),
    );
  }

  function fit(w, h, capped = true) {
    const phone = narrow.matches;
    const padX = phone ? 12 : 24;
    const top = phone ? 56 : 28;
    const bottom = phone ? 56 : 44;
    const maxW = innerWidth - 2 * padX;
    const maxH = innerHeight - top - bottom;
    const k = Math.min(maxW / w, maxH / h, capped ? 1 : Infinity);
    const bw = Math.round(w * k);
    const bh = Math.round(h * k);
    return { x: Math.round((innerWidth - bw) / 2), y: Math.round(top + (maxH - bh) / 2), w: bw, h: bh };
  }

  function place() {
    const b = s.box;
    stage.style.width = `${b.w}px`;
    stage.style.height = `${b.h}px`;
    stage.style.transform = `translate(${b.x}px, ${b.y}px)`;
    cap.style.transform = `translate(${b.x}px, ${b.y + b.h + 9}px)`;
    cap.style.width = `${b.w}px`;
  }

  function caption() {
    const item = s.items[s.at];
    fill(left, [...item.left, ...(narrow.matches || !s.exact ? [] : [[` · ${s.size[0]}×${s.size[1]}`]])]);
    fill(right, item.right);
    root.setAttribute("aria-label", item.alt || "image");
  }

  function decode(src) {
    const probe = new Image();
    probe.decoding = "async";
    probe.src = src;
    return probe.decode().then(
      () => probe,
      () => null,
    );
  }

  function stopFilm(state = s) {
    const film = state?.film;
    if (!film) return 0;
    const time = film.video.currentTime || 0;
    film.off?.();
    film.video.pause();
    film.video.removeAttribute("src");
    film.video.load();
    film.video.remove();
    if (film.url) URL.revokeObjectURL(film.url);
    state.film = null;
    return time;
  }

  function playLabel() {
    const item = s.items[s.at];
    const video = s.film?.video;
    playText.textContent = `play ${clock(video?.duration && video.currentTime ? video.duration - video.currentTime : item.film.duration || 0)}`;
  }

  function toggleFilm() {
    const item = s?.items[s.at];
    if (!item?.film) return;
    if (!s.film) {
      const video = make("video", "lb-film");
      video.playsInline = true;
      video.preload = "auto";
      video.setAttribute("aria-label", item.film.alt || item.alt || "film");
      if (item.film.captions) {
        const track = make("track");
        track.kind = "captions";
        track.srclang = "en";
        track.label = "English";
        track.src = item.film.captions;
        track.default = true;
        video.append(track);
      }
      video.addEventListener("loadedmetadata", () => {
        if (video.textTracks[0]) video.textTracks[0].mode = "showing";
        if (s?.film?.video === video && s.film.at) video.currentTime = s.film.at;
      });
      video.addEventListener("playing", () => {
        play.hidden = true;
        video.classList.add("is-on");
      });
      video.addEventListener("pause", () => {
        if (!s || s.film?.video !== video || video.ended) return;
        play.hidden = false;
        playLabel();
      });
      video.addEventListener("ended", () => {
        video.classList.remove("is-on");
        video.currentTime = 0;
        if (!s || s.film?.video !== video) return;
        play.hidden = false;
        playLabel();
      });
      stage.insertBefore(video, play);
      s.film = { video, url: null, off: null, loading: false, at: item.film.time || 0 };
    }
    const film = s.film;
    const { video } = film;
    if (film.url) {
      if (video.paused) video.play().catch(() => playLabel());
      else video.pause();
      return;
    }
    if (film.loading) return;
    film.loading = true;
    const mine = s;
    const load = item.film.load((progress) => {
      if (s === mine && mine.film === film) playText.textContent = `loading ${Math.round(progress * 100)}%`;
    });
    film.off = load.off;
    load.promise.then(
      (blob) => {
        load.off();
        film.loading = false;
        if (s !== mine || mine.film !== film) return;
        film.url = URL.createObjectURL(blob);
        video.src = film.url;
        video.play().catch(() => playLabel());
      },
      () => {
        load.off();
        film.loading = false;
        if (s === mine && mine.film === film) playText.textContent = "retry";
      },
    );
  }

  async function show(k, start = null) {
    const mine = s;
    const item = mine.items[k];
    const staged = Boolean(item.preview && item.preview !== item.src);
    const full = staged ? await Promise.race([decode(item.src), new Promise((resolve) => setTimeout(resolve, 150, null))]) : null;
    const probe = full || (await decode(staged ? item.preview : item.src));
    if (s !== mine || mine.at !== k) return false;
    stopFilm();
    mine.exact = !staged || Boolean(full);
    mine.size = [probe?.naturalWidth || 16, probe?.naturalHeight || 9];
    mine.box = fit(...mine.size, mine.exact);
    img.src = mine.exact ? item.src : item.preview;
    img.alt = item.alt || "";
    play.hidden = !item.film;
    if (item.film) {
      item.film.time = start?.time || 0;
      playLabel();
    }
    place();
    caption();
    if (!mine.exact) {
      decode(item.src).then((loaded) => {
        if (s !== mine || mine.at !== k || !loaded) return;
        img.src = item.src;
        mine.exact = true;
        mine.size = [loaded.naturalWidth, loaded.naturalHeight];
        mine.box = fit(...mine.size);
        place();
        caption();
      });
    }
    for (const j of [k - 1, k + 1]) {
      const next = mine.items[(j + mine.items.length) % mine.items.length];
      if (next.preview) new Image().src = next.src;
    }
    if (item.film && start?.playing) toggleFilm();
    return true;
  }

  function step(delta) {
    if (!s || s.items.length < 2) return;
    const k = (((s.at + delta) % s.items.length) + s.items.length) % s.items.length;
    s.at = k;
    s.onStep?.(k);
    show(k);
  }

  function apply() {
    if (!s) return;
    const k = s.at;
    const onApply = s.onApply;
    if (!s.items[k].apply || !onApply) return;
    onApply(k);
    close();
  }

  function from(state, k) {
    const rect = state.from?.(k);
    return seen(rect) ? contain(rect, ...state.size) : null;
  }

  function onKey(event) {
    if (!s || event.ctrlKey || event.metaKey || event.altKey) return;
    const item = s.items[s.at];
    event.stopImmediatePropagation();
    if (event.key === "Escape") close();
    else if (event.key === "ArrowRight" || event.key === "l") step(1);
    else if (event.key === "ArrowLeft" || event.key === "h") step(-1);
    else if (event.key === "Enter") item.apply ? apply() : close();
    else if (event.key === " ") toggleFilm();
    else if (event.key === "Tab") root.focus();
    else if (event.key.length !== 1) return;
    event.preventDefault();
  }

  function onResize() {
    if (!s?.box) return;
    s.box = fit(...s.size);
    place();
  }

  root.addEventListener("click", (event) => {
    if (!s) return;
    if (swiped) {
      swiped = false;
      return;
    }
    const target = event.target;
    if (target.closest(".lb-apply")) return apply();
    if (target.closest(".lb-play")) return toggleFilm();
    if (target.closest(".lb-film")) return toggleFilm();
    if (target === img && s.items[s.at].film) return toggleFilm();
    close();
  });
  root.addEventListener(
    "touchstart",
    (event) => {
      swiped = false;
      touch = event.touches.length === 1 && (visualViewport?.scale ?? 1) < 1.01 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    },
    { passive: true },
  );
  root.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 1) touch = null;
    },
    { passive: true },
  );
  root.addEventListener(
    "touchend",
    (event) => {
      if (!touch) return;
      const t = event.changedTouches[0];
      const dx = t.clientX - touch.x;
      const dy = t.clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4 && s?.items.length > 1) {
        swiped = true;
        step(dx < 0 ? 1 : -1);
      }
    },
    { passive: true },
  );
  root.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey) event.preventDefault();
    },
    { passive: false },
  );

  function settle() {
    for (const node of [root, back, stage, cap]) node.getAnimations().forEach((animation) => animation.cancel());
    cap.style.opacity = "";
  }

  async function open({ items, index = 0, start = null, from: source, onStep, onApply, onClose }) {
    if (!items?.length) return false;
    close(true);
    const mine = { items, at: index, from: source, onStep, onApply, onClose, film: null, size: [16, 9], exact: true, box: null, focus: document.activeElement, token: ++token };
    s = mine;
    if (!(await show(index, start)) || s !== mine) return false;
    settle();
    onOpen();
    document.documentElement.classList.add("is-zoomed");
    root.hidden = false;
    addEventListener("keydown", onKey, true);
    addEventListener("resize", onResize);
    root.focus({ preventScroll: true });
    const rect = from(mine, index);
    if (reduced.matches) return true;
    if (!rect) {
      root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MS.fade, easing: "ease-out" });
      return true;
    }
    const b = mine.box;
    stage.animate([{ transform: `translate(${rect.x}px, ${rect.y}px) scale(${rect.w / b.w})` }, { transform: `translate(${b.x}px, ${b.y}px)` }], { duration: MS.open, easing: EASE });
    back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MS.open, easing: EASE });
    cap.animate([{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }], { duration: MS.open, easing: "linear" });
    return true;
  }

  function close(instant = false) {
    if (!s) return;
    const state = s;
    s = null;
    removeEventListener("keydown", onKey, true);
    removeEventListener("resize", onResize);
    document.documentElement.classList.remove("is-zoomed");
    const time = stopFilm(state);
    const done = () => {
      if (state.token !== token || s) return;
      const owned = root.contains(document.activeElement);
      settle();
      root.hidden = true;
      img.removeAttribute("src");
      if (owned && state.focus?.isConnected) state.focus.focus({ preventScroll: true });
    };
    state.onClose?.(state.at, { time });
    if (root.hidden) return;
    if (instant || reduced.matches || !state.box) {
      done();
      return;
    }
    const rect = from(state, state.at);
    const now = getComputedStyle(stage).transform;
    settle();
    if (!rect) {
      root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: MS.fade, easing: EASE, fill: "forwards" }).finished.then(done, done);
      return;
    }
    cap.style.opacity = "0";
    back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: MS.close, easing: EASE, fill: "forwards" });
    stage
      .animate([{ transform: now === "none" ? stage.style.transform : now }, { transform: `translate(${rect.x}px, ${rect.y}px) scale(${rect.w / state.box.w})` }], { duration: MS.close, easing: EASE, fill: "forwards" })
      .finished.then(done, done);
  }

  return {
    open,
    close,
    isOpen: () => Boolean(s),
  };
}
