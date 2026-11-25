export const HC_UNION = [
  [0, 12], [12, 0], [16, 0], [16, 32], [29, 32], [34, 27], [34, 16], [50, 0], [88, 0], [88, 16],
  [57, 16], [50, 23], [50, 57], [57, 64], [88, 64], [72, 80], [50, 80], [34, 64], [34, 47],
  [33, 48], [16, 48], [16, 80], [0, 80],
];

export function inside(x, y, polygon = HC_UNION) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) result = !result;
  }
  return result;
}

export function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");

export function prefersStill() {
  return reducedQuery.matches || new URLSearchParams(location.search).has("still");
}

export function onReducedMotion(callback) {
  reducedQuery.addEventListener("change", () => {
    if (reducedQuery.matches) callback();
  });
}

export async function loadJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

export function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { context, width, height, dpr };
}

export function onWidthResize(callback) {
  let width = window.innerWidth;
  let height = window.innerHeight;
  let frame = 0;
  window.addEventListener("resize", () => {
    if (window.innerWidth === width && Math.abs(window.innerHeight - height) < 120) return;
    width = window.innerWidth;
    height = window.innerHeight;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(callback);
  });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDay(iso) {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

export function isoAdd(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
