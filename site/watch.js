import { createWorm } from "./worm.js";

const KEY_CODES = [
  ["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal"],
  ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash"],
  ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"],
  ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"],
];
const KEY_STAGGER = [0, 1.5, 1.8, 2.3];
const US_KEYS = "`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./";
const US_SHIFTED = { "~": "`", "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", _: "-", "+": "=", "{": "[", "}": "]", "|": "\\", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/" };
const FINGERS = Object.fromEntries(
  [
    [0, 4, "Escape Backquote Digit1 KeyQ KeyA KeyZ ShiftLeft"],
    [0, 3, "Digit2 KeyW KeyS KeyX"],
    [0, 2, "Digit3 KeyE KeyD KeyC"],
    [0, 1, "Digit4 Digit5 KeyR KeyT KeyF KeyG KeyV KeyB"],
    [1, 1, "Digit6 Digit7 KeyY KeyU KeyH KeyJ KeyN KeyM"],
    [1, 2, "Digit8 KeyI KeyK Comma"],
    [1, 3, "Digit9 KeyO KeyL Period"],
    [1, 4, "Digit0 Minus Equal KeyP BracketLeft BracketRight Backslash Semicolon Quote Slash ShiftRight Backspace Enter"],
  ].flatMap(([hand, finger, list]) => list.split(" ").map((code) => [code, [hand, finger]])),
);
const HAND_LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
const EYE = { upper: 0.47, lower: 0.37, iris: 0.33, reach: 0.5, rise: 0.14 };
const IRIS_ZOOM = { response: 0.8, near: 0.92, far: 1.15, span: 2000, locked: 0.9, pulse: 1.12, pulseMs: 320 };
const EYE_TONE = { floor: 0.04, range: 0.9, gamma: 1.2, base: 0.05, bold: 0.55 };
const EM_TOP = 1025 / 1300;
const GLYPH_PX = 5.5;
const FINE_W = GLYPH_PX * 0.6;
const FINE_H = GLYPH_PX * 1.08;
const FOCUS_MS = 1400;
const POINTER_MS = 2500;
const DESK_IDLE_MS = 2200;
const PHONE_IDLE_MS = 6000;
const REPAIR = { idle: 1200, touch: 2500, keys: 2600, every: 500 };

const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const narrow = matchMedia("(max-width: 700px)");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const between = (low, high) => low + Math.random() * (high - low);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function spring(value, response = 0.35, damping = 1) {
  return { value, target: value, velocity: 0, response, damping };
}

function advance(s, dt) {
  if (reduced.matches) {
    s.value = s.target;
    s.velocity = 0;
    return true;
  }
  const stiffness = ((2 * Math.PI) / s.response) ** 2;
  const friction = (4 * Math.PI * s.damping) / s.response;
  let left = Math.min(Math.max(dt, 0), 0.1);
  while (left > 1e-6) {
    const h = Math.min(left, 1 / 240);
    s.velocity += (-stiffness * (s.value - s.target) - friction * s.velocity) * h;
    s.value += s.velocity * h;
    left -= h;
  }
  const settled = Math.abs(s.value - s.target) < 0.002 && Math.abs(s.velocity) < 0.02;
  if (settled) {
    s.value = s.target;
    s.velocity = 0;
  }
  return settled;
}

function pickWorm(style) {
  const read = (name, fallback) => rgbOf(style.getPropertyValue(name).trim(), fallback).split(", ").map(Number);
  const ink = read("--ink", "#e8e9e5");
  const accent = read("--accent", "#ff2fb3");
  const bg = read("--bg", "#0c0b0d");
  const far = (a, b) => {
    const mean = (a[0] + b[0]) / 2;
    const [dr, dg, db] = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    return Math.sqrt((2 + mean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - mean) / 256) * db * db);
  };
  let best = ink;
  let score = -1;
  for (const name of ["--num", "--kw", "--ty", "--fn", "--str"]) {
    if (!style.getPropertyValue(name).trim()) continue;
    const color = read(name, "#888888");
    const value = Math.min(far(color, ink), far(color, accent), far(color, bg));
    if (value > score) {
      score = value;
      best = color;
    }
  }
  return best.join(", ");
}

function blend(a, b, k) {
  const x = a.split(",").map(Number);
  const y = b.split(",").map(Number);
  return x.map((v, n) => Math.round(v + (y[n] - v) * k)).join(", ");
}

function rgbOf(value, fallback) {
  const probe = document.createElement("canvas").getContext("2d");
  probe.fillStyle = value || fallback;
  const color = probe.fillStyle;
  if (color.startsWith("#")) return [1, 3, 5].map((k) => parseInt(color.slice(k, k + 2), 16)).join(", ");
  return (color.match(/\d+/g) || [232, 233, 229]).slice(0, 3).join(", ");
}

export function createWatch({ layer, deskHost, eyeHost, buffer, status, onState, family = null, den = null, wormOn = true }) {
  const g = layer.getContext("2d");
  const colors = { ink: "232, 233, 229", accent: "255, 47, 179", bg: "12, 11, 13", line: "26, 25, 26", worm: "108, 112, 224" };
  let width = 0;
  let height = 0;
  let raf = 0;
  let last = 0;
  let text = "·";
  let layoutMap = null;
  let kb = null;
  let hands = [];
  const pointer = { x: -1, y: -1, at: -Infinity, drift: [0, 0], down: 0, button: -1 };
  const focus = { x: 0, y: 0, at: -Infinity };
  const desk = { vis: spring(0, 0.3, 1), mouse: spring(0, 0.28, 1), ox: spring(0, 0.18, 1), oy: spring(0, 0.18, 1), lastAt: -Infinity, mode: "keys" };
  let lastTouch = performance.now();
  const ghost = { x: -1, y: -1, at: -Infinity };
  let flashes = [];
  let caret = null;
  let externalAt = -Infinity;
  let typedAt = -Infinity;
  let repairing = false;
  let stateKey = "";
  let summoned = null;
  let redMix = 0;
  let hovering = false;
  const worm = buffer && status ? createWorm({ buffer, status, colors, pointer, touchedAt: () => lastTouch, seed: () => text, family, den, sleeping: !wormOn }) : null;
  const eye = {
    state: "closed",
    lid: spring(0, 0.45, 1),
    gx: spring(0, 0.35, 1),
    gy: spring(0, 0.35, 1),
    dil: spring(0.45, 0.5, 1),
    iz: spring(IRIS_ZOOM.near, IRIS_ZOOM.response, 1),
    spin: 0,
    openNow: 0,
    blinkAt: -Infinity,
    nextBlinkAt: performance.now() + between(2600, 6400),
    reopenAt: 0,
    born: performance.now(),
    offset: 0,
    pulseUntil: 0,
    locked: null,
    levels: null,
    pupil: null,
    box: null,
    lost: [0, 0],
    lostAt: 0,
  };

  function recolor() {
    const style = getComputedStyle(document.body);
    colors.ink = rgbOf(style.getPropertyValue("--ink").trim(), "#e8e9e5");
    colors.accent = rgbOf(style.getPropertyValue("--accent").trim(), "#ff2fb3");
    colors.bg = rgbOf(style.getPropertyValue("--bg").trim(), "#0c0b0d");
    colors.line = rgbOf(style.getPropertyValue("--line").trim(), "#1a191a");
    colors.base = pickWorm(style);
    den?.style.setProperty("--worm", colors.base);
    colors.red = rgbOf(style.getPropertyValue("--color1").trim(), "#e5534b");
    paintWorm();
    wake();
  }

  function paintWorm() {
    const a = colors.base.split(",").map(Number);
    const b = colors.red.split(",").map(Number);
    colors.worm = a.map((v, i) => Math.round(v + (b[i] - v) * redMix)).join(", ");
  }

  function stepRed(dt, now) {
    if (summoned && !summoned.started) {
      summoned.started = Boolean(worm?.summon(now));
      if (!summoned.started && now - summoned.at > 4000) summoned = null;
    } else if (summoned && !worm?.visiting()) summoned = null;
    const want = summoned || worm?.zap(now) ? 1 : 0;
    if (redMix === want) return false;
    redMix = want > redMix ? Math.min(1, redMix + dt / 0.25) : Math.max(0, redMix - dt / 1.6);
    paintWorm();
    return true;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    layer.width = Math.round(width * dpr);
    layer.height = Math.round(height * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
    worm?.resize();
    wake();
  }

  function labelFor(code, n) {
    return layoutMap?.get(code) || US_KEYS[n];
  }

  function place(scale, box, withMouse) {
    const pitchX = 21.6 * scale;
    const pitchY = 26 * scale;
    const home = box.top + box.height * 0.5 - 0.5 * pitchY;
    const keys = new Map();
    KEY_CODES.forEach((row, k) => row.forEach((code, n) => keys.set(code, { x: (KEY_STAGGER[k] + n) * pitchX, y: home + (k - 2) * pitchY })));
    keys.set("Space", { x: 6.4 * pitchX, y: home + 2 * pitchY, wide: 5.6 * pitchX });
    keys.set("ShiftLeft", { x: 0.4 * pitchX, y: home + pitchY });
    keys.set("ShiftRight", { x: 12.8 * pitchX, y: home + pitchY });
    keys.set("Backspace", { x: 13.6 * pitchX, y: home - 2 * pitchY });
    keys.set("Enter", { x: 13.3 * pitchX, y: home });
    keys.set("Escape", { x: -1.1 * pitchX, y: home - 2 * pitchY });
    const mouse = withMouse ? { x: 14.7 * pitchX + 70 * scale, y: home + 0.2 * pitchY, w: 34 * scale, h: 56 * scale } : null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const [code, key] of keys) {
      const half = key.wide ? key.wide / 2 : (code === "Escape" ? 3 : 1) * 3.6 * scale;
      lo = Math.min(lo, key.x - half);
      hi = Math.max(hi, key.x + half);
    }
    if (mouse) {
      lo = Math.min(lo, mouse.x - mouse.w / 2);
      hi = Math.max(hi, mouse.x + mouse.w / 2);
    }
    const left = box.left + box.width / 2 - (lo + hi) / 2;
    for (const key of keys.values()) key.x += left;
    if (mouse) mouse.x += left;
    return { keys, pitchX, pitchY, scale, left, home, mouse };
  }

  function layout() {
    const rect = deskHost.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      kb = null;
      hands = [];
      return;
    }
    const withMouse = finePointer.matches;
    const flat = KEY_CODES.flat();
    const labels = new Map();
    flat.forEach((code, n) => labels.set(code, labelFor(code, n)));
    labels.set("ShiftLeft", "↑");
    labels.set("ShiftRight", "↑");
    labels.set("Backspace", "←");
    labels.set("Enter", "↩");
    labels.set("Escape", "esc");
    const chars = new Map([[" ", { code: "Space", shift: false }]]);
    for (const code of flat) {
      const label = labels.get(code);
      if (!label || [...label].length !== 1) continue;
      if (!chars.has(label)) chars.set(label, { code, shift: false });
      const upper = label.toUpperCase();
      if (upper !== label && !chars.has(upper)) chars.set(upper, { code, shift: true });
    }
    for (const [ch, base] of Object.entries(US_SHIFTED)) if (!chars.has(ch)) chars.set(ch, { code: flat[US_KEYS.indexOf(base)], shift: true });
    const needW = (withMouse ? 470 : 380) + 40;
    const needH = 190;
    const scale = clamp(Math.min(rect.width / needW, rect.height / needH), 0.5, 1.15);
    kb = { ...place(scale, rect, withMouse), labels, chars, glow: new Map(), clicks: [0, 0] };
    hands = [makeHand(0), makeHand(1)];
  }

  function keyPose(side) {
    const { keys, pitchX, pitchY, scale: s } = kb;
    const tips = (side === 0 ? ["KeyF", "KeyD", "KeyS", "KeyA"] : ["KeyJ", "KeyK", "KeyL", "Semicolon"]).map((code) => [keys.get(code).x, keys.get(code).y + 3 * s]);
    const center = tips.reduce((sum, [x]) => sum + x, 0) / 4;
    const space = keys.get("Space");
    const thumb = [space.x + (side === 0 ? -1.2 : 1.2) * pitchX, space.y + 2 * s];
    const wrist = [center + (side === 0 ? 10 : -10) * s, tips[0][1] + 3.7 * pitchY];
    const cmc = [wrist[0] + (side === 0 ? 26 : -26) * s, wrist[1] - 16 * s];
    const base = [cmc[0] + (thumb[0] - cmc[0]) * 0.4, cmc[1] + (thumb[1] - cmc[1]) * 0.4 + 4 * s];
    const rest = [wrist, cmc, base, lerp(base, thumb, 0.55), thumb];
    tips.forEach((tip, f) => {
      const knuckle = [tip[0] * 0.82 + center * 0.18, tip[1] + 1.55 * pitchY - Math.abs(f - 1.5) * 3 * s];
      rest.push(knuckle, lerp(knuckle, tip, 0.42), lerp(knuckle, tip, 0.74), tip);
    });
    return rest;
  }

  function mousePose(mx, my) {
    const { w, h } = kb.mouse;
    const at = (u, v) => [mx + u * w, my + v * h];
    const pose = [at(0.1, 1.05), at(-0.45, 0.7), at(-0.62, 0.42), at(-0.7, 0.18), at(-0.66, -0.02)];
    const fingers = [
      [at(-0.2, 0.2), at(-0.2, -0.38)],
      [at(0.08, 0.18), at(0.2, -0.38)],
      [at(0.32, 0.26), at(0.52, -0.08)],
      [at(0.46, 0.4), at(0.66, 0.16)],
    ];
    for (const [knuckle, tip] of fingers) pose.push(knuckle, lerp(knuckle, tip, 0.42), lerp(knuckle, tip, 0.74), tip);
    return pose;
  }

  function makeHand(side) {
    const rest = keyPose(side);
    return {
      side,
      rest,
      points: rest.map((point) => [...point]),
      tips: [0, 1, 2, 3, 4].map((f) => ({ x: spring(rest[4 + f * 4][0], 0.07, 0.82), y: spring(rest[4 + f * 4][1], 0.07, 0.82), pressUntil: 0 })),
      shift: { x: spring(0, 0.2, 1), y: spring(0, 0.2, 1) },
    };
  }

  function reach(hand, finger, key, now, hold) {
    const tip = hand.tips[finger];
    const [rx, ry] = hand.rest[4 + finger * 4];
    tip.x.target = key.x;
    tip.y.target = key.y + 3 * kb.scale;
    tip.pressUntil = now + hold;
    hand.shift.x.target = (key.x - rx) * 0.22;
    hand.shift.y.target = (key.y + 3 * kb.scale - ry) * 0.22;
  }

  function press(code, shift = false) {
    if (!kb) return;
    const key = kb.keys.get(code);
    if (!key) return;
    const now = performance.now();
    desk.lastAt = now;
    desk.mode = "keys";
    kb.glow.set(code, now);
    const [side, finger] = code === "Space" ? [1, 0] : FINGERS[code] || [1, 4];
    reach(hands[side], finger, key, now, 120);
    if (shift) {
      const shiftKey = side === 0 ? "ShiftRight" : "ShiftLeft";
      kb.glow.set(shiftKey, now);
      reach(hands[1 - side], 4, kb.keys.get(shiftKey), now, 160);
    }
    wake();
  }

  function pressKey(code, shift = false) {
    externalAt = performance.now();
    press(code, shift);
  }

  function pressChar(ch, own = false) {
    if (!own) externalAt = performance.now();
    const hit = kb?.chars.get(ch);
    if (hit) press(hit.code, hit.shift);
  }

  async function repair() {
    if (repairing || !worm || reduced.matches || document.hidden) return;
    const now = performance.now();
    const phone = !finePointer.matches;
    if (now - externalAt < REPAIR.keys) return;
    const quiet = now - desk.lastAt >= REPAIR.idle && now - pointer.at >= REPAIR.idle && (!phone || now - lastTouch >= REPAIR.touch);
    const chars = worm.nextRepair(now, quiet);
    if (!chars) return;
    repairing = true;
    const started = performance.now();
    const alive = () => !document.hidden && externalAt < started;
    const first = chars[0].range.getBoundingClientRect();
    if (kb?.mouse) {
      ghost.x = first.left;
      ghost.y = first.top + first.height / 2;
      ghost.at = performance.now();
      desk.mode = "mouse";
      for (let k = 0; k < 4 && alive(); k++) {
        pointer.drift[0] += (k % 2 ? -1 : 1) * between(6, 14);
        pointer.drift[1] += between(-5, 5);
        desk.lastAt = performance.now();
        wake();
        await sleep(90);
      }
      kb.clicks[0] = performance.now() + 160;
    }
    caret = { range: chars[0].range, before: true };
    setFocus(first.left, first.top + first.height / 2);
    desk.lastAt = performance.now();
    wake();
    await sleep(420);
    desk.mode = "keys";
    for (const c of chars) {
      if (!alive()) break;
      pressChar(c.ch, true);
      worm.restore(c);
      flashes.push({ range: c.range, ch: c.ch, at: performance.now() });
      caret = { range: c.range, before: false };
      const r = c.range.getBoundingClientRect();
      setFocus(r.right + 2, r.top + r.height / 2);
      typedAt = performance.now();
      await sleep(between(70, 150) + (Math.random() < 0.12 ? between(200, 420) : 0));
    }
    await sleep(320);
    caret = null;
    repairing = false;
    wake();
  }

  function drawRepair(now) {
    flashes = flashes.filter((f) => now - f.at < 650);
    if (!flashes.length && !caret) return false;
    g.font = `12px "Plex Mono", monospace`;
    g.textBaseline = "alphabetic";
    g.textAlign = "left";
    for (const f of flashes) {
      const r = f.range.getBoundingClientRect();
      if (!r.width) continue;
      g.fillStyle = `rgba(${colors.accent}, ${(1 - (now - f.at) / 650).toFixed(3)})`;
      g.fillText(f.ch, r.left, r.top + 12 * 1.025);
    }
    if (caret) {
      const r = caret.range.getBoundingClientRect();
      if (r.width && (now - typedAt < 500 || Math.floor(now / 530) % 2 === 0)) {
        g.fillStyle = `rgba(${colors.accent}, 0.95)`;
        g.fillRect(Math.round(caret.before ? r.left : r.right), Math.round(r.top + (r.height - 13) / 2), 1.5, 13);
      }
    }
    return true;
  }

  function setFocus(x, y) {
    focus.x = x;
    focus.y = y;
    focus.at = performance.now();
    wake();
  }

  function setText(value) {
    worm?.reset();
    const next = String(value || "").replace(/\s+/g, " ").replace(/[^\x21-\x7e ]/g, "").trim();
    if (!next || next === text) return;
    text = next;
    eye.offset = Math.floor(Math.random() * text.length);
    if (eye.state === "open" || eye.state === "opening") {
      eye.blinkAt = performance.now();
      eye.nextBlinkAt = eye.blinkAt + between(2600, 6400);
    }
    wake();
  }

  function stepHands(now, dt) {
    let moving = false;
    for (const hand of hands) {
      if (hand.tips.every((tip) => now > tip.pressUntil + 250)) {
        hand.shift.x.target = 0;
        hand.shift.y.target = 0;
      }
      if (!advance(hand.shift.x, dt)) moving = true;
      if (!advance(hand.shift.y, dt)) moving = true;
      const points = hand.rest.map(([x, y]) => [x + hand.shift.x.value, y + hand.shift.y.value]);
      hand.tips.forEach((tip, f) => {
        const [rx, ry] = hand.rest[4 + f * 4];
        if (now > tip.pressUntil) {
          tip.x.target = rx + hand.shift.x.target;
          tip.y.target = ry + hand.shift.y.target;
        }
        if (!advance(tip.x, dt)) moving = true;
        if (!advance(tip.y, dt)) moving = true;
        if (now < tip.pressUntil) moving = true;
        bendFinger(points, f, tip.x.value, tip.y.value);
      });
      hand.points = points;
    }
    return moving;
  }

  function bendFinger(points, f, tx, ty) {
    points[4 + f * 4] = [tx, ty];
    if (f === 0) {
      points[3] = lerp(points[2], [tx, ty], 0.55);
      return;
    }
    const knuckle = points[1 + f * 4];
    points[2 + f * 4] = lerp(knuckle, [tx, ty], 0.42);
    points[3 + f * 4] = lerp(knuckle, [tx, ty], 0.74);
  }

  function frameBox(points) {
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    return [Math.min(...xs) - 6, Math.min(...ys) - 6, Math.max(...xs) + 6, Math.max(...ys) + 6];
  }

  function drawKeyboard(vis, now) {
    g.font = `${12 * kb.scale}px "Plex Mono", monospace`;
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    for (const [code, key] of kb.keys) {
      const at = kb.glow.get(code);
      const glow = at === undefined ? 0 : clamp(1 - (now - at) / 260, 0, 1);
      g.fillStyle = `rgba(${glow > 0 ? colors.accent : colors.ink}, ${((0.2 + 0.75 * glow) * vis).toFixed(3)})`;
      if (key.wide) g.fillRect(Math.round(key.x - key.wide / 2), Math.round(key.y) - (glow > 0 ? 1 : 0), Math.round(key.wide), glow > 0 ? 2 : 1);
      else g.fillText(kb.labels.get(code) || "", key.x, key.y + 1 + 12 * kb.scale * (EM_TOP - 0.5));
    }
    g.textAlign = "left";
  }

  function drawZap({ to, eyes, t }) {
    const alpha = 0.55 + 0.35 * Math.abs(Math.sin(t * Math.PI * 3));
    g.lineCap = "round";
    g.lineWidth = 1;
    g.strokeStyle = `rgba(${colors.red}, ${alpha.toFixed(3)})`;
    g.beginPath();
    for (const d of [-1.2, 1.2]) {
      g.moveTo(eyes.x + d, eyes.y);
      g.lineTo(to.x + d * 0.4, to.y);
    }
    g.stroke();
    g.fillStyle = `rgba(${colors.red}, ${(0.35 * alpha).toFixed(3)})`;
    g.beginPath();
    g.arc(to.x, to.y, 3 + 3 * t, 0, Math.PI * 2);
    g.fill();
    g.lineCap = "butt";
  }

  function drawHandShape(points, vis, now, tips, label, side) {
    g.lineWidth = 0.75;
    g.strokeStyle = `rgba(${colors.ink}, ${(0.4 * vis).toFixed(3)})`;
    g.beginPath();
    for (const [a, b] of HAND_LINKS) {
      g.moveTo(points[a][0], points[a][1]);
      g.lineTo(points[b][0], points[b][1]);
    }
    g.stroke();
    points.forEach(([x, y], k) => {
      const tip = tips && k > 0 && k % 4 === 0 ? tips[k / 4 - 1] : null;
      const pressing = tip && now < tip.pressUntil;
      const size = pressing ? 4 : 2;
      g.fillStyle = pressing ? `rgba(${colors.accent}, ${vis.toFixed(3)})` : `rgba(${colors.ink}, ${(0.8 * vis).toFixed(3)})`;
      g.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    });
    const box = frameBox(points);
    g.strokeStyle = `rgba(${colors.ink}, ${(0.28 * vis).toFixed(3)})`;
    g.strokeRect(Math.round(box[0]) + 0.5, Math.round(box[1]) + 0.5, Math.round(box[2] - box[0]), Math.round(box[3] - box[1]));
    g.font = `8px "Plex Mono", monospace`;
    const widthOf = g.measureText(label).width;
    const lx = side === 0 ? box[0] : box[2] - widthOf;
    g.fillStyle = `rgba(${colors.ink}, ${(0.7 * vis).toFixed(3)})`;
    g.fillText(label, Math.round(lx), Math.round(box[1] - 5));
  }

  function drawMouse(vis, now) {
    const { mouse } = kb;
    const mx = mouse.x + desk.ox.value;
    const my = mouse.y + desk.oy.value;
    const { w, h } = mouse;
    const alpha = vis * (0.35 + 0.65 * desk.mouse.value);
    g.lineWidth = 0.9;
    g.strokeStyle = `rgba(${colors.ink}, ${(0.55 * alpha).toFixed(3)})`;
    g.beginPath();
    g.roundRect(mx - w / 2, my - h / 2, w, h, w / 2);
    g.stroke();
    g.beginPath();
    g.moveTo(mx, my - h / 2);
    g.lineTo(mx, my - h * 0.1);
    g.moveTo(mx - w / 2, my - h * 0.1);
    g.lineTo(mx + w / 2, my - h * 0.1);
    g.stroke();
    for (let side = 0; side < 2; side++) {
      const pressed = kb.clicks[side] > now;
      if (!pressed) continue;
      g.fillStyle = `rgba(${colors.accent}, ${(0.55 * alpha).toFixed(3)})`;
      g.beginPath();
      if (side === 0) g.roundRect(mx - w / 2 + 1, my - h / 2 + 1, w / 2 - 1.5, h * 0.4 - 1.5, [w / 2, 0, 0, 0]);
      else g.roundRect(mx + 0.5, my - h / 2 + 1, w / 2 - 1.5, h * 0.4 - 1.5, [0, w / 2, 0, 0]);
      g.fill();
    }
    g.fillStyle = `rgba(${colors.ink}, ${(0.6 * alpha).toFixed(3)})`;
    g.fillRect(Math.round(mx - 1), Math.round(my - h * 0.36), 2, Math.round(h * 0.12));
    const shown = now - ghost.at < 1600 ? ghost : pointer;
    if (desk.mouse.value > 0.4 && shown.x >= 0) {
      g.font = `8px "Plex Mono", monospace`;
      const lines = [`['mouse:u'] ${(shown.x / width).toFixed(7)}`, (shown.y / height).toFixed(7)];
      g.fillStyle = `rgba(${colors.ink}, ${(0.7 * alpha * desk.mouse.value).toFixed(3)})`;
      lines.forEach((line, k) => g.fillText(line, Math.round(mx + w / 2 + 12), Math.round(my - h / 2 + 6 + k * 9)));
    }
    return [mx, my];
  }

  function drawDesk(now, dt) {
    if (!kb) return false;
    const active = now - desk.lastAt < DESK_IDLE_MS;
    desk.vis.target = active ? 1 : 0;
    desk.mouse.target = kb.mouse && desk.mode === "mouse" && active ? 1 : 0;
    let moving = !advance(desk.vis, dt);
    if (!advance(desk.mouse, dt)) moving = true;
    pointer.drift = pointer.drift.map((v) => v * Math.pow(0.02, dt));
    desk.ox.target = clamp(pointer.drift[0], -28, 28) * kb.scale;
    desk.oy.target = clamp(pointer.drift[1], -16, 16) * kb.scale;
    if (!advance(desk.ox, dt) || !advance(desk.oy, dt)) moving = true;
    if (stepHands(now, dt)) moving = true;
    const vis = desk.vis.value;
    if (vis < 0.01) return moving || active;
    drawKeyboard(vis, now);
    let mouseAt = null;
    if (kb.mouse) mouseAt = drawMouse(vis, now);
    const left = hands[0];
    drawHandShape(left.points, vis, now, left.tips, `['hand0:u'] ${(left.points[0][0] / width).toFixed(7)}`, 0);
    const right = hands[1];
    let points = right.points;
    if (mouseAt && desk.mouse.value > 0.001) {
      const pose = mousePose(mouseAt[0], mouseAt[1]);
      points = points.map((point, k) => lerp(point, pose[k], desk.mouse.value));
    }
    drawHandShape(points, vis, now, desk.mouse.value > 0.5 ? null : right.tips, `['hand1:u'] ${(points[0][0] / width).toFixed(7)}`, 1);
    return moving || active;
  }

  function eyeBox() {
    const rect = eyeHost.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 36) return null;
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w: rect.width, h: rect.height };
  }

  function eyeRect(box) {
    if (!box || eye.openNow < 0.35) return null;
    const top = box.cy - box.h * EYE.upper * eye.openNow;
    const bottom = box.cy + box.h * EYE.lower * eye.openNow;
    return { cx: box.cx, cy: (top + bottom) / 2, w: box.w * 0.94, h: bottom - top };
  }

  function pupilOf(t, box) {
    const ri = box.h * EYE.iris * t.iz.value;
    return { x: box.cx + t.gx.value * box.w * 0.47 * EYE.reach, y: box.cy + t.gy.value * box.h * EYE.rise, ri, rp: ri * (0.24 + 0.26 * t.dil.value) };
  }

  function eyeSample(box, x, y) {
    const t = eye;
    const u = (x - box.cx) / (box.w * 0.47);
    if (u <= -1 || u >= 1) return -1;
    const k = 1 - u * u;
    const top = box.cy - box.h * EYE.upper * t.openNow * k ** 0.8;
    const bottom = box.cy + box.h * EYE.lower * t.openNow * k ** 1.15;
    const edge = Math.max(0, 1 - Math.abs(y - top) / 1.7) * 0.95 * Math.sqrt(k);
    const edgeLow = Math.max(0, 1 - Math.abs(y - bottom) / 1.3) * 0.5 * Math.sqrt(k);
    const rim = Math.max(edge, edgeLow);
    if (y < top || y > bottom) return rim > 0.05 ? rim : -1;
    const p = t.pupil;
    const dx = x - p.x;
    const dy = y - p.y;
    const d = Math.hypot(dx, dy);
    let v;
    if (d < p.rp) v = 0;
    else if (d < p.ri) {
      const rr = (d - p.rp) / (p.ri - p.rp);
      const angle = Math.atan2(dy, dx) + t.spin;
      const fibre = 0.5 + 0.5 * Math.sin(angle * 29 + 2.1 * Math.sin(angle * 5)) * Math.cos(angle * 13 - rr * 4);
      const collar = 0.38 * Math.exp(-((rr - 0.3) ** 2) / 0.012);
      const limbus = rr > 0.8 ? (rr - 0.8) / 0.2 : 0;
      v = (0.26 + 0.46 * fibre * (1 - 0.45 * rr) + collar) * (1 - 0.8 * limbus);
      if (rr < 0.07) v = Math.max(v, 0.9);
    } else v = 0.34 * (1 - 0.6 * u * u) * (0.5 + 0.5 * Math.min(1, (y - top) / (box.h * 0.18)));
    if (Math.hypot(x - (p.x - p.ri * 0.34), y - (p.y - p.ri * 0.36)) < p.ri * 0.14) v = 1;
    return Math.max(v, rim);
  }

  function drawEye(box, now) {
    const t = eye;
    const lost = worm ? worm.infection(now) : 0;
    const inner = lost > 0.01 ? worm.inner() : null;
    t.pupil = pupilOf(t, box);
    const x0 = box.cx - box.w / 2;
    const y0 = box.cy - box.h / 2;
    const cols = Math.ceil(box.w / FINE_W);
    const rows = Math.ceil(box.h / FINE_H);
    if (!t.levels || t.levels.length !== cols * rows) t.levels = new Int8Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = x0 + (c + 0.5) * FINE_W;
        const y = y0 + (r + 0.5) * FINE_H;
        let v = eyeSample(box, x, y);
        if (inner && v >= 0 && Math.hypot(x - inner.x, y - inner.y) < 6) v = Math.max(v, 0.9);
        t.levels[r * cols + c] = v < 0 ? -1 : Math.round(clamp((v - EYE_TONE.floor) / EYE_TONE.range, 0, 1) ** EYE_TONE.gamma * 13);
      }
    }
    const scroll = reduced.matches ? 0 : Math.floor((now - t.born) / 420);
    const tone = lost > 0.01 ? blend(colors.ink, colors.worm, lost) : colors.ink;
    const shake = lost > 0.05 && !reduced.matches ? [1.4 * lost * Math.sin(now / 90), 1.1 * lost * Math.cos(now / 110)] : null;
    g.font = `${GLYPH_PX}px "Plex Mono", monospace`;
    g.textBaseline = "alphabetic";
    for (let level = 1; level <= 13; level++) {
      const strength = level / 13;
      g.fillStyle = `rgba(${tone}, ${(EYE_TONE.base + (1 - EYE_TONE.base) * strength).toFixed(3)})`;
      for (let r = 0; r < rows; r++) {
        const from = t.offset + (r + scroll) * cols;
        let line = "";
        let any = false;
        for (let c = 0; c < cols; c++) {
          if (t.levels[r * cols + c] === level) {
            line += text[(from + c) % text.length];
            any = true;
          } else line += " ";
        }
        if (!any) continue;
        g.fillText(line, x0, y0 + r * FINE_H + GLYPH_PX * EM_TOP);
        if (strength > EYE_TONE.bold) g.fillText(line, x0 + 0.45, y0 + r * FINE_H + GLYPH_PX * EM_TOP);
        if (shake) {
          g.globalAlpha = 0.35 * lost;
          g.fillText(line, x0 + shake[0], y0 + r * FINE_H + GLYPH_PX * EM_TOP + shake[1]);
          g.globalAlpha = 1;
        }
      }
    }
    if (t.openNow > 0.6) drawTrack(box, now);
  }

  function drawTrack(box, now) {
    const t = eye;
    const p = t.pupil;
    const alpha = clamp((t.openNow - 0.6) / 0.3, 0, 1);
    const s = p.rp + 4;
    g.lineWidth = 0.75;
    g.font = `8px "Plex Mono", monospace`;
    g.strokeStyle = `rgba(${colors.ink}, ${(0.7 * alpha).toFixed(3)})`;
    g.strokeRect(Math.round(p.x - s) + 0.5, Math.round(p.y - s) + 0.5, Math.round(2 * s), Math.round(2 * s));
    const lost = worm ? worm.infection(now) : 0;
    const area = ((Math.PI * p.rp * p.rp) / (box.w * box.h)).toFixed(10);
    const label = lost > 0.6 ? ["['pupil:u'] NaN", "NaN", area, "None"] : [`['pupil:u'] ${((p.x - (box.cx - box.w / 2)) / box.w).toFixed(7)}`, ((p.y - (box.cy - box.h / 2)) / box.h).toFixed(7), area, "None"];
    const labelWidth = Math.max(...label.map((line) => g.measureText(line).width));
    const lx = clamp(box.cx - labelWidth / 2, 8, width - labelWidth - 8);
    const ly = box.cy + box.h / 2 + 10;
    if (!narrow.matches && ly + label.length * 9 < height - 8) {
      g.fillStyle = `rgba(${colors.ink}, ${(0.86 * alpha).toFixed(3)})`;
      label.forEach((line, k) => g.fillText(line, Math.round(lx), Math.round(ly) + k * 9 + 8 * EM_TOP));
      g.strokeStyle = `rgba(${colors.ink}, ${(0.22 * alpha).toFixed(3)})`;
      g.beginPath();
      g.moveTo(p.x, p.y + s);
      g.lineTo(lx + labelWidth / 2, ly - 2);
      g.stroke();
    }
    const targets = [];
    const blind = Boolean(worm?.inner());
    if (!blind && now - focus.at < FOCUS_MS) targets.push({ x: focus.x, y: focus.y });
    if (!blind && finePointer.matches && pointer.x >= 0 && now - pointer.at < POINTER_MS) targets.push({ x: pointer.x, y: pointer.y });
    for (const aimed of targets) {
      const target = lost > 0.01 ? { x: aimed.x + t.lost[0] * 70 * lost, y: aimed.y + t.lost[1] * 45 * lost } : aimed;
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(dx ? (11 * len) / Math.abs(dx) : Infinity, dy ? (7 * len) / Math.abs(dy) : Infinity, len);
      g.lineCap = "round";
      g.setLineDash([3, 4]);
      g.lineDashOffset = reduced.matches ? 0 : -now / 45;
      g.strokeStyle = `rgba(${colors.accent}, ${(0.35 * alpha).toFixed(3)})`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(target.x - (dx / len) * k, target.y - (dy / len) * k);
      g.stroke();
      g.setLineDash([]);
      g.lineCap = "butt";
      g.lineWidth = 0.75;
      g.strokeStyle = `rgba(${colors.ink}, ${(0.45 * alpha).toFixed(3)})`;
      g.strokeRect(Math.round(target.x - 11) + 0.5, Math.round(target.y - 7) + 0.5, 22, 14);
    }
  }

  function stepEye(box, now, dt) {
    const t = eye;
    const lost = worm ? worm.infection(now) : 0;
    if (lost > 0.01 && now >= t.lostAt) {
      t.lost = [between(-1, 1), between(-1, 1)];
      t.lostAt = now + between(160, 620);
    }
    const phone = !finePointer.matches;
    const wanted = box && (!phone || now - lastTouch > PHONE_IDLE_MS || summoned) && now >= t.reopenAt;
    if (wanted && (t.state === "closed" || t.state === "closing")) {
      t.state = "opening";
      t.lid.target = 1;
      t.lid.response = 0.45;
    } else if (!wanted && (t.state === "open" || t.state === "opening")) {
      t.state = "closing";
      t.lid.target = 0;
      t.lid.response = 0.3;
    }
    if (t.state === "opening" && t.lid.value > 0.97) t.state = "open";
    if (t.state === "closing" && t.lid.value < 0.01) t.state = "closed";
    const blind = Boolean(worm?.inner());
    const hasFocus = !blind && now - focus.at < FOCUS_MS;
    const hunting = !blind && !phone && pointer.x >= 0 && now - pointer.at < POINTER_MS;
    const seen = blind || hasFocus || hunting ? null : worm?.noticed(now);
    const aimAt = hasFocus ? [focus.x, focus.y] : hunting ? [pointer.x, pointer.y] : seen ? [seen.x, seen.y] : null;
    if (hasFocus && (!t.locked || Math.hypot(focus.x - t.locked[0], focus.y - t.locked[1]) > 60)) t.pulseUntil = now + IRIS_ZOOM.pulseMs;
    t.locked = hasFocus ? [focus.x, focus.y] : null;
    if (box) {
      const far = aimAt ? Math.hypot(aimAt[0] - box.cx, aimAt[1] - box.cy) / IRIS_ZOOM.span : 0;
      t.iz.target = now < t.pulseUntil ? IRIS_ZOOM.pulse : hasFocus ? IRIS_ZOOM.locked : clamp(IRIS_ZOOM.near + far, IRIS_ZOOM.near, IRIS_ZOOM.far);
      t.gx.target = aimAt ? clamp((aimAt[0] - box.cx) / 360, -1, 1) : 0.25 * Math.sin(now / 2300);
      t.gy.target = aimAt ? clamp((aimAt[1] - box.cy) / 260, -1, 1) : 0.2 * Math.sin(now / 1700);
      if (lost > 0.01) {
        t.gx.target += (t.lost[0] - t.gx.target) * lost;
        t.gy.target += (t.lost[1] * 0.8 - t.gy.target) * lost;
        t.iz.target += (IRIS_ZOOM.near + (IRIS_ZOOM.far - IRIS_ZOOM.near) * (0.5 + 0.5 * Math.sin(now / 170) * Math.cos(now / 430)) - t.iz.target) * lost;
      }
    }
    t.dil.target = hasFocus ? 0.25 : seen ? 0.12 : 0.5 + 0.2 * Math.sin(now / 1430);
    if (lost > 0.01) t.dil.target += (0.1 + 0.8 * (0.5 + 0.5 * Math.sin(now / 240)) - t.dil.target) * lost;
    let moving = !advance(t.lid, dt);
    for (const s of [t.iz, t.gx, t.gy, t.dil]) if (!advance(s, dt)) moving = true;
    t.spin += dt * (reduced.matches ? 0 : hasFocus ? 0.5 : 0.12);
    if (!reduced.matches && t.state === "open" && now >= t.nextBlinkAt) {
      t.blinkAt = now;
      t.nextBlinkAt = now + (lost > 0.3 ? between(700, 1600) : between(2600, 6400));
    }
    const blink = now - t.blinkAt < 170 ? Math.sin(((now - t.blinkAt) / 170) * Math.PI) : 0;
    t.openNow = clamp(t.lid.value, 0, 1) * (1 - 0.96 * blink);
    return moving || t.state !== "closed";
  }

  function tick(now) {
    raf = 0;
    if (document.hidden) {
      last = 0;
      return;
    }
    const dt = last ? clamp((now - last) / 1000, 0, 0.1) : 1 / 60;
    if (last && now - last < 30 && desk.vis.value < 0.01) {
      raf = requestAnimationFrame(tick);
      return;
    }
    last = now;
    g.clearRect(0, 0, width, height);
    const box = eyeBox();
    const eyeBusy = stepEye(box, now, dt);
    const wormBusy = worm ? worm.step(now, eyeRect(box), box) : false;
    const redBusy = stepRed(dt, now) || Boolean(summoned && !summoned.started);
    worm?.drawBody(g, now);
    const repairBusy = drawRepair(now);
    if (box && eye.openNow > 0.001) drawEye(box, now);
    worm?.drawRadar(g, now, width);
    const zap = worm?.zap(now);
    if (zap) drawZap(zap);
    const deskBusy = drawDesk(now, dt);
    report(now);
    if (eyeBusy || deskBusy || wormBusy || repairBusy || redBusy) raf = requestAnimationFrame(tick);
    else last = 0;
  }

  function wake() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
  }

  function report(now) {
    if (!onState) return;
    const crawler = worm ? worm.describe(now) : { text: "gone", hot: false, label: null };
    const lost = worm ? worm.infection(now) : 0;
    const sight = eye.state === "closed" ? "closed" : worm?.inner() || lost > 0.6 ? "NaN" : now - focus.at < FOCUS_MS ? "focused" : "tracking";
    const next = [crawler.text, crawler.hot, crawler.label, sight, repairing].join("|");
    if (next === stateKey) return;
    stateKey = next;
    onState({ worm: crawler, eye: { text: sight, hot: sight === "NaN" }, ghost: repairing ? "repairing" : "idle" });
  }

  const onMove = (event) => {
    if (event.pointerType !== "mouse") {
      lastTouch = performance.now();
      return;
    }
    const over = Boolean(worm && !summoned && worm.hit(event.clientX, event.clientY));
    if (over !== hovering) {
      hovering = over;
      document.documentElement.style.cursor = over ? "pointer" : "";
    }
    if (pointer.x >= 0) {
      pointer.drift[0] += (event.clientX - pointer.x) * 0.35;
      pointer.drift[1] += (event.clientY - pointer.y) * 0.35;
    }
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.at = performance.now();
    desk.lastAt = pointer.at;
    desk.mode = "mouse";
    wake();
  };
  const onDown = (event) => {
    if (worm && !summoned && !event.target?.closest?.(".den, .lb") && worm.hit(event.clientX, event.clientY)) {
      const now = performance.now();
      summoned = { at: now, started: worm.summon(now) };
      hovering = false;
      document.documentElement.style.cursor = "";
      wake();
    }
    if (event.pointerType !== "mouse") {
      lastTouch = performance.now();
      return;
    }
    if (kb) kb.clicks[event.button === 2 ? 1 : 0] = performance.now() + 160;
    desk.lastAt = performance.now();
    desk.mode = "mouse";
    wake();
  };
  const onTouch = () => {
    lastTouch = performance.now();
    wake();
  };
  const onLeave = () => {
    pointer.at = -Infinity;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("touchstart", onTouch, { passive: true });
  window.addEventListener("scroll", onTouch, { passive: true, capture: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", wake);
  const resizeObserver = new ResizeObserver(() => layout());
  resizeObserver.observe(deskHost);
  navigator.keyboard
    ?.getLayoutMap?.()
    .then((map) => {
      layoutMap = map;
      layout();
    })
    .catch(() => {});
  recolor();
  resize();
  const idleCheck = setInterval(wake, 1500);
  const repairCheck = setInterval(repair, REPAIR.every);

  return {
    pressKey,
    pressChar,
    focus: setFocus,
    setText,
    recolor,
    setWorm(on) {
      const now = performance.now();
      if (on) worm?.wake(now);
      else worm?.sleep(now);
      wake();
    },
    destroy() {
      cancelAnimationFrame(raf);
      clearInterval(idleCheck);
      clearInterval(repairCheck);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("resize", resize);
    },
  };
}
