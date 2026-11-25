import { FAMILY, familyShape, childShape, teddyShape, freeHand } from "./family.js";

const MARK = ["M0 12L12 0H16V32H29L38 23V43L33 48H16V80H0Z", "M50 0H88V16H57L50 23V57L57 64H88L72 80H50L34 64V16Z"];
const SIZE = [88, 80];
const ROOT = [8, 90];
const BOUND = { x0: -16, y0: -16, x1: 104, y1: 100 };
const GROW = { step: 1.1, kill: 1.9, reach: 14, rate: 30, jitter: 0.16, cap: 9000, stall: 4, near: 2, base: 4282 };
const FIELD = { cell: 1, sigma: 1.6, rest: 0.45 };
const ECHO = { ms: 1400, rise: 380, fresh: 450, start: 0.85 };
const CYCLE = { hold: 7000, rest: 1400, back: 1.6 };
const TEDDY = { chance: 0.35, at: 0.3, fall: 260, notice: 900, back: 32, pick: 420, home: 48 };
const WALK = { every: 48000, leg: 3200, turn: 1200, fadeIn: 400, fadeOut: 250 };
const ABOUT = ["father of three", "age 41"];
const RULE = { gap: 4, dx: 3 };
const GLOW = { band: 0.2, ms: 2000, eyes: 0.43, touch: 2500, levels: 12, lift: 0.2, gain: 0.95, in: 300 };
const TICK = { every: 1000, load: 24, size: 2.6 };
const LOAD = [4, 16, 64, 256];
const WIDTH = [0.5, 0.75, 1.05, 1.45, 1.95];
const ALPHA = [0.5, 0.62, 0.74, 0.86, 0.95];
const MM = 25.4 / 96;
const TAU = Math.PI * 2;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const fine = matchMedia("(pointer: fine)");
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (v) => {
  const t = clamp(v, 0, 1);
  return t * t * (3 - 2 * t);
};
const fmt = (n) => Math.round(n).toLocaleString("en-US").replace(/,/g, "'");

function rgbOf(value, fallback) {
  const probe = document.createElement("canvas").getContext("2d");
  probe.fillStyle = value || fallback;
  const v = probe.fillStyle;
  if (v.startsWith("#")) return [1, 3, 5].map((k) => parseInt(v.slice(k, k + 2), 16)).join(",");
  return (v.match(/\d+/g) || [216, 209, 204]).slice(0, 3).join(",");
}

function surfaceOf(el) {
  for (let node = el; node; node = node.parentElement) {
    const color = getComputedStyle(node).backgroundColor;
    if (color && color !== "transparent" && !/,\s*0\)$/.test(color)) return color;
  }
  return getComputedStyle(document.body).getPropertyValue("--bg").trim() || "#0c0b0d";
}

function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleMark(points, random) {
  const probe = document.createElement("canvas").getContext("2d");
  const shape = new Path2D();
  for (const d of MARK) shape.addPath(new Path2D(d));
  const ax = new Float32Array(points);
  const ay = new Float32Array(points);
  for (let k = 0, tries = 0; k < points && tries < points * 20; tries++) {
    const u = random() * SIZE[0];
    const v = random() * SIZE[1];
    if (!probe.isPointInPath(shape, u, v)) continue;
    ax[k] = u;
    ay[k] = v;
    k++;
  }
  return { ax, ay };
}

export function createBlueprint(host, { points = 0, from = "", to = "", owner = "", family = false, portrait = "" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);
  const g = canvas.getContext("2d");
  if (!g) return { recolor() {}, destroy() {} };

  const N = points;
  const B = Math.min(N, GROW.base);
  const random = rngOf(B || 1);
  const head = sampleMark(B, random);
  const tail = sampleMark(N - B, rngOf(GROW.base + 1));
  const ax = new Float32Array(N);
  const ay = new Float32Array(N);
  ax.set(head.ax);
  ay.set(head.ay);
  ax.set(tail.ax, B);
  ay.set(tail.ay, B);
  const alive = new Uint8Array(N).fill(1);
  const near = new Int32Array(N).fill(-1);
  const nearD2 = new Float32Array(N).fill(Infinity);
  let aliveCount = N;

  const nx = new Float32Array(GROW.cap);
  const ny = new Float32Array(GROW.cap);
  const np = new Int32Array(GROW.cap);
  const nb = new Float64Array(GROW.cap);
  const nd = new Int32Array(GROW.cap);
  const seg = new Float32Array(GROW.cap);
  const load = new Int32Array(GROW.cap);
  const kids = new Int32Array(GROW.cap);
  const px = new Float32Array(GROW.cap);
  const py = new Float32Array(GROW.cap);
  const killFrom = new Int32Array(GROW.cap + 1);
  const killList = new Int32Array(Math.max(1, N));
  let count = 0, shown = 0, killed = 0, lastBorn = 0, doneAt = 0, stall = 0;
  const tree = { tips: 0, junctions: 0, length: 0, apex: 0 };

  const acols = Math.ceil((BOUND.x1 - BOUND.x0) / GROW.reach) + 1;
  const arows = Math.ceil((BOUND.y1 - BOUND.y0) / GROW.reach) + 1;
  const agrid = Array.from({ length: acols * arows }, () => []);
  const acell = (u, v) => clamp(Math.floor((u - BOUND.x0) / GROW.reach), 0, acols - 1) + clamp(Math.floor((v - BOUND.y0) / GROW.reach), 0, arows - 1) * acols;
  for (let a = 0; a < N; a++) agrid[acell(ax[a], ay[a])].push(a);

  const ncols = Math.ceil((BOUND.x1 - BOUND.x0) / GROW.near) + 1;
  const nrows = Math.ceil((BOUND.y1 - BOUND.y0) / GROW.near) + 1;
  const ngrid = new Map();

  const fcols = Math.ceil((BOUND.x1 - BOUND.x0) / FIELD.cell) + 1;
  const frows = Math.ceil((BOUND.y1 - BOUND.y0) / FIELD.cell) + 1;
  const fAll = new Float32Array(fcols * frows);
  const fLive = new Float32Array(fcols * frows);
  const reachCells = Math.ceil((FIELD.sigma * 2.5) / FIELD.cell);
  const kernel = [];
  for (let j = -reachCells; j <= reachCells; j++) for (let i = -reachCells; i <= reachCells; i++) {
    const w = Math.exp(-((i * i + j * j) * FIELD.cell * FIELD.cell) / (2 * FIELD.sigma * FIELD.sigma));
    if (w > 0.01) kernel.push(i, j, w);
  }
  const splat = (a, target, sign) => {
    const ci = Math.round((ax[a] - BOUND.x0) / FIELD.cell);
    const cj = Math.round((ay[a] - BOUND.y0) / FIELD.cell);
    for (let k = 0; k < kernel.length; k += 3) {
      const i = ci + kernel[k], j = cj + kernel[k + 1];
      if (i < 0 || j < 0 || i >= fcols || j >= frows) continue;
      target[j * fcols + i] += sign * kernel[k + 2];
    }
  };
  for (let a = 0; a < B; a++) {
    splat(a, fAll, 1);
    splat(a, fLive, 1);
  }
  const sampled = Array.from(ax.subarray(0, B), (u, a) => fAll[Math.round((ay[a] - BOUND.y0) / FIELD.cell) * fcols + Math.round((u - BOUND.x0) / FIELD.cell)]).sort((p, q) => p - q);
  const norm = (sampled[Math.floor(sampled.length * 0.5)] || 1) * 0.9;

  function height(u, v) {
    const fx = (u - BOUND.x0) / FIELD.cell;
    const fy = (v - BOUND.y0) / FIELD.cell;
    if (fx < 0 || fy < 0 || fx >= fcols - 1 || fy >= frows - 1) return 0;
    const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, k = j * fcols + i;
    const r = FIELD.rest, q = 1 - r;
    const a = r * fAll[k] + q * Math.max(0, fLive[k]);
    const b = r * fAll[k + 1] + q * Math.max(0, fLive[k + 1]);
    const c = r * fAll[k + fcols] + q * Math.max(0, fLive[k + fcols]);
    const d = r * fAll[k + fcols + 1] + q * Math.max(0, fLive[k + fcols + 1]);
    return smooth(((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty) / norm);
  }

  let elapsed = 0, acc = 0, done = N === 0, settled = false, phase = "sim", end = 0, timer = 0;
  const clock = () => Math.max(0, elapsed - ECHO.ms * ECHO.start);

  function kill(a) {
    alive[a] = 0;
    aliveCount--;
    if (a < B) splat(a, fLive, -1);
    killList[killed++] = a;
  }

  function setShown(target) {
    while (shown < target) {
      for (let i = killFrom[shown]; i < killFrom[shown + 1]; i++) {
        const a = killList[i];
        alive[a] = 0;
        aliveCount--;
        if (a < B) splat(a, fLive, -1);
      }
      shown++;
    }
    while (shown > target) {
      shown--;
      for (let i = killFrom[shown]; i < killFrom[shown + 1]; i++) {
        const a = killList[i];
        alive[a] = 1;
        aliveCount++;
        if (a < B) splat(a, fLive, 1);
      }
    }
  }

  function syncShown() {
    const c = clock();
    let t = shown;
    while (t < count && nb[t] <= c) t++;
    while (t > 0 && nb[t - 1] > c) t--;
    setShown(t);
  }

  function measure() {
    kids.fill(0, 0, shown);
    load.fill(0, 0, shown);
    let length = 0;
    let apex = 0;
    for (let k = 1; k < shown; k++) {
      kids[np[k]]++;
      length += seg[k];
      if (nd[k] > nd[apex]) apex = k;
    }
    for (let k = shown - 1; k > 0; k--) load[np[k]] += load[k] + 1;
    let tips = 0;
    let junctions = 0;
    for (let k = 0; k < shown; k++) {
      if (!kids[k]) tips++;
      else if (kids[k] > 1) junctions++;
    }
    tree.tips = tips;
    tree.junctions = junctions;
    tree.length = length;
    tree.apex = apex;
  }

  function occupied(x, y, r) {
    const ci = Math.floor((x - BOUND.x0) / GROW.near), cj = Math.floor((y - BOUND.y0) / GROW.near);
    for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
      const list = ngrid.get(j * ncols + i);
      if (!list) continue;
      for (const k of list) if ((nx[k] - x) ** 2 + (ny[k] - y) ** 2 < r * r) return true;
    }
    return false;
  }

  function addNode(x, y, parent) {
    const k = count++;
    nx[k] = x;
    ny[k] = y;
    np[k] = parent;
    nb[k] = clock();
    lastBorn = nb[k];
    nd[k] = parent < 0 ? 0 : nd[parent] + 1;
    seg[k] = parent < 0 ? 0 : Math.hypot(x - nx[parent], y - ny[parent]);
    killFrom[k] = killed;
    const cell = clamp(Math.floor((y - BOUND.y0) / GROW.near), 0, nrows - 1) * ncols + clamp(Math.floor((x - BOUND.x0) / GROW.near), 0, ncols - 1);
    if (!ngrid.has(cell)) ngrid.set(cell, []);
    ngrid.get(cell).push(k);
    const ci = Math.floor((x - BOUND.x0) / GROW.reach), cj = Math.floor((y - BOUND.y0) / GROW.reach);
    const r2 = GROW.reach ** 2, k2 = GROW.kill ** 2;
    for (let j = Math.max(0, cj - 1); j <= Math.min(arows - 1, cj + 1); j++) for (let i = Math.max(0, ci - 1); i <= Math.min(acols - 1, ci + 1); i++) {
      for (const a of agrid[j * acols + i]) {
        if (!alive[a]) continue;
        const d2 = (ax[a] - x) ** 2 + (ay[a] - y) ** 2;
        if (d2 < k2) kill(a);
        else if (a < B && d2 < r2 && d2 < nearD2[a]) {
          nearD2[a] = d2;
          near[a] = k;
        }
      }
    }
    killFrom[k + 1] = killed;
    shown = count;
  }

  function grow() {
    const pull = new Map();
    for (let a = 0; a < N; a++) {
      if (!alive[a] || near[a] < 0) continue;
      const k = near[a], d = Math.sqrt(nearD2[a]) || 1;
      let v = pull.get(k);
      if (!v) pull.set(k, (v = [0, 0]));
      v[0] += (ax[a] - nx[k]) / d;
      v[1] += (ay[a] - ny[k]) / d;
    }
    let added = 0;
    for (const [k, v] of pull) {
      if (count >= GROW.cap) break;
      const len = Math.hypot(v[0], v[1]);
      if (len < 1e-4) continue;
      const x = nx[k] + (v[0] / len) * GROW.step + (random() - 0.5) * GROW.jitter;
      const y = ny[k] + (v[1] / len) * GROW.step + (random() - 0.5) * GROW.jitter;
      if (occupied(x, y, GROW.step * 0.45)) continue;
      addNode(x, y, k);
      added++;
    }
    stall = added ? 0 : stall + 1;
    if (!aliveCount || stall > GROW.stall || count >= GROW.cap) {
      done = true;
      doneAt = clock();
    }
  }

  let W = 0, H = 0, dpr = 1, S = 1, ox = 0, oy = 0, liftPx = 8, narrow = false;
  let d = { x0: 0, y0: 0, x1: 0, y1: 0, top: 0 }, panel = null, chart = null, twin = 0, block = 0;
  let colors = null, base = null, raf = 0, last = 0, inView = true, live = true, story = null, storyTrip = -1, zapUntil = 0, walkTimer = 0;
  const walker = { x: 1, moving: false, dir: -1, arrived: false, trip: null, trips: 0, nextAt: 0, shownAt: 0, hiddenAt: 0, teddy: Math.random() < TEDDY.chance };
  let secY = 0, secTarget = 0, pointerIn = false, cover = null, tapped = false, tapTimer = 0, liveY = null, liveSince = 0;
  const trail = [];
  const face = { img: null, lum: null, w: 0, h: 0, x: 0, y: 0 };

  function recolorNow() {
    const s = getComputedStyle(host);
    colors = { ink: rgbOf(s.getPropertyValue("--ink").trim(), "#d8d1cc"), dim: rgbOf(s.getPropertyValue("--dim").trim(), "#7d8581"), accent: rgbOf(s.getPropertyValue("--accent").trim(), "#ff2fb3"), red: rgbOf(s.getPropertyValue("--color1").trim(), "#e5534b"), paper: surfaceOf(host) };
  }

  const rest = () => oy + 36 * S;

  function layout() {
    const r = host.getBoundingClientRect();
    W = r.width;
    H = r.height;
    if (!W || !H) return false;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    narrow = W < 440;
    host.dataset.panel = narrow ? "0" : "1";
    if (narrow) {
      panel = null;
      d = { x0: 14, x1: W - 14, y0: 30, y1: H - 26, top: 30 };
      liftPx = clamp(Math.round((d.y1 - d.y0) * 0.05), 6, 12);
      S = Math.min((d.x1 - d.x0 - 60) / SIZE[0], (d.y1 - d.y0 - liftPx - 6) / (ROOT[1] + 2));
    } else {
      const pw = clamp(W * 0.36, 170, 252);
      panel = { x0: W - 10 - pw, x1: W - 10 };
      d = { x0: 20, x1: panel.x0 - 16, y0: 36, y1: H - 18, top: 36 - RULE.gap };
      liftPx = clamp(Math.round((d.y1 - d.y0) * 0.05), 6, 16);
      S = Math.min((d.x1 - d.x0 - 40) / SIZE[0], (d.y1 - 4 - (d.y0 + 16) - liftPx) / ROOT[1]);
      chart = { y0: d.top, h: clamp(Math.round(H * 0.16), 36, 66) };
      twin = chart.y0 + chart.h + 44;
      block = H - 18 - 46;
    }
    ox = d.x0 + (d.x1 - d.x0 - SIZE[0] * S) / 2;
    oy = d.y1 - 4 - ROOT[1] * S;
    secY = secTarget = pointerIn ? secTarget : rest();
    base = cover = null;
    fitFace();
    return true;
  }

  function fitFace() {
    if (!face.img || !(d.y1 > d.y0)) return;
    const h = Math.round(d.y1 - d.y0);
    const w = Math.round((h * face.img.naturalWidth) / face.img.naturalHeight);
    const c = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    c.canvas.width = w;
    c.canvas.height = h;
    c.drawImage(face.img, 0, 0, w, h);
    const px = c.getImageData(0, 0, w, h).data;
    face.lum = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const l = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
      face.lum[i] = l > 0.97 ? 0 : smooth((l - 0.15) / 0.75);
    }
    Object.assign(face, { w, h, x: Math.round((d.x0 + d.x1) / 2 - w / 2), y: Math.round(d.y0) });
  }

  const lightAt = (x, y) => {
    const u = Math.round(x - face.x), v = Math.round(y - face.y);
    return u < 0 || v < 0 || u >= face.w || v >= face.h ? 0 : face.lum[v * face.w + u];
  };

  function mark(y, now) {
    const tail = trail[trail.length - 1];
    if (tail && Math.abs(tail.y - y) < 1) tail.t = now;
    else trail.push({ y, t: now });
  }

  function glowAt(y, now) {
    const band = GLOW.band * (d.y1 - d.y0);
    let w = 0;
    const bump = (at, strength) => {
      const gap = Math.abs(y - at);
      if (gap < band && strength > 0) w = Math.max(w, strength * (0.5 + 0.5 * Math.cos((Math.PI * gap) / band)));
    };
    if (liveY !== null) bump(liveY, reduced.matches ? 1 : Math.min(1, (now - liveSince) / GLOW.in));
    for (const spot of trail) bump(spot.y, 1 - (now - spot.t) / GLOW.ms);
    return w;
  }

  function settleLive(now) {
    if (liveY === null) return;
    if (pointerIn || tapped) {
      if (pointerIn) liveY = secTarget;
      return;
    }
    if (!reduced.matches) mark(liveY, now);
    liveY = null;
  }

  function drawGlow(c) {
    if (!face.lum || (!trail.length && liveY === null)) return;
    const now = performance.now();
    c.save();
    const rows = Math.floor((d.y1 - d.top) / RULE.gap) + 1;
    const paths = Array.from({ length: GLOW.levels + 1 }, () => new Path2D());
    for (let i = 0; i < rows; i++) {
      const y = d.top + i * RULE.gap;
      const w = glowAt(y, now);
      const t = (elapsed - (i / rows) * ECHO.ms * ECHO.start) / ECHO.rise;
      if (w <= 0.01 || t < 1) continue;
      const rise = liftPx, v = (y - oy) / S;
      const lift = GLOW.lift * liftPx;
      let px = d.x0, py = y - height((d.x0 - ox) / S, v) * rise - lightAt(d.x0, y) * lift;
      for (let x = d.x0 + RULE.dx; x <= d.x1 + 0.01; x += RULE.dx) {
        const ny = y - height((x - ox) / S, v) * rise - lightAt(x, y) * lift;
        const q = Math.round(Math.min(1, GLOW.gain * w * lightAt(x - RULE.dx / 2, y)) * GLOW.levels);
        if (q > 0) {
          paths[q].moveTo(px, py);
          paths[q].lineTo(x, ny);
        }
        px = x;
        py = ny;
      }
    }
    c.lineWidth = 1.2;
    paths.forEach((path, q) => {
      if (!q) return;
      c.strokeStyle = `rgba(${colors.ink},${(q / GLOW.levels).toFixed(3)})`;
      c.stroke(path);
    });
    c.restore();
  }

  function text(c, s, x, y, size, color, align = "left") {
    c.font = `${size}px "Plex Mono", ui-monospace, monospace`;
    c.textAlign = align;
    c.fillStyle = color;
    c.fillText(s, x, y);
    c.textAlign = "left";
  }

  function arrow(c, x, y, dx, dy, color) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - dx * 5 - dy * 1.7, y - dy * 5 + dx * 1.7);
    c.lineTo(x - dx * 5 + dy * 1.7, y - dy * 5 - dx * 1.7);
    c.closePath();
    c.fillStyle = color;
    c.fill();
  }

  function drawFrame(c) {
    const { dim } = colors;
    c.lineWidth = 1;
    c.strokeStyle = `rgba(${dim},0.5)`;
    c.strokeRect(0.5, 0.5, W - 1, H - 1);
    if (narrow) return;
    c.fillStyle = `rgba(${dim},0.55)`;
    for (let k = 0; k <= 8; k++) {
      const x = Math.round((k * (W - 1)) / 8) + 0.5;
      c.fillRect(x - 0.5, 0, 1, 4);
      c.fillRect(x - 0.5, H - 4, 1, 4);
      if (k < 8) text(c, String(k + 1), x + (W - 1) / 16, H - 5, 8, `rgba(${dim},0.7)`, "center");
    }
  }

  function drawHeader(c) {
    const { ink } = colors;
    text(c, "PJ", d.x0, 18, 11, `rgba(${ink},0.95)`);
    const title = `${fmt(N)} points · 1 per contribution`;
    const dated = from ? `${title} · ${from.slice(0, 4)}` : title;
    c.font = '10px "Plex Mono", ui-monospace, monospace';
    text(c, d.x0 + 22 + c.measureText(dated).width <= d.x1 ? dated : title, d.x0 + 22, 18, 10, `rgba(${ink},0.8)`);
  }

  function drawRules(c) {
    const { ink, paper } = colors;
    const rows = Math.floor((d.y1 - d.top) / RULE.gap) + 1;
    const xs = [];
    for (let x = d.x0; x <= d.x1 + 0.01; x += RULE.dx) xs.push(x);
    const n = xs.length;
    const ys = new Float32Array(n), hs = new Float32Array(n);
    c.lineWidth = 0.75;
    c.lineJoin = "round";
    for (let i = 0; i < rows; i++) {
      const y = d.top + i * RULE.gap;
      const t = (elapsed - (i / rows) * ECHO.ms * ECHO.start) / ECHO.rise;
      if (t <= 0) continue;
      const rise = smooth(t), fade = smooth(t * 1.6);
      const v = (y - oy) / S;
      let peak = 0;
      for (let k = 0; k < n; k++) {
        const h = height((xs[k] - ox) / S, v) * rise;
        hs[k] = h;
        ys[k] = y - h * liftPx;
        if (h > peak) peak = h;
      }
      c.beginPath();
      c.moveTo(xs[0], ys[0]);
      for (let k = 1; k < n; k++) c.lineTo(xs[k], ys[k]);
      if (peak > 0.01) {
        c.lineTo(xs[n - 1], y + 0.5);
        c.lineTo(xs[0], y + 0.5);
        c.closePath();
        c.fillStyle = paper;
        c.fill();
        c.beginPath();
        c.moveTo(xs[0], ys[0]);
        for (let k = 1; k < n; k++) c.lineTo(xs[k], ys[k]);
      }
      c.strokeStyle = `rgba(${ink},${(0.11 * fade).toFixed(3)})`;
      c.stroke();
      if (peak > 0.06) {
        c.beginPath();
        let on = false;
        for (let k = 0; k < n; k++) {
          if (hs[k] > 0.06) {
            if (on) c.lineTo(xs[k], ys[k]);
            else c.moveTo(xs[k], ys[k]);
            on = true;
          } else on = false;
        }
        c.strokeStyle = `rgba(${ink},${(0.2 * fade).toFixed(3)})`;
        c.stroke();
      }
    }
  }

  function drawTree(c) {
    if (shown < 2) return;
    const { ink, accent } = colors;
    for (let k = 0; k < shown; k++) {
      px[k] = ox + nx[k] * S;
      py[k] = oy + ny[k] * S - height(nx[k], ny[k]) * liftPx;
    }
    const now = clock();
    const paths = WIDTH.map(() => new Path2D());
    const fresh = [new Path2D(), new Path2D(), new Path2D()];
    const ticks = new Path2D();
    for (let k = 1; k < shown; k++) {
      const p = np[k];
      const age = now - nb[k];
      if (age < ECHO.fresh && !settled) {
        const b = Math.min(2, Math.floor((age / ECHO.fresh) * 3));
        fresh[b].moveTo(px[p], py[p]);
        fresh[b].lineTo(px[k], py[k]);
        continue;
      }
      const w = load[k] + 1;
      const b = w < LOAD[0] ? 0 : w < LOAD[1] ? 1 : w < LOAD[2] ? 2 : w < LOAD[3] ? 3 : 4;
      paths[b].moveTo(px[p], py[p]);
      paths[b].lineTo(px[k], py[k]);
      if (w >= TICK.load && Math.floor(nb[k] / TICK.every) > Math.floor(nb[p] / TICK.every)) {
        const dx = px[k] - px[p], dy = py[k] - py[p], l = Math.hypot(dx, dy) || 1;
        const tx = (-dy / l) * TICK.size, ty = (dx / l) * TICK.size;
        ticks.moveTo(px[k] - tx, py[k] - ty);
        ticks.lineTo(px[k] + tx, py[k] + ty);
      }
    }
    c.lineCap = "round";
    paths.forEach((path, b) => {
      c.lineWidth = WIDTH[b];
      c.strokeStyle = `rgba(${ink},${ALPHA[b]})`;
      c.stroke(path);
    });
    c.lineWidth = 0.8;
    c.strokeStyle = `rgba(${ink},0.75)`;
    c.stroke(ticks);
    fresh.forEach((path, b) => {
      c.lineWidth = 1.1;
      c.strokeStyle = `rgba(${accent},${[0.95, 0.7, 0.4][b]})`;
      c.stroke(path);
    });
  }

  function callout(c, x, y, dx, dy, label, value, clear = false) {
    const { ink, dim } = colors;
    c.font = '9px "Plex Mono", ui-monospace, monospace';
    const lw = c.measureText(label).width, vw = value ? c.measureText(value).width + 6 : 0;
    const ex = x + dx, side = dx > 0 ? 1 : -1, run = side * 14;
    const tx = side > 0 ? ex + run + 4 : ex + run - 4 - lw - vw;
    let ey = y + dy;
    if (clear) for (let k = 0; k < shown; k++) if (px[k] >= tx - 2 && px[k] <= tx + lw + vw + 2) ey = Math.min(ey, py[k] - 8);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(ex, ey);
    c.lineTo(ex + run, ey);
    c.lineWidth = 0.75;
    c.strokeStyle = `rgba(${dim},0.8)`;
    c.stroke();
    c.beginPath();
    c.arc(x, y, 1.7, 0, TAU);
    c.fillStyle = `rgba(${ink},0.95)`;
    c.fill();
    text(c, label, tx, ey + 3, 9, `rgba(${ink},0.9)`);
    if (value) text(c, value, tx + lw + 6, ey + 3, 9, `rgba(${dim},0.95)`);
  }

  function drawCallouts(c) {
    if (!shown) return;
    callout(c, ox + nx[0] * S, oy + ny[0] * S, 12, -8, "root", shown > 1 ? `carries ${fmt(shown - 1)}` : "");
    const apex = tree.apex;
    if (!narrow && apex) callout(c, px[apex], py[apex], px[apex] + 120 < d.x1 ? 16 : -16, -12, "apex", `${fmt(nd[apex])} steps`, true);
  }

  function drawDims(c) {
    if (narrow) return;
    const { dim, paper } = colors;
    const w = SIZE[0] * S, top = oy - liftPx;
    const y = top - 10;
    const color = `rgba(${dim},0.75)`;
    c.lineWidth = 0.6;
    c.strokeStyle = color;
    c.beginPath();
    c.moveTo(ox, y - 3);
    c.lineTo(ox, top + 12 * S - 3);
    c.moveTo(ox + w, y - 3);
    c.lineTo(ox + w, top - 3);
    c.moveTo(ox, y);
    c.lineTo(ox + w, y);
    c.stroke();
    arrow(c, ox, y, -1, 0, color);
    arrow(c, ox + w, y, 1, 0, color);
    const label = `${(w * MM).toFixed(1)} mm`;
    c.font = '9px "Plex Mono", ui-monospace, monospace';
    const tw = c.measureText(label).width + 6;
    c.fillStyle = paper;
    c.fillRect(ox + w / 2 - tw / 2, y - 6, tw, 12);
    text(c, label, ox + w / 2, y + 3, 9, `rgba(${dim},0.95)`, "center");
  }

  function drawTwin(c) {
    const { ink, dim } = colors;
    const grownFor = Math.min(clock(), done ? doneAt : Infinity) / 1000;
    const rows = [["members", fmt(Math.max(0, shown - 1))], ["tips", fmt(shown ? tree.tips : 0)], ["junctions", fmt(tree.junctions)], ["length", `${fmt(tree.length * S * MM)} mm`], ["grown", `${grownFor.toFixed(1)} s`], ["reached", `${fmt(N - aliveCount)} / ${fmt(N)}`]];
    if (narrow) {
      text(c, [rows[0], rows[1], rows[3]].map(([k, v]) => `${k} ${v}`).join(" · "), d.x0, H - 10, 9, `rgba(${dim},0.95)`);
      return;
    }
    const x0 = panel.x0, x1 = panel.x1;
    text(c, "numeric twin", x0, twin - 14, 10, `rgba(${ink},0.92)`);
    text(c, "as counts", x1, twin - 14, 9, `rgba(${dim},0.9)`, "right");
    rows.forEach(([label, value], k) => {
      const y = twin + k * 14;
      text(c, label, x0, y, 9, `rgba(${dim},0.95)`);
      text(c, value, x1, y, 9, `rgba(${ink},0.92)`, "right");
      c.fillStyle = `rgba(${dim},0.22)`;
      c.fillRect(x0, y + 4, x1 - x0, 1);
    });
    c.lineWidth = 1;
    c.strokeStyle = `rgba(${dim},0.6)`;
    c.strokeRect(x0 + 0.5, block + 0.5, x1 - x0 - 1, 45);
    c.fillStyle = `rgba(${dim},0.6)`;
    c.fillRect(x0, block + 17, x1 - x0, 1);
    text(c, owner || "PJ", x0 + 6, block + 12, 10, `rgba(${ink},0.95)`);
    text(c, "scale 1:1", x1 - 6, block + 12, 8, `rgba(${dim},0.95)`, "right");
  }

  function drawUnder(c) {
    measure();
    drawFrame(c);
    drawHeader(c);
    drawRules(c);
  }

  function drawOver(c) {
    if (elapsed >= ECHO.ms * ECHO.start) {
      drawTree(c);
      drawDims(c);
      drawCallouts(c);
    }
    drawTwin(c);
  }

  function drawSection(c) {
    const { ink, dim, accent } = colors;
    const y = Math.round(secY) + 0.5;
    const color = `rgba(${accent},0.85)`;
    c.save();
    c.setLineDash([10, 3, 2, 3]);
    c.lineWidth = 0.8;
    c.strokeStyle = color;
    c.beginPath();
    c.moveTo(d.x0 + 8, y);
    c.lineTo(d.x1 - 8, y);
    c.stroke();
    c.restore();
    for (const [x, side] of [[d.x0, 1], [d.x1, -1]]) {
      c.lineWidth = 2;
      c.strokeStyle = color;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + side * 8, y);
      c.stroke();
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(x + side * 4, y);
      c.lineTo(x + side * 4, y - 8);
      c.stroke();
      arrow(c, x + side * 4, y - 8, 0, -1, color);
      text(c, "A", x + side * 4, y - 16, 9, color, "center");
    }
    if (!panel) return;
    const x0 = panel.x0, x1 = panel.x1, top = chart.y0, h = chart.h, bw = x1 - x0;
    text(c, "section A–A", x0, top - 8, 10, `rgba(${ink},0.92)`);
    text(c, pointerIn ? "echo at pointer" : "echo at rest", x1, top - 8, 9, `rgba(${dim},0.9)`, "right");
    c.lineWidth = 1;
    c.strokeStyle = `rgba(${dim},0.45)`;
    c.strokeRect(x0 + 0.5, top + 0.5, bw - 1, h - 1);
    const v = (secY - oy) / S;
    const rows = Math.floor((d.y1 - d.top) / RULE.gap) + 1;
    const row = clamp(Math.round((secY - d.top) / RULE.gap), 0, rows);
    const rise = smooth((elapsed - (row / rows) * ECHO.ms * ECHO.start) / ECHO.rise);
    const floor = top + h - 6, span = h - 12;
    c.beginPath();
    c.moveTo(x0 + 1, floor);
    const steps = 96;
    for (let k = 0; k <= steps; k++) {
      const X = d.x0 + ((d.x1 - d.x0) * k) / steps;
      c.lineTo(x0 + 1 + ((bw - 2) * k) / steps, floor - height((X - ox) / S, v) * rise * span);
    }
    c.lineTo(x1 - 1, floor);
    c.closePath();
    c.fillStyle = `rgba(${accent},0.14)`;
    c.fill();
    c.strokeStyle = `rgba(${accent},0.9)`;
    c.stroke();
    let cut = 0;
    c.fillStyle = `rgba(${ink},0.8)`;
    for (let k = 1; k < shown; k++) {
      const p = np[k];
      if (ny[p] <= v === ny[k] <= v) continue;
      const u = nx[p] + ((v - ny[p]) / (ny[k] - ny[p])) * (nx[k] - nx[p]);
      c.fillRect(x0 + 1 + ((ox + u * S - d.x0) / (d.x1 - d.x0)) * (bw - 2) - 0.5, floor + 1, 1, 3);
      cut++;
    }
    text(c, `cuts ${fmt(cut)} members`, x0, top + h + 12, 9, `rgba(${dim},0.95)`);
  }

  function layer(draw) {
    const sheet = document.createElement("canvas");
    sheet.width = canvas.width;
    sheet.height = canvas.height;
    const b = sheet.getContext("2d");
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(b);
    return sheet;
  }

  function paint() {
    if (!colors || !W) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (settled) {
      base ||= layer(drawUnder);
      cover ||= layer(drawOver);
      g.drawImage(base, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawGlow(g);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(cover, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawUnder(g);
      drawGlow(g);
      drawOver(g);
    }
    drawSection(g);
    drawFamily(g);
  }

  const familyScale = () => 25 / FAMILY.h;
  const familySpan = () => Math.max(0, panel.x1 - panel.x0 - 12 - FAMILY.width * familyScale());
  const familyX = () => panel.x0 + 6 + walker.x * familySpan();

  function wakeAt(at) {
    clearTimeout(walkTimer);
    walkTimer = setTimeout(() => {
      last = 0;
      request();
    }, Math.max(0, at - performance.now()));
  }

  function stroll(now) {
    if (reduced.matches || phase === "static") {
      Object.assign(walker, { x: 0, moving: false, arrived: true, trip: null });
      walker.shownAt ||= now - WALK.fadeIn;
      return;
    }
    if (!walker.arrived) {
      const p = N && !done ? (N - aliveCount) / N : 1;
      walker.x = 1 - p;
      walker.dir = -1;
      walker.moving = p > 0 && p < 1;
      if (p >= 1) {
        Object.assign(walker, { x: 0, moving: false, arrived: true, shownAt: now, nextAt: now + WALK.every - 2 * WALK.leg - WALK.turn });
        wakeAt(walker.nextAt);
      }
      return;
    }
    const t = walker.trip;
    if (!t) {
      walker.moving = false;
      if (now >= walker.nextAt && !story && now >= zapUntil) {
        walker.trip = { at: now };
        walker.trips += 1;
        walker.hiddenAt = now;
        walker.teddy = Math.random() < TEDDY.chance;
      } else return;
    }
    const k = now - walker.trip.at;
    if (k < WALK.leg) Object.assign(walker, { x: k / WALK.leg, dir: 1, moving: true });
    else if (k < WALK.leg + WALK.turn) Object.assign(walker, { x: 1, moving: false });
    else if (k < 2 * WALK.leg + WALK.turn) Object.assign(walker, { x: 1 - (k - WALK.leg - WALK.turn) / WALK.leg, dir: -1, moving: true });
    else {
      Object.assign(walker, { x: 0, moving: false, trip: null, shownAt: now, nextAt: walker.trip.at + WALK.every });
      wakeAt(walker.nextAt);
    }
  }

  function familyBusy(now) {
    if (!family || !panel || reduced.matches) return false;
    const fading = walker.arrived && !walker.moving && walker.x === 0 && now - walker.shownAt < WALK.fadeIn + 50;
    return walker.moving || Boolean(walker.trip) || fading || (walker.hiddenAt && now - walker.hiddenAt < WALK.fadeOut + 50);
  }

  function aboutAlpha(now) {
    if (story) return 0;
    if (walker.moving || walker.x > 0) return walker.hiddenAt ? 1 - clamp((now - walker.hiddenAt) / WALK.fadeOut, 0, 1) : 0;
    return walker.arrived ? clamp((now - walker.shownAt) / WALK.fadeIn, 0, 1) : 0;
  }

  function tellStory(now, ox, s, walking, dir) {
    if (reduced.matches || !walking && !story) return;
    const slot = ox + FAMILY.xs[4] * s;
    if (!story && walking && dir < 0 && walker.teddy && storyTrip !== walker.trips && 1 - walker.x >= TEDDY.at) {
      const [hx, hy] = freeHand(FAMILY.xs[4], FAMILY.people[4], 1);
      story = { at: now, last: now, stage: "drop", x: slot, dropX: ox + (hx + 0.3) * s, fromY: hy + 2.2 };
      storyTrip = walker.trips;
    }
    if (!story) return;
    const dt = Math.min(0.05, (now - story.last) / 1000);
    story.last = now;
    if (story.stage === "drop" && now - story.at >= TEDDY.notice) {
      story.stage = "back";
      story.x = slot;
    } else if (story.stage === "back") {
      story.x = Math.min(story.dropX - 1, story.x + dt * TEDDY.back);
      if (story.x >= story.dropX - 1.5) {
        story.stage = "pick";
        story.pickAt = now;
      }
    } else if (story.stage === "pick" && now - story.pickAt >= TEDDY.pick) story.stage = "home";
    else if (story.stage === "home") {
      story.x -= dt * TEDDY.home;
      if (story.x <= slot) {
        story = null;
        if (!walker.moving && walker.x === 0) walker.shownAt = now;
      }
    }
  }

  function paintShape(c, shape, rgb, zap = false) {
    c.strokeStyle = `rgba(${rgb},0.8)`;
    c.fillStyle = `rgba(${rgb},0.8)`;
    c.lineWidth = 0.9;
    c.lineCap = "round";
    c.beginPath();
    for (const [x1, y1, x2, y2] of shape.lines) {
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
    }
    for (const [cx, cy, r] of shape.heads) {
      c.moveTo(cx + r, cy);
      c.arc(cx, cy, r, 0, TAU);
    }
    c.stroke();
    c.beginPath();
    for (const [cx, cy] of shape.joints) {
      c.moveTo(cx + 0.8, cy);
      c.arc(cx, cy, 0.8, 0, TAU);
    }
    c.fill();
    if (zap && shape.heads[0]) {
      const [cx, cy, r] = shape.heads[0];
      c.fillStyle = `rgba(${colors.red},0.95)`;
      c.beginPath();
      c.arc(cx, cy, r, 0, TAU);
      c.fill();
    }
  }

  function paintTeddy(c, x, y, rgb) {
    c.fillStyle = `rgba(${rgb},0.85)`;
    c.beginPath();
    for (const [cx, cy, r] of teddyShape(x, y)) {
      c.moveTo(cx + r, cy);
      c.arc(cx, cy, r, 0, TAU);
    }
    c.fill();
  }

  function drawFamily(c) {
    if (!family || !panel || !colors) return;
    const now = performance.now();
    const s = familyScale();
    stroll(now);
    const walking = walker.moving;
    const dir = walker.dir;
    const ox = familyX();
    const oy = block + 19;
    const walk = walking ? (ox - panel.x0 - 6) / s : 0;
    const about = aboutAlpha(now);
    if (about > 0) ABOUT.forEach((line, k) => text(c, line, panel.x1 - 6, block + 30 + k * 10, 8, `rgba(${colors.dim},${(0.95 * about).toFixed(3)})`, "right"));
    tellStory(now, ox, s, walking, dir);
    const kid = story && story.stage !== "drop" ? story : null;
    c.save();
    c.translate(ox, oy);
    c.scale(s, s);
    paintShape(c, familyShape(walk, dir, { without: kid ? 4 : -1 }), colors.ink, now < zapUntil);
    if (!story) {
      const [hx, hy] = freeHand(FAMILY.xs[4], FAMILY.people[4], 1, walk, dir);
      paintTeddy(c, hx + 0.3, hy + 2.2, colors.ink);
    }
    c.restore();
    if (!story) return;
    const ground = FAMILY.base - 1.6;
    if (story.stage === "drop") {
      const fall = clamp((now - story.at) / TEDDY.fall, 0, 1);
      c.save();
      c.translate(story.dropX, oy);
      c.scale(s, s);
      paintTeddy(c, 0, story.fromY + (ground - story.fromY) * fall * fall, colors.ink);
      c.restore();
      return;
    }
    const alarm = story.stage === "back" || story.stage === "pick";
    const moving = story.stage === "back" || story.stage === "home";
    const kidDir = story.stage === "home" ? -1 : 1;
    const shape = childShape(0, moving ? story.x / s : 0, kidDir, story.stage === "pick" ? 1 : 0);
    c.save();
    c.translate(story.x, oy);
    c.scale(s, s);
    paintShape(c, shape, alarm ? colors.red : colors.ink);
    if (story.stage === "back") paintTeddy(c, (story.dropX - story.x) / s, ground, colors.ink);
    else {
      const [hx, hy] = freeHand(0, FAMILY.people[4], kidDir < 0 ? 1 : -1, moving ? story.x / s : 0, kidDir);
      paintTeddy(c, story.stage === "pick" ? 1.2 : hx + 0.3 * -kidDir, story.stage === "pick" ? ground : hy + 2.2, colors.ink);
    }
    c.restore();
  }

  function pause(name, ms, next) {
    phase = name;
    settled = true;
    base = cover = null;
    clearTimeout(timer);
    const go = () => {
      if (name === "hold" && (liveY !== null || trail.length)) {
        timer = setTimeout(go, 400);
        return;
      }
      phase = next;
      settled = false;
      base = cover = null;
      last = 0;
      request();
    };
    timer = setTimeout(go, ms);
  }

  function advance(dt) {
    if (phase === "replay") {
      elapsed = Math.min(end, elapsed + dt);
      syncShown();
      if (elapsed >= end) pause("hold", CYCLE.hold, "back");
      return;
    }
    if (phase === "back") {
      elapsed = Math.max(0, elapsed - dt * CYCLE.back);
      syncShown();
      if (elapsed <= 0) pause("rest", CYCLE.rest, "replay");
      return;
    }
    elapsed += dt;
    if (done) {
      if (clock() - lastBorn >= ECHO.fresh && elapsed >= ECHO.ms + ECHO.rise) {
        end = elapsed;
        pause("hold", CYCLE.hold, "back");
      }
      return;
    }
    if (elapsed < ECHO.ms * ECHO.start) return;
    if (!count) addNode(ROOT[0], ROOT[1], -1);
    acc = Math.min(3, acc + (dt / 1000) * GROW.rate);
    for (let n = 0; acc >= 1 && !done && n < 3; n++, acc--) grow();
  }

  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(50, now - last) : 16;
    last = now;
    if (!settled) advance(dt);
    secY += (secTarget - secY) * (1 - Math.exp(-dt / 70));
    if (Math.abs(secTarget - secY) < 0.2) secY = secTarget;
    settleLive(now);
    while (trail.length && now - trail[0].t > GLOW.ms) trail.shift();
    paint();
    if (!settled || secY !== secTarget || (trail.length && !reduced.matches) || (liveY !== null && !reduced.matches && now - liveSince < GLOW.in) || story || now < zapUntil || familyBusy(now)) request();
  }

  function request() {
    if (!raf && live && inView && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function sync() {
    if (inView && !document.hidden) {
      last = 0;
      request();
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function onMove(event) {
    const r = host.getBoundingClientRect();
    const x = event.clientX - r.left, y = event.clientY - r.top;
    pointerIn = !event.target?.closest?.(".lb") && x >= d.x0 && x <= d.x1 && y >= d.y0 && y <= d.y1;
    const target = pointerIn ? y : rest();
    if (pointerIn && face.lum && event.pointerType === "mouse" && liveY === null) {
      liveY = y;
      liveSince = performance.now();
    }
    if (Math.abs(target - secTarget) < 0.1 && liveY === null) return;
    secTarget = target;
    request();
  }

  function onLeave() {
    if (!pointerIn) return;
    pointerIn = false;
    secTarget = rest();
    request();
  }

  function onTap(event) {
    if (!face.lum || reduced.matches || fine.matches || event.target.closest("a, .lb")) return;
    const r = host.getBoundingClientRect();
    const x = event.clientX - r.left, y = event.clientY - r.top;
    if (x < d.x0 || x > d.x1 || y < d.y0 || y > d.y1) return;
    if (liveY === null) liveSince = performance.now();
    liveY = secTarget = d.y0 + GLOW.eyes * (d.y1 - d.y0);
    tapped = true;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
      tapped = false;
      secTarget = rest();
      request();
    }, GLOW.touch);
    request();
  }

  function finishNow() {
    elapsed = ECHO.ms + ECHO.rise;
    if (!count && N) addNode(ROOT[0], ROOT[1], -1);
    for (let n = 0; !done && n < 4000; n++) grow();
    done = true;
    lastBorn = -ECHO.fresh;
    settled = true;
    phase = "static";
  }

  recolorNow();
  layout();
  if (reduced.matches) finishNow();
  const sizeObserver = new ResizeObserver(() => {
    if (!layout()) return;
    paint();
    request();
  });
  sizeObserver.observe(host);
  const viewObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  });
  viewObserver.observe(host);
  document.addEventListener("visibilitychange", sync);
  addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  addEventListener("click", onTap);
  if (portrait) {
    const img = new Image();
    img.src = portrait;
    img
      .decode()
      .then(() => {
        if (!live) return;
        face.img = img;
        fitFace();
      })
      .catch(() => {});
  }
  document.fonts?.ready.then(() => {
    base = cover = null;
    if (live) paint();
  });
  paint();
  request();

  return {
    recolor() {
      recolorNow();
      base = cover = null;
      paint();
    },
    family() {
      if (!family || !panel || !inView || reduced.matches) return null;
      const r = canvas.getBoundingClientRect();
      const s = familyScale();
      const x = r.left + familyX();
      const y = r.top + block + 19;
      const head = FAMILY.base - FAMILY.people[0] * 0.91;
      return { x0: x, y0: y, x1: x + FAMILY.width * s, y1: y + 25, eyes: { x: x + FAMILY.xs[0] * s, y: y + head * s } };
    },
    fire(ms) {
      zapUntil = performance.now() + ms;
      last = 0;
      request();
    },
    stats: () => {
      measure();
      return { members: Math.max(0, shown - 1), tips: tree.tips, junctions: tree.junctions, reached: N - aliveCount, points: N, done, settled, phase, shown, recorded: count, elapsed, grown: doneAt, S, liftPx, W, H, narrow };
    },
    destroy() {
      live = false;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      clearTimeout(tapTimer);
      clearTimeout(walkTimer);
      sizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener("visibilitychange", sync);
      removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      removeEventListener("click", onTap);
    },
  };
}
