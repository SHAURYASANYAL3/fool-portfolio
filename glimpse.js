import { prefersStill, onWidthResize, rng } from "/intros/shared/common.js";

const FONT_PX = 12;
const CELL_W = 7.2;
const CELL_H = 13;
const cellX = (c) => Math.round(c * CELL_W);
const TILE_COLS = 40;
const TILE_ROWS = 13;
const SEED_MS = 280;
const FACE_HOLD_MS = 6000;
const TEMPO = 0.5;
const CYCLE = { first: [700, 1100], gap: [1000, 1000], pause: [1000, 1000], retry: 4000, restart: 7000, touchRestart: 3000 };
let INK = "235, 230, 219";
let BG = "#050505";
const GLYPHS = "░▒▓/\\<>+=*#%&@$0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const TICK_MS = 50;
const VANISH = [8, 28];
const EDIT_ALPHA = 0.95;
const MESSAGE_ALPHA = 0.97;
const MESSAGES = [
  ["i build", "the things", "i want to use."],
  ["and make them", "feel like somewhere", "i want to be."],
];
const MSG_MX = 6;
const MSG_MY = 6;
const MSG_MY_FACE = 11;
const NEAR_KEYS = { ";": ":", ":": ";", "(": "[", ")": "]", "[": "(", "]": ")", "{": "[", "}": "]", "=": "-", "-": "=", ".": ",", ",": ".", '"': "'", "'": '"', "<": ",", ">": ".", "_": "-", "/": "?", "+": "=", "*": "8", "&": "7", "!": "1", "?": "/" };
const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];
const GUTTER = 5;
const KIND_ALPHA = { keyword: 0.75, string: 0.66, number: 0.75, function: 0.79, type: 0.7, comment: 0.48, member: 0.35, ident: 0.31, punct: 0.26 };
const KIND_TINT = { keyword: "keyword", string: "string", number: "number", function: "function", type: "type", comment: "comment", member: "member", ident: "ident", punct: "punct" };
const KEYWORDS = new Set("import property readonly required default signal alias var let const function return if else for while do switch case break continue new delete typeof instanceof in of true false null undefined this root parent id on async await class extends static local then elseif end nil and or not repeat until struct enum typedef sizeof unsigned signed int long short char float double void bool static_assert goto extern inline export interface type def module require include extend self super yield try catch finally throw throws raise rescue ensure unless begin public private protected internal override virtual abstract namespace using fun val package object companion lambda with as from is elif except pass None True False nameof get set".split(" "));
const COMMENT = { qml: "//", js: "//", c: "//", lua: "--", ruby: "#", shell: "#", python: "#", text: null };
const MONO = { name: "", accent: "#ebe6db", bg: "#050505", fg: "#ebe6db", kinds: { keyword: "#ebe6db", string: "#ebe6db", number: "#ebe6db", function: "#ebe6db", type: "#ebe6db", comment: "#ebe6db", text: "#ebe6db" } };
const NOTE_TEXT = "// systems, developer tools, open source.";
const touchMode = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
// Bump when face.webm / face.mp4 / face-track.json / wall.json change. These files are fetched by script, and browsers can keep old copies of
// script-initiated fetches even through a hard refresh; a new ?v= makes the old cache entries unreachable.
const ASSET_V = "20261123-orig-face";
const FACE_FONT_PX = 5.5;
const EM_TOP = 1025 / 1300;
const GLYPH_Y = 1 + FONT_PX * EM_TOP;
const FACE_TONE = { floor: 0.06, range: 0.84, gamma: 1.3, bold: 0.55, base: 0.03 };
const EYE = { upper: 0.47, lower: 0.37, iris: 0.33, reach: 0.5, rise: 0.14 };
const IRIS_ZOOM = { response: 0.8, near: 0.92, far: 1.15, span: 2000, locked: 0.9, pulse: 1.12, pulseMs: 320 };
const DEFAULT_THEME = "blackmoney";
const FROST = { blur: 1.6, tint: 0.85, ms: 250 };
const FINE_W = FACE_FONT_PX * 0.6;
const FINE_H = FACE_FONT_PX * 1.08;
const EYE_TONE = { floor: 0.04, range: 0.9, gamma: 1.2, base: 0.05, bold: 0.55 };
const KEY_EDGE = 18;
const KEY_SCALES = [1, 0.9, 0.8, 0.7, 0.62];
const TYPE_FOCUS_MS = 1400;
const POINTER_LOCK_MS = 2500;
const DIVE = { count: 6000, phone: 3000, buckets: 10, ms: 1700 };
const VIEW = { cols: 112, top: 0.12, min: 18, ramp: 2 };
const BOOT = { command: "nvim ~/Projects", blinks: 3, reveal: 700 };
const EDIT = { scrolloff: 3, wipe: [4, 12] };
const VISITOR_IDLE_MS = 5000;
const OBJECT_DWELL = 900;
const OBJECT_LIFE = 9000;
const RUNS = {};
const RUN_MS = 4000;
const OBJECT_OF = {};
const OBJECT_GLYPHS = "╭╮╰╯─│┤├▔▀▄▌▐▓▒░▁▂▃▅▆·•°◊‹›→↻≈^";
const TONES = {
  hi: [0.92, "text"],
  mid: [0.6, "text"],
  lo: [0.36, "text"],
  dim: [0.2, "text"],
  key: [0.88, "keyword"],
  str: [0.84, "string"],
  num: [0.88, "number"],
  fn: [0.88, "function"],
  type: [0.84, "type"],
  com: [0.5, "comment"],
  acc: [0.95, "accent"],
};
const KEY_CODES = [
  ["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal"],
  ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash"],
  ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"],
  ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"],
];
const KEY_STAGGER = [0, 1.5, 1.8, 2.3];
const US_KEYS = "`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./";
const US_SHIFTED = { "~": "`", "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", "_": "-", "+": "=", "{": "[", "}": "]", "|": "\\", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/" };
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

const wallCanvas = document.querySelector(".wall");
const tileCanvas = document.querySelector(".tile");
const machineCanvas = document.querySelector(".machine");
const zoneNodes = [".brand", ".switch", ".enter", ".note", ".theme-key"].map((selector) => document.querySelector(selector));
const enterLink = document.querySelector(".enter");
const themeKey = document.querySelector(".theme-key");
const statusLine = document.querySelector(".status");
const cmdLine = document.querySelector(".cmdline");
const paneStatus = document.querySelector(".pane-status");
const paneCmd = document.querySelector(".pane-cmd");
const glass = document.querySelector(".kb-glass");
const brandLink = document.querySelector(".brand");
const switchNav = document.querySelector(".switch");
const noteLine = document.querySelector(".note");
const sourcesNav = document.querySelector(".sources");
const random = rng(Date.now() % 100000);

let text = "";
let codeText = "";
let codeKinds = [];
let visit = null;
let hover = null;
let hoverTimer = 0;
let dwellTimer = 0;
let leaving = false;
let dive = null;
let wall = null;
let face = null;
let tile = null;
let frame = 0;
let message = null;
let block = null;
let blockFrame = 0;
const director = { token: 0, timer: 0, hush: false };
const boot = { active: false, token: 0 };
let eyeRestUntil = 0;
let object = null;
let objectTimer = 0;
let objectCalmUntil = 0;
let drag = null;
let scrollFrame = 0;
let scrollClock = 0;
let lastScrollAt = -Infinity;
let lastPointerType = "mouse";
let keyboard = null;
let hands = [];
let typing = null;
let visitorSession = null;
let lastVisitorKeyAt = -Infinity;
let layoutMap = null;
let lastStep = 0;
let picker = null;
let unruly = new Set();
let fadeTimer = 0;
const flux = { tick: 0, cells: new Map(), dirty: new Set(), timer: 0 };
const fades = new Map();
const rgbCache = new Map();
const carets = new Set();
const ghost = { token: 0, rows: new Set(), caret: null, edited: new Map(), saved: new Map(), act: false, undo: null, terminal: null, themeShown: false };
const editor = { mode: "NORMAL", row: null, col: 0, shown: false, changes: 0 };
const pointer = { x: -1, y: -1, lastMove: 0, travelled: 0, inside: false };
const touch = { active: false, lastAt: 0, tilt: null, wanderAt: 0, asked: false, unhover: 0 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const between = (a, b) => a + random() * (b - a);
const ri = (a, b) => a + Math.floor(random() * (b - a + 1));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pick = () => GLYPHS[Math.floor(random() * GLYPHS.length)];
const fluxAlpha = () => (random() < 0.24 ? 0.95 : 0.45 + random() * 0.3);
const smooth = (x) => x * x * (3 - 2 * x);

function zones() {
  return zoneNodes.filter((node) => node && node.style.visibility !== "hidden").map((node) => {
    const box = node.getBoundingClientRect();
    return { x0: box.left - CELL_W, y0: box.top, x1: box.right + CELL_W, y1: box.bottom };
  });
}

function measureUnruly(context) {
  const found = new Set();
  for (const ch of new Set([...text, ...GLYPHS, ...MESSAGES.flat().join(""), ...OBJECT_GLYPHS, "│"])) {
    if (ch.trim() === "") continue;
    const m = context.measureText(ch);
    if (GLYPH_Y - m.actualBoundingBoxAscent < 0 || GLYPH_Y + m.actualBoundingBoxDescent > CELL_H || m.actualBoundingBoxLeft > 0.5 || m.actualBoundingBoxRight > CELL_W + 0.5) found.add(ch);
  }
  return found;
}

const rgb = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16)).join(", ");

function lift(hex, light = false) {
  const [r, g, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const floor = light ? Math.min(l, 0.42) : Math.max(l, 0.62);
  if (floor === l) return rgb(hex);
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? 60 * (((g - b) / d + 6) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  const c = (1 - Math.abs(2 * floor - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const m = floor - c / 2;
  return [r1, g1, b1].map((v) => Math.round((v + m) * 255)).join(", ");
}

function planVisit(data, fallback) {
  const files = data?.files?.length ? [...data.files] : [{ repo: "", path: "", url: "", lang: "text", firstLine: 1, lines: (fallback || "engineering with feeling ").match(/.{1,96}/g) }];
  for (let k = files.length - 1; k > 0; k--) {
    const j = Math.floor(random() * (k + 1));
    [files[k], files[j]] = [files[j], files[k]];
  }
  const themes = data?.themes?.length ? data.themes : [MONO];
  const dark = themes.filter((candidate) => !candidate.light);
  const pool = dark.length ? dark : themes;
  const theme = themes.find((candidate) => candidate.name === DEFAULT_THEME) || pool[Math.floor(random() * pool.length)];
  const rowsOf = (file) => {
    const marker = COMMENT[file.lang] || "//";
    const header = file.repo ? [{ text: `${marker} ── ${file.repo}/${file.path} ──`, num: null }, { text: "", num: null }] : [];
    return [...header, ...file.lines.map((line, k) => ({ text: line, num: file.firstLine + k }))].map((row) => ({ ...row, kinds: row.num === null && row.text ? new Array(row.text.length).fill("comment") : tokenize(row.text, file.lang) }));
  };
  const planned = files.map((file) => ({ ...file, count: file.lines.length }));
  const rows = planned.flatMap((file) => rowsOf(file).map((row) => ({ ...row, file })));
  return {
    files: planned,
    stream: { repo: "", path: "", lang: "text", url: "", rows },
    logical: rows.slice(),
    pristine: rows.slice(),
    streamStart: 0,
    themes,
    theme,
  };
}

function luma(hex) {
  const [r, g, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function useTheme(theme) {
  const tints = Object.fromEntries(Object.entries(theme.kinds).map(([kind, hex]) => [kind, rgb(hex)]));
  for (const kind of ["ident", "member", "punct"]) tints[kind] ||= tints.text;
  const bg = theme.bg || "#050505";
  const fg = theme.fg || theme.kinds.text || "#ebe6db";
  const selection = theme.selection || bg;
  const clash = theme.light ? luma(selection) < 0.35 : luma(selection) > 0.45;
  Object.assign(visit, {
    theme,
    tints,
    accent: rgb(theme.accent),
    glow: lift(theme.accent, theme.light),
    note: lift(theme.kinds.comment || fg, theme.light),
    bg,
    ink: rgb(fg),
    cursorline: rgb(theme.cursorline || bg),
    selection: rgb(selection),
    selectionText: theme.selectionText ? rgb(theme.selectionText) : clash ? rgb(bg) : null,
  });
  BG = bg;
  INK = visit.ink;
  const mix = (a, b, t) => `#${[1, 3, 5].map((k) => Math.round(parseInt(a.slice(k, k + 2), 16) * (1 - t) + parseInt(b.slice(k, k + 2), 16) * t).toString(16).padStart(2, "0")).join("")}`;
  document.body.style.setProperty("--bg", bg);
  document.body.style.setProperty("--ink", fg);
  document.body.style.setProperty("--chrome", mix(fg, bg, 0.3));
  document.body.style.setProperty("--dim", theme.kinds.comment || mix(fg, bg, 0.55));
  document.body.style.setProperty("--accent", `rgb(${visit.glow})`);
  document.body.style.setProperty("--line", `rgb(${visit.cursorline})`);
  document.body.style.setProperty("--insert", `rgb(${lift(theme.kinds.string || theme.accent, theme.light)})`);
}

function tokenize(line, lang) {
  const kinds = new Array(line.length).fill("ident");
  const marker = COMMENT[lang];
  const trimmed = line.trimStart();
  if (trimmed.startsWith("/*") || trimmed.startsWith("* ") || trimmed === "*" || trimmed.startsWith("*/")) return kinds.fill("comment");
  const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)(?=\s*\()|([A-Za-z_][A-Za-z0-9_.]*)|(\s+)|([^\sA-Za-z0-9_])/g;
  let m;
  while ((m = re.exec(line))) {
    const [token, str, num, fn, word, ws] = m;
    if (!str && marker && line.startsWith(marker, m.index)) {
      kinds.fill("comment", m.index);
      break;
    }
    const kind = str ? "string" : num ? "number" : fn ? (KEYWORDS.has(fn) ? "keyword" : "function") : word ? (KEYWORDS.has(word) ? "keyword" : /^[A-Z]/.test(word) ? "type" : word.includes(".") ? "member" : "ident") : ws ? "ident" : "punct";
    kinds.fill(kind, m.index, m.index + token.length);
  }
  return kinds;
}

function spring(value, response = 0.35, damping = 1) {
  return { value, target: value, velocity: 0, response, damping };
}

function advance(s, dt) {
  if (prefersStill()) {
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

function columnOf(width) {
  const margin = width <= 380 ? 16 : width <= 800 ? 20 : width <= 1100 ? 36 : 64;
  const inner = Math.min(width - 2 * margin, 1312, Math.round(VIEW.cols * CELL_W));
  return [(width - inner) / 2, (width + inner) / 2];
}

function layoutPanes([from, to]) {
  const start = visit.streamStart;
  return [{ index: 0, c0: from, width: to - from, codeC0: from + GUTTER, codeC1: to - 1, sep: -1, file: visit.stream, fileIndex: 0, start, scroll: spring(start, 0.32, 1), dragging: false }];
}

function rowOf(pane, r) {
  const rows = pane.file.rows;
  return rows[(((pane.start + r) % rows.length) + rows.length) % rows.length];
}

function hiddenCell(c, r) {
  const x = cellX(c);
  const y = r * CELL_H;
  return wall.blocked.some((z) => x + CELL_W > z.x0 && x < z.x1 && y + CELL_H > z.y0 && y < z.y1);
}

function paneRight(pane) {
  return pane.sep >= 0 ? pane.sep : pane.c0 + pane.width - 1;
}

function renderPane(pane, from = 0) {
  const { cols, rows, chars, alphas, tints } = wall;
  const length = pane.file.rows.length;
  pane.start = ((Math.round(pane.scroll.value) % length) + length) % length;
  visit.streamStart = pane.start;
  const right = paneRight(pane);
  const set = (r, c, ch, alpha, tint) => {
    const i = r * cols + c;
    chars[i] = ch;
    alphas[i] = alpha;
    tints[i] = tint;
  };
  for (let r = Math.max(0, from); r < rows; r++) {
    for (let c = pane.c0; c <= right; c++) {
      set(r, c, " ", KIND_ALPHA.ident, visit.tints.text);
      flux.cells.delete(r * cols + c);
      fades.delete(r * cols + c);
    }
    if (r > wall.revealed) continue;
    const { text: line, num, kinds, alpha, tint } = rowOf(pane, r);
    const label = num === null ? "" : String(num).padStart(GUTTER - 1, " ");
    [...label].forEach((ch, k) => ch !== " " && set(r, pane.c0 + k, ch, 0.26, visit.tints.text));
    for (let k = 0; k < line.length && pane.codeC0 + k < pane.codeC1; k++) {
      if (line[k] !== " ") set(r, pane.codeC0 + k, line[k], alpha ?? KIND_ALPHA[kinds[k]], tint ?? visit.tints[KIND_TINT[kinds[k]]]);
    }
    if (pane.sep >= 0) set(r, pane.sep, "│", 0.16, visit.tints.text);
    for (let c = pane.c0; c <= right; c++) {
      if (hiddenCell(c, r)) chars[r * cols + c] = " ";
    }
  }
  updateStatus();
}

function chromeRow() {
  return Math.floor(Math.min(wall.height, ...[noteLine, enterLink, themeKey].filter(Boolean).map((node) => node.getBoundingClientRect().top)) / CELL_H);
}

function bandFor(floor) {
  return [Math.round(wall.rows * VIEW.top), floor - 4];
}

function setBand() {
  const { rows } = wall;
  const [top, lowest] = bandFor(keyboard?.fits ? keyboard.topRow : chromeRow());
  const bottom = Math.max(top + 8, lowest);
  wall.band = [top, bottom];
  wall.fade = Array.from({ length: rows }, (_, r) => {
    const k = clamp(Math.min(r - top + 1, bottom - r + 1) / VIEW.ramp, 0, 1);
    return k * k * (3 - 2 * k);
  });
}

function placeStatus() {
  if (!wall) return;
  const pane = wall.panes[0];
  const c0 = wall.span[0];
  const c1 = pane && pane.sep >= 0 ? pane.sep : wall.span[1];
  const on = wall.revealed === Infinity;
  [[statusLine, 1], [cmdLine, 2]].forEach(([node, k]) => {
    if (!node) return;
    Object.assign(node.style, { left: `${cellX(c0)}px`, top: `${(wall.band[1] + k) * CELL_H}px`, width: `${cellX(c1) - cellX(c0)}px` });
    node.classList.toggle("is-on", on);
  });
  const t = ghost.terminal;
  const inner = Boolean(t?.nvim) && pane?.sep >= 0;
  [[paneStatus, 1], [paneCmd, 2]].forEach(([node, k]) => {
    if (!node) return;
    if (inner) Object.assign(node.style, { left: `${cellX(t.c0 + 1)}px`, top: `${(wall.band[1] + k) * CELL_H}px`, width: `${cellX(Math.min(wall.cols, t.c0 + t.W)) - cellX(t.c0 + 1)}px` });
    node.classList.toggle("is-on", inner);
  });
  updateStatus();
}

function updateStatus() {
  if (!statusLine || !wall?.panes.length) return;
  const pane = wall.panes[0];
  let row = editor.shown ? editor.row : null;
  const col = row ? editor.col : 0;
  for (let r = wall.band[0]; r <= wall.band[1] && !row; r++) {
    const candidate = rowOf(pane, r);
    if (candidate.num !== null && candidate.file?.repo) row = candidate;
  }
  if (!row?.file?.repo || row.num === null) return;
  const { file } = row;
  const at = row.num - file.firstLine + 1;
  const share = at <= 1 ? "Top" : at >= file.count ? "Bot" : `${Math.floor((at / file.count) * 100)}%`;
  const place = `${row.num}:${col + 1}   ${share}`;
  const room = Math.floor(statusLine.clientWidth / CELL_W) - editor.mode.length - place.length - 6;
  const text = `${fitPath(`~/Projects/${file.repo}/${file.path}`, room)}|${place}`;
  if (statusLine.dataset.text === text) return;
  statusLine.dataset.text = text;
  const [path, pos] = text.split("|");
  statusLine.querySelector(".path").textContent = path;
  statusLine.querySelector(".pos").textContent = pos;
}

function ghostBusy() {
  return ghost.act || ghost.rows.size > 0 || ghost.saved.size > 0;
}

function indentOf(row) {
  return row.text.length - row.text.trimStart().length;
}

function screenRow(row) {
  const pane = wall?.panes[0];
  if (!pane || !row) return -1;
  const rows = pane.file.rows;
  const index = rows.indexOf(row);
  if (index < 0) return -1;
  const r = (((index - pane.start) % rows.length) + rows.length) % rows.length;
  return r < wall.rows ? r : -1;
}

function renumber(file) {
  const rows = visit.stream.rows;
  let k = rows.findIndex((row) => row.file === file);
  if (k < 0) return;
  let n = file.firstLine;
  for (; k < rows.length && rows[k].file === file; k++) if (rows[k].num !== null) rows[k].num = n++;
  file.count = n - file.firstLine;
}

function spliceRows(index, remove, insert = []) {
  const pane = wall.panes[0];
  const rows = pane.file.rows;
  const top = rows[pane.start];
  const files = new Set([...rows.slice(index, index + remove), ...insert].map((row) => row.file));
  rows.splice(index, remove, ...insert);
  for (const file of files) renumber(file);
  const at = rows.indexOf(top);
  if (at < 0) return;
  pane.scroll.value = pane.scroll.target = pane.start = at;
  pane.scroll.velocity = 0;
  visit.streamStart = at;
}

function resetBuffer(saved = visit.pristine) {
  const rows = visit.stream.rows;
  const top = rows[visit.streamStart];
  rows.splice(0, rows.length, ...saved);
  for (const file of visit.files) renumber(file);
  const at = rows.indexOf(top);
  if (at >= 0) visit.streamStart = at;
  const pane = wall?.panes[0];
  if (!pane) return;
  pane.scroll.value = pane.scroll.target = pane.start = visit.streamStart;
  pane.scroll.velocity = 0;
}

function wrapRows(rows, room) {
  if (room < 16) return rows.slice();
  const out = [];
  for (const row of rows) {
    const text = row.text.trimEnd();
    if (text.length <= room) {
      out.push(row);
      continue;
    }
    const indent = Math.min(indentOf(row), Math.floor(room / 3));
    let head = null;
    let start = 0;
    while (start < text.length) {
      const lead = head ? indent : 0;
      const width = room - lead;
      let end = Math.min(text.length, start + width);
      if (end < text.length) {
        const cut = text.lastIndexOf(" ", end);
        if (cut > start + width * 0.4) end = cut + 1;
      }
      const piece = { text: " ".repeat(lead) + text.slice(start, end), kinds: [...new Array(lead).fill("ident"), ...row.kinds.slice(start, end)] };
      if (head) out.push({ ...row, ...piece, num: null, cont: head });
      else out.push((head = { ...row, ...piece }));
      start = end;
      while (text[start] === " ") start++;
    }
  }
  return out;
}

function lastOf(row) {
  const rows = visit.stream.rows;
  let k = rows.indexOf(row);
  while (k >= 0 && rows[k + 1]?.cont === row) k++;
  return k >= 0 ? rows[k] : row;
}

function fitPath(path, room) {
  if (room < 8 || path.length <= room) return path;
  const parts = path.split("/");
  for (let k = 1; k < parts.length - 1 && parts.join("/").length > room; k++) parts[k] = parts[k][0];
  const short = parts.join("/");
  return short.length <= room ? short : `<${short.slice(short.length - room + 1)}`;
}

function redraw(from = 0) {
  const pane = wall.panes[0];
  renderPane(pane, from);
  repaint(pane.c0, Math.max(0, from), paneRight(pane), wall.rows - 1);
}

function showCursor() {
  if (!wall?.panes.length) return false;
  const pane = wall.panes[0];
  const r = screenRow(editor.row);
  const c = pane.codeC0 + editor.col;
  const ok = r >= wall.band[0] && r <= wall.band[1] && c < pane.codeC1 && !boot.active && !leaving && !visitorSession && !picker && !inObject(c, r);
  const caret = ghostCaret();
  caret.block = editor.mode !== "INSERT";
  if (ok) placeCaret(caret, r, c, true);
  else if (caret.on) placeCaret(caret, caret.r, caret.c, false);
  editor.shown = ok;
  updateStatus();
  return ok;
}

function hideCursor() {
  editor.shown = false;
  if (wall && ghost.caret?.on) placeCaret(ghost.caret, ghost.caret.r, ghost.caret.c, false);
  updateStatus();
}

function homeCursor() {
  const pane = wall.panes[0];
  for (let r = wall.band[0] + 1; r <= wall.band[1]; r++) {
    const row = rowOf(pane, r);
    if (row.num === null || !row.file?.repo) continue;
    editor.row = row;
    editor.col = indentOf(row);
    break;
  }
  showCursor();
}

function setMode(mode) {
  editor.mode = mode;
  const label = statusLine?.querySelector(".mode");
  if (label) label.textContent = mode;
  statusLine?.classList.toggle("is-insert", mode === "INSERT");
  if (ghost.caret) ghost.caret.block = mode !== "INSERT";
}

function cmdSay(text) {
  if (!cmdLine) return;
  cmdLine.querySelector(".cmd").textContent = text;
  cmdLine.classList.remove("is-typing");
}

function cmdKeys(text) {
  const node = cmdLine?.querySelector(".showcmd");
  if (node) node.textContent = text;
}

async function cmdType(command, alive, { pace = 1, line = cmdLine, from = wall.span[0] } = {}) {
  const node = line?.querySelector(".cmd");
  const r = wall.band[1] + 2;
  const stop = () => {
    if (node) node.textContent = "";
    line?.classList.remove("is-typing");
    return false;
  };
  if (node) node.textContent = "";
  line?.classList.add("is-typing");
  for (let n = 0; n < command.length; n++) {
    await sleep(keyDelay(command[n], pace));
    if (!alive()) return stop();
    pressChar(command[n]);
    if (node) node.textContent = command.slice(0, n + 1);
    typing = { r, c: from + n + 1, at: performance.now() };
  }
  await sleep(beat(180, 340));
  if (!alive()) return stop();
  pressKey("Enter");
  line?.classList.remove("is-typing");
  return true;
}

async function normalKeys(keys, alive) {
  for (let n = 0; n < keys.length; n++) {
    await sleep(keyDelay(keys[n], 1.3));
    if (!alive()) {
      cmdKeys("");
      return false;
    }
    pressChar(keys[n]);
    cmdKeys(n < keys.length - 1 ? keys.slice(0, n + 1) : "");
  }
  return true;
}

async function bootView() {
  const token = ++boot.token;
  const alive = () => token === boot.token && Boolean(wall);
  if (prefersStill() || !wall?.panes.length) {
    finishBoot();
    return;
  }
  boot.active = true;
  wall.revealed = -1;
  const pane = wall.panes[0];
  pane.scroll.value = pane.scroll.target = -wall.band[0];
  renderPane(pane);
  const row = wall.band[0];
  const col = writePrompt(row, pane.c0 + 1, "~");
  repaint(0, 0, wall.cols - 1, wall.rows - 1);
  placeStatus();
  const caret = makeCaret();
  caret.block = true;
  const typed = (await blinkAt(caret, row, col, BOOT.blinks, alive)) && (await typeInto(caret, row, col, [...BOOT.command], { alpha: 0.92, glow: true, alive, typos: 0 })) && (await blinkAt(caret, row, col + BOOT.command.length, 1, alive));
  dropCaret(caret);
  if (!typed || !alive()) return;
  pressKey("Enter");
  await sleep(220);
  const [top, bottom] = wall.band;
  for (let r = top; r <= bottom; r++) {
    if (!alive()) return;
    wall.revealed = r;
    renderPane(pane);
    repaint(pane.c0, top, pane.c0 + pane.width - 1, r);
    await sleep(BOOT.reveal / (bottom - top + 1));
  }
  if (alive()) finishBoot();
}

function finishBoot() {
  boot.token++;
  boot.active = false;
  if (wall) {
    wall.revealed = Infinity;
    for (const pane of wall.panes) renderPane(pane);
    repaint(0, 0, wall.cols - 1, wall.rows - 1);
    placeStatus();
    homeCursor();
    refreshHover();
  }
  scheduleCycle(between(...CYCLE.first));
}

function renderWall() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = wallCanvas.clientWidth;
  const height = wallCanvas.clientHeight;
  wallCanvas.width = Math.round(width * dpr);
  wallCanvas.height = Math.round(height * dpr);
  tileCanvas.width = Math.round(width * dpr);
  tileCanvas.height = Math.round(height * dpr);
  tileCanvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
  tileCanvas.style.display = "none";
  lastStep = 0;
  const context = wallCanvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.fillStyle = BG;
  context.fillRect(0, 0, width, height);
  context.font = `${FONT_PX}px "Plex Mono", monospace`;
  context.textBaseline = "alphabetic";
  unruly = measureUnruly(context);
  const cols = Math.floor(width / CELL_W);
  const rows = Math.floor(height / CELL_H);
  const [left, right] = columnOf(width);
  const span = [Math.ceil(left / CELL_W), Math.floor(right / CELL_W)];
  if (brandLink) brandLink.style.left = `${cellX(span[0] + 5)}px`;
  if (switchNav) switchNav.style.right = `${Math.round(width - cellX(span[1] - 5))}px`;
  if (enterLink) {
    const size = Math.round(enterLink.getBoundingClientRect().width / CELL_W);
    enterLink.style.left = `${(span[1] - 5 - size) * CELL_W}px`;
    enterLink.style.top = `${(rows - 3) * CELL_H}px`;
  }
  let groupStart = enterLink ? span[1] - 5 - Math.round(enterLink.getBoundingClientRect().width / CELL_W) : span[1];
  if (themeKey) {
    groupStart -= 2 + Math.round(themeKey.getBoundingClientRect().width / CELL_W);
    themeKey.style.left = `${Math.round(groupStart * CELL_W)}px`;
    themeKey.style.top = `${(rows - 3) * CELL_H}px`;
  }
  let noteRoom = span[1] - span[0] - 10;
  if (noteLine) {
    const noteEnd = span[0] + 5 + NOTE_TEXT.length + 1;
    const enterStart = groupStart;
    noteRoom = enterStart - span[0] - 7;
    noteLine.style.left = `${cellX(span[0] + 5)}px`;
    noteLine.style.top = `${(rows - 3) * CELL_H}px`;
    noteLine.style.bottom = "auto";
    noteLine.style.visibility = noteEnd + 2 > enterStart ? "hidden" : "";
  }
  const size = cols * rows;
  if (boot.active) {
    boot.token++;
    boot.active = false;
    scheduleCycle(between(...CYCLE.first));
  }
  visit.pristine = wrapRows(visit.logical, span[1] - 1 - span[0] - GUTTER);
  resetBuffer();
  wall = { context, cols, rows, span, fade: new Array(rows).fill(0), band: [0, rows - 1], revealed: Infinity, chars: new Array(size).fill(" "), alphas: new Array(size).fill(KIND_ALPHA.ident), tints: new Array(size).fill(visit.tints.text), blocked: zones(), width, height, panes: [], noteRoom };
  flux.cells.clear();
  flux.dirty.clear();
  fades.clear();
  message = null;
  object = null;
  clearInterval(objectTimer);
  objectTimer = 0;
  hover = null;
  clearTimeout(dwellTimer);
  dwellTimer = 0;
  drag = null;
  typing = null;
  dropVisitor();
  carets.clear();
  ghost.token++;
  ghost.rows.clear();
  ghost.caret = null;
  ghost.edited.clear();
  ghost.saved.clear();
  ghost.act = false;
  ghost.undo = null;
  ghost.terminal = null;
  editor.shown = false;
  if (!visit.stream.rows.includes(editor.row)) editor.row = null;
  setMode("NORMAL");
  cmdSay("");
  cmdKeys("");
  wall.panes = layoutPanes(span);
  layoutKeyboard();
  setBand();
  for (const pane of wall.panes) renderPane(pane);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) drawCell(context, c, r);
  }
  setNote(null);
  listSources();
  placeStatus();
  showCursor();
  if (picker) refreshPicker();
  loop();
}

function listSources() {
  if (!sourcesNav) return;
  const seen = new Set();
  const list = document.createElement("ul");
  for (const file of visit.files) {
    const { repo, path, url } = file;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = url;
    link.textContent = `${repo}/${path}`;
    item.append(link);
    list.append(item);
  }
  sourcesNav.replaceChildren(list);
}

function busyRows() {
  const rows = new Set();
  const span = (from, count) => {
    for (let r = from; r < from + count; r++) rows.add(r);
  };
  for (const row of message?.rows || []) {
    const said = screenRow(row);
    if (said >= 0) rows.add(said);
  }
  if (block) span(block.at.row, block.at.rows);
  if (object) span(object.r0, object.h);
  if (tile) {
    span(tile.row, tile.rows);
    if (tile.painted) span(tile.painted[1], tile.painted[3] - tile.painted[1] + 1);
  }
  for (const r of visitorSession?.saved.keys() || []) rows.add(r);
  if (picker?.at) span(picker.at.r0, picker.at.H);
  return rows;
}

function drawGlyph(context, c, r, ch, alpha, tint = INK) {
  if (!ch || ch === " " || alpha < 0.004) return;
  context.fillStyle = `rgba(${tint}, ${alpha.toFixed(3)})`;
  if (!unruly.has(ch)) {
    context.fillText(ch, cellX(c), r * CELL_H + GLYPH_Y);
    return;
  }
  context.save();
  context.beginPath();
  context.rect(cellX(c), r * CELL_H, cellX(c + 1) - cellX(c), CELL_H);
  context.clip();
  context.fillText(ch, cellX(c), r * CELL_H + GLYPH_Y);
  context.restore();
}

function blockRadii() {
  const grow = clamp(block.grow.value, 0, 1);
  const { at } = block;
  return [(at.w / 2) * grow ** 0.45, (at.h / 2) * grow ** 1.6];
}

function blockCenter() {
  const { at } = block;
  return [at.x + at.w / 2, (at.seed + 0.5) * CELL_H];
}

function holeAt(x, y) {
  if (!block || block.grow.value <= 0.001) return 0;
  const [rx, ry] = blockRadii();
  const [ox, oy] = blockCenter();
  const d = Math.hypot((x - ox) / rx, (y - oy) / ry);
  return clamp((1 - d) / 0.32, 0, 1);
}

function inObject(c, r) {
  return Boolean(object) && r >= object.r0 && r < object.r0 + object.h && c >= object.c0 && c < object.c0 + object.w;
}

function lit(c, r) {
  if (hover && hover.r === r && c >= hover.pane.c0 && c < hover.pane.codeC1 && !inObject(c, r)) return true;
  if (tile?.state === "seed" && r === tile.line && c >= tile.col && c < tile.col + TILE_COLS) return true;
  return Boolean(block) && block.phase === "seed" && r === block.at.seed && c >= block.at.col && c < block.at.col + block.at.cols;
}

function bars() {
  const list = [];
  if (picker?.at && picker.items.length) list.push([picker.at.r0 + 3 + picker.index - picker.top, picker.at.c0 + 1, picker.at.c0 + picker.at.W - 1]);
  if (hover && !(object && object.pane === hover.pane && hover.r >= object.r0 && hover.r < object.r0 + object.h)) list.push([hover.r, hover.pane.c0, hover.pane.codeC1]);
  if (tile?.state === "seed") list.push([tile.line, tile.col, tile.col + TILE_COLS]);
  if (block?.phase === "seed") list.push([block.at.seed, block.at.col, block.at.col + block.at.cols]);
  return list;
}

function rgbOf(tint) {
  let value = rgbCache.get(tint);
  if (!value) {
    value = tint.split(",").map(Number);
    rgbCache.set(tint, value);
  }
  return value;
}

function addFade(i, tint, alpha, duration) {
  if (prefersStill()) return;
  fades.set(i, { at: performance.now(), duration, rgb: rgbOf(tint), alpha });
  if (!fadeTimer) fadeTimer = setInterval(fadeTick, 40);
}

function fadeTick() {
  const now = performance.now();
  for (const [i, fade] of fades) {
    flux.dirty.add(i);
    if (now - fade.at >= fade.duration) fades.delete(i);
  }
  flushDirty();
  if (!fades.size) {
    clearInterval(fadeTimer);
    fadeTimer = 0;
  }
}

function drawCell(context, c, r) {
  const i = r * wall.cols + c;
  const dim = (block ? 1 - 0.92 * holeAt(cellX(c) + CELL_W / 2, r * CELL_H + CELL_H / 2) : 1) * wall.fade[r];
  if (dim <= 0.004) return;
  const entry = flux.cells.get(i);
  if (entry) {
    drawGlyph(context, c, r, entry.glyph, entry.alpha * dim);
    return;
  }
  let alpha = wall.alphas[i];
  let tint = wall.tints[i];
  const fade = fades.get(i);
  if (fade) {
    const k = 1 - (1 - clamp((performance.now() - fade.at) / fade.duration, 0, 1)) ** 2;
    const to = rgbOf(tint);
    tint = fade.rgb.map((v, n) => Math.round(v + (to[n] - v) * k)).join(", ");
    alpha = fade.alpha + (alpha - fade.alpha) * k;
  }
  if (lit(c, r)) alpha = Math.min(0.95, alpha * 2.4 + 0.1);
  drawGlyph(context, c, r, wall.chars[i], alpha * dim, tint);
}

function clipTo(context, c0, r0, c1, r1) {
  const x0 = cellX(c0);
  const y0 = r0 * CELL_H;
  const w = cellX(c1 + 1) - x0;
  const h = (r1 - r0 + 1) * CELL_H;
  context.save();
  context.beginPath();
  context.rect(x0, y0, w, h);
  context.clip();
  context.fillStyle = BG;
  context.fillRect(x0, y0, w, h);
}

function repaint(c0, r0, c1, r1) {
  const { context, cols, rows } = wall;
  clipTo(context, c0, r0, c1, r1);
  for (const [r, a, b] of bars()) {
    if (r < r0 || r > r1) continue;
    context.fillStyle = `rgba(${visit.cursorline}, ${wall.fade[r].toFixed(3)})`;
    context.fillRect(cellX(a), r * CELL_H, cellX(b) - cellX(a), CELL_H);
  }
  for (let r = Math.max(0, r0 - 2); r <= Math.min(rows - 1, r1 + 1); r++) {
    for (let c = Math.max(0, c0 - 1); c <= Math.min(cols - 1, c1 + 1); c++) drawCell(context, c, r);
  }
  for (const k of carets) {
    if (!k.on || k.r < r0 || k.r > r1 || k.c < c0 || k.c > c1) continue;
    if (k.block) {
      context.fillStyle = `rgba(${visit.accent}, 0.85)`;
      context.fillRect(cellX(k.c), k.r * CELL_H, cellX(k.c + 1) - cellX(k.c), CELL_H);
      drawGlyph(context, k.c, k.r, wall.chars[k.r * wall.cols + k.c], 1, rgb(BG));
      continue;
    }
    context.fillStyle = `rgba(${visit.accent}, 0.95)`;
    context.fillRect(cellX(k.c) + 1, k.r * CELL_H + 1, 1.5, CELL_H - 2);
  }
  context.restore();
}

function morph(i, ch, alpha, ticks, tint) {
  const before = wall.chars[i];
  wall.chars[i] = ch;
  wall.alphas[i] = alpha;
  if (tint) wall.tints[i] = tint;
  if (prefersStill() || ticks <= 0 || (before === " " && ch === " ")) flux.cells.delete(i);
  else flux.cells.set(i, { until: flux.tick + ticks, glyph: pick(), alpha: fluxAlpha() });
  flux.dirty.add(i);
  runFlux();
}

function flicker(i, ticks) {
  if (prefersStill()) return;
  const entry = flux.cells.get(i);
  if (entry && entry.until >= flux.tick + ticks) return;
  flux.cells.set(i, { until: flux.tick + ticks, glyph: pick(), alpha: fluxAlpha() });
  flux.dirty.add(i);
  runFlux();
}

function runFlux() {
  if (!flux.timer) flux.timer = setInterval(fluxTick, TICK_MS);
}

function fluxTick() {
  flux.tick++;
  for (const [i, entry] of flux.cells) {
    if (flux.tick >= entry.until) {
      flux.cells.delete(i);
    } else {
      entry.glyph = pick();
      entry.alpha = fluxAlpha();
    }
    flux.dirty.add(i);
  }
  flushDirty();
  if (!flux.cells.size) {
    clearInterval(flux.timer);
    flux.timer = 0;
  }
}

function flushDirty() {
  if (!flux.dirty.size || !wall) return;
  const spans = new Map();
  for (const i of flux.dirty) {
    const r = Math.floor(i / wall.cols);
    const c = i % wall.cols;
    const span = spans.get(r);
    if (span) {
      span[0] = Math.min(span[0], c);
      span[1] = Math.max(span[1], c);
    } else {
      spans.set(r, [c, c]);
    }
  }
  flux.dirty.clear();
  for (const [r, [c0, c1]] of spans) repaint(c0, r, c1, r);
}

function vanishSpan(r, from, to, range) {
  let longest = 0;
  for (let c = from; c < to; c++) {
    const i = r * wall.cols + c;
    if (wall.chars[i] === " ") continue;
    const ticks = ri(...range);
    longest = Math.max(longest, ticks);
    morph(i, " ", baseAlpha(), ticks);
  }
  flushDirty();
  return longest * TICK_MS;
}

function makeCaret() {
  const caret = { r: -1, c: -1, on: false };
  carets.add(caret);
  return caret;
}

function placeCaret(caret, r, c, on = true) {
  const { r: r0, c: c0, on: was } = caret;
  caret.r = r;
  caret.c = c;
  caret.on = on && c < wall.cols && carets.has(caret);
  if (was && r0 >= 0 && c0 < wall.cols) repaint(c0, r0, c0, r0);
  if (caret.on) repaint(c, r, c, r);
}

function dropCaret(caret) {
  if (!caret) return;
  const was = caret.on;
  caret.on = false;
  carets.delete(caret);
  if (was && wall && caret.r >= 0 && caret.c < wall.cols) repaint(caret.c, caret.r, caret.c, caret.r);
}

async function blinkAt(caret, r, c, times, alive) {
  if (caret === ghost.caret) {
    typing = { r, c, at: performance.now() };
    watch(r, c);
  }
  for (let k = 0; k < times; k++) {
    placeCaret(caret, r, c, true);
    await sleep(beat(380));
    if (!alive()) return false;
    placeCaret(caret, r, c, false);
    await sleep(beat(260));
    if (!alive()) return false;
  }
  placeCaret(caret, r, c, true);
  return true;
}

function put(r, c, ch, alpha, tint = INK) {
  if (c < 0 || c >= wall.cols) return;
  const i = r * wall.cols + c;
  wall.chars[i] = ch;
  wall.alphas[i] = alpha;
  wall.tints[i] = tint;
  flux.cells.delete(i);
  repaint(c, r, c, r);
}

function typoFor(ch) {
  if (NEAR_KEYS[ch]) return NEAR_KEYS[ch];
  const lower = ch.toLowerCase();
  for (const row of KEY_ROWS) {
    const k = row.indexOf(lower);
    if (k < 0) continue;
    const next = row[k + (random() < 0.5 ? -1 : 1)] || row[k - 1] || row[k + 1];
    return ch === lower ? next : next.toUpperCase();
  }
  return null;
}

const beat = (a, b = a) => between(a, b) * TEMPO;

function keyDelay(ch, pace) {
  let ms = between(38, 105);
  if (ch === " ") ms += between(10, 110);
  else if (!/[a-z0-9]/i.test(ch)) ms += between(20, 140);
  if (random() < 0.04) ms += between(220, 560);
  return ms * pace * TEMPO;
}

function typed(r, c, ch) {
  typing = { r, c: c + 1, at: performance.now() };
  pressChar(ch);
}

function erased(r, c) {
  typing = { r, c, at: performance.now() };
  pressKey("Backspace");
}

async function typeInto(caret, r, c, chars, { alpha, alive, pace = 1, typos = 1, onPut = null, tints = null, glow = false }) {
  const tintAt = (n) => (tints ? tints[n] : INK);
  const hot = (col, ch) => glow && ch !== " " && col < wall.cols && addFade(r * wall.cols + col, visit.glow, 0.95, 650);
  if (prefersStill()) {
    chars.forEach((ch, n) => put(r, c + n, ch, alpha, tintAt(n)));
    return true;
  }
  for (let n = 0; n < chars.length; n++) {
    const col = c + n;
    if (col >= wall.cols) break;
    const ch = chars[n];
    const chance = ch === " " ? 0 : /[a-z0-9]/i.test(ch) ? 0.012 : 0.04;
    const wrong = random() < chance * typos ? typoFor(ch) : null;
    if (wrong) {
      const extra = n + 1 < chars.length && chars[n + 1] !== " " && col + 1 < wall.cols && random() < 0.35 ? 1 : 0;
      hot(col, wrong);
      put(r, col, wrong, alpha, tintAt(n));
      typed(r, col, wrong);
      placeCaret(caret, r, col + 1);
      await sleep(keyDelay(wrong, pace));
      for (let e = 1; e <= extra; e++) {
        if (!alive()) return false;
        hot(col + e, chars[n + e]);
        put(r, col + e, chars[n + e], alpha, tintAt(n + e));
        typed(r, col + e, chars[n + e]);
        placeCaret(caret, r, col + e + 1);
        await sleep(keyDelay(chars[n + e], pace));
      }
      if (!alive()) return false;
      await sleep(beat(240, 560));
      for (let e = extra; e >= 0; e--) {
        if (!alive()) return false;
        put(r, col + e, " ", alpha, tintAt(n + e));
        erased(r, col + e);
        placeCaret(caret, r, col + e);
        await sleep(beat(80, 140));
      }
      if (!alive()) return false;
      await sleep(beat(80, 200));
    }
    if (!alive()) return false;
    hot(col, ch);
    put(r, col, ch, alpha, tintAt(n));
    typed(r, col, ch);
    if (glow) watch(r, col + 1);
    if (onPut && ch !== " ") onPut(r, col, n);
    placeCaret(caret, r, col + 1);
    await sleep(keyDelay(ch, pace));
    if (!alive()) return false;
  }
  return true;
}

function rowsTouch(row, rowCount, rows, pad) {
  for (const r of rows) {
    if (r >= row - pad && r < row + rowCount + pad) return true;
  }
  return false;
}

function eyeCol(line, half) {
  const pane = wall.panes[0];
  let end = 0;
  for (let r = line - half; r <= line + half; r++) {
    const extent = lineExtent(r, pane.codeC0, pane.codeC1);
    if (extent) end = Math.max(end, extent[1]);
  }
  const least = Math.round(wall.span[0] + (wall.span[1] - wall.span[0]) * 0.55);
  let col = Math.max(end + 1, least);
  if (ghost.terminal) col = Math.min(col, ghost.terminal.c0 - TILE_COLS - 2);
  return { col: clamp(col, wall.span[0] + 2, Math.max(0, wall.cols - TILE_COLS - 1)), end };
}

function chooseTile(near = null) {
  const busy = busyRows();
  const reach = Math.min(320, Math.max(wall.width, wall.height) * 0.3);
  const h = TILE_ROWS * CELL_H;
  const half = Math.floor(TILE_ROWS / 2);
  const pane = wall.panes[0];
  const floorRow = keyboard?.fits ? keyboard.topRow - 1 : wall.rows - 2;
  const options = [];
  for (let line = half + 1; line < floorRow - half; line++) {
    if (wall.fade[line] < 0.8 || wall.fade[line - half] < 0.5 || wall.fade[line + half] < 0.5) continue;
    const { col, end } = eyeCol(line, half);
    const x = cellX(col);
    const w = cellX(col + TILE_COLS) - x;
    if (rowsTouch(line - half, TILE_ROWS, ghost.rows, 1) && !(ghost.terminal && x + w <= cellX(ghost.terminal.c0) - 4)) continue;
    const y = (line + 0.5) * CELL_H - h / 2;
    if (wall.blocked.some((z) => x + w > z.x0 - 20 && x < z.x1 + 20 && y + h > z.y0 - 20 && y < z.y1 + 20)) continue;
    if (col < end && rowsTouch(line - half, TILE_ROWS, busy, 1)) continue;
    const score = near ? -Math.abs(y + h / 2 - near[1]) : Math.hypot(x + w / 2 - pointer.x, y + h / 2 - pointer.y);
    options.push({ col, line, row: line - half, rows: TILE_ROWS, x, y, w, h, pane, score });
  }
  if (!options.length) return null;
  const far = near ? [] : options.filter((option) => option.score > reach);
  const best = Math.max(...options.map((option) => option.score));
  const pool = far.length ? far : options.filter((option) => option.score >= best - (near ? CELL_H : 0));
  return pool[Math.floor(random() * pool.length)];
}

function centeredTile() {
  const col = Math.max(0, Math.floor((wall.cols - TILE_COLS) / 2));
  const half = Math.floor(TILE_ROWS / 2);
  const line = clamp(Math.floor(wall.rows / 2), half + 1, Math.max(half + 1, wall.rows - half - 2));
  const x = cellX(col);
  const h = TILE_ROWS * CELL_H;
  return { col, line, row: line - half, rows: TILE_ROWS, x, y: (line + 0.5) * CELL_H - h / 2, w: cellX(col + TILE_COLS) - x, h, pane: paneNear(col) };
}

function gazeTarget(now) {
  if (!touchMode || touch.active) return [pointer.x, pointer.y];
  if (touch.tilt && now - touch.tilt.at < 1500) return [tile.cx + touch.tilt.vx * 360, tile.cy + touch.tilt.vy * 260];
  if (now >= touch.wanderAt) {
    touch.wanderAt = now + between(900, 1900);
    touch.wander = [between(0, wall.width), between(0, wall.height)];
  }
  return touch.wander || [pointer.x, pointer.y];
}

function baseAlpha() {
  return KIND_ALPHA.ident;
}

function ghostCaret() {
  if (!ghost.caret || !carets.has(ghost.caret)) ghost.caret = makeCaret();
  return ghost.caret;
}

function rangeCells(r, c0, c1) {
  const base = r * wall.cols;
  return Array.from({ length: c1 - c0 }, (_, k) => [wall.chars[base + c0 + k], wall.alphas[base + c0 + k], wall.tints[base + c0 + k]]);
}

function rowCells(r) {
  return rangeCells(r, 0, wall.cols);
}

function saveRow(r) {
  if (!ghost.saved.has(r)) ghost.saved.set(r, rowCells(r));
}

function restoreSaved() {
  for (const [r, cells] of ghost.saved) {
    const base = r * wall.cols;
    cells.forEach(([ch, alpha, tint], c) => {
      wall.chars[base + c] = ch;
      wall.alphas[base + c] = alpha;
      wall.tints[base + c] = tint;
      flux.cells.delete(base + c);
      ghost.edited.delete(base + c);
    });
    repaint(0, r, wall.cols - 1, r);
  }
  ghost.saved.clear();
}

function abortGhost() {
  stopCycle();
  ghost.token++;
  ghost.rows.clear();
  ghost.act = false;
  if (!wall) return;
  cmdLine?.classList.remove("is-typing");
  cmdKeys("");
  if (editor.mode !== "NORMAL") setMode("NORMAL");
  hideCursor();
  if (ghost.terminal) {
    endSplit(ghost.terminal, false);
    ghost.terminal = null;
  }
  restoreSaved();
  const undo = ghost.undo;
  ghost.undo = null;
  if (undo) {
    resetBuffer(undo.rows);
    message = undo.message;
    editor.row = undo.row;
    editor.col = undo.col;
    ghost.edited.clear();
    redraw(0);
    return;
  }
  for (const [i, alpha] of ghost.edited) {
    wall.alphas[i] = alpha;
    flux.dirty.add(i);
  }
  ghost.edited.clear();
  flushDirty();
}

function lineExtent(r, c0, c1) {
  const base = r * wall.cols;
  let from = c0;
  while (from < c1 && wall.chars[base + from] === " ") from++;
  let to = c1;
  while (to > from && wall.chars[base + to - 1] === " ") to--;
  return to > from ? [from, to] : null;
}

function freeSlot(exclude = [], minLength = 14) {
  const busy = busyRows();
  for (let attempt = 0; attempt < 60; attempt++) {
    const pane = wall.panes[Math.floor(random() * wall.panes.length)];
    const r = 2 + Math.floor(random() * (wall.rows - 5));
    const y0 = r * CELL_H;
    if (exclude.includes(r) || busy.has(r) || busy.has(r - 1) || busy.has(r + 1)) continue;
    if (keyboard?.fits && r >= keyboard.topRow - 1) continue;
    if (wall.fade[r] < 0.75) continue;
    if (wall.blocked.some((z) => y0 + CELL_H > z.y0 - CELL_H && y0 < z.y1 + CELL_H)) continue;
    if (pointer.x >= 0 && Math.abs(y0 - pointer.y) < 70) continue;
    if (hover && hover.r === r) continue;
    const extent = lineExtent(r, pane.codeC0, pane.codeC1);
    if (!extent || extent[1] - extent[0] < minLength) continue;
    return { r, pane, c0: pane.codeC0, c1: pane.codeC1, from: extent[0], to: extent[1] };
  }
  return null;
}

async function settle(token) {
  const since = performance.now();
  await sleep(1400);
  if (token !== ghost.token) return;
  if (lastScrollAt > since) {
    ghost.edited.clear();
    return;
  }
  for (const [i, alpha] of ghost.edited) {
    addFade(i, wall.tints[i], wall.alphas[i], 900);
    wall.alphas[i] = alpha;
    flux.dirty.add(i);
  }
  ghost.edited.clear();
  flushDirty();
}

function retypeTarget(slot, start, end) {
  const cells = rangeCells(slot.r, start, end);
  return { chars: cells.map(([ch]) => ch), tints: cells.map(([, , tint]) => tint), alphas: cells.map(([, alpha]) => alpha) };
}

function editedMarker(r, alphas, start) {
  return (row, col, n) => ghost.edited.set(row * wall.cols + col, alphas[n] ?? KIND_ALPHA.ident);
}

async function ghostRewrite(token) {
  const alive = () => token === ghost.token;
  const slot = freeSlot();
  if (!slot) return;
  const { r } = slot;
  ghost.rows = new Set([r]);
  saveRow(r);
  const end = Math.floor(between(slot.from + 8, slot.to));
  const start = Math.max(slot.from, end - Math.floor(between(6, 26)));
  const original = retypeTarget(slot, start, end);
  const caret = ghostCaret();
  if (!(await blinkAt(caret, r, end, 2, alive))) return;
  placeCaret(caret, r, end, false);
  await sleep(vanishSpan(r, start, end, VANISH) + beat(300, 700));
  if (!alive() || !(await blinkAt(caret, r, start, 1, alive))) return;
  setMode("INSERT");
  if (!(await typeInto(caret, r, start, original.chars, { alpha: EDIT_ALPHA, glow: true, alive, tints: original.tints, onPut: editedMarker(r, original.alphas, start) }))) return;
  pressKey("Escape");
  setMode("NORMAL");
  editor.row = rowOf(slot.pane, r);
  editor.col = Math.max(0, end - 1 - slot.pane.codeC0);
  await blinkAt(caret, r, end, 1, alive);
}

function wrapWords(text, room) {
  const lines = [];
  for (const word of text.split(" ")) {
    const last = lines[lines.length - 1];
    if (last !== undefined && last.length + 1 + word.length <= room) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

async function ghostComment(text, token) {
  const alive = () => token === ghost.token;
  if (!wall || (object && !(await until(() => !object, alive, OBJECT_LIFE + 1000)))) return false;
  const pane = wall.panes[0];
  const rows = pane.file.rows;
  const [top, bottom] = wall.band;
  const width = pane.codeC1 - pane.codeC0 - 1;
  const busy = busyRows();
  const inside = (r) => r >= top + EDIT.scrolloff && r <= bottom - EDIT.scrolloff - 1;
  const tail = (at) => {
    let n = 0;
    while (rowOf(pane, at + n + 1).cont) n++;
    return n;
  };
  const option = (at) => {
    const extra = tail(at);
    if (!inside(at) || busy.has(at) || busy.has(at + extra + 1)) return null;
    const row = rowOf(pane, at);
    const next = rowOf(pane, at + extra + 1);
    if (!row.file?.repo || row.num === null) return null;
    const follows = next.file === row.file && next.num !== null && next.text.trim() !== "";
    const lead = follows && !row.text.trim() ? indentOf(next) : indentOf(row);
    const room = width - lead - (COMMENT[row.file.lang] || "//").length - 1;
    const parts = wrapWords(text, room);
    if (room < 16 || !inside(at + extra + parts.length)) return null;
    return { row, at, lead, parts, blank: follows && !row.text.trim() && next.kinds[indentOf(next)] !== "comment" };
  };
  const cursor = editor.shown ? screenRow(editor.row) : -1;
  const from = inside(cursor) ? cursor : Math.floor((top + bottom) / 2);
  let target = null;
  let fallback = null;
  for (let d = 0; d <= bottom - top && !target; d++) {
    for (const at of d ? [from + d, from - d] : [from]) {
      const found = option(at);
      if (!found) continue;
      fallback ||= found;
      if (found.blank) {
        target = found;
        break;
      }
    }
  }
  target ||= fallback;
  if (!target) return false;
  const { row, lead, parts } = target;
  const marker = COMMENT[row.file.lang] || "//";
  ghost.act = true;
  if (!editor.shown || editor.row !== row) {
    if (!(await normalKeys(`${row.num}G`, alive))) return true;
    editor.row = row;
    editor.col = indentOf(row);
    showCursor();
    await sleep(beat(350, 550));
    if (!alive()) return true;
  }
  ghost.undo ||= { rows: rows.slice(), message, row: editor.row, col: editor.col };
  if (!(await normalKeys("o", alive))) return true;
  setMode("INSERT");
  message = { rows: [], done: false, at: performance.now(), change: 0 };
  const style = { num: 0, file: row.file, ghost: true, alpha: MESSAGE_ALPHA, tint: visit.note };
  let anchor = lastOf(row);
  for (let k = 0; k < parts.length; k++) {
    if (k) pressKey("Enter");
    const r = screenRow(anchor) + 1;
    const leader = k ? `${marker} ` : "";
    const draft = { ...style, text: " ".repeat(lead) + leader, kinds: [...new Array(lead).fill("ident"), ...[...leader].map(() => "comment")] };
    spliceRows(rows.indexOf(anchor) + 1, 0, [draft]);
    redraw(r);
    message.rows.push(draft);
    ghost.rows.add(r);
    editor.row = draft;
    editor.col = draft.text.length;
    showCursor();
    await sleep(k ? beat(120, 260) : beat(300, 480));
    if (!alive()) return true;
    const body = [...`${k ? "" : `${marker} `}${parts[k]}`];
    if (!(await typeInto(ghostCaret(), r, pane.codeC0 + draft.text.length, body, { alpha: MESSAGE_ALPHA, alive, pace: 1.05, typos: 0.6, tints: body.map(() => visit.note) }))) return true;
    const line = { ...style, text: draft.text + body.join(""), kinds: [...draft.kinds, ...body.map(() => "comment")] };
    spliceRows(rows.indexOf(draft), 1, [line]);
    message.rows[k] = line;
    anchor = line;
  }
  await sleep(beat(320, 520));
  if (!alive()) return true;
  pressKey("Escape");
  setMode("NORMAL");
  editor.row = anchor;
  editor.col = anchor.text.length - 1;
  showCursor();
  editor.changes++;
  Object.assign(message, { done: true, at: performance.now(), change: editor.changes });
  return true;
}

async function ghostUndo(token) {
  const alive = () => token === ghost.token;
  const job = message;
  if (!job?.done || !wall) return true;
  if (object && !(await until(() => !object, alive, OBJECT_LIFE + 1000))) return false;
  const pane = wall.panes[0];
  const rows = pane.file.rows;
  const first = rows.indexOf(job.rows[0]);
  if (first < 0) {
    message = null;
    return true;
  }
  const count = job.rows.length;
  const r = screenRow(job.rows[0]);
  if (r < wall.band[0] || r + count - 1 > wall.band[1]) {
    spliceRows(first, count);
    redraw(Math.max(0, r));
    message = null;
    return true;
  }
  const age = (performance.now() - job.at) / 1000;
  const secs = Math.max(1, Math.round(age));
  const when = age < 100 ? `${secs} ${secs === 1 ? "second" : "seconds"} ago` : new Date(Date.now() - age * 1000).toTimeString().slice(0, 8);
  ghost.act = true;
  ghost.undo ||= { rows: rows.slice(), message, row: editor.row, col: editor.col };
  ghost.rows = new Set(job.rows.map((_, k) => r + k));
  if (!(await normalKeys("u", alive))) return true;
  hideCursor();
  let wipe = 0;
  for (let k = 0; k < count; k++) wipe = Math.max(wipe, vanishSpan(r + k, pane.c0, pane.codeC1, EDIT.wipe));
  await sleep(wipe + 120);
  if (!alive()) return true;
  spliceRows(first, count);
  redraw(r);
  message = null;
  cmdSay(`${count === 1 ? "1 line less" : `${count} fewer lines`}; before #${job.change}  ${when}`);
  const near = rows[first - 1] || rows[first];
  editor.row = near?.cont || near;
  editor.col = indentOf(editor.row);
  showCursor();
  await sleep(beat(350, 550));
  return true;
}

async function ghostColors(token) {
  const alive = () => token === ghost.token;
  if (!visit.theme.name || !wall) return;
  ghost.act = true;
  if (!(await cmdType(`:colorscheme ${visit.theme.name}`, alive))) return;
  const pane = wall.panes[0];
  for (let r = wall.band[0]; r <= wall.band[1]; r++) {
    for (let c = pane.c0; c <= paneRight(pane); c++) {
      const i = r * wall.cols + c;
      if (wall.chars[i] !== " ") addFade(i, INK, wall.alphas[i], 900);
    }
    await sleep(16);
    if (!alive()) return;
  }
  await sleep(beat(700));
}

function scheduleCycle(delay) {
  clearTimeout(director.timer);
  director.timer = setTimeout(runCycle, delay);
}

function stopCycle() {
  director.token++;
  if (tile) Object.assign(tile, { hold: false, dilate: false });
  if (!leaving) scheduleCycle(touchMode ? CYCLE.touchRestart : CYCLE.restart);
}

function calmNow() {
  const now = performance.now();
  return Boolean(wall) && !leaving && !document.hidden && !prefersStill() && !drag && !picker && !visitorSession && now - lastScrollAt > 1500 && now - lastVisitorKeyAt > 4000;
}

function until(test, alive, limit) {
  return new Promise((resolve) => {
    const start = performance.now();
    const check = () => {
      if (!alive()) resolve(false);
      else if (test()) resolve(true);
      else if (performance.now() - start > limit) resolve(false);
      else setTimeout(check, 100);
    };
    check();
  });
}

function tidyGhost(token) {
  if (token === ghost.token) {
    ghost.rows.clear();
    ghost.saved.clear();
    ghost.act = false;
    ghost.undo = null;
    cmdKeys("");
    if (editor.mode !== "NORMAL") setMode("NORMAL");
    showCursor();
    settle(token);
  } else if (wall) {
    restoreSaved();
  }
}

async function runCycle() {
  director.timer = 0;
  if (leaving) return;
  if (!calmNow() || block || ghost.act || tile?.hold || (message && !message.done)) {
    scheduleCycle(2000);
    return;
  }
  const token = ++director.token;
  const alive = () => token === director.token && !leaving;
  const ok = (await workAct(alive)) && (await sayAct(alive)) && (await faceAct(alive));
  if (alive()) scheduleCycle(ok ? between(...CYCLE.pause) : CYCLE.retry);
}

async function workAct(alive) {
  const token = ghost.token;
  await ghostUndo(token);
  if (alive() && token === ghost.token) {
    if (!ghost.themeShown) {
      ghost.themeShown = true;
      await ghostColors(token);
    } else if (!(await ghostTerminal(token))) {
      await ghostRewrite(token);
    }
  }
  tidyGhost(token);
  return alive();
}

async function sayAct(alive) {
  const token = ghost.token;
  await ghostComment(MESSAGES[0].join(" "), token);
  tidyGhost(token);
  return alive() && Boolean(message?.done);
}

async function faceAct(alive) {
  if (!face) return true;
  director.hush = true;
  if (tile && !tile.leaving) close(performance.now());
  await sleep(between(...CYCLE.gap));
  const token = ghost.token;
  if (alive()) {
    await ghostUndo(token);
    tidyGhost(token);
  }
  if (tile && alive()) await until(() => !tile, alive, 1500);
  let at = null;
  for (let attempt = 0; attempt < 8 && !at && alive(); attempt++) {
    at = calmNow() ? planFace() : null;
    if (!at) await sleep(1200);
  }
  const started = Boolean(at) && (await runCommand("./face --track", alive)) && startBlock(at);
  director.hush = false;
  if (!started) return false;
  if (!(await until(() => !block, alive, 30000))) return false;
  const next = ghost.token;
  await ghostComment(MESSAGES[1].join(" "), next);
  tidyGhost(next);
  return alive() && Boolean(message?.done);
}

function layoutMessage(lines) {
  let dx = 0;
  const placed = lines.map((line, k) => {
    const item = { dx, dy: k, text: line };
    dx += line.lastIndexOf(" ") + 1;
    return item;
  });
  return { lines: placed, width: Math.max(...placed.map((line) => line.dx + line.text.length)) + 2, height: lines.length };
}

function chooseBlock(layout, my) {
  const mx = Math.min(MSG_MX, Math.floor((wall.span[1] - wall.span[0] - 4 - layout.width) / 2));
  if (mx < 2) return null;
  let cols = layout.width + 2 * mx;
  let rows = layout.height + 2 * my;
  const fig = face?.track?.mode === "body" ? face.track : null;
  if (fig) {
    rows = clamp(wall.band[1] - wall.band[0] - 4, 16, 44); // must fit inside the faded-in code band above the keyboard
    cols = Math.ceil((rows * CELL_H * fig.aspect) / CELL_W) + 4;
  }
  const minCol = wall.span[0] + 2;
  const maxCol = wall.span[1] - cols - 2;
  const maxRow = wall.rows - rows - 2;
  if (maxCol < minCol || maxRow < 2) return null;
  const height = rows * CELL_H;
  const busy = busyRows();
  let best = null;
  for (let attempt = 0; attempt < 240; attempt++) {
    const col = minCol + Math.floor(random() * (maxCol - minCol + 1));
    const row = 2 + Math.floor(random() * (maxRow - 1));
    const seed = row + Math.floor(rows / 2);
    let filled = 0;
    for (let c = col; c < col + cols; c++) if (wall.chars[seed * wall.cols + c] !== " ") filled++;
    if (filled < cols * 0.5) continue;
    if (keyboard?.fits && row + rows >= keyboard.topRow) continue;
    if (wall.fade[seed] < 0.8 || wall.fade[row] < 0.5 || wall.fade[row + rows - 1] < 0.5) continue;
    const x = cellX(col);
    const width = cellX(col + cols) - x;
    const y = row * CELL_H;
    if (wall.blocked.some((z) => x + width > z.x0 - 16 && x < z.x1 + 16 && y + height > z.y0 - 16 && y < z.y1 + 16)) continue;
    if (rowsTouch(row, rows, busy, 1) || rowsTouch(row, rows, ghost.rows, 1)) continue;
    const distance = pointer.x < 0 ? Infinity : Math.hypot(x + width / 2 - pointer.x, y + height / 2 - pointer.y);
    const candidate = { col, row, cols, rows, x, y, w: width, h: height, distance, seed, mx };
    if (distance > 220) return candidate;
    if (!best || distance > best.distance) best = candidate;
  }
  return best;
}

function showMachine(job) {
  const { at, dpr, scene } = job;
  machineCanvas.dataset.scene = scene.kind;
  machineCanvas.width = Math.round(at.w * dpr);
  machineCanvas.height = Math.round(at.h * dpr);
  Object.assign(machineCanvas.style, { display: "block", left: `${at.x}px`, top: `${at.y}px`, width: `${at.w}px`, height: `${at.h}px` });
  blockFrame = requestAnimationFrame(blockStep);
}

function planFace() {
  if (!face || !wall || leaving || tile || block || document.hidden) return null;
  const layout = layoutMessage(MESSAGES[1]);
  for (let my = clamp(Math.floor((wall.band[1] - wall.band[0] - 6) / 2), 4, MSG_MY_FACE); my >= 4; my--) {
    const at = chooseBlock(layout, my);
    if (at) return at;
  }
  return null;
}

function startBlock(at) {
  if (leaving || !face || !at || tile || block) return false;
  const now = performance.now();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  block = { at, dpr, scene: makeTracking(at.w, at.h), start: now, last: now, grow: spring(0, 0.6, 1), phase: "seed", holdUntil: 0, holdMs: FACE_HOLD_MS };
  seedLine(at.seed, at.col, at.col + at.cols);
  showMachine(block);
  return true;
}

function maskEllipse(g, ox, oy, rx, ry) {
  const { w, h } = block.at;
  const stretch = Math.max(ry, 1e-3) / Math.max(rx, 1e-3);
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.translate(ox, oy);
  g.scale(1, stretch);
  const gradient = g.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, 1e-3));
  gradient.addColorStop(0, "#000");
  gradient.addColorStop(0.68, "#000");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = gradient;
  g.fillRect(-2 * w, -2 * h / stretch - 4, 4 * w, (4 * h) / stretch + 8);
  g.restore();
}

function drawScene(now) {
  const g = machineCanvas.getContext("2d");
  const { y, w, h } = block.at;
  g.setTransform(block.dpr, 0, 0, block.dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  if (block.grow.value <= 0.002) return;
  block.scene.draw(g, now);
  const [rx, ry] = blockRadii();
  const [ox, oy] = blockCenter();
  const k = face?.track?.mask || 1;
  maskEllipse(g, ox - block.at.x, oy - y, rx * k, ry * k);
}

function repaintBlock() {
  const { at } = block;
  repaint(at.col, at.row, at.col + at.cols - 1, at.row + at.rows - 1);
  if (block.phase === "hold" || prefersStill()) return;
  for (let r = at.row; r < at.row + at.rows; r++) {
    for (let c = at.col; c < at.col + at.cols; c++) {
      const m = holeAt(cellX(c) + CELL_W / 2, r * CELL_H + CELL_H / 2);
      if (m > 0.2 && m < 0.7 && random() < 0.06) flicker(r * wall.cols + c, ri(1, 3));
    }
  }
}

function blockStep(now) {
  blockFrame = 0;
  if (!block) return;
  const dt = (now - block.last) / 1000;
  block.last = now;
  if (!sceneStep(now, dt)) return;
  drawScene(now);
  blockFrame = requestAnimationFrame(blockStep);
}

function sceneStep(now, dt) {
  if (block.phase === "seed" && now - block.start >= SEED_MS) {
    block.phase = "grow";
    block.grow.target = 1;
  }
  const settled = advance(block.grow, dt);
  if (block.phase === "grow" && (settled || block.grow.value > 0.985)) {
    block.phase = "hold";
    block.holdUntil = now + block.holdMs;
  } else if (block.phase === "hold" && now >= block.holdUntil) {
    retractBlock();
  } else if (block.phase === "shrink" && block.grow.value < 0.01) {
    endBlock(now);
    return false;
  }
  if (block.phase === "grow" || block.phase === "shrink" || (block.phase === "hold" && !settled)) repaintBlock();
  return true;
}

function retractBlock() {
  if (!block) return;
  if (block.phase === "seed") {
    abortBlock();
    return;
  }
  if (block.phase === "shrink") return;
  block.phase = "shrink";
  block.grow.target = 0;
  block.grow.response = 0.36;
}

function endBlock(now) {
  cancelAnimationFrame(blockFrame);
  blockFrame = 0;
  machineCanvas.style.display = "none";
  const region = block?.at;
  block?.scene?.stop?.();
  block = null;
  if (region && wall) repaint(region.col, region.row, region.col + region.cols - 1, region.row + region.rows - 1);
  if (visitorSession && now - lastVisitorKeyAt < 3000) tryEye(now);
}

function abortBlock() {
  if (block) endBlock(performance.now());
}

function codeSource(files) {
  let out = "";
  const kinds = [];
  for (const file of files) {
    for (const raw of file.lines) {
      const line = raw.trim();
      if (!line) continue;
      if (out) {
        out += " ";
        kinds.push("ident");
      }
      const tokens = tokenize(line, file.lang);
      for (let k = 0; k < line.length; k++) {
        const code = line.charCodeAt(k);
        if (code < 0x20 || code > 0x7e) continue;
        out += line[k];
        kinds.push(tokens[k] || "ident");
      }
    }
  }
  return { codeText: out, codeKinds: kinds };
}

function makeCodifier(w, h, tone) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const px = face?.track?.fontPx || FACE_FONT_PX; // figure mode (full-body portrait) needs finer glyphs than the 5.5px face
  const cw = px * 0.6;
  const ch = px * 1.08;
  const cols = Math.max(1, Math.ceil(w / cw));
  const rows = Math.max(1, Math.ceil(h / ch));
  const sample = document.createElement("canvas");
  sample.width = cols;
  sample.height = rows;
  const sg = sample.getContext("2d", { willReadFrequently: true });
  const layer = document.createElement("canvas");
  layer.width = Math.max(1, Math.round(w * dpr));
  layer.height = Math.max(1, Math.round(h * dpr));
  const lg = layer.getContext("2d");
  lg.setTransform(dpr, 0, 0, dpr, 0, 0);
  lg.font = `${px}px "Plex Mono", monospace`;
  lg.textBaseline = "alphabetic";
  const source = codeText || " ";
  const offset = Math.floor(random() * source.length);
  const start = performance.now();
  const steps = 14;
  const levels = new Uint8Array(cols * rows);
  const luma = new Float32Array(cols * rows);
  const tint = document.createElement("canvas");
  tint.width = cols;
  tint.height = rows;
  const tg = tint.getContext("2d");
  const pixels = tg.createImageData(cols, rows);
  const colours = new Map();
  const colourOf = (kind) => {
    let colour = colours.get(kind);
    if (!colour) colours.set(kind, (colour = rgbOf(visit.tints[KIND_TINT[kind]] || visit.tints.text)));
    return colour;
  };
  let tinted = -1;
  return (drawSample, now) => {
    const scroll = Math.floor((now - start) / 420);
    if (scroll !== tinted) {
      tinted = scroll;
      for (let r = 0; r < rows; r++) {
        const from = offset + (r + scroll) * cols;
        for (let c = 0; c < cols; c++) {
          const [red, green, blue] = colourOf(codeKinds[(from + c) % source.length] || "ident");
          const i = (r * cols + c) * 4;
          pixels.data[i] = red;
          pixels.data[i + 1] = green;
          pixels.data[i + 2] = blue;
        }
      }
    }
    sg.imageSmoothingQuality = "high";
    sg.clearRect(0, 0, cols, rows);
    drawSample(sg, cols, rows);
    const data = sg.getImageData(0, 0, cols, rows).data;
    for (let i = 0; i < cols * rows; i++) luma[i] = (data[i * 4] * 0.2126 + data[i * 4 + 1] * 0.7152 + data[i * 4 + 2] * 0.0722) * (data[i * 4 + 3] / 255);
    let lo = 0;
    let hi = tone.fixed || 255;
    if (!tone.fixed) {
      const sorted = luma.filter((_, i) => i % 3 === 0).sort();
      lo = sorted[Math.floor(sorted.length * 0.04)];
      hi = sorted[Math.floor(sorted.length * 0.97)] || lo + 1;
    }
    for (let i = 0; i < cols * rows; i++) {
      const v = clamp(((luma[i] - lo) / Math.max(1, hi - lo) - tone.floor) / tone.range, 0, 1) ** tone.gamma;
      levels[i] = Math.round(v * (steps - 1));
    }
    lg.clearRect(0, 0, w, h);
    lg.fillStyle = "#fff";
    for (let r = 0; r < rows; r++) {
      const from = offset + (r + scroll) * cols;
      let line = "";
      let heavy = "";
      let any = false;
      let bold = false;
      for (let c = 0; c < cols; c++) {
        const level = levels[r * cols + c];
        const strength = level / (steps - 1);
        const alpha = level ? tone.base + (1 - tone.base) * strength : 0;
        const thick = level > 0 && strength > tone.bold;
        pixels.data[(r * cols + c) * 4 + 3] = Math.round(255 * alpha);
        const glyph = level ? source[(from + c) % source.length] : " ";
        line += glyph;
        heavy += thick ? glyph : " ";
        any ||= level > 0;
        bold ||= thick;
      }
      if (any) lg.fillText(line, 0, r * ch + px * EM_TOP);
      if (bold) lg.fillText(heavy, 0.45, r * ch + px * EM_TOP);
    }
    tg.putImageData(pixels, 0, 0);
    lg.save();
    lg.globalCompositeOperation = "source-in";
    lg.imageSmoothingEnabled = false;
    lg.drawImage(tint, 0, 0, cols * cw, rows * ch);
    lg.restore();
    return layer;
  };
}

function makeCodeFace(w, h, video) {
  const codify = makeCodifier(w, h, FACE_TONE);
  const start = performance.now();
  let lastTime = -1;
  let lastScroll = -1;
  let layer = null;
  let readyAt = 0;
  return (dx, dy, dw, dh, now) => {
    const scroll = Math.floor((now - start) / 420);
    if (layer && ((video.currentTime === lastTime && scroll === lastScroll) || now < readyAt)) return layer;
    lastTime = video.currentTime;
    lastScroll = scroll;
    const begin = performance.now();
    layer = codify((sg, cols, rows) => sg.drawImage(video, (dx * cols) / w, (dy * rows) / h, (dw * cols) / w, (dh * rows) / h), now);
    readyAt = now + Math.min(120, 2 * (performance.now() - begin));
    return layer;
  };
}

function makeTracking(w, h) {
  const { video, track } = face;
  const first = track.frames[0];
  const groups = first.map((p) => (!p ? -1 : p[0] < 0.42 ? 0 : p[0] > 0.58 ? 1 : 2));
  const codeFace = makeCodeFace(w, h, video);
  let pattern = null;
  let patternAt = -Infinity;
  let stepAt = -Infinity;
  video.currentTime = 0;
  video.play().catch(() => {});
  return {
    kind: "tracking",
    draw(g, now) {
      if (video.paused && !video.seeking && now - stepAt > 80) {
        stepAt = now;
        video.currentTime = (video.currentTime + 0.08) % Math.max(0.1, video.duration || 5);
      }
      if (video.readyState < 2) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const scale = Math.min(w / vw, h / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      g.drawImage(codeFace(dx, dy, dw, dh, now), 0, 0, w, h);
      const n = clamp(Math.floor(video.currentTime * track.fps), 0, track.frames.length - 1);
      const points = track.frames[n].map((p, id) => (p ? { id, x: dx + p[0] * dw, y: dy + p[1] * dh, u: p[0], v: p[1] } : null));
      const alive = points.filter(Boolean);
      if (now - patternAt > 420) {
        const ids = alive.map((p) => p.id).sort(() => random() - 0.5);
        pattern = { chain: ids.slice(0, ri(6, 10)), boxes: [0, 1, 2].filter(() => random() < 0.7) };
        patternAt = now;
      }
      g.lineWidth = 0.75;
      g.strokeStyle = `rgba(${INK}, 0.5)`;
      g.beginPath();
      let started = false;
      for (const id of pattern.chain) {
        const p = points[id];
        if (!p) continue;
        if (started) g.lineTo(p.x, p.y);
        else g.moveTo(p.x, p.y);
        started = true;
      }
      g.stroke();
      g.fillStyle = `rgba(${INK}, 0.8)`;
      for (const p of alive) g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
      g.font = `8px "Plex Mono", monospace`;
      g.textBaseline = "alphabetic";
      const center = dx + dw / 2;
      const taken = [];
      for (const group of pattern.boxes) {
        const members = alive.filter((p) => groups[p.id] === group);
        if (members.length < 2) continue;
        const x0 = Math.min(...members.map((p) => p.x)) - 4;
        const y0 = Math.min(...members.map((p) => p.y)) - 4;
        const x1 = Math.max(...members.map((p) => p.x)) + 4;
        const y1 = Math.max(...members.map((p) => p.y)) + 4;
        g.strokeStyle = `rgba(${INK}, 0.7)`;
        g.strokeRect(Math.round(x0) + 0.5, Math.round(y0) + 0.5, Math.round(x1 - x0), Math.round(y1 - y0));
        const u = members.reduce((sum, p) => sum + p.u, 0) / members.length;
        const v = members.reduce((sum, p) => sum + p.v, 0) / members.length;
        const area = ((x1 - x0) * (y1 - y0)) / (w * h);
        const label = [`['blob${group}:u'] ${u.toFixed(7)}`, v.toFixed(7), area.toFixed(10), "None"];
        const width = Math.max(...label.map((line) => g.measureText(line).width));
        const left = (x0 + x1) / 2 < center;
        let lx = left ? x0 - 8 - width : x1 + 8;
        lx = clamp(lx, 2, w - width - 2);
        let ly = clamp(y0, 2, h - 38);
        while (taken.some(([ax, ay]) => Math.abs(ax - lx) < width && Math.abs(ay - ly) < 38)) ly += 40;
        if (ly > h - 38) continue;
        taken.push([lx, ly]);
        g.strokeStyle = `rgba(${INK}, 0.35)`;
        g.beginPath();
        g.moveTo(left ? x0 : x1, (y0 + y1) / 2);
        g.lineTo(left ? lx + width + 2 : lx - 2, ly + 4);
        g.stroke();
        g.fillStyle = `rgba(${INK}, 0.86)`;
        label.forEach((line, k) => g.fillText(line, Math.round(lx), Math.round(ly) + k * 9 + 8 * EM_TOP));
      }
    },
    stop() {
      video.pause();
    },
  };
}

function repaintArea(t) {
  if (!wall) return;
  const area = [Math.max(0, Math.floor((t.cx - t.w / 2) / CELL_W) - 2), Math.max(0, Math.floor((t.cy - t.h / 2) / CELL_H) - 1), Math.min(wall.cols - 1, Math.ceil((t.cx + t.w / 2) / CELL_W) + 1), Math.min(wall.rows - 1, Math.ceil((t.cy + t.h / 2) / CELL_H))];
  const last = t.painted || area;
  t.painted = area;
  repaint(Math.min(area[0], last[0]), Math.min(area[1], last[1]), Math.max(area[2], last[2]), Math.max(area[3], last[3]));
}

function seedLine(r, c0, c1) {
  for (let c = c0; c < c1; c++) {
    const i = r * wall.cols + c;
    if (wall.chars[i] !== " ") flicker(i, ri(2, 6));
  }
  repaint(c0, r, c1 - 1, r);
}

function pupilOf(t) {
  const ri = t.h * EYE.iris * t.iz.value;
  return { x: t.cx + t.gx.value * t.w * 0.47 * EYE.reach, y: t.cy + t.gy.value * t.h * EYE.rise, ri, rp: ri * (0.24 + 0.26 * t.dil.value) };
}

function lidPath(t) {
  const a = t.w * 0.47;
  const path = new Path2D();
  for (let k = 0; k <= 48; k++) {
    const u = k / 24 - 1;
    const y = t.cy - t.h * EYE.upper * t.openNow * (1 - u * u) ** 0.8;
    if (k) path.lineTo(t.cx + u * a, y);
    else path.moveTo(t.cx + u * a, y);
  }
  for (let k = 48; k >= 0; k--) {
    const u = k / 24 - 1;
    path.lineTo(t.cx + u * a, t.cy + t.h * EYE.lower * t.openNow * (1 - u * u) ** 1.15);
  }
  path.closePath();
  return path;
}

function frost(t, now) {
  const f = t.frost || (t.frost = { canvas: document.createElement("canvas"), at: -Infinity, x: 0, y: 0, pad: 0 });
  const x = Math.round(t.cx - t.w / 2);
  const y = Math.round(t.cy - t.h / 2);
  if (now - f.at > FROST.ms || f.x !== x || f.y !== y) {
    const dpr = wallCanvas.width / wall.width;
    const pad = Math.ceil(FROST.blur * 3);
    f.canvas.width = Math.round((t.w + 2 * pad) * dpr);
    f.canvas.height = Math.round((t.h + 2 * pad) * dpr);
    const fg = f.canvas.getContext("2d");
    fg.filter = `blur(${(FROST.blur * dpr).toFixed(2)}px)`;
    fg.drawImage(wallCanvas, Math.round((x - pad) * dpr), Math.round((y - pad) * dpr), f.canvas.width, f.canvas.height, 0, 0, f.canvas.width, f.canvas.height);
    fg.filter = "none";
    fg.fillStyle = `rgba(${rgb(BG)}, ${FROST.tint})`;
    fg.fillRect(0, 0, f.canvas.width, f.canvas.height);
    Object.assign(f, { at: now, x, y, pad });
  }
  return f;
}

function drawFrost(g, t, now) {
  const f = frost(t, now);
  g.drawImage(f.canvas, f.x - f.pad, f.y - f.pad, t.w + 2 * f.pad, t.h + 2 * f.pad);
}

function eyeSample(t, x, y) {
  const u = (x - t.cx) / (t.w * 0.47);
  if (u <= -1 || u >= 1) return -1;
  const k = 1 - u * u;
  const top = t.cy - t.h * EYE.upper * t.openNow * k ** 0.8;
  const bottom = t.cy + t.h * EYE.lower * t.openNow * k ** 1.15;
  const edge = Math.max(0, 1 - Math.abs(y - top) / 1.7) * 0.95 * Math.sqrt(k);
  const edgeLow = Math.max(0, 1 - Math.abs(y - bottom) / 1.3) * 0.5 * Math.sqrt(k);
  const rim = Math.max(edge, edgeLow);
  if (y < top || y > bottom) return rim > 0.05 ? rim : -1;
  const p = t.pupil;
  const dx = x - p.x;
  const dy = y - p.y;
  const d = Math.hypot(dx, dy);
  let v;
  if (d < p.rp) {
    v = 0;
  } else if (d < p.ri) {
    const rr = (d - p.rp) / (p.ri - p.rp);
    const angle = Math.atan2(dy, dx) + t.spin;
    const fibre = 0.5 + 0.5 * Math.sin(angle * 29 + 2.1 * Math.sin(angle * 5)) * Math.cos(angle * 13 - rr * 4);
    const collar = 0.38 * Math.exp(-((rr - 0.3) ** 2) / 0.012);
    const limbus = rr > 0.8 ? (rr - 0.8) / 0.2 : 0;
    v = (0.26 + 0.46 * fibre * (1 - 0.45 * rr) + collar) * (1 - 0.8 * limbus);
    if (rr < 0.07) v = Math.max(v, 0.9);
  } else {
    v = 0.34 * (1 - 0.6 * u * u) * (0.5 + 0.5 * Math.min(1, (y - top) / (t.h * 0.18)));
  }
  if (Math.hypot(x - (p.x - p.ri * 0.34), y - (p.y - p.ri * 0.36)) < p.ri * 0.14) v = 1;
  return Math.max(v, rim);
}

function eyeGlyphs(g, t, scroll, cols, rows) {
  const source = codeText || "·";
  const x0 = t.cx - t.w / 2;
  const y0 = t.cy - t.h / 2;
  for (let level = 1; level <= 13; level++) {
    const strength = level / 13;
    g.fillStyle = `rgba(${INK}, ${(EYE_TONE.base + (1 - EYE_TONE.base) * strength).toFixed(3)})`;
    for (let r = 0; r < rows; r++) {
      const from = t.offset + (r + scroll) * cols;
      let line = "";
      let any = false;
      for (let c = 0; c < cols; c++) {
        if (t.levels[r * cols + c] === level) {
          line += source[(from + c) % source.length];
          any = true;
        } else {
          line += " ";
        }
      }
      if (!any) continue;
      g.fillText(line, x0, y0 + r * FINE_H + FACE_FONT_PX * EM_TOP);
      if (strength > EYE_TONE.bold) g.fillText(line, x0 + 0.45, y0 + r * FINE_H + FACE_FONT_PX * EM_TOP);
    }
  }
}

function drawEye(g, t, now) {
  const p = (t.pupil = pupilOf(t));
  const x0 = t.cx - t.w / 2;
  const y0 = t.cy - t.h / 2;
  const cols = Math.ceil(t.w / FINE_W);
  const rows = Math.ceil(t.h / FINE_H);
  if (!t.levels || t.levels.length !== cols * rows) t.levels = new Int8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = eyeSample(t, x0 + (c + 0.5) * FINE_W, y0 + (r + 0.5) * FINE_H);
      t.levels[r * cols + c] = v < 0 ? -1 : Math.round(clamp((v - EYE_TONE.floor) / EYE_TONE.range, 0, 1) ** EYE_TONE.gamma * 13);
    }
  }
  const scroll = prefersStill() ? 0 : Math.floor((now - t.born) / 420);
  g.save();
  if (t.zoom) {
    const [px, py] = t.zoom.origin;
    g.translate(px, py);
    g.scale(t.zoom.scale, t.zoom.scale);
    g.translate(-px, -py);
  }
  if (!t.zoom) {
    g.save();
    g.clip(lidPath(t));
    drawFrost(g, t, now);
    g.restore();
  }
  g.font = `${FACE_FONT_PX}px "Plex Mono", monospace`;
  g.textBaseline = "alphabetic";
  if (t.zoom && dive) g.globalAlpha = clamp(1 - (t.zoom.scale - 1.2) / 2.5, 0, 1);
  if (g.globalAlpha > 0.004) eyeGlyphs(g, t, scroll, cols, rows);
  g.restore();
  if (!t.zoom && t.openNow > 0.6) drawTrack(g, t);
}

function drawTrack(g, t) {
  const p = t.pupil;
  const alpha = clamp((t.openNow - 0.6) / 0.3, 0, 1);
  const s = p.rp + 4;
  g.save();
  g.lineWidth = 0.75;
  g.font = `8px "Plex Mono", monospace`;
  g.textBaseline = "alphabetic";
  g.strokeStyle = `rgba(${INK}, ${(0.7 * alpha).toFixed(3)})`;
  g.strokeRect(Math.round(p.x - s) + 0.5, Math.round(p.y - s) + 0.5, Math.round(2 * s), Math.round(2 * s));
  const label = [`['pupil:u'] ${((p.x - (t.cx - t.w / 2)) / t.w).toFixed(7)}`, ((p.y - (t.cy - t.h / 2)) / t.h).toFixed(7), ((Math.PI * p.rp * p.rp) / (t.w * t.h)).toFixed(10), "None"];
  const width = Math.max(...label.map((line) => g.measureText(line).width));
  const height = label.length * 9;
  const fits = ([lx, ly]) => lx >= 8 && lx + width <= wall.width - 8 && ly >= 8 && ly + height <= wall.height - 8;
  const clear = ([lx]) => lx >= cellX(wall.span[1]) || lx + width <= cellX(wall.span[0]);
  const term = ghost.terminal;
  const free = ([lx, ly]) => !term || lx + width <= cellX(term.c0) - 4 || ly >= (term.r0 + term.H) * CELL_H || ly + height <= term.r0 * CELL_H;
  const spots = [[t.cx + t.w / 2 + 10, t.cy - t.h / 2 + 6], [t.cx + t.w * 0.2, t.cy - t.h / 2 - height - 6], [t.cx - t.w / 2 - 10 - width, t.cy - t.h / 2 + 6]].filter((spot) => fits(spot) && free(spot));
  const spot = spots.find(clear) || spots[0];
  if (spot) {
    const [lx, ly] = spot;
    const right = lx > p.x;
    g.fillStyle = `rgba(${INK}, ${(0.86 * alpha).toFixed(3)})`;
    label.forEach((line, k) => g.fillText(line, Math.round(lx), Math.round(ly) + k * 9 + 8 * EM_TOP));
    g.strokeStyle = `rgba(${INK}, ${(0.22 * alpha).toFixed(3)})`;
    g.beginPath();
    g.moveTo(right ? p.x + s : p.x - s, p.y);
    g.lineTo(right ? lx - 2 : lx + width + 2, ly + 4);
    g.stroke();
  }
  const targets = [t.focus?.caret ? t.focus : null, t.hunt].filter(Boolean);
  for (const target of targets) {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(dx ? (11 * len) / Math.abs(dx) : Infinity, dy ? (7 * len) / Math.abs(dy) : Infinity, len);
    g.lineCap = "round";
    g.setLineDash([3, 4]);
    g.lineDashOffset = prefersStill() ? 0 : -performance.now() / 45;
    g.strokeStyle = `rgba(${visit.glow}, ${(0.35 * alpha).toFixed(3)})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(target.x - (dx / len) * k, target.y - (dy / len) * k);
    g.stroke();
    g.setLineDash([]);
    g.lineCap = "butt";
    g.lineWidth = 0.75;
    g.strokeStyle = `rgba(${INK}, ${(0.45 * alpha).toFixed(3)})`;
    g.strokeRect(Math.round(target.x - 11) + 0.5, Math.round(target.y - 7) + 0.5, 22, 14);
  }
  g.restore();
}

function focusPoint(now) {
  if (typing && now - typing.at < TYPE_FOCUS_MS) return { x: cellX(typing.c) + 1, y: (typing.r + 0.5) * CELL_H, caret: true };
  const k = ghost.caret;
  if (k && ghost.rows.size && carets.has(k) && k.r >= 0) return { x: cellX(k.c) + 1, y: (k.r + 0.5) * CELL_H, caret: true };
  const [x, y] = gazeTarget(now);
  return x >= 0 ? { x, y, caret: false } : null;
}

function open(now, chosen = chooseTile()) {
  if (!chosen) return false;
  tile = {
    ...chosen,
    cx: chosen.x + chosen.w / 2,
    cy: (chosen.line + 0.5) * CELL_H,
    iz: spring(IRIS_ZOOM.near, IRIS_ZOOM.response, 1),
    locked: null,
    pulseUntil: 0,
    state: "seed",
    start: now,
    born: now,
    offset: Math.floor(random() * Math.max(1, codeText.length)),
    lid: spring(0, 0.45, 1),
    gx: spring(0, 0.35, 1),
    gy: spring(0, 0.35, 1),
    dil: spring(0.45, 0.5, 1),
    spin: 0,
    blinkAt: -Infinity,
    nextBlinkAt: now + between(3200, 6200),
    openNow: 0,
    closeAt: Infinity,
    focus: null,
  };
  if (prefersStill()) {
    tile.lid.value = tile.lid.target = 1;
    tile.openNow = 1;
    tile.state = "open";
    tile.closeAt = now + between(4200, 6200);
    repaintArea(tile);
  } else {
    seedLine(tile.line, tile.col, tile.col + TILE_COLS);
  }
  loop();
  return true;
}

function close(now) {
  if (!tile || tile.state === "closing" || tile.leaving) return;
  if (prefersStill() || tile.state === "seed") {
    const region = tile;
    tile = null;
    eyeRestUntil = now + between(2000, 3500);
    repaintArea(region);
    return;
  }
  tile.state = "closing";
  tile.lid.target = 0;
  tile.lid.response = 0.3;
  loop();
}

function closeNow() {
  if (!tile) return;
  const region = tile;
  tile = null;
  eyeRestUntil = performance.now() + between(2000, 3500);
  repaintArea(region);
}

function finishClose(now) {
  const region = tile;
  tile = null;
  eyeRestUntil = now + between(2000, 3500);
  repaintArea(region);
  seedLine(region.line, region.col, region.col + TILE_COLS);
}

function canOpen(now) {
  return Boolean(wall) && !tile && !block && !object && !drag && !picker && !leaving && !boot.active && !director.hush && !(message && !message.done) && now > eyeRestUntil && now - lastScrollAt > 1200;
}

function watch(r, c) {
  const now = performance.now();
  if (tile || leaving || !wall || boot.active || document.hidden || block || drag || visitorSession || now - lastScrollAt < 1200) return;
  const y = (r + 0.5) * CELL_H;
  if (open(now, chooseTile([cellX(c), y]))) tile.watch = true;
}

function tileStep(now, dt) {
  const t = tile;
  if (t.state === "seed" && now - t.start >= SEED_MS) {
    t.state = "opening";
    t.start = now;
    t.lid.target = 1;
    repaintArea(t);
  } else if (t.state === "opening" && t.lid.value > 0.97) {
    t.state = "open";
    t.closeAt = t.leaving ? Infinity : now + between(4200, 6200);
  } else if (t.state === "open") {
    const idle = !touchMode && (!pointer.inside || now - pointer.lastMove > 2800);
    const reading = ghost.rows.size > 0 || (typing && now - typing.at < 1600);
    if (!t.leaving && !t.hold && !reading && now - lastVisitorKeyAt > 3000 && (idle || now >= t.closeAt)) close(now);
  } else if (t.state === "closing" && t.lid.value < 0.01) {
    finishClose(now);
    return;
  }
  if (!tile) return;
  if (t.slide) {
    advance(t.slide, dt);
    t.cx = t.slide.value;
    t.x = t.cx - t.w / 2;
    t.col = Math.round(t.x / CELL_W);
  }
  const still = prefersStill();
  t.focus = t.leaving ? null : focusPoint(now);
  t.hunt = !touchMode && !t.leaving && pointer.inside && pointer.x >= 0 && now - pointer.lastMove < POINTER_LOCK_MS ? { x: pointer.x, y: pointer.y } : null;
  const caret = Boolean(t.focus?.caret);
  if (caret && (!t.locked || Math.hypot(t.focus.x - t.locked[0], t.focus.y - t.locked[1]) > 60)) t.pulseUntil = now + IRIS_ZOOM.pulseMs;
  t.locked = caret ? [t.focus.x, t.focus.y] : null;
  const far = t.focus ? Math.hypot(t.focus.x - t.cx, t.focus.y - t.cy) / IRIS_ZOOM.span : 0;
  t.iz.target = now < t.pulseUntil ? IRIS_ZOOM.pulse : caret ? IRIS_ZOOM.locked : clamp(IRIS_ZOOM.near + far, IRIS_ZOOM.near, IRIS_ZOOM.far);
  advance(t.iz, dt);
  const aim = t.focus ? [clamp((t.focus.x - t.cx) / 360, -1, 1), clamp((t.focus.y - t.cy) / 260, -1, 1)] : [0, 0];
  t.gx.target = aim[0];
  t.gy.target = aim[1];
  t.dil.target = t.zoom || t.dilate ? 1 : t.focus?.caret ? 0.25 : 0.5 + 0.2 * Math.sin(now / 1430);
  advance(t.lid, dt);
  for (const s of [t.gx, t.gy, t.dil]) advance(s, dt);
  t.spin += dt * (still ? 0 : t.focus?.caret ? 0.5 : 0.12);
  if (!still && !t.leaving && !block && t.state === "open" && now >= t.nextBlinkAt) {
    t.blinkAt = now;
    t.nextBlinkAt = now + between(2600, 6400);
  }
  const blink = now - t.blinkAt < 170 ? Math.sin(((now - t.blinkAt) / 170) * Math.PI) : 0;
  t.openNow = clamp(t.lid.value, 0, 1) * (1 - 0.96 * blink);
}

function step(now) {
  frame = 0;
  if (!wall) return;
  const dt = lastStep ? clamp((now - lastStep) / 1000, 0, 0.1) : 1 / 60;
  lastStep = now;
  if (tile) tileStep(now, dt);
  const keys = keyboard?.fits && !leaving;
  let moving = false;
  if (keys) {
    if (now - keyboard.lastAt > 2200) keyboard.vis.target = 0;
    const settled = advance(keyboard.vis, dt);
    moving = stepHands(now, dt) || !settled || keyboard.vis.target > 0;
  }
  glass?.classList.toggle("is-on", Boolean(keys && keyboard.vis.target > 0));
  const g = tileCanvas.getContext("2d");
  g.clearRect(0, 0, wall.width, wall.height);
  if (keys) {
    drawKeyboard(g, now);
    drawHands(g, now);
  }
  if (tile && tile.openNow > 0.001) drawEye(g, tile, now);
  if (dive) drawDive(g, now);
  if (tile || moving) {
    frame = requestAnimationFrame(step);
  } else {
    lastStep = 0;
    tileCanvas.style.display = "none";
  }
}

function loop() {
  if (!wall) return;
  tileCanvas.style.display = "block";
  if (!frame) frame = requestAnimationFrame(step);
}

function layoutKeyboard() {
  if (KEY_SCALES.some((scale) => placeKeyboard(scale))) return;
  hands = [];
  if (glass) glass.style.display = "none";
}

function placeKeyboard(scale) {
  const pitchX = 3 * CELL_W * scale;
  const pitchY = 2 * CELL_H * scale;
  const chrome = chromeRow();
  const left = Math.round(wall.width / 2 - 6.9 * pitchX);
  const labels = new Map();
  const flat = KEY_CODES.flat();
  flat.forEach((code, n) => labels.set(code, layoutMap?.get(code) || US_KEYS[n]));
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
  for (const [ch, base] of Object.entries(US_SHIFTED)) {
    if (!chars.has(ch)) chars.set(ch, { code: flat[US_KEYS.indexOf(base)], shift: true });
  }
  const place = (homeRow) => {
    const home = (homeRow + 0.5) * CELL_H;
    const keys = new Map();
    KEY_CODES.forEach((row, k) => row.forEach((code, n) => keys.set(code, { x: left + (KEY_STAGGER[k] + n) * pitchX, y: home + (k - 2) * pitchY })));
    keys.set("Space", { x: left + 6.4 * pitchX, y: home + 2 * pitchY, wide: 5.6 * pitchX });
    keys.set("ShiftLeft", { x: left + 0.4 * pitchX, y: home + pitchY });
    keys.set("ShiftRight", { x: left + 12.8 * pitchX, y: home + pitchY });
    keys.set("Backspace", { x: left + 13.6 * pitchX, y: home - 2 * pitchY });
    keys.set("Enter", { x: left + 13.3 * pitchX, y: home });
    keys.set("Escape", { x: left - 1.1 * pitchX, y: home - 2 * pitchY });
    return keys;
  };
  keyboard = { keys: place(chrome - 12), labels, chars, homeRow: chrome - 12, pitchX, pitchY, scale, fits: false, glass: null, topRow: wall.rows, vis: spring(0, 0.3, 1), glow: new Map(), lastAt: -Infinity };
  hands = [makeHand(0), makeHand(1)];
  keyboard.homeRow += Math.floor((chrome * CELL_H - 1 - KEY_EDGE - keyboardExtent().y1) / CELL_H);
  keyboard.keys = place(keyboard.homeRow);
  hands = [makeHand(0), makeHand(1)];
  const box = keyboardExtent();
  const area = { x0: Math.floor(box.x0 - KEY_EDGE), y0: Math.floor(box.y0 - KEY_EDGE), x1: Math.ceil(box.x1 + KEY_EDGE), y1: Math.ceil(box.y1 + KEY_EDGE) };
  const [top, bottom] = bandFor(Math.floor(area.y0 / CELL_H));
  keyboard.fits = !prefersStill() && area.x0 > cellX(wall.span[0]) && area.x1 < cellX(wall.span[1]) && area.y0 > wall.height * 0.42 && bottom - top + 1 >= VIEW.min;
  if (!keyboard.fits) return false;
  keyboard.glass = area;
  keyboard.topRow = Math.floor(area.y0 / CELL_H);
  if (glass) Object.assign(glass.style, { display: "block", left: `${area.x0}px`, top: `${area.y0}px`, width: `${area.x1 - area.x0}px`, height: `${area.y1 - area.y0}px` });
  return true;
}

function handPose(hand, code) {
  const [side, finger] = code === null ? [hand.side, -1] : code === "Space" ? [1, 0] : FINGERS[code] || [1, 4];
  if (side !== hand.side) return null;
  const key = finger < 0 ? null : keyboard.keys.get(code);
  const [rx, ry] = key ? hand.rest[4 + finger * 4] : [0, 0];
  const sx = key ? (key.x - rx) * 0.22 : 0;
  const sy = key ? (key.y + 3 * keyboard.scale - ry) * 0.22 : 0;
  const points = hand.rest.map(([x, y]) => [x + sx, y + sy]);
  if (key) bendFinger(points, finger, key.x, key.y + 3 * keyboard.scale);
  return points;
}

function keyboardExtent() {
  const { keys, homeRow } = keyboard;
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const add = (x0, y0, x1, y1) => {
    box.x0 = Math.min(box.x0, x0);
    box.y0 = Math.min(box.y0, y0);
    box.x1 = Math.max(box.x1, x1);
    box.y1 = Math.max(box.y1, y1);
  };
  for (const key of keys.values()) {
    const half = key.wide ? key.wide / 2 : 11 * keyboard.scale;
    add(key.x - half, key.y - 8 * keyboard.scale, key.x + half, key.y + 8 * keyboard.scale);
  }
  const g = wall.context;
  g.save();
  g.font = `8px "Plex Mono", monospace`;
  const label = g.measureText(keyboard.scale < 1 ? "['hand0:u']" : "['hand0:u'] 0.0000000").width;
  g.restore();
  for (const hand of hands) {
    for (const code of [null, ...keys.keys()]) {
      const points = handPose(hand, code);
      if (!points) continue;
      const frame = handFrame(points);
      add(frame[0] - 1, frame[1] - 1, frame[2] + 1, frame[3] + 1);
      const [lx, ly] = labelAt(hand, label, frame);
      add(lx, ly, lx + label, ly + 10);
    }
  }
  return box;
}

function makeHand(side) {
  const { keys, pitchX, pitchY, scale: s } = keyboard;
  const tips = (side === 0 ? ["KeyF", "KeyD", "KeyS", "KeyA"] : ["KeyJ", "KeyK", "KeyL", "Semicolon"]).map((code) => [keys.get(code).x, keys.get(code).y + 3 * s]);
  const center = tips.reduce((sum, [x]) => sum + x, 0) / 4;
  const space = keys.get("Space");
  const thumb = [space.x + (side === 0 ? -1.2 : 1.2) * pitchX, space.y + 2 * s];
  const wrist = [center + (side === 0 ? 10 : -10) * s, tips[0][1] + 3.7 * pitchY];
  const cmc = [wrist[0] + (side === 0 ? 26 : -26) * s, wrist[1] - 16 * s];
  const base = [cmc[0] + (thumb[0] - cmc[0]) * 0.4, cmc[1] + (thumb[1] - cmc[1]) * 0.4 + 4 * s];
  const rest = [wrist, cmc, base, [base[0] + (thumb[0] - base[0]) * 0.55, base[1] + (thumb[1] - base[1]) * 0.55], thumb];
  tips.forEach((tip, f) => {
    const knuckle = [tip[0] * 0.82 + center * 0.18, tip[1] + 1.55 * pitchY - Math.abs(f - 1.5) * 3 * s];
    rest.push(knuckle, [knuckle[0] + (tip[0] - knuckle[0]) * 0.42, knuckle[1] + (tip[1] - knuckle[1]) * 0.42], [knuckle[0] + (tip[0] - knuckle[0]) * 0.74, knuckle[1] + (tip[1] - knuckle[1]) * 0.74], tip);
  });
  return {
    side,
    rest,
    points: rest.map((point) => [...point]),
    tips: [0, 1, 2, 3, 4].map((f) => ({ x: spring(rest[4 + f * 4][0], 0.07, 0.82), y: spring(rest[4 + f * 4][1], 0.07, 0.82), pressUntil: 0 })),
    shift: { x: spring(0, 0.2, 1), y: spring(0, 0.2, 1) },
  };
}

async function runCommand(command, alive) {
  if (leaving || !wall) return false;
  return cmdType(`:!${command}`, alive, { pace: 0.9 });
}

function reach(hand, finger, key, now, hold) {
  const tip = hand.tips[finger];
  const [rx, ry] = hand.rest[4 + finger * 4];
  tip.x.target = key.x;
  tip.y.target = key.y + 3 * keyboard.scale;
  tip.pressUntil = now + hold;
  hand.shift.x.target = (key.x - rx) * 0.22;
  hand.shift.y.target = (key.y + 3 * keyboard.scale - ry) * 0.22;
}

function pressKey(code, shift = false) {
  if (!wall || !keyboard?.fits || leaving) return;
  const key = keyboard.keys.get(code);
  if (!key) return;
  const now = performance.now();
  keyboard.lastAt = now;
  keyboard.vis.target = 1;
  keyboard.glow.set(code, now);
  const [side, finger] = code === "Space" ? [1, 0] : FINGERS[code] || [1, 4];
  reach(hands[side], finger, key, now, 120);
  if (shift) {
    const shiftKey = side === 0 ? "ShiftRight" : "ShiftLeft";
    keyboard.glow.set(shiftKey, now);
    reach(hands[1 - side], 4, keyboard.keys.get(shiftKey), now, 160);
  }
  loop();
}

function pressChar(ch) {
  const hit = keyboard?.chars.get(ch);
  if (hit) pressKey(hit.code, hit.shift);
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
      const tx = tip.x.value;
      const ty = tip.y.value;
      bendFinger(points, f, tx, ty);
    });
    hand.points = points;
  }
  return moving;
}

function bendFinger(points, f, tx, ty) {
  points[4 + f * 4] = [tx, ty];
  if (f === 0) {
    const [mx, my] = points[2];
    points[3] = [mx + (tx - mx) * 0.55, my + (ty - my) * 0.55];
    return;
  }
  const [mx, my] = points[1 + f * 4];
  points[2 + f * 4] = [mx + (tx - mx) * 0.42, my + (ty - my) * 0.42];
  points[3 + f * 4] = [mx + (tx - mx) * 0.74, my + (ty - my) * 0.74];
}

function drawKeyboard(g, now) {
  const vis = keyboard.vis.value;
  if (vis < 0.01) return;
  g.font = `${FONT_PX * keyboard.scale}px "Plex Mono", monospace`;
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  for (const [code, key] of keyboard.keys) {
    const at = keyboard.glow.get(code);
    const glow = at === undefined ? 0 : clamp(1 - (now - at) / 260, 0, 1);
    const hint = code === "Semicolon" && glow === 0;
    g.fillStyle = `rgba(${glow > 0 || hint ? visit.accent : INK}, ${((hint ? 0.6 : 0.2 + 0.75 * glow) * vis).toFixed(3)})`;
    if (key.wide) g.fillRect(Math.round(key.x - key.wide / 2), Math.round(key.y) - (glow > 0 ? 1 : 0), Math.round(key.wide), glow > 0 ? 2 : 1);
    else g.fillText(keyboard.labels.get(code) || "", key.x, key.y + 1 + FONT_PX * keyboard.scale * (EM_TOP - 0.5));
  }
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
}

function handFrame(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [Math.min(...xs) - 6, Math.min(...ys) - 6, Math.max(...xs) + 6, Math.max(...ys) + 6];
}

function labelAt(hand, width, frame) {
  const [x0, y0, x1] = frame;
  if (keyboard.scale < 1) return [hand.side === 0 ? x0 : x1 - width, y0 - 11];
  return [hand.side === 0 ? x0 - width - 8 : x1 + 8, y0 + 2];
}

function drawHands(g, now) {
  const vis = keyboard.vis.value;
  if (vis < 0.01) return;
  g.lineWidth = 0.75;
  g.font = `8px "Plex Mono", monospace`;
  g.textBaseline = "alphabetic";
  for (const hand of hands) {
    const { points } = hand;
    g.strokeStyle = `rgba(${INK}, ${(0.4 * vis).toFixed(3)})`;
    g.beginPath();
    for (const [a, b] of HAND_LINKS) {
      g.moveTo(points[a][0], points[a][1]);
      g.lineTo(points[b][0], points[b][1]);
    }
    g.stroke();
    points.forEach(([x, y], k) => {
      const tip = k > 0 && k % 4 === 0 ? hand.tips[k / 4 - 1] : null;
      const pressing = tip && now < tip.pressUntil;
      const size = pressing ? 4 : 2;
      g.fillStyle = pressing ? `rgba(${visit.accent}, ${vis.toFixed(3)})` : `rgba(${INK}, ${(0.8 * vis).toFixed(3)})`;
      g.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    });
    const frame = handFrame(points);
    g.strokeStyle = `rgba(${INK}, ${(0.28 * vis).toFixed(3)})`;
    g.strokeRect(Math.round(frame[0]) + 0.5, Math.round(frame[1]) + 0.5, Math.round(frame[2] - frame[0]), Math.round(frame[3] - frame[1]));
    const label = keyboard.scale < 1 ? `['hand${hand.side}:u']` : `['hand${hand.side}:u'] ${(points[0][0] / wall.width).toFixed(7)}`;
    const [lx, ly] = labelAt(hand, g.measureText(label).width, frame);
    g.fillStyle = `rgba(${INK}, ${(0.7 * vis).toFixed(3)})`;
    g.fillText(label, Math.round(lx), Math.round(ly) + 8 * EM_TOP);
  }
}

function paint(r, c, ch, alpha, tint) {
  const i = r * wall.cols + c;
  wall.chars[i] = ch;
  wall.alphas[i] = alpha;
  wall.tints[i] = tint;
  flux.cells.delete(i);
}

function paintText(r, c, value, alpha, tint, max = Infinity) {
  [...value].slice(0, Math.max(0, max)).forEach((ch, k) => paint(r, c + k, ch, alpha, tint));
}

function writePrompt(r, c, dir) {
  paintText(r, c, dir, 0.7, visit.tints.function);
  paint(r, c + dir.length + 1, "›", 0.95, visit.accent);
  return c + dir.length + 3;
}

function inTerminal(c, r) {
  const t = ghost.terminal;
  return Boolean(t) && r >= t.r0 && r < t.r0 + t.H && c >= t.c0 && c < t.c0 + t.W;
}

function clearSpan(r, c0, c1) {
  for (let c = c0; c < c1; c++) paint(r, c, " ", KIND_ALPHA.ident, visit.tints.text);
}

function chooseTerminal() {
  const files = visit.files.filter((file) => file.repo);
  if (!wall || !files.length) return null;
  const [top, bottom] = wall.band;
  const [from, right] = wall.span;
  const W = Math.min(92, Math.max(60, Math.round((right - from) * 0.56)));
  if (right - from - W < 40 || bottom - top < 16) return null;
  const c0 = right - W;
  if (wall.blocked.some((z) => cellX(right) > z.x0 && cellX(c0) < z.x1 && (bottom + 1) * CELL_H > z.y0 && top * CELL_H < z.y1)) return null;
  const runnable = files.filter((file) => objectKind(file));
  const pool = runnable.length && random() < 0.8 ? runnable : files;
  return { r0: top, c0, W, H: bottom - top + 1, pane: wall.panes[0], file: pool[Math.floor(random() * pool.length)] };
}

async function openSplit(t, alive) {
  const { pane } = t;
  let wipe = 0;
  for (let r = t.r0; r < t.r0 + t.H; r++) wipe = Math.max(wipe, vanishSpan(r, t.c0, pane.c0 + pane.width, [3, 8]));
  await sleep(wipe + 60);
  if (!alive()) return false;
  t.codeC1 = pane.codeC1;
  pane.sep = t.c0;
  pane.codeC1 = t.c0 - 1;
  renderPane(pane);
  repaint(0, 0, wall.cols - 1, wall.rows - 1);
  placeStatus();
  return alive();
}

async function closeSplit(t, alive) {
  let wipe = 0;
  for (let r = t.r0; r < t.r0 + t.H; r++) wipe = Math.max(wipe, vanishSpan(r, t.c0 + 1, Math.min(wall.cols, t.c0 + t.W), [3, 8]));
  await sleep(wipe + 60);
  if (!alive()) return false;
  endSplit(t, true);
  return true;
}

function endSplit(t, animate) {
  const { pane } = t;
  if (object?.until) endObject();
  for (let r = t.r0; r < t.r0 + t.H; r++) clearSpan(r, t.c0, Math.min(wall.cols, t.c0 + t.W));
  pane.sep = -1;
  pane.codeC1 = t.codeC1 ?? pane.codeC1;
  const before = animate ? wall.chars.slice() : null;
  renderPane(pane);
  if (animate && !prefersStill()) {
    for (let r = t.r0; r < t.r0 + t.H; r++) {
      for (let c = t.c0; c < pane.c0 + pane.width; c++) {
        const i = r * wall.cols + c;
        if (wall.chars[i] !== " " && wall.chars[i] !== before[i]) flux.cells.set(i, { until: flux.tick + ri(1, 4), glyph: pick(), alpha: fluxAlpha() });
      }
    }
    runFlux();
  }
  repaint(0, 0, wall.cols - 1, wall.rows - 1);
  placeStatus();
}

function makeRoom(term) {
  if (!tile || tile.leaving) return;
  const top = term.r0 * CELL_H;
  const bottom = (term.r0 + term.H) * CELL_H;
  const eyeTop = tile.cy - tile.h / 2;
  if (tile.cx + tile.w / 2 <= cellX(term.c0) - 8 || eyeTop >= bottom || eyeTop + tile.h <= top) return;
  const col = clamp(term.c0 - TILE_COLS - 2, wall.span[0] + 2, wall.cols - TILE_COLS - 1);
  tile.slide ||= spring(tile.cx, 0.7, 1);
  tile.slide.target = cellX(col) + tile.w / 2;
  loop();
}

function drawFish(t, history, dir) {
  const c0 = t.c0 + 2;
  for (let r = t.r0 + 1; r < t.r0 + t.H - 1; r++) clearSpan(r, c0, t.c0 + t.W - 2);
  history.forEach(([at, command], k) => {
    const col = writePrompt(t.r0 + 1 + k, c0, at);
    paintText(t.r0 + 1 + k, col, command, 0.92, INK, t.c0 + t.W - 2 - col);
  });
  const row = t.r0 + 1 + history.length;
  const col = writePrompt(row, c0, dir);
  repaint(t.c0, t.r0 + 1, t.c0 + t.W - 1, t.r0 + t.H - 2);
  return [row, col];
}

function nvimLine(t, v, k) {
  const r = t.r0 + 1 + k;
  const c0 = t.c0 + 2;
  const width = t.W - 4;
  clearSpan(r, c0, c0 + width);
  const li = v.top + k;
  const line = v.lines[li];
  if (!line) {
    paint(r, c0 + 3, "~", 0.3, visit.tints.comment || visit.tints.text);
    return;
  }
  paintText(r, c0, String(v.first + li).padStart(4, " "), li === v.cur ? 0.72 : 0.26, visit.tints.text);
  [...line.text].slice(0, width - 5).forEach((ch, n) => {
    if (ch !== " ") paint(r, c0 + 5 + n, ch, KIND_ALPHA[line.kinds[n]], visit.tints[KIND_TINT[line.kinds[n]]]);
  });
}

function nvimStatus(t, v) {
  if (!paneStatus) return;
  paneStatus.querySelector(".mode").textContent = v.mode;
  paneStatus.classList.toggle("is-insert", v.mode === "INSERT");
  paneStatus.querySelector(".path").textContent = v.path;
  paneStatus.querySelector(".pos").textContent = `${v.lang}  ${v.first + v.cur}:${v.col + 1}`;
}

function nvimCommand(t, v) {
  if (!paneCmd) return;
  paneCmd.querySelector(".cmd").textContent = v.cmd;
  paneCmd.classList.remove("is-typing");
}

function nvimDraw(t, v, from = 0) {
  for (let k = from; k < t.H - 2; k++) nvimLine(t, v, k);
  repaint(t.c0, t.r0 + 1 + from, t.c0 + t.W - 1, t.r0 + t.H - 2);
  nvimStatus(t, v);
  nvimCommand(t, v);
}

function nvimCursor(t, v, caret, block = true) {
  caret.block = block;
  placeCaret(caret, t.r0 + 1 + v.cur - v.top, t.c0 + 7 + v.col);
}

async function nvimKeys(keys, alive, caret) {
  for (const ch of keys) {
    pressChar(ch);
    typing = { r: caret.r, c: caret.c, at: performance.now() };
    await sleep(keyDelay(ch, 1));
    if (!alive()) return false;
  }
  return true;
}

async function nvimCommandLine(t, v, caret, command, alive) {
  placeCaret(caret, caret.r, caret.c, false);
  return cmdType(command, alive, { line: paneCmd, from: t.c0 + 1 });
}

async function ghostTerminal(token) {
  const alive = () => token === ghost.token;
  const t = chooseTerminal();
  if (!t) return false;
  ghost.terminal = t;
  ghost.rows = new Set(Array.from({ length: t.H }, (_, k) => t.r0 + k));
  ghost.act = true;
  makeRoom(t);
  if (tile?.slide) await until(() => !tile?.slide || Math.abs(tile.slide.value - tile.slide.target) < 1, alive, 1500);
  if (!(await openSplit(t, alive))) return true;
  await sleep(beat(300));
  if (!alive()) return true;
  const { repo, path, lang } = t.file;
  const dir = `~/P/${repo}`;
  const slash = path.lastIndexOf("/");
  const name = path.slice(slash + 1);
  const width = t.W - 4;
  const history = [];
  const commands = [["~", `cd ~/Projects/${repo}`]];
  const nvim = t.file.firstLine > 1 ? `nvim +${t.file.firstLine} ` : "nvim ";
  if (dir.length + 3 + nvim.length + path.length > width && slash > 0) {
    commands.push([dir, `cd ${path.slice(0, slash)}`]);
    const parts = path.slice(0, slash).split("/");
    commands.push([["~", "P", repo[0], ...parts.slice(0, -1).map((part) => part[0]), parts[parts.length - 1]].join("/"), `${nvim}${name}`]);
  } else {
    commands.push([dir, `${nvim}${path}`]);
  }
  const caret = ghostCaret();
  caret.block = false;
  for (const [at, command] of commands) {
    const [row, col] = drawFish(t, history, at);
    if (!(await blinkAt(caret, row, col, 1, alive))) return true;
    if (!(await typeInto(caret, row, col, [...command].slice(0, t.c0 + t.W - 2 - col), { alpha: 0.92, glow: true, alive, pace: 0.65, typos: 0.3 }))) return true;
    await sleep(beat(160, 320));
    if (!alive()) return true;
    pressKey("Enter");
    history.push([at, command]);
    await sleep(beat(260, 480));
    if (!alive()) return true;
  }
  const lines = visit.logical.filter((row) => row.file === t.file && row.num !== null).map(({ text, kinds }) => ({ text, kinds }));
  const v = { lines, top: 0, cur: 0, col: 0, mode: "NORMAL", cmd: "", first: t.file.firstLine, path, lang };
  const indent = (li) => (v.lines[li]?.text.length ?? 0) - (v.lines[li]?.text.trimStart().length ?? 0);
  v.col = indent(0);
  t.nvim = true;
  placeStatus();
  nvimDraw(t, v);
  nvimCursor(t, v, caret);
  await sleep(beat(450, 650));
  if (!alive()) return true;
  const rows = t.H - 2;
  const want = ri(2, 3);
  const starts = [];
  for (let s = 2; s + 3 < rows - 1 && s <= 12; s++) {
    const span = Math.min(want, rows - 2 - s);
    const lines = v.lines.slice(s, s + span);
    if (lines.length < want || !lines[0].text.trim() || lines.some((line) => line.text.length >= width - 6)) continue;
    if (lines.filter((line) => line.text.trim()).length >= Math.min(want, 2)) starts.push([s, span]);
  }
  if (starts.length) {
    const [start, size] = starts[Math.floor(random() * starts.length)];
    for (let k = 0; k < start; k++) {
      pressChar("j");
      v.cur += 1;
      v.col = indent(v.cur);
      nvimLine(t, v, v.cur - 1);
      nvimLine(t, v, v.cur);
      repaint(t.c0, t.r0 + v.cur, t.c0 + t.W - 1, t.r0 + v.cur + 1);
      nvimStatus(t, v);
      nvimCursor(t, v, caret);
      typing = { r: caret.r, c: caret.c, at: performance.now() };
      await sleep(beat(90, 170));
      if (!alive()) return true;
    }
    await sleep(beat(300, 520));
    if (!(await nvimKeys(`d${size - 1}j`, alive, caret))) return true;
    for (let k = 0; k < size; k++) {
      const r = t.r0 + 1 + start + k;
      for (let c = t.c0 + 7; c < t.c0 + t.W - 2; c++) if (wall.chars[r * wall.cols + c] !== " ") morph(r * wall.cols + c, " ", baseAlpha(), ri(3, 9));
    }
    flushDirty();
    await sleep(beat(520));
    if (!alive()) return true;
    const block = v.lines.splice(start, size);
    const pace = 0.7 * Math.min(1, 70 / Math.max(1, block.reduce((n, line) => n + line.text.trim().length, 0)));
    v.cmd = `${size} fewer lines`;
    v.col = indent(start);
    nvimDraw(t, v, start);
    nvimCursor(t, v, caret);
    await sleep(beat(600, 900));
    if (!alive()) return true;
    pressChar("O");
    v.lines.splice(start, 0, { text: "", kinds: [] });
    v.mode = "INSERT";
    v.cmd = "-- INSERT --";
    nvimDraw(t, v, start);
    for (let k = 0; k < size; k++) {
      const line = block[k];
      const lead = line.text.length - line.text.trimStart().length;
      const body = [...line.text.slice(lead)];
      v.cur = start + k;
      v.col = lead;
      if (k > 0) {
        nvimLine(t, v, v.cur - 1 - v.top);
        repaint(t.c0, t.r0 + v.cur - v.top, t.c0 + t.W - 1, t.r0 + v.cur - v.top);
      }
      v.lines[v.cur] = { text: " ".repeat(lead), kinds: new Array(lead).fill("ident") };
      nvimStatus(t, v);
      nvimCursor(t, v, caret, false);
      await sleep(beat(140, 320));
      if (!alive()) return true;
      const tints = line.kinds.slice(lead).map((kind) => visit.tints[KIND_TINT[kind]]);
      if (!(await typeInto(caret, t.r0 + 1 + v.cur, t.c0 + 7 + lead, body, { alpha: 0.86, glow: true, alive, pace, typos: 0.5, tints }))) return true;
      v.lines[v.cur] = line;
      v.col = line.text.length;
      nvimLine(t, v, v.cur);
      repaint(t.c0, t.r0 + 1 + v.cur, t.c0 + t.W - 1, t.r0 + 1 + v.cur);
      if (k < size - 1) {
        await sleep(beat(120, 260));
        if (!alive()) return true;
        pressKey("Enter");
        v.lines.splice(v.cur + 1, 0, { text: "", kinds: [] });
        nvimDraw(t, v, v.cur + 1);
      }
    }
    await sleep(beat(300, 520));
    if (!alive()) return true;
    pressKey("Escape");
    v.mode = "NORMAL";
    v.cmd = "";
    v.col = Math.max(0, v.lines[v.cur].text.length - 1);
    nvimStatus(t, v);
    nvimCommand(t, v);
    nvimCursor(t, v, caret);
    await sleep(beat(500, 800));
    if (!alive()) return true;
    if (!(await nvimCommandLine(t, v, caret, ":w", alive))) return true;
    v.cmd = `"${name}" written`;
    nvimCommand(t, v);
    nvimCursor(t, v, caret);
    await sleep(beat(700, 1000));
    if (!alive()) return true;
    const run = RUNS[objectKind(t.file)];
    if (run) {
      if (!(await nvimCommandLine(t, v, caret, `:!${run}`, alive))) return true;
      const area = { c0: t.c0 + 2, width: t.W - 4, codeC0: t.c0 + 7, codeC1: t.c0 + t.W - 2 };
      if (startObject({ pane: area, r: t.r0 + 1 + v.cur - v.top, n: v.first + v.cur, file: t.file }, RUN_MS)) {
        if (!(await until(() => !object, alive, RUN_MS + 4000))) return true;
      }
      v.cmd = "";
      nvimCommand(t, v);
      nvimCursor(t, v, caret);
      await sleep(beat(400, 700));
      if (!alive()) return true;
    }
  }
  if (!(await nvimCommandLine(t, v, caret, ":qa", alive))) return true;
  t.nvim = false;
  placeStatus();
  await sleep(beat(160, 300));
  if (!alive()) return true;
  caret.block = false;
  const [row, col] = drawFish(t, history, commands[commands.length - 1][0]);
  if (!(await blinkAt(caret, row, col, 1, alive))) return true;
  if (!(await typeInto(caret, row, col, [..."exit"], { alpha: 0.92, glow: true, alive, typos: 0 }))) return true;
  await sleep(beat(160, 300));
  if (!alive()) return true;
  pressKey("Enter");
  placeCaret(caret, row, col + 4, false);
  if (!(await closeSplit(t, alive))) return true;
  ghost.terminal = null;
  await sleep(beat(700));
  return true;
}

function placePicker() {
  const W = Math.min(46, wall.span[1] - wall.span[0] - 4);
  const H = 13;
  const floor = wall.band[1] + 1;
  let r0 = clamp(floor - H, 2, Math.max(2, wall.rows - H - 2));
  while (r0 > 2 && wall.fade[r0 + H - 1] < 0.8) r0--;
  const c0 = Math.round((wall.span[0] + wall.span[1]) / 2 - W / 2);
  picker.at = { r0, c0, W, H };
  picker.saved = new Map();
  for (let r = r0; r < r0 + H; r++) picker.saved.set(r, rangeCells(r, c0, c0 + W));
}

function inPicker(c, r) {
  const t = picker?.at;
  return Boolean(t) && r >= t.r0 && r < t.r0 + t.H && c >= t.c0 && c < t.c0 + t.W;
}

function pickerItems() {
  const needle = picker.filter.toLowerCase();
  return visit.themes.filter((theme) => theme.name.toLowerCase().includes(needle));
}

function drawPicker() {
  const p = picker;
  const { r0, c0, W, H } = p.at;
  const dim = visit.tints.comment || visit.tints.text;
  for (let r = r0; r < r0 + H; r++) {
    for (let c = c0; c < c0 + W; c++) {
      const top = r === r0;
      const bottom = r === r0 + H - 1;
      let ch = " ";
      if (top || bottom) ch = c === c0 ? (top ? "╭" : "╰") : c === c0 + W - 1 ? (top ? "╮" : "╯") : "─";
      else if (c === c0 || c === c0 + W - 1) ch = "│";
      paint(r, c, ch, ch === " " ? KIND_ALPHA.ident : 0.34, visit.tints.text);
    }
  }
  paintText(r0, c0 + 2, " colorscheme ", 0.62, visit.tints.text);
  const input = `:${p.filter}`;
  paintText(r0 + 1, c0 + 2, input, 0.95, INK, W - 4);
  const rows = H - 5;
  p.top = clamp(p.index - Math.floor(rows / 2), 0, Math.max(0, p.items.length - rows));
  for (let k = 0; k < rows; k++) {
    const theme = p.items[p.top + k];
    if (!theme) continue;
    const r = r0 + 3 + k;
    const chosen = p.top + k === p.index;
    if (chosen) paint(r, c0 + 2, "›", 0.95, visit.accent);
    paintText(r, c0 + 4, theme.name, chosen ? 0.95 : 0.55, visit.tints.text, 16);
    ["keyword", "string", "number", "function", "type", "comment"].forEach((kind, n) => {
      const hex = theme.kinds[kind] || theme.kinds.text;
      paint(r, c0 + 21 + n, "█", 0.92, rgb(hex));
    });
    if (theme.light) paintText(r, c0 + 29, "light", 0.4, dim);
  }
  if (!p.items.length) paintText(r0 + 3, c0 + 4, "no match", 0.4, dim);
  const count = ` ${p.items.length ? p.index + 1 : 0}/${p.items.length} `;
  paintText(r0 + H - 1, c0 + W - 2 - count.length, count, 0.5, visit.tints.text);
  repaint(c0, r0, c0 + W - 1, r0 + H - 1);
  placeCaret(p.caret, r0 + 1, c0 + 2 + [...input].length);
  typing = { r: r0 + 1, c: c0 + 2 + [...input].length, at: performance.now() };
}

function showPickerTheme() {
  const theme = picker.items[picker.index];
  if (!theme || theme === visit.theme) {
    drawPicker();
    return;
  }
  closeNow();
  abortBlock();
  useTheme(theme);
  renderWall();
}

function refreshPicker() {
  picker.caret = picker.caret && carets.has(picker.caret) ? picker.caret : makeCaret();
  placePicker();
  drawPicker();
}

function openPicker() {
  if (!wall || leaving || picker) return;
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  abortGhost();
  endObject();
  clearTimeout(dwellTimer);
  dwellTimer = 0;
  setHover(null);
  picker = { filter: "", index: 0, top: 0, items: [], original: visit.theme, caret: makeCaret(), at: null, saved: null };
  hideCursor();
  picker.items = pickerItems();
  picker.index = Math.max(0, picker.items.indexOf(visit.theme));
  placePicker();
  drawPicker();
  loop();
}

function closePicker(keep) {
  const p = picker;
  if (!p) return;
  picker = null;
  dropCaret(p.caret);
  if (keep && p.original !== visit.theme) cmdSay(`:colorscheme ${visit.theme.name}`);
  if (!keep && p.original !== visit.theme) {
    closeNow();
    abortBlock();
    useTheme(p.original);
    renderWall();
    return;
  }
  for (const [r, cells] of p.saved) {
    cells.forEach(([ch, alpha, tint], k) => morph(r * wall.cols + p.at.c0 + k, ch, alpha, ri(3, 10), tint));
  }
  flushDirty();
  repaint(p.at.c0, p.at.r0, p.at.c0 + p.at.W - 1, p.at.r0 + p.at.H - 1);
  showCursor();
}

function pickerKey(event) {
  const p = picker;
  const move = { ArrowDown: 1, ArrowUp: -1, Tab: event.shiftKey ? -1 : 1 }[event.key];
  if (event.key === "Escape") {
    closePicker(false);
  } else if (event.key === "Enter") {
    pressKey("Enter");
    closePicker(true);
  } else if (move) {
    if (!p.items.length) return;
    pressKey(event.code, event.shiftKey);
    p.index = (p.index + move + p.items.length) % p.items.length;
    showPickerTheme();
  } else if (event.key === "Backspace") {
    pressKey("Backspace");
    if (!p.filter) {
      closePicker(false);
      return;
    }
    p.filter = p.filter.slice(0, -1);
    p.items = pickerItems();
    p.index = Math.max(0, p.items.indexOf(visit.theme));
    drawPicker();
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    pressKey(event.code, event.shiftKey);
    p.filter += event.key;
    p.items = pickerItems();
    p.index = 0;
    showPickerTheme();
  }
}

function pickerClick(x, y) {
  const c = Math.floor(x / CELL_W);
  const r = Math.floor(y / CELL_H);
  if (!inPicker(c, r)) {
    closePicker(true);
    return;
  }
  const k = r - picker.at.r0 - 3;
  if (k < 0 || k >= picker.at.H - 5 || !picker.items[picker.top + k]) return;
  picker.index = picker.top + k;
  showPickerTheme();
  closePicker(true);
}

function tryEye(now) {
  if (tile || leaving || !wall || document.hidden) return;
  if (block) {
    retractBlock();
    return;
  }
  if (object) endObject();
  const s = visitorSession;
  open(now, chooseTile(s ? [cellX(s.c), (s.r + 0.5) * CELL_H] : null));
}

function rowBlocked(r) {
  return wall.blocked.some((z) => (r + 1) * CELL_H > z.y0 && r * CELL_H < z.y1);
}

function startVisitor(now) {
  const limit = keyboard?.fits ? keyboard.topRow - 1 : wall.rows - 2;
  const busy = busyRows();
  const usable = (r, pane) => r >= 2 && r < limit && wall.fade[r] >= 0.6 && !busy.has(r) && !rowBlocked(r) && !inObject(pane.codeC0 + 1, r);
  let pane = null;
  let r = -1;
  if (hover && usable(hover.r, hover.pane)) {
    pane = hover.pane;
    r = hover.r;
  } else {
    pane = pointer.inside && pointer.x >= 0 ? paneNear(Math.floor(pointer.x / CELL_W)) : paneNear(Math.floor(wall.cols / 2));
    const want = Math.min(limit - 1, Math.round(wall.rows * 0.6));
    for (let d = 0; d < wall.rows && r < 0; d++) {
      for (const candidate of [want - d, want + d]) {
        if (usable(candidate, pane) && lineExtent(candidate, pane.codeC0, pane.codeC1)) {
          r = candidate;
          break;
        }
      }
    }
  }
  if (r < 0) return false;
  stopCycle();
  if (ghostBusy()) abortGhost();
  hideCursor();
  if (object) endObject();
  const extent = lineExtent(r, pane.codeC0, pane.codeC1);
  const home = extent ? extent[0] : pane.codeC0 + 2;
  visitorSession = { pane, r0: r, r, home, c: home, end: pane.codeC1 - 1, saved: new Map(), ends: new Map(), caret: makeCaret(), at: now, timer: 0, blink: 0 };
  claimRow(visitorSession, r);
  visitorSession.blink = setInterval(blinkVisitor, 530);
  return true;
}

function claimRow(s, r) {
  s.saved.set(r, rangeCells(r, s.pane.codeC0, s.pane.codeC1));
  for (let c = s.home; c < s.end; c++) {
    const i = r * wall.cols + c;
    if (wall.chars[i] !== " ") morph(i, " ", baseAlpha(), ri(3, 9));
  }
  flushDirty();
}

function visitorKey(event) {
  const now = performance.now();
  if (!visitorSession && (event.key === "Backspace" || !startVisitor(now))) return;
  const s = visitorSession;
  lastVisitorKeyAt = now;
  clearTimeout(dwellTimer);
  dwellTimer = 0;
  pressKey(event.code, event.shiftKey);
  if (event.key === "Backspace") {
    if (s.c <= s.home && s.r > s.r0) {
      s.r -= 1;
      s.c = s.ends.get(s.r) ?? s.end;
    }
    if (s.c > s.home) {
      s.c -= 1;
      put(s.r, s.c, " ", baseAlpha(), visit.tints.text);
    }
  } else {
    if (s.c >= s.end) {
      const next = s.r + 1;
      const busy = busyRows();
      for (const r of s.saved.keys()) busy.delete(r);
      const limit = keyboard?.fits ? keyboard.topRow - 1 : wall.rows - 2;
      if (next >= limit || busy.has(next) || rowBlocked(next)) return;
      s.ends.set(s.r, s.c);
      claimRow(s, next);
      s.r = next;
      s.c = s.home;
    }
    put(s.r, s.c, event.key, MESSAGE_ALPHA, INK);
    s.c += 1;
  }
  s.at = now;
  typing = { r: s.r, c: s.c, at: now };
  placeCaret(s.caret, s.r, s.c, true);
  clearTimeout(s.timer);
  s.timer = setTimeout(() => endVisitor(true), VISITOR_IDLE_MS);
  if (tile) tile.closeAt = Math.max(tile.closeAt, now + 3000);
  else tryEye(now);
}

function blinkVisitor() {
  const s = visitorSession;
  if (!s || !wall) return;
  placeCaret(s.caret, s.r, s.c, performance.now() - s.at > 500 ? !s.caret.on : true);
}

function dropVisitor() {
  const s = visitorSession;
  if (!s) return null;
  visitorSession = null;
  clearTimeout(s.timer);
  clearInterval(s.blink);
  dropCaret(s.caret);
  return s;
}

function endVisitor(animate = true) {
  const s = dropVisitor();
  if (!s || !wall) return;
  for (const [r, cells] of s.saved) {
    cells.forEach(([ch, alpha, tint], k) => {
      const i = r * wall.cols + s.pane.codeC0 + k;
      if (wall.chars[i] !== ch || wall.alphas[i] !== alpha || wall.tints[i] !== tint) morph(i, ch, alpha, animate ? ri(4, 14) : 0, tint);
    });
  }
  flushDirty();
  showCursor();
}

function thumb(kind, u, v, seed) {
  if (kind === 0) {
    const ridge = 0.42 + 0.22 * Math.sin(u * 8 + seed * 1.7) + 0.08 * Math.sin(u * 23 + seed);
    if (v > ridge) return v > 0.78 ? "▓" : "▒";
    return Math.abs(u - 0.74) < 0.08 && Math.abs(v - 0.28) < 0.12 ? "°" : " ";
  }
  if (kind === 1) return "░▒▓"[Math.min(2, Math.floor((u * 0.6 + v * 0.5) * 3))];
  if (kind === 2) return Math.hypot((u - 0.5) / 0.3, (v - 0.5) / 0.42) < 1 ? "▓" : "·";
  return (Math.floor(u * 9) + Math.floor(v * 3)) % 2 ? "▒" : "░";
}

const OBJECTS = {
  carousel: {
    size: [46, 7, 3],
    draw(g, t) {
      const cycle = t / 1.9;
      const base = Math.floor(cycle);
      const offset = base + smooth(clamp((cycle - base - 0.6) / 0.4, 0, 1));
      const cards = [];
      for (let i = Math.floor(offset) - 3; i <= Math.floor(offset) + 3; i++) {
        const far = Math.abs(i - offset);
        if (far <= 2.4) cards.push({ i, rel: i - offset, far });
      }
      cards.sort((a, b) => b.far - a.far);
      for (const { i, rel, far } of cards) {
        const cw = Math.round(far < 1 ? 15 - 6 * far : 9 - 3 * (far - 1));
        const ch = far < 0.5 ? 7 : far < 1.5 ? 5 : 3;
        const x0 = Math.round(g.w / 2 + rel * 12 - cw / 2);
        const y0 = g.ay - Math.floor(ch / 2);
        const x1 = x0 + cw - 1;
        const y1 = y0 + ch - 1;
        const kind = ((i % 4) + 4) % 4;
        g.clear(x0, y0, x1, y1);
        g.box(x0, y0, x1, y1, far < 0.5 ? "acc" : far < 1.5 ? "lo" : "dim");
        const fill = far < 0.5 ? ["str", "fn", "type", "key"][kind] : "dim";
        for (let y = y0 + 1; y < y1; y++) {
          for (let x = x0 + 1; x < x1; x++) g.set(x, y, thumb(kind, (x - x0) / Math.max(1, cw - 1), (y - y0) / Math.max(1, ch - 1), i), fill);
        }
      }
    },
  },
  particles: {
    size: [48, 7, 3],
    init(o) {
      o.parts = Array.from({ length: 24 }, () => ({ x: random() * 60, v: 5 + random() * 15, a: random() * Math.PI * 2, amp: 0.4 + random() * 2.7, f: 0.5 + random() * 1.4, tone: random() < 0.35 ? "str" : random() < 0.55 ? "fn" : "hi" }));
    },
    draw(g, t, o) {
      const span = g.w + 6;
      const at = (p, x) => g.ay + Math.sin(p.a + x * 0.16 + t * p.f) * p.amp;
      const heads = o.parts.map((p) => ({ p, x: ((p.x + t * p.v) % span) - 3 }));
      for (const { p, x } of heads) {
        if (p.v > 9) g.set(x - 1, at(p, x - 1), "·", "lo");
        if (p.v > 14) g.set(x - 2, at(p, x - 2), "·", "dim");
      }
      for (const { p, x } of heads) g.set(x, at(p, x), p.v > 12 ? "•" : "°", p.tone);
    },
  },
  ratchet: {
    size: [48, 3, 1],
    init(o) {
      o.seed = Math.floor(random() * 65536);
    },
    draw(g, t, o) {
      const cycle = t / 1.35;
      const turn = Math.floor(cycle);
      const slide = smooth(clamp((cycle - turn - 0.55) / 0.45, 0, 1));
      const pitch = 11;
      const newest = Math.floor((g.w - 14) / pitch);
      for (let k = -1; k <= Math.ceil(g.w / pitch); k++) {
        const x0 = 3 + k * pitch - Math.round(slide * pitch);
        const key = ((Math.imul(turn + k + o.seed, 2654435761) >>> 0) & 0xffff).toString(16).padStart(4, "0");
        const burning = k === 0 && slide > 0;
        const tone = burning ? "dim" : k === newest ? "acc" : "lo";
        g.box(x0, 0, x0 + 7, 2, tone);
        g.set(x0, 1, "┤", tone);
        g.set(x0 + 7, 1, "├", tone);
        g.text(x0 + 2, 1, key, burning ? "dim" : "num");
        g.text(x0 + 8, 1, "──→", "lo");
        if (!burning) continue;
        for (let x = x0; x <= x0 + 7; x++) {
          for (let y = 0; y < 3; y++) if (random() < slide) g.set(x, y, random() < 0.5 ? "░" : "▒", "dim");
        }
      }
      g.clear(0, 0, 2, 2);
      g.set(0, 1, "↻", slide > 0 && slide < 1 ? "acc" : "mid");
      g.text(1, 1, "──", "lo");
    },
  },
  bongo: {
    size: [21, 5, 2],
    min: 21,
    draw(g, t) {
      const cx = Math.floor(g.w / 2);
      const beat = t % 2.4;
      const hit = beat < 1.4 ? Math.floor(beat / 0.17) % 2 : -1;
      const blink = t % 3.3 < 0.15;
      g.text(cx - 4, 0, "/\\_____/\\", "hi");
      for (const y of [1, 2]) {
        g.set(cx - 5, y, "(", "hi");
        g.set(cx + 5, y, ")", "hi");
      }
      g.set(cx - 2, 1, blink ? "-" : "o", "hi");
      g.set(cx + 2, 1, blink ? "-" : "o", "hi");
      g.set(cx, 2, "^", "acc");
      g.text(cx - 5, 3, hit === 0 ? "▄▄" : "▀▀", hit === 0 ? "hi" : "mid");
      g.text(cx + 4, 3, hit === 1 ? "▄▄" : "▀▀", hit === 1 ? "hi" : "mid");
      if (hit === 0) g.set(cx - 7, 3, "·", "acc");
      if (hit === 1) g.set(cx + 7, 3, "·", "acc");
      g.text(0, 4, "▔".repeat(g.w), "lo");
    },
  },
};

function objectGrid(w, h, ay) {
  const cells = new Array(w * h).fill(null);
  const set = (x, y, ch, tone = "mid") => {
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (cx < 0 || cx >= w || cy < 0 || cy >= h) return;
    cells[cy * w + cx] = ch === " " ? null : [ch, tone];
  };
  return {
    w,
    h,
    ay,
    cells,
    set,
    text(x, y, value, tone) {
      [...value].forEach((ch, k) => ch !== " " && set(x + k, y, ch, tone));
    },
    clear(x0, y0, x1, y1) {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) set(x, y, " ");
      }
    },
    box(x0, y0, x1, y1, tone) {
      for (let x = x0 + 1; x < x1; x++) {
        set(x, y0, "─", tone);
        set(x, y1, "─", tone);
      }
      for (let y = y0 + 1; y < y1; y++) {
        set(x0, y, "│", tone);
        set(x1, y, "│", tone);
      }
      set(x0, y0, "╭", tone);
      set(x1, y0, "╮", tone);
      set(x0, y1, "╰", tone);
      set(x1, y1, "╯", tone);
    },
  };
}

function toneOf(tone) {
  const [alpha, kind] = TONES[tone] || TONES.mid;
  return [alpha, kind === "accent" ? visit.accent : visit.tints[kind] || visit.tints.text];
}

function objectKind(file) {
  return OBJECT_OF[`${file.repo}/${file.path}`] || null;
}

function objectRegion(line) {
  const spec = OBJECTS[objectKind(line.file)];
  const { pane, r } = line;
  const [want, h, ay] = spec.size;
  const w = Math.min(want, pane.codeC1 - pane.codeC0 - 1);
  if (w < (spec.min || 32) || h > wall.rows - 4) return null;
  const extent = lineExtent(r, pane.codeC0, pane.codeC1);
  const c0 = clamp(extent ? extent[0] : pane.codeC0, pane.codeC0, pane.codeC1 - w);
  const x0 = cellX(c0);
  const x1 = cellX(c0 + w);
  for (const shift of [0, 1, -1, 2, -2, 3, -3]) {
    const r0 = r - ay + shift;
    if (r0 < 1 || r0 + h > wall.rows - 1 || r < r0 || r >= r0 + h) continue;
    if (wall.fade[r0] < 0.6 || wall.fade[r0 + h - 1] < 0.6) continue;
    const y0 = r0 * CELL_H;
    const y1 = (r0 + h) * CELL_H;
    if (wall.blocked.some((z) => x1 > z.x0 && x0 < z.x1 && y1 > z.y0 && y0 < z.y1)) continue;
    return { spec, w, h, r0, c0 };
  }
  return null;
}

function objectClear({ r0, c0, w, h }) {
  if (block && r0 < block.at.row + block.at.rows && r0 + h > block.at.row) return false;
  if ((message?.rows || []).some((row) => {
    const said = screenRow(row);
    return said >= r0 && said < r0 + h;
  })) return false;
  for (const r of visitorSession?.saved.keys() || []) if (r >= r0 && r < r0 + h) return false;
  return true;
}

function startObject(line, run = 0) {
  if (!line || !wall || leaving || !objectKind(line.file)) return false;
  endObject();
  if (ghost.act && !ghost.terminal && !touchMode) abortGhost();
  const region = objectRegion(line);
  if (!region || !objectClear(region)) return false;
  if (tile && region.r0 < tile.row + tile.rows && region.r0 + region.h > tile.row && cellX(region.c0) < tile.x + tile.w && cellX(region.c0 + region.w) > tile.x) close(performance.now());
  if (!ghost.terminal && (rowsTouch(region.r0, region.h, ghost.rows, 0) || rowsTouch(region.r0, region.h, ghost.saved.keys(), 0))) abortGhost();
  const now = performance.now();
  const saved = new Map();
  for (let y = region.r0; y < region.r0 + region.h; y++) {
    for (let x = region.c0; x < region.c0 + region.w; x++) {
      const i = y * wall.cols + x;
      saved.set(i, [wall.chars[i], wall.alphas[i], wall.tints[i]]);
    }
  }
  object = {
    ...region,
    pane: line.pane,
    line: line.r,
    source: line,
    saved,
    inside: new Set(),
    jitter: Array.from({ length: region.w * region.h }, () => random() * 0.8),
    reveal: spring(0, 0.5, 1),
    state: "in",
    start: now,
    last: now,
    awayAt: 0,
    endAt: now + (touchMode ? 6000 : OBJECT_LIFE),
    until: run ? now + run : 0,
    o: {},
  };
  object.reveal.target = region.h + 1;
  object.spec.init?.(object.o);
  clearTimeout(dwellTimer);
  dwellTimer = 0;
  if (hover) repaint(hover.pane.c0, hover.r, hover.pane.codeC1 - 1, hover.r);
  if (editor.shown && inObject(ghost.caret.c, ghost.caret.r)) hideCursor();
  clearInterval(objectTimer);
  objectTimer = setInterval(objectTick, TICK_MS);
  objectTick();
  return true;
}

function objectTick() {
  if (!object || !wall) {
    clearInterval(objectTimer);
    objectTimer = 0;
    return;
  }
  const now = performance.now();
  const dt = (now - object.last) / 1000;
  object.last = now;
  const over = !touchMode && pointer.inside && pointer.x >= cellX(object.c0 - 2) && pointer.x < cellX(object.c0 + object.w + 2) && pointer.y >= (object.r0 - 1) * CELL_H && pointer.y < (object.r0 + object.h + 1) * CELL_H;
  if (object.state === "in") {
    if (object.until) {
      if (now >= object.until) exitObject();
    } else {
      object.awayAt = over || touchMode ? 0 : object.awayAt || now + 600;
      if ((object.awayAt && now >= object.awayAt) || now >= object.endAt) exitObject();
    }
  } else if (over && now < object.endAt && !object.until) {
    object.state = "in";
    object.awayAt = 0;
    object.reveal.target = object.h + 1;
    object.reveal.response = 0.5;
  }
  advance(object.reveal, dt);
  if (object.state === "out" && object.reveal.value <= -0.95) {
    endObject();
    showCursor();
    return;
  }
  paintObject(now);
}

function paintObject(now) {
  const { w, h, r0, c0, line, spec } = object;
  const g = objectGrid(w, h, spec.size[2]);
  spec.draw(g, prefersStill() ? 1.5 : (now - object.start) / 1000, object.o);
  const reach = object.reveal.value;
  for (let y = 0; y < h; y++) {
    const dist = Math.abs(r0 + y - line);
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      const i = (r0 + y) * wall.cols + c0 + x;
      const was = object.inside.has(i);
      if (dist + object.jitter[k] < reach) {
        const [ch, tone] = g.cells[k] || [" ", "dim"];
        const [alpha, tint] = toneOf(tone);
        if (!was) {
          object.inside.add(i);
          morph(i, ch, alpha, ri(2, 6), tint);
        } else if (wall.chars[i] !== ch || wall.alphas[i] !== alpha || wall.tints[i] !== tint) {
          wall.chars[i] = ch;
          wall.alphas[i] = alpha;
          wall.tints[i] = tint;
          flux.dirty.add(i);
        }
      } else if (was) {
        object.inside.delete(i);
        const [ch, alpha, tint] = object.saved.get(i);
        morph(i, ch, alpha, ri(2, 6), tint);
      }
    }
  }
  flushDirty();
}

function exitObject() {
  if (!object || object.state === "out") return;
  object.state = "out";
  object.reveal.target = -1;
  object.reveal.response = 0.35;
}

function endObject() {
  if (!object) return;
  const done = object;
  object = null;
  clearInterval(objectTimer);
  objectTimer = 0;
  objectCalmUntil = performance.now() + 400;
  if (!wall) return;
  for (const i of done.inside) {
    const [ch, alpha, tint] = done.saved.get(i);
    morph(i, ch, alpha, 0, tint);
  }
  flushDirty();
  if (hover) repaint(hover.pane.c0, hover.r, hover.pane.codeC1 - 1, hover.r);
  setNote(hover);
}

function paneAt(c) {
  return wall.panes.find((pane) => c >= pane.c0 && c < pane.c0 + pane.width) || null;
}

function paneNear(c) {
  return wall.panes.find((pane) => c <= pane.c0 + pane.width) || wall.panes[wall.panes.length - 1];
}

function runScroll() {
  if (scrollFrame) return;
  scrollClock = performance.now();
  scrollFrame = requestAnimationFrame(scrollStep);
}

function scrollStep(now) {
  scrollFrame = 0;
  if (!wall) return;
  const dt = (now - scrollClock) / 1000;
  scrollClock = now;
  let moving = false;
  for (const pane of wall.panes) {
    if (pane.dragging) continue;
    if (!advance(pane.scroll, dt)) moving = true;
    syncPane(pane);
  }
  if (moving) scrollFrame = requestAnimationFrame(scrollStep);
}

function syncPane(pane) {
  const length = pane.file.rows.length;
  const start = ((Math.round(pane.scroll.value) % length) + length) % length;
  if (start === pane.start) return;
  disturb(pane);
  renderPane(pane);
  repaint(pane.c0, 0, paneRight(pane), wall.rows - 1);
  lastScrollAt = performance.now();
  refreshHover();
}

function disturb(pane) {
  const right = paneRight(pane);
  const x0 = cellX(pane.c0);
  const x1 = cellX(right + 1);
  clearTimeout(dwellTimer);
  dwellTimer = 0;
  if (ghostBusy()) abortGhost();
  if (object?.pane === pane) endObject();
  if (visitorSession?.pane === pane) dropVisitor();
  if (block && block.at.x < x1 && block.at.x + block.at.w > x0) retractBlock();
  if (tile && tile.cx - tile.w / 2 < x1 && tile.cx + tile.w / 2 > x0) close(performance.now());
  hideCursor();
}

function jumpPane(pane, rows, edge) {
  const s = pane.scroll;
  const length = pane.file.rows.length;
  const base = Math.round(s.target);
  const offset = ((base % length) + length) % length;
  let next = base + rows;
  if (edge === "Home") next = base - offset;
  if (edge === "End") next = base - offset + Math.max(0, length - wall.rows);
  s.value = next;
  s.target = next;
  s.velocity = 0;
  syncPane(pane);
}

function lineAt(x, y) {
  if (!wall || leaving) return null;
  const c = Math.floor(x / CELL_W);
  const r = Math.floor(y / CELL_H);
  if (r < 0 || r >= wall.rows || c < 0 || c >= wall.cols) return null;
  if (wall.fade[r] < 0.35 || r > wall.revealed) return null;
  if (wall.blocked.some((z) => x >= z.x0 && x < z.x1 && y >= z.y0 && y < z.y1)) return null;
  if (inObject(c, r) || inTerminal(c, r) || inPicker(c, r)) return null;
  const pane = paneAt(c);
  const shown = pane && rowOf(pane, r);
  const row = shown?.cont || shown;
  if (!pane || !row || !row.file?.repo || row.num === null) return null;
  return { pane, r, n: row.num, file: row.file };
}

function setHover(next, arm = true) {
  const same = hover && next && hover.pane === next.pane && hover.r === next.r && hover.n === next.n;
  if (same || (!hover && !next)) return;
  const previous = hover;
  hover = next;
  if (previous) repaint(previous.pane.c0, previous.r, previous.pane.codeC1 - 1, previous.r);
  if (next) repaint(next.pane.c0, next.r, next.pane.codeC1 - 1, next.r);
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => setNote(hover || object?.source || null), next ? 160 : 700);
  clearTimeout(dwellTimer);
  dwellTimer = 0;
  if (next && arm && !touchMode && objectKind(next.file)) dwellTimer = setTimeout(() => dwell(next), OBJECT_DWELL);
}

function dwell(line) {
  dwellTimer = 0;
  if (hover !== line || leaving) return;
  const now = performance.now();
  if (now - lastVisitorKeyAt < 2500) return;
  if (object || now < objectCalmUntil || (ghost.act && !ghost.terminal)) {
    dwellTimer = setTimeout(() => dwell(line), Math.max(250, objectCalmUntil - now));
    return;
  }
  startObject(line);
}

function refreshHover() {
  if (touchMode || !pointer.inside || pointer.x < 0) return;
  setHover(lineAt(pointer.x, pointer.y), false);
}

function fitNote(textValue) {
  const room = clamp(wall?.noteRoom || 40, 12, 64);
  if (textValue.length <= room) return textValue;
  const keep = room - 1;
  return `${textValue.slice(0, Math.ceil(keep * 0.35))}…${textValue.slice(textValue.length - Math.floor(keep * 0.65))}`;
}

function setNote(line) {
  if (!noteLine) return;
  noteLine.textContent = line ? fitNote(`${line.file.repo}/${line.file.path}:${line.n}`) : NOTE_TEXT;
}

function dragTo(event, now) {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  const s = drag.pane.scroll;
  if (!drag.moved) {
    if (Math.abs(event.clientY - drag.y) < 25) return;
    drag.moved = true;
    drag.y = event.clientY;
    drag.from = s.value;
    drag.pane.dragging = true;
    clearTimeout(touch.unhover);
    setHover(null);
  }
  s.value = drag.from - (event.clientY - drag.y) / CELL_H;
  s.target = s.value;
  s.velocity = 0;
  drag.samples.push([now, event.clientY]);
  if (drag.samples.length > 8) drag.samples.shift();
  syncPane(drag.pane);
}

function fling(ended, now) {
  const { pane, samples } = ended;
  pane.dragging = false;
  const recent = samples.filter(([at]) => now - at < 120);
  const [t0, y0] = recent[0] || samples[samples.length - 1];
  const [t1, y1] = samples[samples.length - 1];
  const vy = t1 - t0 > 8 ? ((y1 - y0) / (t1 - t0)) * 1000 : 0;
  const s = pane.scroll;
  if (prefersStill()) {
    s.target = s.value;
  } else {
    s.velocity = -vy / CELL_H;
    s.target = s.value - (((vy / 1000) * 0.998) / (1 - 0.998)) / CELL_H;
    s.response = 0.9;
  }
  runScroll();
}

function tap(x, y) {
  if (picker) {
    pickerClick(x, y);
    return;
  }
  const line = lineAt(x, y);
  setHover(line, false);
  clearTimeout(hoverTimer);
  setNote(line || object?.source || null);
  clearTimeout(touch.unhover);
  touch.unhover = setTimeout(() => setHover(null), 5000);
  if (!line || !startObject(line)) exitObject();
}

window.addEventListener("pointermove", (event) => {
  const now = performance.now();
  const isTouch = event.pointerType === "touch" || event.pointerType === "pen";
  lastPointerType = event.pointerType;
  if (drag && event.pointerId === drag.id) {
    touch.lastAt = now;
    dragTo(event, now);
    return;
  }
  if (pointer.x >= 0) pointer.travelled += Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y);
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.lastMove = now;
  pointer.inside = true;
  if (isTouch) touch.lastAt = now;
  else setHover(event.target === wallCanvas ? lineAt(event.clientX, event.clientY) : null);
  if (!isTouch && pointer.travelled > 220 && canOpen(now)) {
    pointer.travelled = 0;
    open(now);
  } else if (tile) {
    loop();
  }
});

window.addEventListener("pointerdown", (event) => {
  lastPointerType = event.pointerType;
  if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
  const now = performance.now();
  touch.active = true;
  touch.lastAt = now;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.lastMove = now;
  pointer.inside = true;
  askTilt();
  if (event.target === wallCanvas && wall && !leaving && !drag) {
    const pane = paneNear(Math.floor(event.clientX / CELL_W));
    pane.scroll.target = pane.scroll.value;
    pane.scroll.velocity = 0;
    drag = { pane, id: event.pointerId, y: event.clientY, from: pane.scroll.value, at: now, moved: false, samples: [[now, event.clientY]] };
  }
  if (tile) loop();
});

window.addEventListener("pointerup", (event) => {
  if (event.pointerType === "touch" || event.pointerType === "pen") touch.active = false;
  if (!drag || event.pointerId !== drag.id) return;
  const ended = drag;
  drag = null;
  const now = performance.now();
  if (ended.moved) fling(ended, now);
  else if (now - ended.at < 500) tap(event.clientX, event.clientY);
});

window.addEventListener("pointercancel", (event) => {
  touch.active = false;
  if (!drag || event.pointerId !== drag.id) return;
  drag.pane.dragging = false;
  drag = null;
  runScroll();
});

wallCanvas.addEventListener("click", (event) => {
  if (lastPointerType !== "mouse" || event.button !== 0 || leaving || !wall) return;
  if (picker) {
    pickerClick(event.clientX, event.clientY);
    return;
  }
  const line = lineAt(event.clientX, event.clientY);
  if (line) startObject(line);
  else if (!inObject(Math.floor(event.clientX / CELL_W), Math.floor(event.clientY / CELL_H))) exitObject();
});

window.addEventListener(
  "wheel",
  (event) => {
    if (!wall || leaving || event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    if (boot.active) finishBoot();
    if (picker) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const pane = paneNear(clamp(Math.floor(event.clientX / CELL_W), 0, wall.cols - 1));
    const rows = event.deltaMode === 1 ? event.deltaY : event.deltaMode === 2 ? event.deltaY * (wall.rows - 4) : event.deltaY / CELL_H;
    pane.scroll.target += rows;
    pane.scroll.response = event.deltaMode === 0 && Math.abs(event.deltaY) < 40 ? 0.14 : 0.3;
    runScroll();
  },
  { passive: false },
);

function askTilt() {
  if (touch.asked) return;
  touch.asked = true;
  const listen = () => window.addEventListener("deviceorientation", (event) => {
    if (event.beta === null || event.gamma === null) return;
    touch.tilt = { vx: clamp(event.gamma / 25, -1, 1), vy: clamp((event.beta - 50) / 25, -1, 1), at: performance.now() };
  });
  const request = window.DeviceOrientationEvent?.requestPermission;
  if (typeof request === "function") request.call(window.DeviceOrientationEvent).then((state) => state === "granted" && listen()).catch(() => {});
  else if ("DeviceOrientationEvent" in window) listen();
}

function startDive(origin, start, rp) {
  const far = Math.hypot(wall.width, wall.height);
  const count = wall.width < 700 ? DIVE.phone : DIVE.count;
  const parts = [];
  for (let k = 0; k < count; k++) {
    parts.push({ r: rp + 4 + random() ** 2.2 * far, a: random() * Math.PI * 2, s: 0.55 + random() * 0.9, w: (0.12 + random() * 0.4) * (random() < 0.5 ? -1 : 1) });
  }
  dive = { start, origin, rp, far, parts, last: 0 };
}

function diveRadius(t, d) {
  const side = Math.min(wall.width, wall.height);
  const open = d.rp + (0.3 * side - d.rp) * (1 - (1 - clamp(t / 0.3, 0, 1)) ** 3);
  const hover = 0.08 * side * smooth(clamp((t - 0.3) / 0.5, 0, 1));
  const swallow = d.far * smooth(clamp((t - 0.8) / 0.2, 0, 1)) ** 2;
  return open + hover + swallow;
}

function drawDive(g, now) {
  const d = dive;
  const t = (now - d.start) / DIVE.ms;
  const glide = smooth(clamp(t / 0.45, 0, 1));
  const cx = d.origin[0] + (wall.width / 2 - d.origin[0]) * glide;
  const cy = d.origin[1] + (wall.height / 2 - d.origin[1]) * glide;
  if (t >= 1) {
    g.fillStyle = "#000";
    g.fillRect(0, 0, wall.width, wall.height);
    return;
  }
  const dt = d.last ? Math.min(0.05, (now - d.last) / 1000) : 1 / 60;
  d.last = now;
  const R = diveRadius(t, d);
  const pull = 1 + 2.5 * t + 14 * smooth(clamp((t - 0.78) / 0.22, 0, 1));
  const fade = smooth(clamp(t / 0.22, 0, 1));
  const paths = Array.from({ length: DIVE.buckets }, () => new Path2D());
  for (const p of d.parts) {
    if (p.r <= R + 0.5) {
      p.r = R + 8 + random() ** 2.2 * d.far;
      p.a = random() * Math.PI * 2;
      continue;
    }
    const v = (70 + 14000 / (Math.max(4, p.r - R) + 40)) * p.s * pull;
    p.r -= v * dt;
    p.a += p.w * dt * (1 + (2 * R) / Math.max(p.r, 1));
    if (p.r <= R + 0.5) continue;
    const tail = Math.min(p.r - R + 60, v * 0.05 + 2);
    const glow = Math.exp(-(p.r - R) / (0.3 * R + 70));
    const k = Math.min(DIVE.buckets - 1, Math.floor((0.1 + 0.9 * glow) * DIVE.buckets));
    const ca = Math.cos(p.a);
    const sa = Math.sin(p.a);
    paths[k].moveTo(cx + ca * (p.r + tail), cy + sa * (p.r + tail));
    paths[k].lineTo(cx + ca * p.r, cy + sa * p.r);
  }
  g.save();
  const halo = g.createRadialGradient(cx, cy, R, cx, cy, R * 1.6 + 40);
  halo.addColorStop(0, `rgba(${INK}, ${(0.16 * fade).toFixed(3)})`);
  halo.addColorStop(1, `rgba(${INK}, 0)`);
  g.fillStyle = halo;
  g.fillRect(0, 0, wall.width, wall.height);
  g.lineCap = "round";
  g.lineWidth = 1;
  for (let k = 0; k < DIVE.buckets; k++) {
    g.strokeStyle = `rgba(${INK}, ${(fade * (0.18 + (0.82 * (k + 1)) / DIVE.buckets)).toFixed(3)})`;
    g.stroke(paths[k]);
  }
  for (const [width, alpha] of [[14, 0.05], [6, 0.12], [2.2, 0.45], [1, 0.95]]) {
    g.lineWidth = width;
    g.strokeStyle = `rgba(${INK}, ${(alpha * fade).toFixed(3)})`;
    g.beginPath();
    g.arc(cx, cy, R + width * 0.3, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = "#000";
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function zoomInto() {
  return new Promise((resolve) => {
    if (!tile) {
      resolve();
      return;
    }
    const p = pupilOf(tile);
    const start = performance.now();
    const ease = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2);
    tile.zoom = { origin: [p.x, p.y], scale: 1 };
    startDive([p.x, p.y], start, p.rp);
    const grow = (now) => {
      if (!tile?.zoom) {
        resolve();
        return;
      }
      const x = clamp((now - start) / 900, 0, 1);
      tile.zoom.scale = 64 ** ease(x);
      if (now - start < DIVE.ms) requestAnimationFrame(grow);
      else resolve();
    };
    requestAnimationFrame(grow);
    loop();
  });
}

async function leave(href) {
  if (leaving) return;
  leaving = true;
  if (prefersStill() || !wall) {
    window.location.href = href;
    return;
  }
  clearTimeout(director.timer);
  abortGhost();
  abortBlock();
  endObject();
  endVisitor(false);
  clearTimeout(dwellTimer);
  setHover(null);
  hideCursor();
  cmdSay("");
  document.documentElement.classList.add("is-leaving");
  const now = performance.now();
  if (!tile) {
    open(now, chooseTile([wall.width / 2, wall.height / 2]) || centeredTile());
  } else if (tile.state === "closing") {
    tile.state = "opening";
    tile.lid.target = 1;
    tile.lid.response = 0.45;
    loop();
  }
  tile.leaving = true;
  tile.closeAt = Infinity;
  for (let k = 0; k < 50 && tile && (tile.state !== "open" || tile.lid.value < 0.99); k++) await sleep(40);
  if (!tile) {
    window.location.href = href;
    return;
  }
  const reach = Math.hypot(wall.width, wall.height);
  for (let r = 0; r < wall.rows; r++) {
    for (let c = 0; c < wall.cols; c++) {
      const i = r * wall.cols + c;
      if (wall.chars[i] === " ") continue;
      const d = Math.hypot(cellX(c) - tile.cx, r * CELL_H - tile.cy) / reach;
      morph(i, " ", wall.alphas[i], 2 + Math.round(d * 20) + ri(0, 3));
    }
  }
  flushDirty();
  await sleep(700);
  if (tile) await zoomInto();
  window.location.href = href;
}

themeKey?.addEventListener("click", (event) => {
  event.preventDefault();
  if (picker) closePicker(true);
  else openPicker();
});

enterLink?.addEventListener("click", (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  leave(enterLink.href);
});

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented) return;
  if (boot.active && event.key !== "Enter") finishBoot();
  const active = document.activeElement;
  const free = !active || active === document.body || active === document.documentElement;
  if (picker && free) {
    event.preventDefault();
    pickerKey(event);
    return;
  }
  if (event.key === "Escape" && visitorSession && free) {
    event.preventDefault();
    endVisitor(true);
    return;
  }
  if (event.key === "Enter") {
    if (!enterLink || (!free && active !== enterLink)) return;
    event.preventDefault();
    leave(enterLink.href);
    return;
  }
  if (!free || !wall || leaving || event.ctrlKey || event.metaKey || event.altKey) return;
  if ((event.key.length === 1 || event.key === "Backspace") && !event.isComposing) {
    event.preventDefault();
    if (event.key === ":" && !visitorSession) {
      pressKey(event.code, event.shiftKey);
      openPicker();
      return;
    }
    visitorKey(event);
    return;
  }
  const page = Math.max(1, wall.rows - 6);
  const steps = { ArrowDown: 3, ArrowUp: -3, PageDown: page, PageUp: -page };
  const edge = event.key === "Home" || event.key === "End" ? event.key : null;
  if (!(event.key in steps) && !edge) return;
  event.preventDefault();
  const under = pointer.inside && pointer.x >= 0 ? paneNear(Math.floor(pointer.x / CELL_W)) : null;
  for (const pane of under ? [under] : wall.panes) jumpPane(pane, steps[event.key] || 0, edge);
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted && leaving) window.location.reload();
});

document.documentElement.addEventListener("pointerleave", () => {
  pointer.inside = false;
  if (!touchMode) setHover(null);
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  cancelAnimationFrame(frame);
  frame = 0;
  closeNow();
  abortBlock();
  endObject();
  endVisitor(false);
  closePicker(true);
  if (keyboard) {
    keyboard.vis.value = 0;
    keyboard.vis.target = 0;
    keyboard.lastAt = -Infinity;
  }
  if (wall) abortGhost();
});

onWidthResize(() => {
  cancelAnimationFrame(frame);
  frame = 0;
  closeNow();
  abortBlock();
  renderWall();
});

function markSeen() {
  let timer = 0;
  const arm = () => {
    clearTimeout(timer);
    if (document.hidden) return;
    timer = setTimeout(() => {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", arm);
      navigator.sendBeacon?.("/api/seen");
    }, 1000);
  };
  document.addEventListener("visibilitychange", arm);
  arm();
}

function loadFace() {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    const track = fetch(`face-track.json?v=${ASSET_V}`)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    video.addEventListener("loadedmetadata", async () => {
      const data = await track;
      resolve(data ? { video, track: data } : null);
    }, { once: true });
    video.addEventListener("error", () => resolve(null), { once: true });
    fetch(video.canPlayType('video/webm; codecs="vp9"') ? `face.webm?v=${ASSET_V}` : `face.mp4?v=${ASSET_V}`)
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => {
        video.src = URL.createObjectURL(blob);
      })
      .catch(() => resolve(null));
  });
}

const [wallData, wallText] = await Promise.all([
  fetch(`wall.json?v=${ASSET_V}`).then((response) => (response.ok ? response.json() : null)).catch(() => null),
  fetch(`wall.txt?v=${ASSET_V}`).then((response) => (response.ok ? response.text() : "")).catch(() => ""),
  document.fonts.load(`${FONT_PX}px "Plex Mono"`),
]);
visit = planVisit(wallData, wallText);
useTheme(visit.theme);
text = visit.files.flatMap((file) => file.lines.map((line) => line.trim())).filter(Boolean).join(" ");
({ codeText, codeKinds } = codeSource(visit.files));
renderWall();
bootView();
markSeen();
navigator.keyboard
  ?.getLayoutMap?.()
  .then((map) => {
    layoutMap = map;
    if (wall) layoutKeyboard();
  })
  .catch(() => {});
loadFace().then((loaded) => {
  face = loaded;
});
