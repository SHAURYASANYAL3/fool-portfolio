const SVG = "http://www.w3.org/2000/svg";
const PEOPLE = [26, 23.5, 18, 15, 12];
const BASE = 27.5;
const XS = PEOPLE.reduce((xs, h, k) => [...xs, k ? xs[k - 1] + (PEOPLE[k - 1] + h) * 0.34 : 5], []);
export const FAMILY = { h: 28, base: BASE, people: PEOPLE, xs: XS, width: XS.at(-1) + 5 };

function add(parent, tag, attrs) {
  const node = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, typeof value === "number" ? value.toFixed(2) : value);
  parent.append(node);
  return node;
}

export const freeHand = (cx, h, side, walk = 0, dir = 1) => [cx + side * h * 0.16 - dir * Math.sin((walk / (h * 0.55)) * Math.PI * 2) * h * 0.04, BASE - h * 0.4];

function person(out, cx, h, { walk = 0, dir = 1, hands = [null, null], crouch = 0 }) {
  const r = h * 0.09;
  const step = Math.sin((walk / (h * 0.55)) * Math.PI * 2);
  const lift = walk ? Math.abs(Math.cos((walk / (h * 0.55)) * Math.PI * 2)) : 0;
  const bob = (walk ? lift * h * 0.015 : 0) - crouch * h * 0.22;
  const neck = [cx + dir * crouch * h * 0.12, BASE - h + 2 * r + h * 0.03 - bob];
  const hip = [cx, BASE - h * 0.47 - bob * 0.5];
  out.heads.push([neck[0] + dir * crouch * h * 0.04, BASE - h + r - bob, r]);
  out.lines.push([...neck, ...hip]);
  [-1, 1].forEach((side, n) => {
    const hand = hands[n] || freeHand(cx, h, side, walk, dir);
    const elbow = [(neck[0] + hand[0]) / 2, (neck[1] + hand[1]) / 2 + h * 0.04];
    out.lines.push([...neck, ...elbow], [...elbow, ...hand]);
    out.joints.push(elbow);
    if (!hands[n] || side === 1) out.joints.push(hand);
    const swing = side * step * h * 0.12;
    const foot = walk ? [cx + swing, BASE - (swing * dir > 0 ? lift * h * 0.05 : 0)] : [cx + side * h * 0.1, BASE];
    const knee = walk ? [(hip[0] + foot[0]) / 2 + dir * h * 0.03, BASE - h * 0.24 - bob / 2] : [cx + side * h * (0.06 + crouch * 0.05), BASE - h * 0.24 + crouch * h * 0.08];
    out.lines.push([...hip, ...knee], [...knee, ...foot]);
    out.joints.push(knee, foot);
  });
  out.joints.push(neck, hip);
}

export function familyShape(walk = 0, dir = 1, { without = -1 } = {}) {
  const out = { width: FAMILY.width, heads: [], lines: [], joints: [] };
  const linked = (a, b) => a >= 0 && b < PEOPLE.length && a !== without && b !== without;
  PEOPLE.forEach((h, k) => {
    if (k === without) return;
    const hand = (j) => [(XS[k] + XS[j]) / 2, BASE - Math.min(h, PEOPLE[j]) * 0.52];
    const hands = [linked(k - 1, k) ? hand(k - 1) : null, linked(k, k + 1) ? hand(k + 1) : null];
    person(out, XS[k], h, { walk, dir, hands });
  });
  return out;
}

export function childShape(cx, walk = 0, dir = 1, crouch = 0) {
  const out = { heads: [], lines: [], joints: [] };
  person(out, cx, PEOPLE.at(-1), { walk, dir, crouch });
  return out;
}

export function teddyShape(x, y) {
  return [[x, y, 1.5], [x, y - 2.3, 1.1], [x - 0.9, y - 3.2, 0.45], [x + 0.9, y - 3.2, 0.45]];
}

export function familyFigure() {
  const shape = familyShape();
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", `0 0 ${FAMILY.width.toFixed(2)} ${FAMILY.h}`);
  svg.setAttribute("class", "fam");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "family: two parents and three children, holding hands");
  const strokes = add(svg, "g", { class: "fam-lines" });
  const dots = add(svg, "g", { class: "fam-dots" });
  for (const [cx, cy, r] of shape.heads) add(strokes, "circle", { cx, cy, r });
  for (const [x1, y1, x2, y2] of shape.lines) add(strokes, "line", { x1, y1, x2, y2 });
  for (const [cx, cy] of shape.joints) add(dots, "circle", { cx, cy, r: 0.8 });
  const [hx, hy] = freeHand(XS.at(-1), PEOPLE.at(-1), 1);
  for (const [cx, cy, r] of teddyShape(hx + 0.3, hy + 2.2)) add(dots, "circle", { cx, cy, r });
  return svg;
}
