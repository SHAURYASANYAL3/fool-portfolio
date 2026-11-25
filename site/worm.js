const MOVE = { creep: 64, tunnel: 260, surge: 1.15, pauseEvery: [1800, 3600], pause: [380, 900] };
const BODY = { base: 46, perChar: 3.2, maxChars: 64, radius: 7.5, ring: 4.4, wave: 26, step: 1.5, keep: 60, swallow: 48 };
const TIMING = { lurk: [5200, 8200], watch: [2200, 3400], seek: 1300, wake: 2400 };
const SONAR = { every: 1500, speed: 540 };
const FLEE_PX = 84;
const AVOID_PX = 150;
const IDLE_MS = 6000;
const SPUR_MS = 6500;
const HOLE_MS = 1100;
const RIPPLE_MS = 650;
const REPAIR_WAIT = [5000, 8000];
const REPAIR_LATE = 4000;
const VISIT = { first: 45000, every: [70000, 140000], stay: [9000, 15000], fadeIn: 1200, fadeOut: 2500, orbit: 34 };
const GUARD = { first: 20000, every: [70000, 150000], look: 700, zap: 900 };
const GLYPH_PX = 5.5;
const FW = GLYPH_PX * 0.6;
const FH = GLYPH_PX * 1.08;
const EM_TOP = 1025 / 1300;
const TONE = { floor: 0.04, range: 0.9, gamma: 1.2, base: 0.05, bold: 0.55 };
const TAU = Math.PI * 2;
const WORD = /[A-Za-z0-9][\w.+#-]*[A-Za-z0-9]|\d/g;
const STOP = new Set("the and for with you this that from are can into your all not has its our was but use via one out any how".split(" "));

const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const narrow = matchMedia("(max-width: 700px)");
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const between = (low, high) => low + Math.random() * (high - low);
const ease = (t) => 1 - (1 - clamp(t, 0, 1)) ** 3;
const smooth = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

function chaikin(points, rounds) {
  let pts = points;
  for (let k = 0; k < rounds && pts.length > 2; k++) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

function makePlan(f, points, rounds) {
  const pts = chaikin(points, rounds);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { f, pts, cum, total: cum[cum.length - 1], pos: 0, i: 0 };
}

function pointAt(plan, pos) {
  const { pts, cum } = plan;
  if (pts.length === 1) return pts[0];
  let i = clamp(plan.i, 0, pts.length - 2);
  while (i < pts.length - 2 && cum[i + 1] < pos) i++;
  while (i > 0 && cum[i] > pos) i--;
  plan.i = i;
  const span = cum[i + 1] - cum[i] || 1;
  const t = clamp((pos - cum[i]) / span, 0, 1);
  return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t };
}

export function createWorm({ buffer, status, colors, pointer, touchedAt, seed, family = null, den = null, sleeping = false }) {
  const size = { cw: 7.2, ch: 13 };
  const holeMarks = typeof Highlight === "function" && globalThis.CSS?.highlights ? new Highlight() : null;
  if (holeMarks) CSS.highlights.set("worm-eaten", holeMarks);
  let eatenIn = new WeakMap();
  let frame = null;
  let bounds = null;
  let eyeRect = null;
  let seenWidth = -1;
  let seenHeight = -1;
  let settlePending = true;
  let contentChanged = false;
  let shifted = false;
  let trail = [];
  let nextId = 0;
  let head = null;
  let headLen = 0;
  let homeAt = null;
  let familyAt = performance.now() + GUARD.first;
  let zapAt = 0;
  let zapped = false;
  let data = [];
  let bites = [];
  let plan = null;
  let tunnel = null;
  let pending = null;
  let eyeHost = null;
  let nextVisitAt = performance.now() + VISIT.first;
  let inside = null;
  let exitAt = -Infinity;
  let eyeSeenAt = -Infinity;
  let mode = sleeping ? "off" : "rest";
  let asleep = sleeping;
  let purpose = "home";
  let until = 0;
  const wakeAt = performance.now() + TIMING.wake;
  let pauseUntil = 0;
  let nextPauseAt = 0;
  let phase = 0;
  let last = 0;
  let spurUntil = 0;
  let target = null;
  let lockAt = -Infinity;
  let hitAt = -Infinity;
  let bitAt = -Infinity;
  let pingedAt = -Infinity;
  let pingNext = 0;
  let pings = [];
  let eatenLog = [];
  let holes = [];
  let ripples = [];
  let grid = null;

  function resize() {
    const style = getComputedStyle(document.body);
    size.cw = parseFloat(style.getPropertyValue("--cell-w")) || 7.2;
    size.ch = parseFloat(style.getPropertyValue("--cell-h")) || 13;
    settlePending = true;
  }

  function measure() {
    const b = buffer.getBoundingClientRect();
    const clip = { x: b.left + buffer.clientLeft, y: b.top + buffer.clientTop, w: buffer.clientWidth, h: buffer.clientHeight };
    frame = { s: status.getBoundingClientRect(), clip, ox: clip.x - buffer.scrollLeft, oy: clip.y - buffer.scrollTop };
    if (buffer.clientWidth !== seenWidth) {
      seenWidth = buffer.clientWidth;
      settlePending = true;
    }
    if (buffer.scrollHeight !== seenHeight) {
      if (seenHeight >= 0) shifted = true;
      seenHeight = buffer.scrollHeight;
    }
  }

  function build() {
    const tx = buffer.querySelector(".ln .tx");
    if (!tx) {
      bounds = null;
      return;
    }
    const rect = tx.getBoundingClientRect();
    bounds = { left: 6, right: rect.right - frame.ox - 6 };
  }

  const screenOf = (p) => (p.f === "s" ? { x: frame.s.left + p.x, y: frame.s.top + p.y } : p.f === "e" ? { x: eyeHost.cx + p.x, y: eyeHost.cy + p.y } : { x: frame.ox + p.x, y: frame.oy + p.y });
  const toField = (f, x, y) => (f === "s" ? { f, x: x - frame.s.left, y: y - frame.s.top } : f === "e" ? { f, x: x - eyeHost.cx, y: y - eyeHost.cy } : { f, x: x - frame.ox, y: y - frame.oy });

  function fieldAt(x, y) {
    const { clip, s } = frame;
    if (x >= clip.x && x < clip.x + clip.w && y >= clip.y && y < clip.y + clip.h) return "b";
    if (x >= s.left && x < s.right && y >= s.top && y < s.bottom) return "s";
    return null;
  }

  function home() {
    const { s } = frame;
    const hole = den?.getBoundingClientRect();
    if (hole?.width) return { f: "s", x: hole.left + hole.width / 2 - s.left, y: size.ch / 2 };
    const cols = Math.max(4, Math.floor(s.width / size.cw));
    const taken = [];
    for (const node of status.children) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const text = range.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      const filled = getComputedStyle(node).backgroundColor !== "rgba(0, 0, 0, 0)";
      if (!filled && !text.width) continue;
      const left = filled ? box.left : text.left;
      const right = filled ? box.right : Math.min(text.right, box.right);
      taken.push([Math.floor((left - s.left) / size.cw), Math.ceil((right - s.left) / size.cw)]);
    }
    taken.sort((a, b) => a[0] - b[0]);
    const want = clamp(eyeRect ? Math.round((eyeRect.cx - s.left) / size.cw) : cols - 8, 0, cols - 1);
    let best = null;
    let from = 0;
    for (const [a, b] of [...taken, [cols, cols]]) {
      if (a > from) {
        const roomy = a - from >= 3;
        const c = clamp(want, roomy ? from + 1 : from, roomy ? a - 2 : a - 1);
        if (best === null || Math.abs(c - want) < Math.abs(best - want)) best = c;
      }
      from = Math.max(from, b);
    }
    return { f: "s", x: (best ?? want) * size.cw + size.cw / 2, y: size.ch / 2 };
  }

  function neckFrom(at) {
    const lean = eyeRect ? clamp((eyeRect.cx - frame.s.left - at.x) / 220, -1, 1) : 0;
    return [
      { x: at.x, y: at.y },
      { x: at.x, y: at.y - 10 },
      { x: at.x + lean * 6, y: at.y - 22 },
      { x: at.x + lean * 9, y: at.y - 28 },
    ];
  }

  const bodyLength = () => BODY.base + data.length * BODY.perChar;
  const awake = (now) => finePointer.matches || now - touchedAt() > IDLE_MS;

  function aim(next, now) {
    target = next;
    lockAt = now;
    pingNext = now + 250;
    pings = [];
  }

  function record() {
    const prev = trail[trail.length - 1];
    if (prev) {
      let d;
      if (prev.f === head.f) d = Math.hypot(head.x - prev.x, head.y - prev.y);
      else {
        const a = screenOf(prev);
        const b = screenOf(head);
        d = Math.hypot(b.x - a.x, b.y - a.y);
      }
      if (d < BODY.step) return;
      headLen += d;
    }
    trail.push({ id: nextId++, f: head.f, x: head.x, y: head.y, under: head.under, len: headLen, passed: 0 });
  }

  function follow(f, points, next, now) {
    plan = makePlan(f, points, 2);
    purpose = next;
    mode = "move";
    nextPauseAt = now + between(...MOVE.pauseEvery);
  }

  function dig(to, then, now) {
    if (head && !head.under && head.f === "s" && homeAt && mode !== "move") {
      pending = { to, then };
      follow("s", [{ x: head.x, y: head.y }, { x: homeAt.x + 6, y: homeAt.y - 15 }, { x: homeAt.x + 2, y: homeAt.y + 1 }], "dive", now);
      return;
    }
    pending = null;
    const end = screenOf(to);
    let from;
    if (mode === "tunnel" && tunnel) from = pointAt(tunnel.plan, tunnel.plan.pos);
    else if (head) from = screenOf(head);
    else from = { x: end.x, y: end.y + 40 };
    if (head && !head.under && head.f !== "e") holes.push({ f: head.f, x: head.x, y: head.y, at: now, open: true });
    if (head) head = { ...head, under: true };
    const dx = end.x - from.x;
    const dy = end.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const bend = (Math.random() - 0.5) * Math.min(length * 0.45, 160);
    const cx = (from.x + end.x) / 2 - (dy / length) * bend;
    const cy = (from.y + end.y) / 2 + (dx / length) * bend;
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const t = k / 24;
      const u = 1 - t;
      pts.push({ x: u * u * from.x + 2 * u * t * cx + t * t * end.x, y: u * u * from.y + 2 * u * t * cy + t * t * end.y });
    }
    tunnel = { plan: makePlan("screen", pts, 0), to, then, marked: 0 };
    plan = null;
    mode = "tunnel";
  }

  function vanish() {
    mode = "off";
    trail = [];
    head = null;
    plan = null;
    tunnel = null;
    pending = null;
    target = null;
    purpose = "home";
    holes = [];
    ripples = [];
    pings = [];
    bites = [];
  }

  function goHome(now) {
    target = null;
    const at = home();
    dig(at, { purpose: "home", points: neckFrom(at) }, now);
  }

  function burrow(now, dt) {
    const t = tunnel;
    t.plan.pos = Math.min(t.plan.total, t.plan.pos + MOVE.tunnel * dt);
    const at = pointAt(t.plan, t.plan.pos);
    head = { ...toField(t.to.f, at.x, at.y), under: true };
    record();
    if (t.plan.pos - t.marked >= 5) {
      t.marked = t.plan.pos;
      const f = fieldAt(at.x, at.y);
      if (f) ripples.push({ ...toField(f, at.x, at.y), at: now, seed: Math.random() });
    }
    phase += dt * 3;
    if (t.plan.pos < t.plan.total) return;
    tunnel = null;
    if (t.then.purpose === "sleep") {
      vanish();
      return;
    }
    head = { f: t.to.f, x: t.to.x, y: t.to.y, under: false };
    record();
    if (head.f !== "e") holes.push({ f: head.f, x: head.x, y: head.y, at: now, open: true });
    if (t.then.purpose === "home") homeAt = { ...t.to };
    follow(t.to.f, t.then.points, t.then.purpose, now);
  }

  function bite(now) {
    const t = target;
    if (t?.kind !== "code" || head.f !== "b" || head.under) return;
    for (const c of t.chars) {
      if (c.eaten || Math.abs(head.x - c.x) > 3.4 || Math.abs(head.y - c.y) > 5.5) continue;
      c.eaten = true;
      bitAt = now;
      holeMarks?.add(c.range);
      if (!t.group) {
        t.group = { at: now, wait: between(...REPAIR_WAIT), chars: [] };
        eatenLog.push(t.group);
      }
      t.group.chars.push(c);
      t.group.at = now;
      const list = eatenIn.get(t.node) || [];
      list.push([c.offset, c.offset + 1]);
      eatenIn.set(t.node, list);
      data.unshift(c.ch);
      if (data.length > BODY.maxChars) data.length = BODY.maxChars;
      bites.push({ at: now });
    }
  }

  function crawl(now, dt) {
    if (now < pauseUntil) {
      phase += dt * 1.1;
      return;
    }
    if (purpose === "hunt" && now >= nextPauseAt) {
      pauseUntil = now + between(...MOVE.pause);
      nextPauseAt = pauseUntil + between(...MOVE.pauseEvery);
      return;
    }
    const surge = (0.5 + 0.5 * Math.sin((now / 1000) * TAU * MOVE.surge)) ** 2;
    const step = MOVE.creep * (purpose === "dive" ? 2.2 : 1) * (0.18 + 0.82 * surge) * dt;
    plan.pos = Math.min(plan.total, plan.pos + step);
    const at = pointAt(plan, plan.pos);
    head = { f: plan.f, x: at.x, y: at.y, under: false };
    phase += (step / BODY.wave) * TAU * 0.9 + dt * 0.6;
    record();
    bite(now);
    if (plan.pos >= plan.total) arrive(now);
  }

  function arrive(now) {
    plan = null;
    if (purpose === "dive" && pending) {
      const next = pending;
      pending = null;
      dig(next.to, next.then, now);
      return;
    }
    if (purpose === "eye") {
      enterEye(now);
      return;
    }
    if (purpose === "leaveEye") {
      goHome(now);
      return;
    }
    mode = purpose === "home" ? "lurk" : "watch";
    until = now + between(...(purpose === "home" ? TIMING.lurk : TIMING.watch));
    aim({ kind: "eye" }, now);
  }

  function riseFor(t, left) {
    const dir = left ? 1 : -1;
    const first = left ? t.chars[0] : t.chars[t.chars.length - 1];
    let y = first.y;
    if (Math.random() < 0.4) {
      const moved = y + (Math.random() < 0.5 ? -1 : 1) * size.ch;
      const sy = frame.oy + moved;
      if (sy > frame.clip.y + 10 && sy < frame.clip.y + frame.clip.h - 10) y = moved;
    }
    return { f: "b", x: clamp(first.x - dir * size.cw * between(4, 9), bounds.left, bounds.right), y };
  }

  function go(now, force) {
    const t = target;
    const surfaced = head && !head.under && head.f === "b";
    const left = surfaced ? head.x <= t.chars[0].x : Math.random() < 0.5;
    const seq = left ? t.chars : [...t.chars].reverse();
    const dir = left ? 1 : -1;
    const edge = seq[0];
    const through = [{ x: edge.x - dir * size.cw, y: edge.y }, ...seq.map((c) => ({ x: c.x, y: c.y })), { x: seq[seq.length - 1].x + dir * size.cw * 1.5, y: edge.y }];
    if (!force && surfaced && Math.hypot(head.x - through[0].x, head.y - through[0].y) < 220) {
      follow("b", [{ x: head.x, y: head.y }, ...through], "hunt", now);
      return;
    }
    const rise = riseFor(t, left);
    dig(rise, { purpose: "hunt", points: [{ x: rise.x, y: rise.y }, ...through] }, now);
  }

  function blocked(node, start, end) {
    const list = eatenIn.get(node);
    return Boolean(list && list.some(([a, b]) => a < end && b > start));
  }

  function findToken(now) {
    if (!bounds) return null;
    const walker = document.createTreeWalker(buffer, NodeFilter.SHOW_TEXT);
    const found = [];
    const seen = new Map();
    let all = "";
    let lastTx = null;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const tx = node.parentElement?.closest(".tx");
      if (!tx) continue;
      if (tx !== lastTx) all += "\n";
      lastTx = tx;
      const offset = all.length;
      const list = eatenIn.get(node);
      all += list ? [...node.data].map((ch, k) => (list.some(([a, b]) => k >= a && k < b) ? " " : ch)).join("") : node.data;
      if (tx.parentElement.classList.contains("is-tilde")) continue;
      let box = seen.get(tx);
      if (!box) {
        box = tx.getBoundingClientRect();
        seen.set(tx, box);
      }
      if (box.bottom < frame.clip.y + size.ch || box.top > frame.clip.y + frame.clip.h - size.ch) continue;
      const rich = Boolean(node.parentElement.closest(".md-link, .md-code, .md-h"));
      for (const match of node.data.matchAll(WORD)) {
        const text = match[0];
        const digit = /\d/.test(text);
        if (text.length > 16 || (!digit && text.length < 3) || STOP.has(text.toLowerCase()) || blocked(node, match.index, match.index + text.length)) continue;
        const weight = rich || digit ? 3 : /^[A-Z]/.test(text) && text.length >= 4 ? 2 : text.length >= 5 ? 1 : 0;
        if (weight) found.push({ node, index: match.index, text, weight, at: offset + match.index });
      }
    }
    const recent = finePointer.matches && pointer.x >= 0 && now - pointer.at < 2500;
    for (let tries = 0; tries < 14 && found.length; tries++) {
      let roll = Math.random() * found.reduce((sum, item) => sum + item.weight, 0);
      let pick = 0;
      while (pick < found.length - 1 && roll >= found[pick].weight) {
        roll -= found[pick].weight;
        pick += 1;
      }
      const [item] = found.splice(pick, 1);
      const range = document.createRange();
      range.setStart(item.node, item.index);
      range.setEnd(item.node, item.index + item.text.length);
      const rects = range.getClientRects();
      if (rects.length !== 1) continue;
      const rect = rects[0];
      if (rect.top < frame.clip.y || rect.bottom > frame.clip.y + frame.clip.h) continue;
      if (rect.right - frame.ox > bounds.right + size.cw) continue;
      if (recent && Math.hypot(pointer.x - (rect.left + rect.width / 2), pointer.y - (rect.top + rect.height / 2)) < AVOID_PX) continue;
      const chars = [...item.text].map((ch, k) => {
        const one = document.createRange();
        one.setStart(item.node, item.index + k);
        one.setEnd(item.node, item.index + k + 1);
        const b = one.getBoundingClientRect();
        return { ch, range: one, node: item.node, offset: item.index + k, x: b.left + b.width / 2 - frame.ox, y: b.top + b.height / 2 - frame.oy, eaten: false };
      });
      let index = 0;
      let total = 0;
      for (let k = all.indexOf(item.text); k !== -1; k = all.indexOf(item.text, k + 1)) {
        total += 1;
        if (k <= item.at) index = total;
      }
      const xs = chars.map((c) => c.x);
      const box = { x0: Math.min(...xs) - size.cw / 2, x1: Math.max(...xs) + size.cw / 2, y0: chars[0].y - size.ch / 2, y1: chars[0].y + size.ch / 2 };
      return { kind: "code", node: item.node, text: item.text, chars, box, label: `/${item.text}  [${index}/${total}]` };
    }
    return null;
  }

  function lidOf() {
    return (eyeRect ? eyeRect.cy + eyeRect.h / 2 : eyeHost.cy + eyeHost.h * 0.37) - eyeHost.cy;
  }

  function toEye() {
    return purpose === "eye" || tunnel?.then.purpose === "eye" || pending?.then.purpose === "eye";
  }

  function goEye(now) {
    nextVisitAt = now + between(...VISIT.every);
    aim({ kind: "eye" }, now);
    const lid = lidOf();
    const w = eyeHost.w;
    const rise = { f: "e", x: -w * 0.16, y: lid + 26 };
    dig(rise, { purpose: "eye", points: [{ x: rise.x, y: rise.y }, { x: -w * 0.06, y: lid + 6 }, { x: -w * 0.02, y: lid * 0.4 }, { x: 0, y: 0 }] }, now);
  }

  function enterEye(now) {
    inside = { at: now, until: now + between(...VISIT.stay), angle: 0 };
    head = { ...head, under: true };
    mode = "inside";
    purpose = "inside";
    target = null;
    pings = [];
  }

  function stayInside(now, dt) {
    inside.angle += dt * 2.1;
    const r = Math.min(VISIT.orbit, eyeHost.h * 0.28);
    head = { f: "e", x: Math.cos(inside.angle) * r * 1.3, y: Math.sin(inside.angle * 1.37) * r * 0.55, under: true };
    record();
    phase += dt * 1.6;
    if (now >= inside.until || now - eyeSeenAt > 400) exitEye(now);
  }

  function exitEye(now) {
    inside = null;
    exitAt = now;
    const lid = lidOf();
    const w = eyeHost.w;
    head = { f: "e", x: 0, y: 0, under: false };
    record();
    follow("e", [{ x: 0, y: 0 }, { x: w * 0.05, y: lid * 0.5 }, { x: w * 0.1, y: lid + 8 }, { x: w * 0.14, y: lid + 30 }], "leaveEye", now);
  }

  function decide(now) {
    if (awake(now) && eyeRect && eyeHost && now >= nextVisitAt) {
      goEye(now);
      return;
    }
    const fam = awake(now) && now >= familyAt && head && !head.under && frame ? family?.box() : null;
    if (fam) {
      familyAt = now + between(...GUARD.every);
      aim({ kind: "family", label: "/family  [1/1]" }, now);
      mode = "seek";
      until = now + GUARD.look + GUARD.zap;
      zapAt = now + GUARD.look;
      zapped = false;
      return;
    }
    const token = awake(now) && bounds && (mode === "lurk" || Math.random() < 0.7) ? findToken(now) : null;
    if (token) {
      aim(token, now);
      mode = "seek";
      until = now + TIMING.seek;
      return;
    }
    if (mode === "lurk") {
      until = now + between(...TIMING.lurk);
      return;
    }
    goHome(now);
  }

  function escape(now) {
    const token = awake(now) ? findToken(now) : null;
    if (!token) {
      goHome(now);
      return;
    }
    aim(token, now);
    go(now, true);
  }

  function pose() {
    const at = home();
    const L = bodyLength();
    trail = [];
    headLen = 0;
    const push = (x, y, under) => {
      const prev = trail[trail.length - 1];
      if (prev) headLen += Math.hypot(x - prev.x, y - prev.y);
      trail.push({ id: nextId++, f: "s", x, y, under, len: headLen, passed: 0 });
    };
    for (let y = at.y + L; y > at.y; y -= BODY.step) push(at.x, y, true);
    const neck = makePlan("s", neckFrom(at), 2);
    for (let pos = 0; pos <= neck.total; pos += BODY.step) {
      const p = pointAt(neck, pos);
      push(p.x, p.y, false);
    }
    const tip = trail[trail.length - 1];
    head = { f: "s", x: tip.x, y: tip.y, under: false };
    homeAt = at;
    holes = [{ ...at, at: 0, open: true }];
    plan = null;
    tunnel = null;
    purpose = "home";
    target = { kind: "eye" };
    lockAt = -Infinity;
    mode = "still";
  }

  function settle(now) {
    settlePending = false;
    shifted = false;
    build();
    if (contentChanged) {
      holeMarks?.clear();
      eatenLog = [];
      eatenIn = new WeakMap();
      contentChanged = false;
    }
    const surfaced = head && !head.under && head.f === "b";
    const hunting = purpose === "hunt" && (mode === "move" || mode === "watch" || (mode === "tunnel" && tunnel?.then.purpose === "hunt"));
    trail = trail.filter((p) => p.f !== "b");
    holes = holes.filter((h) => h.f !== "b");
    ripples = ripples.filter((m) => m.f !== "b");
    if (target?.kind === "code" || target?.kind === "family") target = null;
    if (pending?.to.f === "b") {
      const at = home();
      pending = { to: at, then: { purpose: "home", points: neckFrom(at) } };
    }
    if (reduced.matches) {
      mode = "rest";
      return;
    }
    if (mode === "rest" || mode === "off") return;
    if (surfaced || hunting) {
      if (head?.f === "b") head = { ...head, under: true };
      goHome(now);
      return;
    }
    if (mode === "seek") {
      mode = "lurk";
      until = now + 1500;
      aim({ kind: "eye" }, now);
    }
    if (mode === "lurk" && homeAt && Math.abs(home().x - homeAt.x) > 2 * size.cw) goHome(now);
  }

  function guard(now) {
    const moved = shifted;
    shifted = false;
    if ((mode === "inside" || purpose === "eye") && now - eyeSeenAt > 400) {
      if (mode === "inside") exitEye(now);
      else goHome(now);
      return;
    }
    if (mode === "tunnel") {
      if (tunnel.then.purpose === "hunt" && !awake(now)) goHome(now);
      return;
    }
    if (!head || head.under || head.f !== "b") return;
    const at = screenOf(head);
    const { clip } = frame;
    const out = at.y < clip.y || at.y > clip.y + clip.h || at.x < clip.x || at.x > clip.x + clip.w;
    const near = finePointer.matches && pointer.x >= 0 && now - pointer.at < 1200 && Math.hypot(pointer.x - at.x, pointer.y - at.y) < FLEE_PX;
    if (out || near || moved || !awake(now)) escape(now);
  }

  function passTail(now) {
    const L = bodyLength();
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      if (headLen - p.len <= L) continue;
      if (p.passed) break;
      p.passed = now;
      if (!p.under) spurUntil = now + SPUR_MS;
    }
    let drop = 0;
    while (drop < trail.length - 2) {
      const p = trail[drop];
      if (headLen - p.len <= L + BODY.keep || (p.passed && !p.under && now - p.passed < SPUR_MS)) break;
      drop += 1;
    }
    if (drop) trail.splice(0, drop);
    if (trail.length > 4000) trail.splice(0, trail.length - 4000);
  }

  function holesTick(now) {
    const L = bodyLength();
    holes = holes.filter((h) => {
      if (!h.open) return now - h.at < HOLE_MS;
      let near = false;
      for (let i = trail.length - 1; i >= 0 && !near; i--) {
        const p = trail[i];
        if (headLen - p.len > L) break;
        near = !p.under && p.f === h.f && Math.abs(p.x - h.x) < 6 && Math.abs(p.y - h.y) < 6;
      }
      if (!near) {
        h.open = false;
        h.at = now;
      }
      return true;
    });
  }

  function aimRect() {
    if (!target) return null;
    if (target.kind === "eye") return eyeRect;
    if (target.kind === "family") {
      const fam = family?.box();
      return fam ? { cx: (fam.x0 + fam.x1) / 2, cy: (fam.y0 + fam.y1) / 2, w: fam.x1 - fam.x0, h: fam.y1 - fam.y0 } : null;
    }
    const a = screenOf({ f: "b", x: target.box.x0, y: target.box.y0 });
    const w = target.box.x1 - target.box.x0;
    const h = target.box.y1 - target.box.y0;
    return { cx: a.x + w / 2, cy: a.y + h / 2, w, h };
  }

  const reach = (from, tr) => Math.max(10, Math.hypot(tr.cx - from.x, tr.cy - from.y) - Math.min(tr.w, tr.h) * 0.35);
  const headAt = () => (head && !head.under ? screenOf(head) : null);

  function sonar(now) {
    const from = headAt();
    const tr = aimRect();
    if (!from || !tr || !awake(now)) {
      pings = [];
      return;
    }
    const hunting = mode === "move" && purpose === "hunt" && target.kind === "code";
    if (now >= pingNext && (mode === "lurk" || mode === "watch" || mode === "seek" || hunting)) {
      pings.push({ at: now, hit: false });
      pingNext = now + SONAR.every * (hunting ? 1.5 : 1);
    }
    const dist = reach(from, tr);
    pings = pings.filter((ping) => {
      const travel = ((now - ping.at) * SONAR.speed) / 1000;
      if (!ping.hit && travel >= dist) {
        ping.hit = true;
        hitAt = now;
        if (target.kind === "eye") pingedAt = now;
      }
      return !ping.hit;
    });
  }

  function step(now, eye, box) {
    const dt = last ? clamp((now - last) / 1000, 0, 0.1) : 1 / 60;
    last = now;
    eyeRect = eye;
    if (eye) eyeSeenAt = now;
    if (box) eyeHost = box;
    measure();
    if (settlePending) settle(now);
    if (mode === "off") return false;
    if (reduced.matches) {
      if (asleep) {
        vanish();
        return false;
      }
      if (mode !== "still") pose();
      pings = [];
      ripples = [];
      return false;
    }
    if (mode === "still") mode = "lurk";
    guard(now);
    if (mode === "rest") {
      if (now >= wakeAt) goHome(now);
    } else if (mode === "tunnel") burrow(now, dt);
    else if (mode === "move") crawl(now, dt);
    else if (mode === "inside") stayInside(now, dt);
    else {
      if (awake(now)) phase += dt * 1.1;
      if (mode === "seek" && target?.kind === "family" && now >= zapAt && !zapped) {
        zapped = true;
        family?.fire(GUARD.zap);
      }
      if (now >= until) {
        if (mode === "seek" && target?.kind === "family") goHome(now);
        else if (mode === "seek") go(now, false);
        else decide(now);
      }
    }
    passTail(now);
    holesTick(now);
    ripples = ripples.filter((m) => now - m.at < RIPPLE_MS);
    bites = bites.filter((b) => ((now - b.at) / 1000) * BODY.swallow < bodyLength() + 10);
    sonar(now);
    const resting = mode === "lurk" || mode === "watch";
    return !resting || awake(now) || pings.length > 0 || ripples.length > 0 || bites.length > 0 || now < spurUntil || holes.some((h) => !h.open);
  }

  function radius(s, L, now) {
    const t = s / L;
    const tip = 0.62 + 0.38 * smooth(s / 5);
    const tail = 1 - 0.62 * smooth((t - 0.5) / 0.5);
    const saddle = 1 + 0.1 * Math.exp(-(((t - 0.3) / 0.07) ** 2));
    const wave = 1 + 0.12 * Math.sin((s / BODY.wave) * TAU - phase);
    let swallow = 0;
    for (const b of bites) swallow += Math.exp(-(((s - ((now - b.at) / 1000) * BODY.swallow) / 3.2) ** 2));
    return BODY.radius * tip * tail * saddle * wave * (1 + 0.32 * Math.min(1, swallow));
  }

  function samplesFor(field, now) {
    const L = bodyLength();
    const out = [];
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      const s = headLen - p.len;
      if (s > L) break;
      if (p.under || p.f !== field) continue;
      const at = screenOf(p);
      out.push({ x: at.x, y: at.y, s, r: radius(s, L, now), tx: 0, ty: 0 });
    }
    for (let k = 0; k < out.length; k++) {
      let a = out[k - 1];
      let b = out[k + 1];
      if (a && Math.hypot(a.x - out[k].x, a.y - out[k].y) > 6) a = null;
      if (b && Math.hypot(b.x - out[k].x, b.y - out[k].y) > 6) b = null;
      const from = a || out[k];
      const to = b || out[k];
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      const len = Math.hypot(dx, dy) || 1;
      out[k].tx = dx / len;
      out[k].ty = dy / len;
    }
    return out;
  }

  function renderTube(g, samples, src) {
    if (!samples.length) return;
    g.fillStyle = `rgb(${colors.bg})`;
    g.beginPath();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const q of samples) {
      g.moveTo(q.x + q.r + 0.7, q.y);
      g.arc(q.x, q.y, q.r + 0.7, 0, TAU);
      minX = Math.min(minX, q.x - q.r);
      minY = Math.min(minY, q.y - q.r);
      maxX = Math.max(maxX, q.x + q.r);
      maxY = Math.max(maxY, q.y + q.r);
    }
    g.fill();
    const c0 = Math.floor(minX / FW);
    const r0 = Math.floor(minY / FH);
    const cols = Math.floor(maxX / FW) - c0 + 1;
    const rows = Math.floor(maxY / FH) - r0 + 1;
    const n = cols * rows;
    if (!grid || grid.d.length < n) {
      const m = Math.max(n, 4096);
      grid = { d: new Float32Array(m), s: new Float32Array(m), ox: new Float32Array(m), oy: new Float32Array(m), r: new Float32Array(m), lat: new Float32Array(m), lv: new Int8Array(m), ch: new Uint16Array(m), mask: new Uint16Array(1024) };
    }
    grid.d.fill(Infinity, 0, n);
    for (const q of samples) {
      const ca = Math.max(0, Math.floor((q.x - q.r) / FW) - c0);
      const cb = Math.min(cols - 1, Math.floor((q.x + q.r) / FW) - c0);
      const ra = Math.max(0, Math.floor((q.y - q.r) / FH) - r0);
      const rb = Math.min(rows - 1, Math.floor((q.y + q.r) / FH) - r0);
      const r2 = q.r * q.r;
      for (let rr = ra; rr <= rb; rr++) {
        const dy = (r0 + rr + 0.5) * FH - q.y;
        for (let cc = ca; cc <= cb; cc++) {
          const dx = (c0 + cc + 0.5) * FW - q.x;
          const d2 = dx * dx + dy * dy;
          const k = rr * cols + cc;
          if (d2 >= r2 || d2 >= grid.d[k]) continue;
          grid.d[k] = d2;
          grid.s[k] = q.s;
          grid.ox[k] = dx;
          grid.oy[k] = dy;
          grid.r[k] = q.r;
          grid.lat[k] = dx * -q.ty + dy * q.tx;
        }
      }
    }
    if (grid.mask.length < rows) grid.mask = new Uint16Array(rows * 2);
    grid.mask.fill(0, 0, rows);
    for (let rr = 0; rr < rows; rr++) {
      for (let cc = 0; cc < cols; cc++) {
        const k = rr * cols + cc;
        grid.lv[k] = 0;
        if (grid.d[k] === Infinity) continue;
        const R = grid.r[k];
        const u = Math.sqrt(grid.d[k]) / R;
        const nx = grid.ox[k] / R;
        const ny = grid.oy[k] / R;
        const nz = Math.sqrt(Math.max(0, 1 - u * u));
        const s = grid.s[k];
        let v = 0.08 + 0.82 * Math.max(0, -0.36 * nx - 0.5 * ny + 0.79 * nz);
        v *= 0.66 + 0.34 * (0.5 + 0.5 * Math.cos((s / BODY.ring) * TAU));
        if (s < 2.4) v *= 0.3 + 0.7 * (s / 2.4);
        else if (s < 5.2 && grid.lat[k] < -0.3 * R) v = Math.max(v, 0.95);
        if (u > 0.8) v = Math.max(v, ((u - 0.8) / 0.2) * 0.8);
        const level = Math.round(clamp((v - TONE.floor) / TONE.range, 0, 1) ** TONE.gamma * 13);
        if (!level) continue;
        grid.lv[k] = level;
        const band = clamp(Math.floor(((grid.lat[k] + R) / (2 * R)) * 3), 0, 2);
        grid.ch[k] = src.charCodeAt((Math.floor(s / FW) * 3 + band) % src.length);
        grid.mask[rr] |= 1 << level;
      }
    }
    g.font = `${GLYPH_PX}px "Plex Mono", monospace`;
    g.textBaseline = "alphabetic";
    g.textAlign = "left";
    for (let level = 1; level <= 13; level++) {
      const strength = level / 13;
      g.fillStyle = `rgba(${colors.worm}, ${(TONE.base + (1 - TONE.base) * strength).toFixed(3)})`;
      for (let rr = 0; rr < rows; rr++) {
        if (!(grid.mask[rr] & (1 << level))) continue;
        let line = "";
        let first = -1;
        let lastCol = -1;
        for (let cc = 0; cc < cols; cc++) {
          if (grid.lv[rr * cols + cc] !== level) continue;
          if (first < 0) first = cc;
          lastCol = cc;
        }
        for (let cc = first; cc <= lastCol; cc++) {
          const k = rr * cols + cc;
          line += grid.lv[k] === level ? String.fromCharCode(grid.ch[k]) : " ";
        }
        const x = (c0 + first) * FW;
        const y = (r0 + rr) * FH + GLYPH_PX * EM_TOP;
        g.fillText(line, x, y);
        if (strength > TONE.bold) g.fillText(line, x + 0.45, y);
      }
    }
  }

  const glyphAt = (g, ch, x, y) => g.fillText(ch, Math.round(x / FW) * FW - FW / 2, Math.round(y / FH) * FH + GLYPH_PX * (EM_TOP - 0.5));

  function drawSpur(g, field, now, src) {
    if (field === "s") return;
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      if (!p.passed) continue;
      const age = (now - p.passed) / SPUR_MS;
      if (age >= 1) break;
      if (p.under || p.f !== field || p.id % 4) continue;
      const at = screenOf(p);
      g.fillStyle = `rgba(${colors.worm}, ${(0.34 * (1 - age) ** 1.3).toFixed(3)})`;
      glyphAt(g, src[p.id % src.length], at.x, at.y);
    }
  }

  function drawHoles(g, field, now, src) {
    if (field === "s") return;
    for (const h of holes) {
      if (h.f !== field) continue;
      const fade = h.open ? 1 : 1 - (now - h.at) / HOLE_MS;
      if (fade <= 0) continue;
      const at = screenOf(h);
      g.fillStyle = `rgba(${colors.bg}, ${fade.toFixed(3)})`;
      g.beginPath();
      g.ellipse(at.x, at.y, 8.5, 5, 0, 0, TAU);
      g.fill();
      g.fillStyle = `rgba(${colors.worm}, ${(0.5 * fade).toFixed(3)})`;
      const key = Math.abs(h.x * 0.37 + h.y * 0.11);
      for (let k = 0; k < 12; k++) {
        if ((key + k * 0.618) % 1 > fade + 0.15) continue;
        const a = (k / 12) * TAU;
        glyphAt(g, src[Math.floor(key * 97 + k * 13) % src.length], at.x + Math.cos(a) * 9.5, at.y + Math.sin(a) * 5.8);
      }
    }
  }

  function noise(g, x, y, rx, ry, alpha, count, src, key) {
    g.fillStyle = `rgba(${colors.worm}, ${alpha.toFixed(3)})`;
    for (let k = 0; k < count; k++) {
      const a = ((key * 7.31 + k * 0.618) % 1) * TAU;
      const d = (key * 3.7 + k * 0.382) % 1;
      const gx = Math.round((x + Math.cos(a) * rx * d) / FW) * FW;
      const gy = Math.round((y + Math.sin(a) * ry * d) / FH) * FH;
      g.fillText(src[Math.floor((key * 977 + k * 131) % src.length)], gx - FW / 2, gy + GLYPH_PX * (EM_TOP - 0.5));
    }
  }

  function drawRipples(g, field, now, src) {
    if (field === "s") return;
    for (const m of ripples) {
      if (m.f !== field) continue;
      const age = (now - m.at) / RIPPLE_MS;
      if (age >= 1) continue;
      const at = screenOf(m);
      g.fillStyle = `rgba(${colors.bg}, ${(0.92 * (1 - age)).toFixed(3)})`;
      g.beginPath();
      g.ellipse(at.x, at.y, 5.5, 4, 0, 0, TAU);
      g.fill();
      noise(g, at.x, at.y, 5, 3.5, 0.6 * (1 - age), 3, src, m.seed);
    }
    if (mode !== "tunnel" || !tunnel) return;
    const at = pointAt(tunnel.plan, tunnel.plan.pos);
    if (fieldAt(at.x, at.y) !== field) return;
    g.fillStyle = `rgb(${colors.bg})`;
    g.beginPath();
    g.ellipse(at.x, at.y, 7, 5, 0, 0, TAU);
    g.fill();
    noise(g, at.x, at.y, 6.5, 4.5, 0.75, 5, src, Math.floor(now / 70) * 0.137);
  }

  function drawField(g, field, now, src) {
    g.font = `${GLYPH_PX}px "Plex Mono", monospace`;
    g.textBaseline = "alphabetic";
    g.textAlign = "left";
    drawSpur(g, field, now, src);
    drawHoles(g, field, now, src);
    drawRipples(g, field, now, src);
    renderTube(g, samplesFor(field, now), src);
  }

  function drawBody(g, now) {
    if (!frame || !trail.length) return;
    const src = (data.join("") + seed()).replace(/\s+/g, "") || "worm";
    const { clip } = frame;
    g.save();
    g.beginPath();
    g.rect(clip.x, clip.y, clip.w, clip.h);
    g.clip();
    drawField(g, "b", now, src);
    if (eyeHost) drawField(g, "e", now, src);
    g.restore();
    drawField(g, "s", now, src);
  }

  function snap(x) {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    return Math.round(x * d) / d;
  }

  function drawRadar(g, now, width) {
    const tr = aimRect();
    const from = headAt();
    if (tr && target.kind === "code") {
      const { clip } = frame;
      g.save();
      g.beginPath();
      g.rect(clip.x, clip.y, clip.w, clip.h);
      g.clip();
      g.fillStyle = `rgba(${colors.worm}, 0.24)`;
      let run = null;
      const flush = () => {
        if (!run) return;
        const x0 = snap(frame.ox + run.x0);
        const y0 = snap(frame.oy + target.box.y0);
        g.fillRect(x0, y0, snap(frame.ox + run.x1) - x0, snap(frame.oy + target.box.y1) - y0);
        run = null;
      };
      for (const c of target.chars) {
        if (c.eaten) {
          flush();
          continue;
        }
        if (!run) run = { x0: c.x - size.cw / 2, x1: c.x + size.cw / 2 };
        else run.x1 = c.x + size.cw / 2;
      }
      flush();
      g.restore();
    }
    if (tr) {
      const scale = 1 + 0.6 * (1 - ease((now - lockAt) / 320)) + 0.16 * clamp(1 - (now - hitAt) / 260, 0, 1);
      const alpha = clamp((now - lockAt) / 180, 0, 1);
      const hw = (tr.w / 2) * scale + 3;
      const hh = (tr.h / 2) * scale + 3;
      const arm = clamp(Math.min(tr.w, tr.h) * 0.22, 3, 9);
      g.lineWidth = 1;
      g.strokeStyle = `rgba(${colors.worm}, ${(0.9 * alpha).toFixed(3)})`;
      g.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = Math.round(tr.cx + sx * hw) + 0.5;
        const y = Math.round(tr.cy + sy * hh) + 0.5;
        g.moveTo(x - sx * arm, y);
        g.lineTo(x, y);
        g.lineTo(x, y - sy * arm);
      }
      g.stroke();
      g.fillStyle = `rgba(${colors.worm}, ${(0.9 * alpha).toFixed(3)})`;
      if (target.kind === "eye" && !narrow.matches) {
        g.font = `8px "Plex Mono", monospace`;
        g.fillText(`['eye:u'] ${(tr.cx / width).toFixed(7)}`, Math.round(tr.cx - tr.w / 2 - 3), Math.round(tr.cy - tr.h / 2 - 7));
      }
    }
    if (from && head.f === "s" && (mode === "lurk" || mode === "still") && !narrow.matches) {
      g.font = `8px "Plex Mono", monospace`;
      const lines = [`['worm:u'] ${(from.x / width).toFixed(7)}`, `len ${data.length}`];
      const wide = Math.max(...lines.map((line) => g.measureText(line).width));
      const x = from.x + 13 + wide < width - 4 ? from.x + 13 : from.x - 13 - wide;
      g.fillStyle = `rgba(${colors.ink}, 0.6)`;
      lines.forEach((line, k) => g.fillText(line, Math.round(x), Math.round(from.y - 4 + k * 9)));
    }
  }

  return {
    step,
    drawBody,
    drawRadar,
    resize,
    reset() {
      contentChanged = true;
      settlePending = true;
    },
    nextRepair(now, quiet = true) {
      if (!frame) return null;
      const from = headAt();
      for (const group of eatenLog) {
        if (group === target?.group || now - group.at < group.wait + (quiet ? 0 : REPAIR_LATE)) continue;
        const live = group.chars.filter((c) => !c.restored);
        const rects = live.map((c) => c.range.getBoundingClientRect());
        if (!live.length || rects.some((r) => !r.width || r.top < frame.clip.y || r.bottom > frame.clip.y + frame.clip.h)) continue;
        if (from && rects.some((r) => Math.hypot(r.left + r.width / 2 - from.x, r.top + r.height / 2 - from.y) < 70)) continue;
        return live.sort((a, b) => a.offset - b.offset);
      }
      return null;
    },
    restore(c) {
      if (c.restored) return;
      c.restored = true;
      holeMarks?.delete(c.range);
      const list = eatenIn.get(c.node);
      if (list) eatenIn.set(c.node, list.filter(([a]) => a !== c.offset));
      eatenLog = eatenLog.filter((group) => group.chars.some((x) => !x.restored));
    },
    infection(now) {
      if (inside) return smooth(clamp((now - inside.at) / VISIT.fadeIn, 0, 1));
      return 1 - smooth(clamp((now - exitAt) / VISIT.fadeOut, 0, 1));
    },
    inner() {
      return inside && head && eyeHost ? screenOf(head) : null;
    },
    noticed(now) {
      return now - pingedAt < 1700 ? headAt() : null;
    },
    hit(x, y) {
      if (!frame || !trail.length) return false;
      const L = bodyLength();
      for (let k = trail.length - 1; k >= 0; k--) {
        const p = trail[k];
        if (headLen - p.len > L) break;
        if (p.under) continue;
        const at = screenOf(p);
        if (Math.hypot(at.x - x, at.y - y) < 11) return true;
      }
      return false;
    },
    visiting() {
      return Boolean(inside) || toEye() || purpose === "inside" || purpose === "leaveEye";
    },
    summon(now) {
      if (asleep || inside || toEye() || !eyeRect || !eyeHost || reduced.matches) return false;
      goEye(now);
      return true;
    },
    sleep(now) {
      if (asleep) return;
      asleep = true;
      for (const group of eatenLog) group.at = -Infinity;
      if (inside) {
        inside = null;
        exitAt = now;
      }
      target = null;
      pending = null;
      purpose = "home";
      pings = [];
      if (!head || !frame || mode === "rest" || reduced.matches) {
        vanish();
        return;
      }
      const from = mode === "tunnel" && tunnel ? pointAt(tunnel.plan, tunnel.plan.pos) : screenOf(head);
      dig(toField("s", from.x, frame.s.bottom + bodyLength() + 40), { purpose: "sleep", points: [] }, now);
    },
    wake(now) {
      if (!asleep) return;
      asleep = false;
      nextVisitAt = Math.max(nextVisitAt, now + VISIT.first);
      familyAt = Math.max(familyAt, now + GUARD.first);
      if (frame) goHome(now);
      else mode = "rest";
    },
    zap(now) {
      if (target?.kind !== "family" || mode !== "seek" || now < zapAt || now >= until) return null;
      const to = headAt();
      const eyes = family?.box()?.eyes;
      return to && eyes ? { to, eyes, t: (now - zapAt) / GUARD.zap } : null;
    },
    describe(now) {
      if (asleep) return { text: "asleep", hot: false, label: null };
      const hunt = target?.kind === "code" || target?.kind === "family" ? target.label : null;
      if (mode === "rest") return { text: "resting", hot: false, label: null };
      if (inside) return { text: "inside eye", hot: true, label: null };
      if (now - bitAt < 700) return { text: "eating", hot: true, label: hunt };
      if (hunt && (mode === "seek" || purpose === "hunt")) return { text: "hunting", hot: true, label: hunt };
      if (toEye()) return { text: "to the eye", hot: true, label: null };
      if (mode === "tunnel") return { text: "tunneling", hot: false, label: null };
      if (mode === "move") return { text: "crawling", hot: false, label: null };
      return { text: "lurking", hot: false, label: null };
    },
  };
}
