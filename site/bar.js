const narrow = matchMedia("(max-width: 700px)");

function rgbOf(value, fallback) {
  const probe = document.createElement("canvas").getContext("2d");
  probe.fillStyle = value || fallback;
  const color = probe.fillStyle;
  if (color.startsWith("#")) return [1, 3, 5].map((k) => parseInt(color.slice(k, k + 2), 16)).join(",");
  return (color.match(/\d+/g) || [125, 133, 129]).slice(0, 3).join(",");
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const fmt = (value) => Math.round(value).toLocaleString("en-US").replace(/,/g, "'");

export function createBar(host) {
  const cols = host.querySelector(".bar-cols");
  const values = Object.fromEntries([...host.querySelectorAll("[data-k]")].map((node) => [node.dataset.k, node]));
  const hunt = host.querySelector(".hunt");
  const keys = host.querySelector(".keys");
  const graph = host.querySelector(".bar-graph");
  const den = host.querySelector(".den");
  const canvas = graph.querySelector("canvas");
  const span = graph.querySelector(".span");
  const end = graph.querySelector(".end");
  const g = canvas.getContext("2d");
  let typing = false;
  let repairing = false;
  let colors = null;
  let seen = null;

  function setView(list) {
    cols.replaceChildren(
      ...list.map(([name, value]) => {
        const col = make("p", "col");
        col.append(make("span", "label", name), make("span", "value", value));
        return col;
      }),
    );
  }

  function paintGhost() {
    values.ghost.textContent = typing ? "typing" : repairing ? "repairing" : "idle";
    values.ghost.classList.toggle("is-hot", typing || repairing);
  }

  function setState({ worm, eye, ghost }) {
    values.worm.textContent = worm.text;
    values.worm.classList.toggle("is-hot", worm.hot);
    values.eye.textContent = eye.text;
    values.eye.classList.toggle("is-hot", eye.hot);
    hunt.textContent = worm.label || "";
    repairing = ghost === "repairing";
    paintGhost();
  }

  function setTyping(on) {
    typing = on;
    paintGhost();
  }

  function setKeys(text) {
    keys.textContent = text;
  }

  function draw() {
    if (!colors) return;
    const n = narrow.matches ? 28 : 56;
    const hours = (seen?.hours || []).slice(-n);
    const w = n * 3 - 1;
    const h = 15;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const top = Math.max(1, ...hours.filter((count) => count !== null));
    const shift = n - hours.length;
    const first = hours.findIndex((count) => count !== null);
    if (first > 0) {
      g.fillStyle = `rgba(${colors.dim},0.55)`;
      for (let y = 0; y < h; y += 2) g.fillRect((shift + first) * 3 - 2, y, 1, 1);
    }
    hours.forEach((count, k) => {
      if (count === null) return;
      const bar = 1 + (h - 1) * Math.min(1, count / top);
      g.fillStyle = k === hours.length - 1 ? `rgba(${colors.accent},0.95)` : `rgba(${colors.dim},0.75)`;
      g.fillRect((shift + k) * 3, h - bar, 2, bar);
    });
    span.textContent = narrow.matches ? "VISITORS" : "VISITORS · 56 H";
    end.textContent = seen ? fmt(seen.total) : "";
  }

  function setSeen(data) {
    seen = data;
    graph.dataset.tip = `visitors per hour · ${fmt(data.total)} since ${(data.since || "").slice(5, 10)}\nno cookies · no stored IPs`;
    draw();
  }

  function recolor() {
    const style = getComputedStyle(document.body);
    colors = { dim: rgbOf(style.getPropertyValue("--dim").trim(), "#7d8581"), accent: rgbOf(style.getPropertyValue("--accent").trim(), "#ff2fb3") };
    draw();
  }

  narrow.addEventListener("change", draw);
  if (den) new ResizeObserver(() => (den.style.right = `${graph.offsetWidth + 2}px`)).observe(graph);
  recolor();
  paintGhost();
  return { setView, setState, setTyping, setKeys, setSeen, recolor };
}
