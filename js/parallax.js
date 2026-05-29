// 鼠标视差：根据指针位置，按各层 data-depth 做轻微平移。
(function () {
  const layers = Array.from(document.querySelectorAll("[data-depth]"));
  if (!layers.length || window.matchMedia("(pointer: coarse)").matches) return;

  let targetX = 0;
  let targetY = 0;
  let curX = 0;
  let curY = 0;

  window.addEventListener(
    "pointermove",
    (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true }
  );

  function tick() {
    curX += (targetX - curX) * 0.06;
    curY += (targetY - curY) * 0.06;
    for (const layer of layers) {
      const depth = parseFloat(layer.dataset.depth) || 0;
      const dx = -curX * depth * 100;
      const dy = -curY * depth * 100;
      layer.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
