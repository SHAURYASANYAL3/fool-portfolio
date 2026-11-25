import { zoomButton } from "./lightbox.js";

const SVG = "http://www.w3.org/2000/svg";
const FADE = 48;
const BUS = 12;
const SPINE = 9;
const fine = matchMedia("(pointer: fine)");

const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export function createArchive(host, themes, { stats = {}, thumbs = {}, current = "", viewport, onPick = () => {}, groupBy = (data) => data?.created?.slice(0, 7) || "—", lightbox = null } = {}) {
  const box = make("div", "arc");
  const inner = make("div", "arc-inner");
  const wire = document.createElementNS(SVG, "svg");
  wire.setAttribute("class", "arc-wire");
  wire.setAttribute("aria-hidden", "true");
  inner.append(wire);
  box.append(inner);
  host.replaceChildren(box);

  const dated = themes.map((theme) => ({ theme, data: stats[theme.repo.split("/").pop()] }));
  dated.sort((a, b) => (b.data?.created || "").localeCompare(a.data?.created || "") || a.theme.name.localeCompare(b.theme.name));
  const groups = [];
  for (const item of dated) {
    const month = groupBy(item.data, item.theme);
    const group = groups.find((entry) => entry.month === month);
    if (group) group.items.push(item);
    else groups.push({ month, items: [item] });
  }

  const cards = [];
  for (const group of groups) {
    const section = make("section", "arc-grp");
    section.setAttribute("aria-label", `${group.month}, ${group.items.length} ${group.items.length === 1 ? "theme" : "themes"}`);
    const label = make("h6", "arc-mon", group.month);
    label.append(make("span", "arc-count", ` · ${group.items.length}`));
    const list = make("ul", "arc-grid");
    for (const { theme, data } of group.items) {
      const li = make("li");
      const button = make("button", "arc-card");
      button.type = "button";
      button.setAttribute("aria-label", `${theme.name}. ${theme.description}.${theme.included ? " Ships with Omarchy." : ""}`);
      button.setAttribute("aria-pressed", "false");
      const img = make("img");
      img.src = thumbs[theme.slug] || theme.image;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.width = 640;
      img.height = 360;
      const meta = make("span", "arc-meta");
      meta.append(make("span", "arc-name", theme.name));
      if (data) {
        const badge = make("span", "arc-stars", "stars");
        badge.append(make("b", "", String(data.stars)));
        meta.append(badge);
      }
      const swatches = make("span", "arc-sw");
      for (const color of theme.palette.slice(0, 8)) {
        const chip = make("i");
        chip.style.background = color;
        swatches.append(chip);
      }
      if (theme.note) swatches.append(make("span", "arc-note", theme.note));
      const shot = make("span", "arc-shot");
      shot.append(img);
      if (theme.included) {
        const badge = make("span", "arc-badge");
        badge.setAttribute("aria-hidden", "true");
        badge.dataset.tip = "ships with Omarchy";
        badge.append(make("i", "arc-omarchy"));
        shot.append(badge);
      }
      button.append(shot, meta, swatches);
      li.append(button);
      const lens = lightbox && theme.palette.length ? zoomButton("arc-zoom") : null;
      if (lens) li.append(lens);
      list.append(li);
      cards.push({ li, button, theme, lens });
    }
    section.append(label, list);
    inner.append(section);
  }

  let selected = cards.findIndex((card) => card.theme.slug === current);

  function mark() {
    cards.forEach((card, index) => {
      card.button.classList.toggle("is-on", index === selected);
      card.button.setAttribute("aria-pressed", String(index === selected));
    });
  }

  function rectOf(element) {
    const base = inner.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return { x: rect.left - base.left + rect.width / 2, top: rect.top - base.top, bottom: rect.bottom - base.top };
  }

  function route() {
    const parts = [];
    const line = (x1, y1, x2, y2) => parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`);
    const nodes = [];
    for (const section of inner.querySelectorAll(".arc-grp")) {
      const boxes = [...section.querySelectorAll(".arc-card")].map(rectOf);
      if (!boxes.length) continue;
      const rows = [];
      for (const b of boxes) {
        const row = rows.find((items) => Math.abs(items[0].top - b.top) < 2);
        if (row) row.push(b);
        else rows.push([b]);
      }
      const bus = rows[0][0].top - BUS;
      nodes.push(bus);
      line(SPINE, bus, Math.max(...rows[0].map((b) => b.x)), bus);
      for (const b of rows[0]) line(b.x, bus, b.x, b.top);
      rows.forEach((row, r) => {
        const next = rows[r + 1];
        if (!next) return;
        for (const b of row) {
          const below = next.find((n) => Math.abs(n.x - b.x) < 2);
          if (below) line(b.x, b.bottom, b.x, below.top);
        }
      });
    }
    if (nodes.length) line(SPINE, 0, SPINE, nodes.at(-1));
    parts.push(`<path class="arc-tip" d="M${SPINE - 4} 6L${SPINE} 0L${SPINE + 4} 6"/>`);
    for (const y of nodes) parts.push(`<rect x="${SPINE - 3}" y="${(y - 3).toFixed(1)}" width="6" height="6"/>`);
    const width = inner.clientWidth;
    const height = inner.scrollHeight;
    wire.setAttribute("viewBox", `0 0 ${width} ${height}`);
    wire.setAttribute("width", String(width));
    wire.setAttribute("height", String(height));
    wire.innerHTML = parts.join("");
  }

  function fade() {
    const top = Math.min(FADE, box.scrollTop);
    const bottom = Math.min(FADE, box.scrollHeight - box.clientHeight - box.scrollTop);
    box.style.setProperty("--fade-top", `${Math.max(0, top)}px`);
    box.style.setProperty("--fade-bottom", `${Math.max(0, bottom)}px`);
  }

  function size() {
    if (!viewport) return;
    const cell = parseFloat(getComputedStyle(viewport).getPropertyValue("--cell-h")) || 13;
    const top = box.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
    box.style.height = `${Math.max(220, Math.floor(viewport.clientHeight - top - 3 * cell - 2))}px`;
    route();
    fade();
  }

  function reveal(index) {
    const { top, bottom } = rectOf(cards[index].li);
    if (top < box.scrollTop + FADE) box.scrollTop = Math.max(0, top - FADE);
    else if (bottom > box.scrollTop + box.clientHeight - FADE) box.scrollTop = bottom - box.clientHeight + FADE;
  }

  function focus(index) {
    const next = Math.max(0, Math.min(cards.length - 1, index));
    cards[next].button.focus({ preventScroll: true });
    reveal(next);
  }

  function vertical(index, down) {
    const from = rectOf(cards[index].button);
    let best = index;
    let score = Infinity;
    cards.forEach((card, k) => {
      if (k === index) return;
      const to = rectOf(card.button);
      const dy = down ? to.top - from.bottom : from.top - to.bottom;
      if (dy < -1) return;
      const cost = dy * 4 + Math.abs(to.x - from.x);
      if (cost < score) {
        score = cost;
        best = k;
      }
    });
    return best;
  }

  cards.forEach((card, index) => {
    card.button.addEventListener("click", () => {
      selected = index;
      mark();
      onPick(card.theme);
    });
    card.button.addEventListener("keydown", (event) => {
      let next = null;
      if (event.key === "ArrowRight" || event.key === "l") next = index + 1;
      else if (event.key === "ArrowLeft" || event.key === "h") next = index - 1;
      else if (event.key === "ArrowDown" || event.key === "j") next = vertical(index, true);
      else if (event.key === "ArrowUp" || event.key === "k") next = vertical(index, false);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = cards.length - 1;
      if (next === null) return;
      event.preventDefault();
      event.stopPropagation();
      focus(next);
    });
  });

  const lenses = cards.filter((card) => card.lens);
  const shotOf = (card) => {
    const rect = card.li.querySelector(".arc-shot img").getBoundingClientRect();
    const view = box.getBoundingClientRect();
    return rect.top >= view.top - 1 && rect.bottom <= view.bottom + 1 ? rect : null;
  };
  lenses.forEach((card, k) => {
    card.lens.addEventListener("pointerenter", () => (new Image().src = card.theme.image), { once: true });
    card.lens.addEventListener("click", () =>
      lightbox.open({
        items: lenses.map((item, j) => ({
          src: item.theme.image,
          preview: thumbs[item.theme.slug],
          alt: `${item.theme.name}. ${item.theme.description}.`,
          left: [["themes · "], [item.theme.name, "lb-b"], [` · ${j + 1}/${lenses.length}`]],
          right: [["↩ apply", "lb-apply"], [fine.matches ? " · ←→ theme · esc" : " · swipe · tap closes"]],
          apply: true,
        })),
        index: k,
        from: (j) => shotOf(lenses[j]),
        onStep: (j) => reveal(cards.indexOf(lenses[j])),
        onApply: (j) => lenses[j].button.click(),
      }),
    );
  });

  let frame = 0;
  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      fade();
    });
  };
  box.addEventListener("scroll", onScroll, { passive: true });
  const observer = new ResizeObserver(() => size());
  observer.observe(viewport || box);
  observer.observe(inner);
  size();
  mark();
  fade();

  return {
    scroller: box,
    focus: () => focus(Math.max(0, selected)),
    destroy() {
      observer.disconnect();
      cancelAnimationFrame(frame);
      box.removeEventListener("scroll", onScroll);
    },
  };
}
