import { attachXray } from "./xray.js";
import { zoomButton } from "./lightbox.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 700px)");
const fine = matchMedia("(pointer: fine)");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PACE = { key: [18, 34], enter: 170, line: 14, gap: 260 };
const RUN = { every: 3800, hold: 8000 };
const CAL = { key: [18, 18], day: 28, month: 350 };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PLAY = "M6 3 17 10 6 17Z";
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const films = new Map();

function loadFilm(url, onProgress) {
  let film = films.get(url);
  if (!film) {
    film = { progress: 0, listeners: new Set() };
    film.promise = fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const size = Number(response.headers.get("content-length")) || 0;
        if (!response.body || !size) return response.blob();
        const reader = response.body.getReader();
        const parts = [];
        let got = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value);
          got += value.length;
          film.progress = Math.min(1, got / size);
          film.listeners.forEach((listener) => listener(film.progress));
        }
        return new Blob(parts, { type: response.headers.get("content-type") || "video/mp4" });
      })
      .catch((error) => {
        films.delete(url);
        throw error;
      });
    films.set(url, film);
  }
  film.listeners.add(onProgress);
  onProgress(film.progress);
  return { promise: film.promise, off: () => film.listeners.delete(onProgress) };
}
const between = (a, b) => a + Math.random() * (b - a);

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const SVG = "http://www.w3.org/2000/svg";

function glyph(icon, letter) {
  if (!icon?.path) return make("span", "t-glyph", (letter || "?").slice(0, 1));
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", `0 0 ${icon.box || 24} ${icon.box || 24}`);
  svg.setAttribute("class", "t-icon");
  svg.setAttribute("aria-hidden", "true");
  if (icon.credit) svg.dataset.tip = icon.credit;
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", icon.path);
  svg.append(path);
  return svg;
}

function fill(parent, segments) {
  for (const segment of segments) {
    if (typeof segment === "string") {
      parent.append(segment);
      continue;
    }
    if (segment.node) {
      parent.append(segment.node());
      continue;
    }
    if (segment.mark) {
      const mark = make("span", `t-mark t-mark-${segment.mark}`);
      mark.setAttribute("role", "img");
      mark.setAttribute("aria-label", segment.label || segment.mark);
      parent.append(mark);
      continue;
    }
    if (!Array.isArray(segment)) {
      parent.append(glyph(segment.icon, segment.letter));
      continue;
    }
    const [text, className, href] = segment;
    if (href) {
      const link = make("a", `md-link${className ? ` ${className}` : ""}`, text);
      link.href = href;
      if (!href.startsWith("#")) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      parent.append(link);
    } else parent.append(make("span", className, text));
  }
}

function row(segments, className = "") {
  const line = make("div", `ln term${className ? ` ${className}` : ""}`);
  const text = make("span", "tx");
  fill(text, segments);
  line.append(text);
  return line;
}

export function prompt(cwd, branch) {
  return [["alex", "t-user"], ["@dev", "t-host"], " ", [cwd, "t-path"], ...(branch ? [" ", [`(${branch})`, "t-git"]] : [])];
}

function buildCalendar({ days, months = [], done = "" }) {
  const offset = (new Date(`${days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const weeks = Math.ceil((days.length + offset) / 7);
  const block = make("div", "t-cal");
  block.setAttribute("aria-hidden", "true");
  block.style.setProperty("--weeks", String(weeks));
  const put = (node, row, column) => {
    node.style.gridRow = String(row);
    node.style.gridColumn = String(column);
    block.append(node);
  };
  WEEKDAYS.forEach((label, row) => put(make("span", "t-cal-day", label), row + 2, 1));
  for (let week = 0; week < weeks; week += 4) put(make("span", "t-cal-week", `W${String(week + 1).padStart(2, "0")}`), 9, week + 2);
  const cells = [];
  const steps = [];
  days.forEach((day, k) => {
    const slot = k + offset;
    const cell = make("i", `l${day.level ?? 0}`);
    cell.dataset.tip = `${day.date} · ${day.count} contribution${day.count === 1 ? "" : "s"}`;
    put(cell, (slot % 7) + 2, Math.floor(slot / 7) + 2);
    cells.push(cell);
    const month = day.date.slice(0, 7);
    if (steps.at(-1)?.month !== month) {
      steps.push({ month, first: k, last: k, top: months.find((item) => item.month === month)?.top || [] });
      put(make("span", "t-cal-month", new Date(`${day.date}T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" })), 1, Math.floor(slot / 7) + 2);
    }
    steps.at(-1).last = k;
  });
  const legend = make("p", "t-cal-legend");
  legend.append("none");
  for (let level = 0; level <= 4; level++) legend.append(make("i", `l${level}`));
  legend.append("more");
  put(legend, 10, `1 / span ${weeks + 1}`);
  const code = make("div", "t-code");
  code.setAttribute("aria-hidden", "true");
  for (const step of steps) code.append(make("span", "t-measure", `renderMonth${monthArgs(step)} `));
  const live = make("span", "t-live");
  const args = make("span", "t-args");
  live.append(make("span", "t-call", "renderMonth"), args);
  code.append(live);
  return { block, code, live, args, cells, steps, done };
}

function monthParts(step) {
  const syn = (text) => [text, "t-syn"];
  if (!step.top.length) return [syn("("), syn(`"${step.month}"`), syn(");")];
  const parts = [syn("("), syn(`"${step.month}"`), syn(", { ")];
  step.top.forEach((item, k) => {
    if (k) parts.push(syn(", "));
    parts.push([JSON.stringify(item.owner && item.owner !== "alexrivera" ? `${item.owner}/${item.repo}` : item.repo), ""], syn(": "), [String(item.commits), ""]);
  });
  parts.push(syn(" });"), [" // public commits", ""]);
  return parts;
}

function monthArgs(step) {
  return monthParts(step)
    .map(([text]) => text)
    .join("");
}

// A white web-page screenshot popping into a near-black terminal reads as a flash. Measure each image once it loads and dim the bright ones to
// roughly the page's own tone (CSS restores full brightness on hover); dark screenshots are left alone.
const dimProbe = document.createElement("canvas");
dimProbe.width = 32;
dimProbe.height = 18;
function dimFor(img) {
  try {
    const g = dimProbe.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, 32, 18);
    const d = g.getImageData(0, 0, 32, 18).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722;
    const l = sum / (32 * 18) / 255;
    return l > 0.3 ? Math.max(0.42, 0.3 / l).toFixed(3) : 1;
  } catch {
    return 1;
  }
}

export function createTerminal(buffer, options) {
  const { onTyping } = options;
  let token = 0;
  let viewer = null;
  let xray = null;
  let hero = null;
  let mounts = [];

  function unmount() {
    for (const stop of mounts) stop?.();
    mounts = [];
  }

  function stopViewer() {
    options.lightbox?.close(true);
    xray?.destroy();
    xray = null;
    viewer?.observer.disconnect();
    for (const film of viewer?.films.values() || []) {
      film.off?.();
      film.video.pause();
      film.video.removeAttribute("src");
      film.video.load();
      if (film.url) URL.revokeObjectURL(film.url);
    }
  }

  function filmOf(v) {
    const shot = v.shots[v.at];
    return shot?.kind === "film" ? shot : null;
  }

  function playLabel(v, shot) {
    const video = v.films.get(v.at)?.video;
    v.playText.textContent = `play ${clock(video?.duration && video.currentTime ? video.duration - video.currentTime : shot.duration)}`;
  }

  function stopFilm(v) {
    for (const film of v.films.values()) {
      film.video.pause();
      film.video.classList.remove("is-on");
    }
    v.run.firstChild.style.transform = "";
  }

  function filmVideo(v, shot) {
    const video = make("video", "t-film");
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("aria-label", shot.alt || shot.name);
    if (shot.captions) {
      const track = make("track");
      track.kind = "captions";
      track.srclang = "en";
      track.label = "English";
      track.src = shot.captions;
      track.default = true;
      video.append(track);
    }
    video.addEventListener("loadedmetadata", () => {
      if (video.textTracks[0]) video.textTracks[0].mode = "showing";
    });
    video.addEventListener("click", () => toggleFilm(v));
    video.addEventListener("playing", () => {
      v.play.hidden = true;
      video.classList.add("is-on");
      v.run.classList.remove("is-running");
    });
    video.addEventListener("pause", () => {
      const current = filmOf(v);
      if (!current || video.ended) return;
      v.play.hidden = false;
      playLabel(v, current);
    });
    video.addEventListener("timeupdate", () => {
      if (video.duration && !video.paused) v.run.firstChild.style.transform = `scaleX(${(video.currentTime / video.duration).toFixed(4)})`;
    });
    video.addEventListener("ended", () => {
      video.classList.remove("is-on");
      video.currentTime = 0;
      v.run.firstChild.style.transform = "";
      const current = filmOf(v);
      if (!current) return;
      v.play.hidden = false;
      playLabel(v, current);
      restart(true);
    });
    v.frame.insertBefore(video, v.play);
    return { video, url: null, off: null, loading: false };
  }

  function toggleFilm(v) {
    const shot = filmOf(v);
    if (!shot) return false;
    if (!v.films.has(v.at)) v.films.set(v.at, filmVideo(v, shot));
    const film = v.films.get(v.at);
    const { video } = film;
    v.run.classList.remove("is-running");
    if (!video.paused) {
      video.pause();
      return true;
    }
    if (film.url) {
      video.play().catch(() => playLabel(v, shot));
      return true;
    }
    if (film.loading) return true;
    film.loading = true;
    const load = loadFilm(shot.video, (progress) => {
      if (viewer === v && filmOf(v) === shot) v.playText.textContent = `loading ${Math.round(progress * 100)}%`;
    });
    film.off = load.off;
    load.promise.then(
      (blob) => {
        load.off();
        film.loading = false;
        if (viewer !== v) return;
        film.url = URL.createObjectURL(blob);
        video.src = film.url;
        if (filmOf(v) === shot) video.play().catch(() => playLabel(v, shot));
      },
      () => {
        load.off();
        film.loading = false;
        if (viewer === v && filmOf(v) === shot) v.playText.textContent = "retry";
      },
    );
    return true;
  }

  function pace() {
    if (!viewer) return;
    viewer.run.firstChild.style.animationPlayState = viewer.hover || viewer.zoomed || !viewer.visible || document.hidden ? "paused" : "running";
  }

  function restart(hold) {
    const { run, shots } = viewer;
    if (shots.length < 2 || reduced.matches) return;
    run.classList.remove("is-running");
    void run.offsetWidth;
    run.style.setProperty("--run", `${hold ? RUN.hold : RUN.every}ms`);
    run.classList.add("is-running");
    pace();
  }

  function go(k, manual) {
    if (!viewer) return false;
    const n = viewer.shots.length;
    if (n < 2) return false;
    showShot(((k % n) + n) % n);
    restart(manual || Boolean(filmOf(viewer)));
    return true;
  }

  function zoomItems(v) {
    return v.shots.map((shot, k) => {
      const film = shot.kind === "film";
      const many = v.shots.length > 1;
      const count = many ? `${k + 1}/${v.shots.length}` : "";
      const keys = fine.matches ? [film && "space play", many && "←→ shot", "esc"] : [film && "tap plays", many && "swipe", film ? "outside closes" : "tap closes"];
      return {
        src: shot.file,
        alt: shot.alt || `${shot.repo} screenshot ${k + 1}`,
        left: [...(narrow.matches ? [] : [[`${shot.repo} · `]]), [film ? "film " : "shots "], ...(count ? [[count, "lb-b"], [" · "]] : []), [shot.name || shot.file.split("/").pop(), "lb-b"]],
        right: [[keys.filter(Boolean).join(" · ")]],
        film: film ? { load: (onProgress) => loadFilm(shot.video, onProgress), duration: shot.duration, captions: shot.captions, alt: shot.alt || shot.name } : null,
      };
    });
  }

  function zoom(v) {
    const lightbox = options.lightbox;
    if (!lightbox || !v || v.at < 0 || viewer !== v) return false;
    const inline = v.films.get(v.at)?.video;
    const start = { time: inline?.currentTime || 0, playing: Boolean(inline && !inline.paused) };
    if (start.playing) inline.pause();
    v.zoomed = true;
    pace();
    lightbox.open({
      items: zoomItems(v),
      index: v.at,
      start,
      from: (k) => (viewer === v && v.at === k ? v.frame.getBoundingClientRect() : null),
      onStep: (k) => {
        if (viewer === v) go(k, true);
      },
      onClose: (k, { time }) => {
        v.zoomed = false;
        if (viewer !== v) return;
        pace();
        const shot = v.shots[k];
        const film = v.films.get(k);
        if (shot?.kind === "film" && film?.url && time) {
          film.video.currentTime = time;
          playLabel(v, shot);
        }
      },
    });
    return true;
  }

  function buildViewer(shots) {
    const figure = make("figure", "term-shot");
    const caption = make("figcaption");
    const name = make("span", "t-name");
    const count = make("span", "t-count");
    const help = make("span", "t-help", shots.length > 1 ? (matchMedia("(pointer: fine)").matches ? "←→ shot" : "swipe") : "");
    caption.append(name, count, help);
    const frame = make("div", "frame");
    const imgs = [make("img"), make("img")];
    for (const img of imgs) {
      img.decoding = "async";
      img.draggable = false;
      img.alt = "";
      img.addEventListener("load", () => img.style.setProperty("--shot-dim", dimFor(img)));
      frame.append(img);
    }
    const play = make("button", "t-play");
    play.type = "button";
    play.hidden = true;
    if (matchMedia("(pointer: fine)").matches) play.dataset.tip = "space";
    const icon = document.createElementNS(SVG, "svg");
    icon.setAttribute("viewBox", "0 0 20 20");
    icon.setAttribute("aria-hidden", "true");
    const triangle = document.createElementNS(SVG, "path");
    triangle.setAttribute("d", PLAY);
    icon.append(triangle);
    const playText = make("span");
    play.append(icon, playText);
    frame.append(play);
    const lens = zoomButton("t-zoom");
    frame.append(lens);
    const run = make("span", "t-run");
    run.setAttribute("aria-hidden", "true");
    run.append(make("i"));
    const dots = make("p", "t-dots");
    const buttons = shots.map((shot, k) => {
      const button = make("button", "t-dot", String(k + 1));
      button.type = "button";
      button.setAttribute("aria-label", `Shot ${k + 1} of ${shots.length}`);
      button.addEventListener("click", () => go(k, true));
      dots.append(button);
      return button;
    });
    figure.append(caption, frame);
    if (shots.length > 1) figure.append(run, dots);
    const v = { figure, name, count, frame, imgs, front: 0, play, playText, films: new Map(), run, buttons, shots, at: -1, hover: false, zoomed: false, visible: true, observer: null };
    play.addEventListener("click", () => toggleFilm(v));
    lens.addEventListener("click", () => zoom(v));
    frame.addEventListener("click", (event) => {
      const shot = v.shots[v.at];
      if (!shot || shot.xray || shot.kind === "film" || event.target.closest("button, video")) return;
      zoom(v);
    });
    frame.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") return;
      v.hover = true;
      pace();
    });
    frame.addEventListener("pointerleave", () => {
      v.hover = false;
      pace();
    });
    let swipe = null;
    frame.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      swipe = { x: event.clientX, y: event.clientY };
    });
    frame.addEventListener("pointerup", (event) => {
      if (!swipe) return;
      const dx = event.clientX - swipe.x;
      const dy = event.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4 && viewer === v) go(v.at + (dx < 0 ? 1 : -1), true);
    });
    run.addEventListener("animationend", () => {
      if (viewer === v) go(v.at + 1, false);
    });
    v.observer = new IntersectionObserver(([entry]) => {
      v.visible = entry.isIntersecting;
      pace();
    });
    v.observer.observe(frame);
    return v;
  }

  function showShot(k) {
    const v = viewer;
    if (!v || !v.shots[k] || v.at === k) return;
    v.at = k;
    const shot = v.shots[k];
    xray?.destroy();
    xray = null;
    stopFilm(v);
    v.play.hidden = shot.kind !== "film";
    if (shot.kind === "film") playLabel(v, shot);
    v.frame.classList.toggle("is-xray", Boolean(shot.xray));
    const back = v.imgs[1 - v.front];
    const front = v.imgs[v.front];
    const reveal = () => {
      back.onload = back.onerror = null;
      if (viewer !== v || v.at !== k) return;
      back.alt = shot.alt || `${shot.repo} screenshot ${k + 1}`;
      front.alt = "";
      back.classList.add("is-on");
      front.classList.remove("is-on");
      v.front = 1 - v.front;
      if (shot.xray) xray = attachXray(v.frame, back);
    };
    if (back.getAttribute("src") === shot.file && back.complete && back.naturalWidth) reveal();
    else {
      back.onload = back.onerror = reveal;
      back.src = shot.file;
    }
    v.name.textContent = shot.name || shot.file.split("/").pop();
    if (shot.kind === "film" && /^https?:\/\//.test(shot.source || "")) {
      const url = new URL(shot.source);
      const link = make("a", "md-link", `${url.host}/${url.pathname.split("/")[1]}`);
      link.href = shot.source;
      link.target = "_blank";
      link.rel = "noopener";
      v.name.append(" · ", link);
    }
    v.count.textContent = v.shots.length > 1 ? `${k + 1}/${v.shots.length}` : "";
    v.buttons.forEach((button, j) => button.setAttribute("aria-current", String(j === k)));
  }

  document.addEventListener("visibilitychange", pace);

  async function type(target, text, mine, pace = PACE.key) {
    for (let n = 1; n <= text.length; n++) {
      if (mine !== token) return false;
      target.textContent = text.slice(0, n);
      options.watch?.pressChar(text[n - 1]);
      const rect = target.getBoundingClientRect();
      if (rect.width) options.watch?.focus(rect.right + 3, rect.top + rect.height / 2);
      await sleep(between(...pace));
    }
    return mine === token;
  }

  async function calendar(cal, mine, instant) {
    if (instant) {
      cal.cells.forEach((cell) => cell.classList.add("is-on"));
      if (cal.done) cal.live.replaceChildren(make("span", "t-done", cal.done));
      else cal.args.replaceChildren(...monthParts(cal.steps.at(-1)).map(([text, cls]) => make("span", cls, text)));
      return true;
    }
    let head = null;
    for (const step of cal.steps) {
      cal.args.replaceChildren();
      cal.code.classList.add("is-typing");
      let typed = true;
      for (const [text, cls] of monthParts(step)) {
        const part = make("span", cls);
        cal.args.append(part);
        typed = await type(part, text, mine, CAL.key);
        if (!typed) break;
      }
      cal.code.classList.remove("is-typing");
      if (!typed) return false;
      for (let k = step.first; k <= step.last; k++) {
        if (mine !== token) return false;
        head?.classList.remove("is-head");
        head = cal.cells[k];
        head.classList.add("is-on", "is-head");
        const rect = head.getBoundingClientRect();
        if (rect.width) options.watch?.focus(rect.left + rect.width / 2, rect.top + rect.height / 2);
        await sleep(CAL.day);
      }
      await sleep(CAL.month);
    }
    head?.classList.remove("is-head");
    if (mine === token && cal.done) cal.live.replaceChildren(make("span", "t-done", cal.done));
    return mine === token;
  }

  async function play(spec, mine) {
    const instant = reduced.matches;
    if (!instant) onTyping?.(true);
    try {
      for (const block of spec.blocks) {
        if (mine !== token) return;
        buffer.append(row(prompt(spec.cwd, spec.branch), "t-prompt-row"));
        const cmd = make("span", "t-cmd");
        const line = row([["› ", "t-caret"]]);
        line.firstChild.append(cmd);
        buffer.append(line);
        if (instant) cmd.textContent = block.cmd;
        else {
          await sleep(PACE.gap);
          if (!(await type(cmd, block.cmd, mine))) return;
          await sleep(PACE.enter);
          if (mine !== token) return;
          options.watch?.pressKey("Enter");
        }
        if (block.link) {
          cmd.replaceChildren(block.cmd.slice(0, block.cmd.length - block.link.text.length));
          fill(cmd, [[block.link.text, "", block.link.href]]);
        }
        for (const out of block.out || []) {
          if (mine !== token) return;
          buffer.append(row(out.segments, out.className));
          if (!instant) await sleep(PACE.line);
        }
        if (block.mount && mine === token) {
          const host = make("div", "t-mount");
          buffer.append(host);
          mounts.push(block.mount(host));
        }
        if (block.calendar && mine === token) {
          const cal = buildCalendar(block.calendar);
          buffer.append(cal.code, cal.block);
          if (!(await calendar(cal, mine, instant))) return;
        }
        if (block.viewer && mine === token) {
          buffer.append(viewer.figure);
          showShot(0);
          restart(false);
        }
      }
      if (mine !== token) return;
      const idle = row(prompt(spec.cwd, spec.branch), "t-prompt-row");
      const cursor = row([["› ", "t-caret"], ["", "t-cursor"]], "t-idle");
      buffer.append(idle, cursor);
    } finally {
      if (mine === token) onTyping?.(false);
    }
  }

  return {
    show(spec) {
      const mine = ++token;
      stopViewer();
      unmount();
      hero?.destroy();
      hero = null;
      viewer = spec.shots?.length ? buildViewer(spec.shots) : null;
      buffer.replaceChildren();
      if (spec.hero) {
        const host = make("div", "wave");
        buffer.append(host);
        hero = spec.hero(host);
      }
      for (const out of spec.head || []) buffer.append(row(out.segments, out.className));
      play(spec, mine);
      return hero;
    },
    zoom() {
      return viewer?.visible ? zoom(viewer) : false;
    },
    step(delta) {
      return viewer?.at >= 0 ? go(viewer.at + delta, true) : false;
    },
    toggle() {
      return viewer?.visible ? toggleFilm(viewer) : false;
    },
    recolor() {
      hero?.recolor?.();
    },
    destroy() {
      token++;
      onTyping?.(false);
      stopViewer();
      unmount();
      hero?.destroy();
      hero = null;
      viewer = null;
    },
  };
}
