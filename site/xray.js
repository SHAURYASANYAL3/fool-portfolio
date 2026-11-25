const clamp = (n) => Math.max(0, Math.min(1, n));
const smooth = (n) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const BAND = 0.28;
const DURATION = 2400;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

function rgbOf(value) {
  const probe = document.createElement("canvas").getContext("2d");
  probe.fillStyle = value || "#e5e5df";
  const hex = probe.fillStyle;
  if (hex.startsWith("#")) return [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  return (hex.match(/\d+/g) || [229, 229, 223]).slice(0, 3).map(Number);
}

export function attachXray(frame, image) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  const edges = document.createElement("canvas");
  const edgeContext = edges.getContext("2d", { willReadFrequently: true });
  if (!ctx || !edgeContext) return { destroy() {} };
  frame.append(canvas);
  const status = document.createElement("span");
  status.className = "sr-only";
  status.setAttribute("role", "status");
  frame.append(status);
  frame.tabIndex = 0;
  frame.setAttribute("aria-label", `${image.alt}. X-ray: drag across the image, Escape restores it.`);

  let width = 0;
  let height = 0;
  let raf = 0;
  let started = 0;
  let ready = false;
  let inView = false;
  let played = false;
  let mode = "idle";
  let scanLeft = -BAND;
  let scanOpacity = 0;
  let pointer = null;
  let colors = { bg: "#020303", ink: [229, 229, 223], accent: "#df6124" };

  const canInspect = () => ready && !reduced.matches && !document.hidden && inView;

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    mode = "idle";
    scanOpacity = 0;
    ctx.clearRect(0, 0, width, height);
  }

  function prepare() {
    stop();
    if (!image.naturalWidth) return;
    const box = frame.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const style = getComputedStyle(document.body);
    colors = { bg: style.getPropertyValue("--bg").trim() || "#020303", ink: rgbOf(style.getPropertyValue("--ink").trim()), accent: style.getPropertyValue("--accent").trim() || "#df6124" };
    width = Math.min(1100, Math.round(box.width * Math.min(devicePixelRatio || 1, 2)));
    height = Math.round(width / (box.width / box.height));
    canvas.width = edges.width = width;
    canvas.height = edges.height = height;
    edgeContext.drawImage(image, 0, 0, width, height);
    const source = edgeContext.getImageData(0, 0, width, height);
    const output = edgeContext.createImageData(width, height);
    const gray = new Float32Array(width * height);
    for (let i = 0; i < gray.length; i++) gray[i] = source.data[i * 4] * 0.2126 + source.data[i * 4 + 1] * 0.7152 + source.data[i * 4 + 2] * 0.0722;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        const gx = -gray[i - width - 1] + gray[i - width + 1] - 2 * gray[i - 1] + 2 * gray[i + 1] - gray[i + width - 1] + gray[i + width + 1];
        const gy = -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] + gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
        output.data[i * 4] = colors.ink[0];
        output.data[i * 4 + 1] = colors.ink[1];
        output.data[i * 4 + 2] = colors.ink[2];
        output.data[i * 4 + 3] = Math.min(230, Math.max(0, Math.hypot(gx, gy) - 18) * 1.05);
      }
    }
    edgeContext.putImageData(output, 0, 0);
    ready = true;
  }

  function inspect(x, opacity) {
    const band = width * BAND;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 0, band, height);
    ctx.clip();
    ctx.globalAlpha = opacity * 0.96;
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = opacity;
    ctx.drawImage(edges, 0, 0);
    ctx.restore();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(x + band - 1, height * 0.12, Math.max(1, width / 700), height * 0.76);
    ctx.globalAlpha = 1;
  }

  function drawScan(left, opacity) {
    scanLeft = left;
    scanOpacity = opacity;
    ctx.clearRect(0, 0, width, height);
    inspect(left * width, opacity);
  }

  function tick(now) {
    raf = 0;
    if (!canInspect()) {
      stop();
      return;
    }
    const t = clamp((now - started) / DURATION);
    if (t >= 1) {
      stop();
      return;
    }
    drawScan(-BAND + smooth(t) * (1 + BAND), smooth(t / 0.1) * smooth((1 - t) / 0.15));
    raf = requestAnimationFrame(tick);
  }

  function play() {
    if (!canInspect() || pointer || mode === "manual" || raf) return;
    mode = "auto";
    started = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function manualAt(left) {
    if (!canInspect()) return;
    cancelAnimationFrame(raf);
    raf = 0;
    mode = "manual";
    drawScan(Math.max(0, Math.min(1 - BAND, left)), 1);
  }

  function settle() {
    if (mode !== "manual" || pointer) return;
    const from = performance.now();
    const left = scanLeft;
    mode = "settling";
    const fade = (now) => {
      raf = 0;
      const t = clamp((now - from) / 320);
      if (t >= 1 || !canInspect()) {
        stop();
        return;
      }
      drawScan(left, 1 - smooth(t));
      raf = requestAnimationFrame(fade);
    };
    raf = requestAnimationFrame(fade);
  }

  const positionAt = (event) => {
    const rect = frame.getBoundingClientRect();
    return (event.clientX - rect.left) / rect.width;
  };

  const onDown = (event) => {
    if (!event.isPrimary || event.button !== 0 || !canInspect() || pointer) return;
    const x = positionAt(event);
    const offset = scanOpacity > 0.1 && x >= scanLeft && x <= scanLeft + BAND ? x - scanLeft : BAND / 2;
    pointer = { id: event.pointerId, offset, startX: event.clientX, startY: event.clientY, moved: false, horizontal: event.pointerType !== "touch" };
    if (pointer.horizontal) {
      frame.setPointerCapture(event.pointerId);
      manualAt(x - offset);
    }
  };
  const onMove = (event) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = Math.abs(event.clientX - pointer.startX);
    const dy = Math.abs(event.clientY - pointer.startY);
    if (!pointer.horizontal) {
      if (dy > 8 && dy > dx) {
        pointer = null;
        return;
      }
      if (dx > 8) {
        pointer.horizontal = true;
        frame.setPointerCapture(event.pointerId);
      } else return;
    }
    pointer.moved ||= dx > 3;
    manualAt(positionAt(event) - pointer.offset);
  };
  const onUp = (event) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (!pointer.moved) manualAt(positionAt(event) - BAND / 2);
    const rect = frame.getBoundingClientRect();
    pointer = null;
    status.textContent = `X-ray position: ${Math.round((scanLeft / (1 - BAND)) * 100)} percent. Escape restores the image.`;
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) settle();
  };
  const onLeave = () => {
    if (!pointer && mode === "manual") settle();
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      stop();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      mode = "idle";
      play();
    }
  };
  frame.addEventListener("pointerdown", onDown);
  frame.addEventListener("pointermove", onMove);
  frame.addEventListener("pointerup", onUp);
  const onCancel = () => {
    pointer = null;
    stop();
  };
  frame.addEventListener("pointercancel", onCancel);
  frame.addEventListener("pointerleave", onLeave);
  frame.addEventListener("keydown", onKey);

  const observer = new IntersectionObserver(
    (entries) => {
      inView = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0.55);
      if (inView && !played) {
        played = true;
        play();
      }
      if (!inView && mode !== "idle") stop();
    },
    { threshold: [0, 0.55, 1] },
  );
  const resize = new ResizeObserver(() => prepare());
  const start = () => {
    prepare();
    observer.observe(frame);
    resize.observe(frame);
  };
  if (image.complete && image.naturalWidth) start();
  else image.addEventListener("load", start, { once: true });

  return {
    destroy() {
      stop();
      observer.disconnect();
      resize.disconnect();
      image.removeEventListener("load", start);
      frame.removeEventListener("pointerdown", onDown);
      frame.removeEventListener("pointermove", onMove);
      frame.removeEventListener("pointerup", onUp);
      frame.removeEventListener("pointercancel", onCancel);
      frame.removeEventListener("pointerleave", onLeave);
      frame.removeEventListener("keydown", onKey);
      canvas.remove();
      status.remove();
      frame.removeAttribute("tabindex");
      frame.removeAttribute("aria-label");
    },
  };
}
