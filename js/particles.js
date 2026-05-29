// 海面光点粒子：缓慢上浮 + 闪烁，营造阳光洒在海面的感觉。
(function () {
  const canvas = document.getElementById("particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let w = 0;
  let h = 0;
  let dpr = 1;
  let points = [];

  const { sceneHeight } = window.SHARED;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    // 宽度取居中海洋栏的 CSS 宽度；高度撑满整张滚动场景
    w = Math.max(1, canvas.offsetWidth);
    h = sceneHeight();
    canvas.style.height = h + "px";
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const count = Math.round(Math.min(160, (w * h) / 12000));
    points = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 2.2,
      speed: 0.05 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.6 + Math.random() * 1.4,
      warm: Math.random() > 0.5,
    }));
  }

  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    const time = t * 0.001;
    for (const p of points) {
      p.y -= p.speed;
      if (p.y < -4) {
        p.y = h + 4;
        p.x = Math.random() * w;
      }
      const alpha = 0.2 + (Math.sin(time * p.twinkle + p.phase) * 0.5 + 0.5) * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.warm
        ? `rgba(255, 253, 231, ${alpha})`
        : `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scene:layout", resize, { passive: true });
  resize();
  requestAnimationFrame(frame);
})();
