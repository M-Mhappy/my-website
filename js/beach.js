// 两侧沙滩：五彩贝壳 + 寄居蟹 + 沙粒。只在海洋栏两侧的留白区绘制，动漫扁平风，和海洋统一。
// 静态装饰（沙粒/贝壳）预渲染到离屏画布，主循环只动画寄居蟹，省性能。
(function () {
  const canvas = document.getElementById("beach");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const { rand, pick, clamp, sceneHeight } = window.SHARED;
  const TAU = Math.PI * 2;

  const SHELL_COLORS = [
    "#FF9AA2", "#FFB7B2", "#FFD79A", "#E5A8FF",
    "#A6E3C8", "#9BD8FF", "#FFC2DD", "#C5B3FF", "#FF8FA3",
  ];
  const CRAB_BODY = ["#F08A5D", "#EA6A8B", "#D86BC4", "#F2A65A"];
  const SAND_LIGHT = "rgba(255, 250, 222, 0.55)";
  const SAND_DARK = "rgba(150, 120, 60, 0.16)";
  const RIDGE = "rgba(0, 0, 0, 0.12)";
  const HL = "rgba(255, 255, 255, 0.32)";
  const SHADOW = "rgba(120, 95, 40, 0.16)";

  let w = 0, h = 0, dpr = 1;
  let colLeft = 0, colRight = 0;
  let shells = [], crabs = [], grains = [];
  let last = 0;

  const bg = document.createElement("canvas");
  const bgctx = bg.getContext("2d");

  // 指针追踪：鼠标靠近寄居蟹时它会缩回壳里（触屏不启用）
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const pointer = { x: -9999, y: -9999, active: false };
  const RETRACT_RADIUS = 90;
  if (!coarse) {
    window.addEventListener(
      "pointermove",
      (e) => {
        // 画布随页面滚动，用实时位置换算到画布内坐标
        const r = canvas.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
        pointer.active = true;
      },
      { passive: true }
    );
    window.addEventListener("blur", () => (pointer.active = false));
  }

  function measureCols() {
    const ocean = document.querySelector(".ocean");
    if (ocean) {
      const r = ocean.getBoundingClientRect();
      colLeft = clamp(r.left, 0, w);
      colRight = clamp(r.right, 0, w);
    } else {
      colLeft = w * 0.12;
      colRight = w * 0.88;
    }
  }

  function profileBox() {
    const p = document.getElementById("profile");
    if (!p) return null;
    const r = p.getBoundingClientRect();
    if (r.width < 1) return null;
    return { x0: r.left - 12, y0: r.top - 12, x1: r.right + 12, y1: r.bottom + 12 };
  }

  const inBox = (x, y, b) => b && x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;

  function spot(gx0, gx1, pad, avoid) {
    for (let i = 0; i < 24; i++) {
      const x = rand(gx0 + pad, gx1 - pad);
      const y = rand(pad + 8, h - pad - 8);
      if (inBox(x, y, avoid)) continue;
      return { x, y };
    }
    return null;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = sceneHeight();
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    measureCols();
    build();
    renderStatic();
  }

  function build() {
    shells = [];
    crabs = [];
    grains = [];
    const bands = [
      { x0: 2, x1: colLeft - 6, side: "L" },
      { x0: colRight + 6, x1: w - 2, side: "R" },
    ];
    const avoid = profileBox();
    for (const band of bands) {
      const gw = band.x1 - band.x0;
      if (gw < 10) continue; // 留白太窄不放装饰
      const area = gw * h;
      const narrow = gw < 50; // 窄带模式：用更小的贝壳和更少的寄居蟹

      const shellN = narrow
        ? clamp(Math.round(area / 40000), 1, 6)
        : clamp(Math.round(area / 24000), 3, 14);
      const shellPad = narrow ? 8 : 24;
      const shellSizeMin = narrow ? 5 : 11;
      const shellSizeMax = narrow ? 10 : 20;
      for (let i = 0; i < shellN; i++) {
        const p = spot(band.x0, band.x1, shellPad, band.side === "L" ? avoid : null);
        if (!p) continue;
        shells.push({
          x: p.x, y: p.y,
          size: rand(shellSizeMin, shellSizeMax),
          rot: rand(-0.4, 0.4),
          color: pick(SHELL_COLORS),
          type: pick(["fan", "spiral", "clam"]),
        });
      }

      const crabN = narrow ? 0 : (gw > 90 ? (Math.random() < 0.6 ? 2 : 1) : 1);
      const crabPad = Math.min(26, gw * 0.4);
      for (let i = 0; i < crabN; i++) {
        let cy = rand(40, h - 30);
        for (let t = 0; t < 20; t++) {
          cy = rand(40, h - 30);
          if (!(band.side === "L" && avoid && cy > avoid.y0 && cy < avoid.y1)) break;
        }
        crabs.push({
          x: rand(band.x0 + crabPad, band.x1 - crabPad),
          y: cy,
          size: gw > 90 ? rand(15, 22) : rand(10, 15),
          dir: Math.random() < 0.5 ? -1 : 1,
          spd: rand(6, 14),
          phase: rand(0, TAU),
          bodyColor: pick(CRAB_BODY),
          shellColor: pick(SHELL_COLORS),
          retract: 0,
          band,
        });
      }

      const grainN = clamp(Math.round(area / 1700), 40, 260);
      for (let i = 0; i < grainN; i++) {
        grains.push({
          x: rand(band.x0, band.x1),
          y: rand(2, h - 2),
          r: rand(0.6, 1.8),
          dark: Math.random() < 0.5,
        });
      }
    }
  }

  // ---------- 贝壳 ----------
  function drawFan(g, s) {
    const R = s.size;
    const cy = R * 0.5;
    g.fillStyle = s.color;
    g.beginPath();
    g.moveTo(0, cy);
    g.arc(0, cy, R, Math.PI * 1.18, Math.PI * 1.82, false);
    g.closePath();
    g.fill();
    g.strokeStyle = RIDGE;
    g.lineWidth = Math.max(0.8, R * 0.045);
    for (let i = -2; i <= 2; i++) {
      const ang = Math.PI * 1.5 + i * 0.16;
      g.beginPath();
      g.moveTo(0, cy);
      g.lineTo(Math.cos(ang) * R * 0.95, cy + Math.sin(ang) * R * 0.95);
      g.stroke();
    }
    g.fillStyle = s.color;
    g.beginPath();
    g.arc(0, cy, R * 0.12, 0, TAU);
    g.fill();
    g.fillStyle = HL;
    g.beginPath();
    g.ellipse(-R * 0.18, cy - R * 0.45, R * 0.2, R * 0.1, -0.5, 0, TAU);
    g.fill();
  }

  function drawSpiral(g, s) {
    const R = s.size;
    g.fillStyle = s.color;
    g.beginPath();
    g.ellipse(0, 0, R, R * 0.82, 0, 0, TAU);
    g.fill();
    g.strokeStyle = RIDGE;
    g.lineWidth = Math.max(0.8, R * 0.06);
    g.beginPath();
    g.moveTo(0, 0);
    for (let a = 0; a < TAU * 2.2; a += 0.25) {
      const rr = R * 0.12 + (a / (TAU * 2.2)) * R * 0.82;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.82);
    }
    g.stroke();
    g.fillStyle = HL;
    g.beginPath();
    g.ellipse(-R * 0.32, -R * 0.32, R * 0.22, R * 0.14, -0.5, 0, TAU);
    g.fill();
  }

  function drawClam(g, s) {
    const R = s.size;
    g.fillStyle = s.color;
    g.beginPath();
    g.ellipse(0, 0, R, R * 0.78, 0, 0, TAU);
    g.fill();
    g.strokeStyle = RIDGE;
    g.lineWidth = Math.max(0.8, R * 0.045);
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * R * 0.3, -R * 0.66);
      g.quadraticCurveTo(i * R * 0.44, 0, i * R * 0.3, R * 0.66);
      g.stroke();
    }
    g.fillStyle = s.color;
    g.beginPath();
    g.arc(0, -R * 0.78, R * 0.12, 0, TAU);
    g.fill();
    g.fillStyle = HL;
    g.beginPath();
    g.ellipse(-R * 0.24, -R * 0.18, R * 0.18, R * 0.1, -0.4, 0, TAU);
    g.fill();
  }

  function drawShell(g, s) {
    g.save();
    g.translate(s.x, s.y);
    g.fillStyle = SHADOW;
    g.beginPath();
    g.ellipse(0, s.size * 0.5, s.size * 0.95, s.size * 0.3, 0, 0, TAU);
    g.fill();
    g.rotate(s.rot);
    if (s.type === "fan") drawFan(g, s);
    else if (s.type === "spiral") drawSpiral(g, s);
    else drawClam(g, s);
    g.restore();
  }

  // 预渲染静态层（沙粒 + 贝壳）
  function renderStatic() {
    bg.width = w * dpr;
    bg.height = h * dpr;
    bgctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgctx.clearRect(0, 0, w, h);
    for (const gr of grains) {
      bgctx.fillStyle = gr.dark ? SAND_DARK : SAND_LIGHT;
      bgctx.beginPath();
      bgctx.arc(gr.x, gr.y, gr.r, 0, TAU);
      bgctx.fill();
    }
    for (const s of shells) drawShell(bgctx, s);
  }

  // ---------- 寄居蟹（动画） ----------
  function drawCrab(c, time) {
    const s = c.size;
    const wig = Math.sin(time * 6 + c.phase);
    const k = c.retract || 0; // 0 探出 / 1 缩满
    const ext = 1 - k;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.dir, 1);

    // 影子（缩壳时略收）
    ctx.fillStyle = SHADOW;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.58, s * (0.72 + 0.28 * ext), s * 0.3, 0, 0, TAU);
    ctx.fill();

    // 螺壳之家（始终在）
    ctx.save();
    ctx.translate(-s * 0.5, -s * 0.05);
    drawSpiral(ctx, { size: s * 0.85, color: c.shellColor });
    ctx.restore();

    // 蟹身（腿/身体/眼柄/钳）——鼠标靠近时淡出并向螺壳口收没
    if (ext > 0.02) {
      ctx.save();
      ctx.globalAlpha = ext;
      ctx.translate(-k * s * 0.5, 0); // 朝螺壳口收
      ctx.scale(ext, ext); // 缩小没入

      // 腿
      ctx.strokeStyle = c.bodyColor;
      ctx.lineWidth = Math.max(1.3, s * 0.08);
      ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        const lx = s * (0.06 + i * 0.16);
        const kk = (i % 2 ? 1 : -1) * wig * 0.5;
        ctx.beginPath();
        ctx.moveTo(lx, s * 0.18);
        ctx.quadraticCurveTo(lx + s * 0.16, s * 0.5, lx + s * 0.3, s * 0.62 + kk * s * 0.12);
        ctx.stroke();
      }

      // 身体
      ctx.fillStyle = c.bodyColor;
      ctx.beginPath();
      ctx.ellipse(s * 0.45, s * 0.05, s * 0.36, s * 0.32, 0, 0, TAU);
      ctx.fill();

      // 眼柄 + 眼睛
      ctx.strokeStyle = c.bodyColor;
      ctx.lineWidth = Math.max(1.3, s * 0.07);
      const ey = -s * 0.34 + wig * s * 0.03;
      ctx.beginPath(); ctx.moveTo(s * 0.5, -s * 0.18); ctx.lineTo(s * 0.5, ey); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.68, -s * 0.18); ctx.lineTo(s * 0.68, ey); ctx.stroke();
      ctx.fillStyle = "#2d2f39";
      ctx.beginPath(); ctx.arc(s * 0.5, ey, Math.max(1.4, s * 0.08), 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.68, ey, Math.max(1.4, s * 0.08), 0, TAU); ctx.fill();

      // 双钳
      ctx.fillStyle = c.bodyColor;
      const o = wig * 0.2;
      const claw = (cx, cy, r, open) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, open, open + Math.PI * 1.55);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.fill();
      };
      claw(s * 0.86, s * 0.22, s * 0.22, 0.4 + o);
      claw(s * 0.92, -s * 0.02, s * 0.18, -0.2 - o);

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    ctx.restore();
  }

  function updateCrab(c, dt) {
    // 鼠标靠近 → 缩回壳里
    let target = 0;
    if (pointer.active) {
      const d = Math.hypot(pointer.x - c.x, pointer.y - c.y);
      if (d < RETRACT_RADIUS) target = Math.min(1, (1 - d / RETRACT_RADIUS) * 1.6);
    }
    c.retract += (target - (c.retract || 0)) * Math.min(1, dt * 10);

    // 缩壳时基本不动
    c.x += c.dir * c.spd * dt * (1 - c.retract);
    const lo = c.band.x0 + c.size * 1.1;
    const hi = c.band.x1 - c.size * 1.1;
    if (c.x < lo) { c.x = lo; c.dir = 1; }
    else if (c.x > hi) { c.x = hi; c.dir = -1; }
  }

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    const time = now / 1000;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bg, 0, 0, w, h);
    for (const c of crabs) {
      updateCrab(c, dt);
      drawCrab(c, time);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("load", resize, { passive: true });
  window.addEventListener("scene:layout", resize, { passive: true });
  resize();
  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });
})();
