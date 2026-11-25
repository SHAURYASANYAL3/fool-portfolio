const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const WHEEL = { radius: 520, step: 0.155, reach: 0.82, box: [150, 94], small: 0.64, tilt: 0.55, rim: 96, pad: 150, drag: 64, response: 0.34 };
const INK = { seed: 4014, peaks: 0.62, reach: 48, single: 26, form: 2800, tail: 1.12, sway: 1400, swing: 0.3, reachOut: 1.6, cycles: 2.5 };
const MARK = ["M8 16L36 40L8 64L18 74L54 40L18 6Z", "M52 62H84V74H52Z"];
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (v) => {
  const t = clamp(v, 0, 1);
  return t * t * (3 - 2 * t);
};

function rgbOf(value, fallback) {
  const probe = document.createElement("canvas").getContext("2d");
  probe.fillStyle = value || fallback;
  const color = probe.fillStyle;
  if (color.startsWith("#")) return [1, 3, 5].map((k) => parseInt(color.slice(k, k + 2), 16)).join(",");
  return (color.match(/\d+/g) || [216, 209, 204]).slice(0, 3).join(",");
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

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function inkData({ cx, cy, R, a0, a1, values }) {
  const rnd = rngOf(INK.seed);
  const late = rngOf(INK.seed + 1);
  const gauss = () => {
    let s = 0;
    for (let k = 0; k < 4; k++) s += rnd();
    return (s - 2) / 0.58;
  };
  const N = values.length;
  const sorted = values.slice().sort((p, q) => p - q);
  const p90 = sorted[Math.floor(N * 0.9)] || 1;
  const norm = (v) => Math.min(1.5, v / p90);
  const angleOf = (k) => a0 + ((k + 0.5) / Math.max(1, N)) * (a1 - a0);
  const dayArc = Math.abs(a1 - a0) / Math.max(1, N);
  const smoothOf = (r) =>
    values.map((_, i) => {
      let s = 0;
      let w = 0;
      for (let j = -r; j <= r; j++) {
        const k = i + j;
        if (k < 0 || k >= N) continue;
        const ww = Math.exp(-(j * j) / (2 * (r / 2) ** 2));
        s += values[k] * ww;
        w += ww;
      }
      return s / w;
    });
  const daily = smoothOf(2);
  const week = smoothOf(4);
  const quiet = new Uint8Array(N);
  for (let i = 0; i < N; ) {
    if (values[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < N && !values[j]) j++;
    if (j - i >= 3) for (let k = i; k < j; k++) quiet[k] = 1;
    i = j;
  }
  const sw = week.slice().sort((p, q) => p - q);
  const thr = sw[Math.floor(N * INK.peaks)];
  const top = sw[N - 1] || 1;
  const peaks = [];
  for (let i = 1; i < N - 1; i++) if (week[i] >= week[i - 1] && week[i] > week[i + 1] && week[i] > thr) peaks.push(i);
  const kept = peaks.filter((i) => !peaks.some((j) => j !== i && Math.abs(j - i) <= 6 && week[j] > week[i]));
  const ph = [rnd() * TAU, rnd() * TAU, rnd() * TAU];
  const ring = [];
  const M = N * 8;
  for (let i = 0; i <= M && N; i++) {
    const t = i / M;
    const k = clamp(Math.round(t * N - 0.5), 0, N - 1);
    const noise = 0.5 * Math.sin(t * 41 + ph[0]) + 0.3 * Math.sin(t * 97 + ph[1]) + 0.2 * Math.sin(t * 233 + ph[2]);
    let w = 1.5 + 0.55 * noise + 2.1 * norm(daily[k]);
    const edge = [-1, 0, 1].every((d) => !quiet[clamp(k + d, 0, N - 1)]);
    if (quiet[k]) w = 0;
    else if (!edge) w *= 0.45;
    ring.push({ t, a: a0 + t * (a1 - a0), w, wob: 0.35 * Math.sin(t * 173 + ph[2]) });
  }
  const blobs = [];
  const tendrils = [];
  const drops = [];
  const hairs = [];
  const spray = (day, a, strength, count, reach) => {
    for (let j = 0; j < count; j++) {
      const aa = a + gauss() * dayArc * 2.4 * (0.6 + strength);
      const out = rnd() > 0.2;
      const dev = (rnd() - 0.5) * 0.95;
      const dir = out ? aa + dev : aa + Math.PI + dev;
      const base = R + (out ? 1.4 : -1.4);
      const L = (4 + reach * strength) * (0.18 + rnd() ** 1.35) * (out ? 1 : 0.42);
      const bw = 0.55 + 1.9 * strength * (0.35 + rnd() * 0.65);
      const tendril = { day, aa, x0: cx + Math.cos(aa) * base, y0: cy + Math.sin(aa) * base, dir, L, bw, curl: (rnd() - 0.5) * 0.45 * L, delay: late() * 0.5, twig: null };
      if (L > 15 && rnd() < 0.65) tendril.twig = { at: 0.35 + rnd() * 0.3, turn: (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.4), L: L * (0.25 + rnd() * 0.3), curl: (rnd() - 0.5) * 3 };
      tendrils.push(tendril);
      if (L > 10 && rnd() < 0.55) {
        for (let d = 0, m = 1 + Math.floor(rnd() * 3); d < m; d++) drops.push({ tendril, far: 1.05 + rnd() * 0.35, side: (rnd() - 0.5) * 5, r: 0.35 + rnd() * 1.1 * strength });
      }
      if (out && rnd() < 0.35) hairs.push({ tendril, length: L * (1.3 + rnd() * 0.8), dir: dir + (rnd() - 0.5) * 0.25, jx: (rnd() - 0.5) * 6, jy: (rnd() - 0.5) * 6 });
    }
  };
  for (const i of kept) {
    const s = clamp((week[i] - thr) / (top - thr), 0.12, 1);
    const a = angleOf(i);
    const rb = 2 + 4.2 * s;
    const pts = 22;
    const rad = Array.from({ length: pts }, () => rb * (0.55 + rnd() * 0.9));
    blobs.push({ day: i, a, soft: rad.map((r, k) => (r + rad[(k + 1) % pts] + rad[(k + pts - 1) % pts]) / 3) });
    spray(i, a, s, Math.round(10 + 30 * s), INK.reach);
  }
  values.forEach((v, k) => {
    if (v < p90 || kept.some((i) => Math.abs(i - k) <= 3)) return;
    spray(k, angleOf(k), 0.25 + 0.3 * Math.min(1, v / (p90 * 2)), 1 + Math.floor(rnd() * 3), INK.single);
  });
  return { cx, cy, R, a0, a1, N, ring, blobs, tendrils, drops, hairs, angleOf, peaks: kept.length, quiet: quiet.reduce((s, q) => s + q, 0) };
}

function taper(path, x0, y0, dir, L, bw, curl) {
  const dx = Math.cos(dir);
  const dy = Math.sin(dir);
  const P = (t) => {
    const u = 1 - t;
    const qx = x0 + dx * L * 0.5 - dy * curl;
    const qy = y0 + dy * L * 0.5 + dx * curl;
    return [u * u * x0 + 2 * u * t * qx + t * t * (x0 + dx * L), u * u * y0 + 2 * u * t * qy + t * t * (y0 + dy * L)];
  };
  const left = [];
  const right = [];
  for (let s = 0; s <= 8; s++) {
    const t = s / 8;
    const [x, y] = P(t);
    const [x2, y2] = P(Math.min(1, t + 0.02));
    const [x1, y1] = P(Math.max(0, t - 0.02));
    const tx = x2 - x1;
    const ty = y2 - y1;
    const tl = Math.hypot(tx, ty) || 1;
    const hw = (bw / 2) * (1 - t) ** 0.9;
    left.push([x - (ty / tl) * hw, y + (tx / tl) * hw]);
    right.push([x + (ty / tl) * hw, y - (tx / tl) * hw]);
  }
  path.moveTo(...left[0]);
  left.forEach((p) => path.lineTo(...p));
  for (let s = right.length - 1; s >= 0; s--) path.lineTo(...right[s]);
  path.closePath();
  return P;
}

function inkPaths(model, grow = () => 1, shown = () => true, bend = () => 0) {
  const { cx, cy, R } = model;
  const body = new Path2D();
  const hairs = new Path2D();
  const outer = [];
  const inner = [];
  const flush = () => {
    if (outer.length > 1) {
      body.moveTo(...outer[0]);
      outer.forEach((p) => body.lineTo(...p));
      for (let i = inner.length - 1; i >= 0; i--) body.lineTo(...inner[i]);
      body.closePath();
    }
    outer.length = 0;
    inner.length = 0;
  };
  for (const p of model.ring) {
    if (!shown(p)) {
      flush();
      continue;
    }
    outer.push([cx + Math.cos(p.a) * (R + p.w / 2 + p.wob), cy + Math.sin(p.a) * (R + p.w / 2 + p.wob)]);
    inner.push([cx + Math.cos(p.a) * (R - p.w / 2 + p.wob), cy + Math.sin(p.a) * (R - p.w / 2 + p.wob)]);
  }
  flush();
  for (const blob of model.blobs) {
    const k = smooth(grow(blob.day, 0));
    if (k <= 0) continue;
    const bx = cx + Math.cos(blob.a) * R;
    const by = cy + Math.sin(blob.a) * R;
    const tx = -Math.sin(blob.a);
    const ty = Math.cos(blob.a);
    const pts = blob.soft.length;
    for (let i = 0; i <= pts; i++) {
      const t = ((i % pts) / pts) * TAU;
      const r = blob.soft[i % pts] * k;
      const x = bx + tx * Math.cos(t) * r * 1.9 + Math.cos(blob.a) * Math.sin(t) * r;
      const y = by + ty * Math.cos(t) * r * 1.9 + Math.sin(blob.a) * Math.sin(t) * r;
      if (i) body.lineTo(x, y);
      else body.moveTo(x, y);
    }
    body.closePath();
  }
  for (const td of model.tendrils) {
    const k = smooth(grow(td.day, td.delay));
    if (k <= 0) continue;
    const b = bend(td.aa);
    const P = taper(body, td.x0, td.y0, td.dir + b, td.L * k, td.bw, td.curl * k - b * td.L * 0.35);
    if (td.twig && k > 0.5) {
      const [bx, by] = P(td.twig.at);
      taper(body, bx, by, td.dir + td.twig.turn + b * 1.3, td.twig.L * smooth((k - 0.5) * 2), td.bw * 0.5, td.twig.curl);
    }
  }
  for (const drop of model.drops) {
    const td = drop.tendril;
    const k = smooth(grow(td.day, td.delay + 0.35));
    if (k <= 0) continue;
    const b = bend(td.aa) * 1.15;
    const dx = Math.cos(td.dir + b);
    const dy = Math.sin(td.dir + b);
    const far = td.L * drop.far * (0.6 + 0.4 * k);
    const x = td.x0 + dx * far - dy * drop.side;
    const y = td.y0 + dy * far + dx * drop.side;
    const r = drop.r * k;
    body.moveTo(x + r, y);
    body.arc(x, y, r, 0, TAU);
  }
  for (const hair of model.hairs) {
    const td = hair.tendril;
    const k = smooth(grow(td.day, td.delay + 0.2));
    if (k <= 0) continue;
    const length = hair.length * k;
    const b = bend(td.aa);
    const mid = hair.dir + b * 0.6;
    const tip = hair.dir + b * 1.5;
    hairs.moveTo(td.x0, td.y0);
    hairs.quadraticCurveTo(td.x0 + Math.cos(mid) * length * 0.5 + hair.jx, td.y0 + Math.sin(mid) * length * 0.5 + hair.jy, td.x0 + Math.cos(tip) * length, td.y0 + Math.sin(tip) * length);
  }
  return { body, hairs };
}

function paintInk(g, { body, hairs }, color, alpha = 0.92) {
  g.fillStyle = `rgba(${color},${alpha})`;
  g.fill(body);
  g.lineWidth = 0.4;
  g.strokeStyle = `rgba(${color},${(alpha * 0.46).toFixed(3)})`;
  g.stroke(hairs);
}

function paintTile(kind, { colors, palettes, stack, wordmark }) {
  const [w, h] = WHEEL.box;
  const canvas = document.createElement("canvas");
  canvas.width = w * 2;
  canvas.height = h * 2;
  const g = canvas.getContext("2d");
  g.scale(2, 2);
  g.fillStyle = colors.paper;
  g.fillRect(0, 0, w, h);
  if (kind === "about") {
    g.strokeStyle = `rgba(${colors.ink},0.14)`;
    g.lineWidth = 0.6;
    for (let y = 8; y < h - 6; y += 4) {
      g.beginPath();
      g.moveTo(8, y);
      g.lineTo(w - 8, y);
      g.stroke();
    }
    const s = 0.62;
    g.save();
    g.translate((w - 88 * s) / 2, 12);
    g.scale(s, s);
    g.fillStyle = `rgba(${colors.ink},0.92)`;
    for (const d of MARK) g.fill(new Path2D(d));
    g.restore();
  } else if (kind === "stack") {
    const list = stack ? [...stack.languages, ...stack.tools, ...stack.site].filter((item) => item.icon?.path) : [];
    const seen = new Set();
    const icons = list.filter((item) => !seen.has(item.icon.slug) && seen.add(item.icon.slug)).slice(0, 18);
    const size = 13;
    const gap = 9;
    const cols = 6;
    const x0 = (w - (cols * size + (cols - 1) * gap)) / 2;
    icons.forEach((item, k) => {
      g.save();
      g.translate(x0 + (k % cols) * (size + gap), 10 + Math.floor(k / cols) * (size + gap));
      g.scale(size / (item.icon.box || 24), size / (item.icon.box || 24));
      g.fillStyle = `rgba(${colors.ink},${k < (stack?.languages.length ?? 0) ? 0.95 : 0.7})`;
      g.fill(new Path2D(item.icon.path));
      g.restore();
    });
  } else if (kind === "work") {
    g.fillStyle = `rgba(${colors.ink},0.85)`;
    [[0.1, 0.86], [0.22, 0.6], [0.34, 0.78], [0.46, 0.42], [0.58, 0.7], [0.7, 0.5], [0.82, 0.3]].forEach(([y, len], k) => {
      g.globalAlpha = 0.45 + 0.08 * k;
      g.fillRect(8, 8 + y * (h - 24), (w - 16) * len, 2.4);
    });
    g.globalAlpha = 1;
  } else if (kind === "talks") {
    g.strokeStyle = `rgba(${colors.ink},0.5)`;
    g.lineWidth = 0.8;
    g.beginPath();
    g.arc(w / 2, (h - 8) / 2 + 2, h * 0.34, 0, Math.PI * 2);
    g.moveTo(w / 2 - h * 0.34, (h - 8) / 2 + 2);
    g.lineTo(w / 2 + h * 0.34, (h - 8) / 2 + 2);
    g.stroke();
    g.beginPath();
    g.ellipse(w / 2, (h - 8) / 2 + 2, h * 0.14, h * 0.34, 0, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = `rgb(${colors.accent})`;
    [[0.2, -0.1], [-0.12, 0.12], [0.05, -0.22], [-0.24, -0.04]].forEach(([dx, dy]) => g.fillRect(w / 2 + dx * h - 1.5, (h - 8) / 2 + 2 + dy * h - 1.5, 3, 3));
  } else if (kind === "themes") {
    const list = palettes.length ? palettes : [{ bg: colors.paper, accent: colors.paper, fg: colors.paper }];
    const sw = w / list.length;
    list.forEach((theme, k) => {
      g.fillStyle = theme.bg;
      g.fillRect(k * sw, 0, Math.ceil(sw), h);
      g.fillStyle = theme.accent;
      g.fillRect(k * sw, h * 0.62, Math.ceil(sw), h * 0.16);
      g.fillStyle = theme.fg;
      g.fillRect(k * sw + sw * 0.3, h * 0.3, Math.max(1, sw * 0.4), 2);
    });
  }
  return canvas.toDataURL("image/png");
}

export function createWheel(host, { items, days, palettes = [], stack = null, wordmark = null, initial = 0, onChange, onCommit, onPick }) {
  const n = items.length;
  const layer = make("canvas", "wheel-ink");
  layer.setAttribute("aria-hidden", "true");
  const cache = document.createElement("canvas");
  const list = make("ul", "wheel-list");
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", host.getAttribute("aria-label") || "Projects");
  const mark = make("span", "wheel-mark");
  mark.setAttribute("aria-hidden", "true");
  const hint = make("p", "wheel-hint", "scroll · drag the wheel");
  hint.setAttribute("aria-hidden", "true");
  const nodes = items.map((item, k) => {
    const li = make("li");
    li.setAttribute("role", "none");
    const button = make("button", "wheel-item");
    button.type = "button";
    button.dataset.index = String(k);
    button.setAttribute("role", "option");
    button.setAttribute("aria-label", item.label);
    button.tabIndex = -1;
    const img = make("img");
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;
    if (item.src) img.src = item.src;
    const cap = make("span", "wheel-cap", item.label);
    cap.setAttribute("aria-hidden", "true");
    button.append(img, cap);
    li.append(button);
    list.append(li);
    return { button, img };
  });
  host.replaceChildren(layer, list, mark, hint);

  let W = 0;
  let H = 0;
  let cx = 0;
  let cy = 0;
  let apex = 0;
  let pos = initial;
  let target = initial;
  let vel = 0;
  let raf = 0;
  let last = 0;
  let colors = null;
  let committed = -1;
  let commitTimer = 0;
  let drag = null;
  let moved = false;
  let wheelAcc = 0;
  let live = true;
  let foot = null;
  let model = null;
  let full = null;
  let anim = null;
  let inkRaf = 0;
  let wantForm = false;
  let formed = reduced.matches;

  const wrap = (k) => ((Math.round(k) % n) + n) % n;
  const index = () => wrap(target);
  const offOf = (k, p) => {
    let off = (k - p) % n;
    if (off > n / 2) off -= n;
    if (off < -n / 2) off += n;
    return off;
  };

  function recolorNow() {
    const style = getComputedStyle(document.body);
    colors = {
      ink: rgbOf(style.getPropertyValue("--ink").trim(), "#d8d1cc"),
      dim: rgbOf(style.getPropertyValue("--dim").trim(), "#7d8581"),
      accent: rgbOf(style.getPropertyValue("--accent").trim(), "#ff2fb3"),
      paper: style.getPropertyValue("--bg").trim() || "#0c0b0d",
    };
    items.forEach((item, k) => {
      if (item.tile) nodes[k].img.src = paintTile(item.tile, { colors, palettes, stack, wordmark });
    });
  }

  function sized(canvas) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cw = W + WHEEL.pad;
    const w = Math.round(cw * dpr);
    const h = Math.round(H * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, WHEEL.pad * dpr, 0);
    g.clearRect(-WHEEL.pad, 0, cw, H);
    return g;
  }

  function rebuild() {
    const R = WHEEL.radius + WHEEL.rim;
    const half = Math.asin(clamp((H / 2 - 30) / R, 0.1, 0.9));
    model = inkData({ cx, cy, R, a0: Math.PI + half, a1: Math.PI - half, values: days.map((day) => day.count) });
    full = inkPaths(model);
    host.dataset.peaks = String(model.peaks);
    host.dataset.quiet = String(model.quiet);
  }

  function frameInk(g) {
    g.strokeStyle = `rgba(${colors.dim},0.3)`;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(cx, cy, WHEEL.radius, Math.PI - 1.2, Math.PI + 1.2);
    g.stroke();
    if (!days.length || !foot) return;
    const text = days[days.length - 1].date;
    g.save();
    g.font = '9px "Plex Mono", ui-monospace, monospace';
    g.lineJoin = "round";
    g.lineWidth = 3;
    g.strokeStyle = colors.paper;
    g.strokeText(text, foot.x, foot.y);
    g.fillStyle = `rgba(${colors.dim},0.9)`;
    g.fillText(text, foot.x, foot.y);
    g.restore();
  }

  function drawInk() {
    const cw = W + WHEEL.pad;
    layer.style.width = `${cw}px`;
    layer.style.height = `${H}px`;
    if (!colors || !W || !H || !model) {
      sized(layer);
      return;
    }
    const g = sized(cache);
    paintInk(g, full, colors.ink);
    frameInk(g);
    if (!anim) blit(sized(layer));
  }

  function blit(g) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(cache, 0, 0);
    g.restore();
  }

  function swayAt(a, p, dir) {
    const d = Math.abs(a - Math.PI) / Math.max(0.001, Math.abs(model.a1 - model.a0) / 2);
    const front = clamp(p * INK.reachOut - d, 0, 1);
    return dir * INK.swing * Math.sin(front * Math.PI * INK.cycles) * (1 - front) * (1 - p);
  }

  function animate(kind, dir = 1) {
    if (reduced.matches || !model || !W) return;
    anim = { kind, dir, start: performance.now() };
    if (!inkRaf && live) inkRaf = requestAnimationFrame(tickInk);
  }

  function tickInk(now) {
    inkRaf = 0;
    if (!anim || !model || !W) return;
    const g = sized(layer);
    if (anim.kind === "form") {
      const p = (now - anim.start) / INK.form;
      const head = p * model.N;
      frameInk(g);
      paintInk(g, inkPaths(model, (day, delay) => (head - day) / 16 - delay, (q) => q.t * model.N <= head), colors.ink);
      if (p < 1) {
        const a = model.a0 + p * (model.a1 - model.a0);
        g.fillStyle = `rgba(${colors.accent},0.95)`;
        g.beginPath();
        g.arc(cx + Math.cos(a) * model.R, cy + Math.sin(a) * model.R, 2.4, 0, TAU);
        g.fill();
      }
      if (p >= INK.tail) {
        anim = null;
        formed = true;
        blit(sized(layer));
        return;
      }
    } else {
      const p = Math.min(1, (now - anim.start) / INK.sway);
      frameInk(g);
      paintInk(g, inkPaths(model, undefined, undefined, (a) => swayAt(a, p, anim.dir)), colors.ink);
      if (p >= 1) {
        anim = null;
        blit(sized(layer));
        return;
      }
    }
    inkRaf = requestAnimationFrame(tickInk);
  }

  function layout() {
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const grew = rect.width !== W || rect.height !== H || !model;
    W = rect.width;
    H = rect.height;
    apex = clamp(W * 0.34, 78, 130);
    cx = apex + WHEEL.radius;
    cy = H / 2;
    foot = { x: parseFloat(getComputedStyle(hint).left) || 0, y: hint.offsetTop - 9 };
    if (grew) rebuild();
    drawInk();
    place();
    if (wantForm && !formed && !anim) animate("form");
    return true;
  }

  function place() {
    if (!W) return;
    const [bw, bh] = WHEEL.box;
    const sel = index();
    for (let k = 0; k < n; k++) {
      const off = offOf(k, pos);
      const a = Math.PI - off * WHEEL.step;
      const far = Math.abs(off * WHEEL.step);
      const { button } = nodes[k];
      if (far > WHEEL.reach) {
        button.style.visibility = "hidden";
        continue;
      }
      const x = cx + Math.cos(a) * WHEEL.radius;
      const y = cy + Math.sin(a) * WHEEL.radius;
      const near = clamp(1 - Math.abs(off), 0, 1);
      const s = WHEEL.small + (1 - WHEEL.small) * near;
      button.style.visibility = "visible";
      button.style.transform = `translate(${Math.round(x - bw / 2)}px, ${Math.round(y - bh / 2)}px) rotate(${((a - Math.PI) * WHEEL.tilt).toFixed(4)}rad) scale(${s.toFixed(4)})`;
      button.style.setProperty("--shade", (k === sel ? 0 : 1 - (0.32 + 0.42 * (1 - far / WHEEL.reach) + 0.26 * near)).toFixed(3));
      button.style.zIndex = String(100 - Math.round(Math.abs(off) * 8));
      nodes[k].x = x;
      nodes[k].y = y;
      nodes[k].s = s;
    }
    mark.style.transform = `translate(${(apex + bw / 2 + 4).toFixed(1)}px, ${(cy - 6).toFixed(1)}px)`;
  }

  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    if (!drag) {
      const w = TAU / WHEEL.response;
      vel += (w * w * (target - pos) - 2 * w * vel) * dt;
      pos += vel * dt;
      if (Math.abs(target - pos) < 0.002 && Math.abs(vel) < 0.01) {
        pos = target;
        vel = 0;
      }
    }
    place();
    if (drag || pos !== target) raf = requestAnimationFrame(frame);
    else last = 0;
  }

  function kick() {
    if (reduced.matches && !drag) {
      pos = target;
      vel = 0;
      place();
      return;
    }
    if (!raf && live) raf = requestAnimationFrame(frame);
  }

  function changed() {
    const k = index();
    nodes.forEach(({ button }, j) => {
      button.setAttribute("aria-selected", String(j === k));
      button.tabIndex = j === k ? 0 : -1;
    });
    onChange?.(items[k], k);
    clearTimeout(commitTimer);
    commitTimer = setTimeout(commit, reduced.matches ? 0 : 170);
  }

  function commit() {
    const k = index();
    if (k === committed) return;
    const previous = committed;
    committed = k;
    const item = items[k];
    if (formed && (!anim || anim.kind === "sway")) animate("sway", k > previous ? 1 : -1);
    onCommit?.(item, k);
  }

  function moveTo(next) {
    if (next === target) return;
    target = next;
    changed();
    kick();
  }

  function step(delta) {
    moveTo(Math.round(target) + delta);
  }

  function select(k, { animate = true } = {}) {
    const next = Math.round(target) + offOf(k, Math.round(target));
    if (!animate) {
      pos = next;
      vel = 0;
    }
    if (next === target) {
      if (!animate) place();
      return;
    }
    target = next;
    changed();
    if (animate) kick();
    else place();
  }

  function centerOf(k = index()) {
    const node = nodes[k];
    const rect = node?.button.getBoundingClientRect();
    return rect && rect.width ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
  }

  const onWheel = (event) => {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? 400 : 1;
    wheelAcc += (Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX) * unit;
    const steps = Math.trunc(wheelAcc / 42);
    if (!steps) return;
    wheelAcc -= steps * 42;
    step(clamp(steps, -3, 3));
  };

  const onDown = (event) => {
    if (event.button !== 0) return;
    drag = { id: event.pointerId, y: event.clientY, from: pos, at: performance.now(), v: 0, lastY: event.clientY, lastAt: performance.now() };
    moved = false;
  };
  const onMove = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dy = event.clientY - drag.y;
    if (!moved && Math.abs(dy) < 6) return;
    if (!moved) {
      moved = true;
      host.setPointerCapture?.(event.pointerId);
      host.classList.add("is-dragging");
    }
    const now = performance.now();
    const dt = Math.max(1, now - drag.lastAt);
    drag.v = 0.7 * drag.v + 0.3 * ((event.clientY - drag.lastY) / dt) * 1000;
    drag.lastY = event.clientY;
    drag.lastAt = now;
    pos = drag.from - dy / WHEEL.drag;
    vel = 0;
    const near = Math.round(pos);
    if (near !== target) {
      target = near;
      changed();
    }
    kick();
  };
  const onUp = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const release = drag.v;
    drag = null;
    host.classList.remove("is-dragging");
    if (!moved) return;
    const project = ((release / 1000) * 0.99) / (1 - 0.99);
    const next = Math.round(pos - project / WHEEL.drag);
    vel = -release / WHEEL.drag;
    if (next !== target) {
      target = next;
      changed();
    }
    kick();
  };
  const onClick = (event) => {
    const button = event.target.closest?.(".wheel-item");
    if (!button) return;
    if (moved) {
      event.preventDefault();
      moved = false;
      return;
    }
    select(Number(button.dataset.index));
    onPick?.(items[index()], index());
  };

  host.addEventListener("wheel", onWheel, { passive: false });
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onUp);
  host.addEventListener("click", onClick);
  const sizeObserver = new ResizeObserver(() => layout());
  sizeObserver.observe(host);

  recolorNow();
  layout();
  changed();
  clearTimeout(commitTimer);
  document.fonts?.ready.then(() => {
    if (!live) return;
    recolorNow();
    drawInk();
  });

  return {
    step,
    select,
    current: () => ({ item: items[index()], index: index() }),
    centerOf,
    focus() {
      nodes[index()]?.button.focus({ preventScroll: true });
    },
    commitNow() {
      clearTimeout(commitTimer);
      commit();
    },
    layout,
    setSrc(k, src) {
      if (nodes[k]) nodes[k].img.src = src;
    },
    form() {
      wantForm = true;
      if (!formed && !anim && W) animate("form");
    },
    recolor() {
      recolorNow();
      drawInk();
    },
    destroy() {
      live = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(inkRaf);
      clearTimeout(commitTimer);
      sizeObserver.disconnect();
      host.removeEventListener("wheel", onWheel);
    },
  };
}
