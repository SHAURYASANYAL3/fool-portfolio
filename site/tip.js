export function createTips() {
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.append(tip);
  let current = null;
  let timer = 0;

  function hide() {
    clearTimeout(timer);
    current = null;
    tip.hidden = true;
  }

  function show(target) {
    const text = target.dataset.tip;
    if (!text) {
      hide();
      return;
    }
    current = target;
    tip.textContent = text;
    tip.hidden = false;
    const box = target.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const x = Math.max(6, Math.min(innerWidth - w - 6, box.left + box.width / 2 - w / 2));
    const y = box.top - h - 6 < 6 ? box.bottom + 6 : box.top - h - 6;
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  document.addEventListener("pointerover", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-tip]") : null;
    if (target) {
      show(target);
      clearTimeout(timer);
      if (event.pointerType !== "mouse") timer = setTimeout(hide, 2500);
    } else if (current) hide();
  });
  document.addEventListener("pointerout", (event) => {
    if (event.pointerType !== "mouse") return;
    if (current && !(event.relatedTarget instanceof Node && current.contains(event.relatedTarget))) hide();
  });
  document.addEventListener("pointerdown", (event) => {
    if (current && !(event.target instanceof Node && current.contains(event.target))) hide();
  });
  document.addEventListener("click", (event) => {
    if (current && event.target instanceof Node && current.contains(event.target)) show(current);
  });
  addEventListener("scroll", hide, { capture: true, passive: true });
  return { hide };
}
