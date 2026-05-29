// 背景海洋生物：小鱼 / 水母 / 螃蟹 / 海虾 共用一套游动逻辑（漫游 + 鼠标吸引 + 环绕）；
// 海草固定在底部随水流摆动。canvas 固定全屏，位于岛屿之后（水中）。
(function () {
  const canvas = document.getElementById("fish");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const TAU = Math.PI * 2;

  const FISH_COLORS = [
    "#FF8A65", "#FFD54F", "#4FC3F7", "#81C784", "#F06292",
    "#BA68C8", "#FFB74D", "#4DD0E1", "#E57373", "#9CCC65",
  ];
  const JELLY_COLORS = ["#CE93D8", "#B39DDB", "#F48FB1", "#80DEEA", "#9FA8DA"];
  const CRAB_COLORS = ["#EF5350", "#FF7043", "#EC407A"];
  const SHRIMP_COLORS = ["#FF8A80", "#FFAB91", "#F48FB1"];
  const WEED_COLORS = ["#43A047", "#2E7D32", "#66BB6A", "#388E3C", "#1B9E5A"];

  // 鱼的种类：体长区间、身高比例、背鳍大小、尾型、花纹、速度倍率
  const SPECIES = [
    { id: "slim",   len: [26, 40], bodyH: 0.46, dorsal: 0.9,  tail: "fan",  pattern: "none",   spd: 1.0 },
    { id: "round",  len: [24, 32], bodyH: 0.64, dorsal: 0.7,  tail: "fan",  pattern: "none",   spd: 0.85 },
    { id: "long",   len: [36, 50], bodyH: 0.30, dorsal: 0.6,  tail: "fork", pattern: "stripe", spd: 1.2 },
    { id: "angel",  len: [26, 34], bodyH: 0.80, dorsal: 1.35, tail: "fan",  pattern: "stripe", spd: 0.8, anal: true },
    { id: "tiny",   len: [16, 22], bodyH: 0.5,  dorsal: 0.7,  tail: "fan",  pattern: "none",   spd: 1.6 },
    { id: "spotty", len: [28, 38], bodyH: 0.54, dorsal: 0.95, tail: "fork", pattern: "spot",   spd: 1.0 },
  ];

  const ATTRACT_RADIUS = 400; // 鼠标吸引半径(px)
  const POINTER_TIMEOUT = 2500; // 指针静止超时后解除吸引(ms)
  const SEABED = 26; // 底部沙质海床厚度(px)，海草自此扎根

  let w = 0;
  let h = 0;
  let dpr = 1;
  let agents = [];
  let weeds = [];
  let last = 0;

  // ---- 指针（触屏不启用吸引） ----
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const pointer = { x: 0, y: 0, active: false };
  let pointerTimer = 0;
  if (!coarse) {
    window.addEventListener(
      "pointermove",
      (e) => {
        // 画布随页面滚动，用实时位置把指针换算到画布内坐标
        const r = canvas.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
        pointer.active = true;
        clearTimeout(pointerTimer);
        pointerTimer = setTimeout(() => (pointer.active = false), POINTER_TIMEOUT);
      },
      { passive: true }
    );
    window.addEventListener("blur", () => (pointer.active = false));
    document.addEventListener("pointerleave", () => (pointer.active = false));
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // 各类生物共用的基础字段
  function baseAgent(depth) {
    return {
      x: rand(0, w),
      y: rand(0, h),
      heading: rand(0, TAU),
      wanderAngle: rand(0, TAU),
      speed: 0,
      pulse: rand(0, TAU),
      pulseSpeed: rand(0.6, 1.4),
      phase: rand(0, TAU),
      phaseRate: 2,
      depth,
      biasY: 0, // 垂直倾向（螃蟹偏底部）
    };
  }

  function makeFish() {
    const depth = rand(0.55, 1);
    const sp = pick(SPECIES);
    const a = baseAgent(depth);
    a.kind = "fish";
    a.orient = "swim";
    a.sp = sp;
    a.size = rand(sp.len[0], sp.len[1]) * depth;
    a.baseSpeed = rand(24, 80) * (0.7 + depth * 0.5) * sp.spd;
    a.color = pick(FISH_COLORS);
    if (sp.pattern === "spot") {
      a.spots = Array.from({ length: 4 }, () => ({
        fx: rand(-0.28, 0.34),
        fy: rand(-0.3, 0.3),
        fr: rand(0.04, 0.07),
      }));
    }
    return a;
  }

  function makeJelly() {
    const depth = rand(0.5, 1);
    const a = baseAgent(depth);
    a.kind = "jelly";
    a.orient = "upright";
    a.size = rand(30, 50) * depth;
    a.baseSpeed = rand(12, 28) * (0.7 + depth * 0.4);
    a.color = pick(JELLY_COLORS);
    a.tentacles = 4 + ((Math.random() * 3) | 0);
    a.phaseRate = 1.2;
    return a;
  }

  function makeCrab() {
    const depth = rand(0.6, 1);
    const a = baseAgent(depth);
    a.kind = "crab";
    a.orient = "upright";
    a.size = rand(26, 40) * depth;
    a.baseSpeed = rand(16, 34) * (0.7 + depth * 0.4);
    a.color = pick(CRAB_COLORS);
    a.phaseRate = 3;
    a.biasY = 0.45; // 倾向于靠近底部
    return a;
  }

  function makeShrimp() {
    const depth = rand(0.55, 1);
    const a = baseAgent(depth);
    a.kind = "shrimp";
    a.orient = "swim";
    a.size = rand(26, 40) * depth;
    a.baseSpeed = rand(30, 60) * (0.7 + depth * 0.5);
    a.color = pick(SHRIMP_COLORS);
    a.phaseRate = 4;
    return a;
  }

  function makeWeed(x) {
    return {
      x,
      height: rand(70, 160),
      width: rand(12, 24),
      phase: rand(0, TAU),
      sway: rand(10, 26),
      swaySpeed: rand(0.5, 1.1),
      color: pick(WEED_COLORS),
      blades: 1 + ((Math.random() * 2) | 0),
    };
  }

  function sceneHeight() {
    const scene = document.getElementById("scene");
    return Math.max(
      1,
      window.SCENE_HEIGHT || (scene && scene.clientHeight) || window.innerHeight
    );
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    // 宽度取居中海洋栏的 CSS 宽度；高度撑满整张滚动场景
    w = Math.max(1, canvas.offsetWidth);
    h = sceneHeight();
    canvas.style.height = h + "px";
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const area = w * h;
    const fishCount = clamp(Math.round(area / 60000), 10, 24);
    const jellyCount = clamp(Math.round(area / 420000), 2, 5);
    const crabCount = clamp(Math.round(area / 700000), 1, 3);
    const shrimpCount = clamp(Math.round(area / 440000), 2, 4);

    agents = [
      ...Array.from({ length: fishCount }, makeFish),
      ...Array.from({ length: jellyCount }, makeJelly),
      ...Array.from({ length: crabCount }, makeCrab),
      ...Array.from({ length: shrimpCount }, makeShrimp),
    ];

    // 海草：底部均匀分布
    weeds = [];
    for (let x = rand(20, 60); x < w - 20; x += rand(80, 150)) {
      weeds.push(makeWeed(x));
    }
  }

  // 朝目标角度平滑转向（取最短弧，限制每帧步长）
  function angLerp(a, target, maxStep) {
    let d = target - a;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    if (d > maxStep) d = maxStep;
    if (d < -maxStep) d = -maxStep;
    return a + d;
  }

  // 共用：漫游 + 鼠标吸引 + 环绕 + 速度脉动
  function update(a, dt) {
    a.wanderAngle += rand(-1, 1) * 1.6 * dt;
    let dx = Math.cos(a.wanderAngle);
    let dy = Math.sin(a.wanderAngle) + a.biasY;

    // 垂直软边界：把生物留在水体内，避免穿过顶部或底部海床（海草处）被裁切
    const topB = a.size * 0.6 + 12;
    const floorB = a.size * 0.6 + SEABED + 8;
    if (a.y < topB) dy += (1 - a.y / topB) * 2.4;
    else if (a.y > h - floorB) dy -= (1 - (h - a.y) / floorB) * 2.4;

    let attracted = 0;
    if (pointer.active) {
      const px = pointer.x - a.x;
      const py = pointer.y - a.y;
      const dist = Math.hypot(px, py);
      if (dist < ATTRACT_RADIUS && dist > 0.001) {
        attracted = 1 - dist / ATTRACT_RADIUS;
        const wgt = attracted * 3.2;
        dx += (px / dist) * wgt;
        dy += (py / dist) * wgt;
      }
    }

    const desired = Math.atan2(dy, dx);
    const maxTurn = (0.9 + attracted * 1.6) * dt;
    a.heading = angLerp(a.heading, desired, maxTurn);

    a.pulse += a.pulseSpeed * dt;
    const pulseFactor = 1 + Math.sin(a.pulse) * 0.28;
    const targetSpeed = a.baseSpeed * pulseFactor * (1 + attracted * 0.9);
    a.speed += (targetSpeed - a.speed) * Math.min(1, dt * 3);

    a.x += Math.cos(a.heading) * a.speed * dt;
    a.y += Math.sin(a.heading) * a.speed * dt;

    // 水平环绕：游出一侧从对侧返回，分布均匀、不在角落堆积
    const m = a.size + 24;
    const fullW = w + m * 2;
    if (a.x < -m) a.x += fullW;
    else if (a.x > w + m) a.x -= fullW;

    // 垂直兜底（极少触发）：不弹跳，紧贴边界即可
    if (a.y < a.size * 0.4) a.y = a.size * 0.4;
    else if (a.y > h - a.size * 0.3) a.y = h - a.size * 0.3;

    a.phase += (a.phaseRate + a.speed / 18) * dt;
  }

  // ---------- 绘制 ----------
  function drawFish(a) {
    const sp = a.sp;
    const len = a.size;
    const bodyH = len * sp.bodyH;
    const baseAlpha = 0.55 + a.depth * 0.4;
    ctx.globalAlpha = baseAlpha;
    const tail = Math.sin(a.phase) * 0.5;
    const tx = -len * 0.5;
    ctx.fillStyle = a.color;

    if (sp.tail === "fork") {
      const sw = tail * bodyH * 0.5;
      ctx.beginPath();
      ctx.moveTo(tx, 0);
      ctx.lineTo(tx - len * 0.34, -bodyH * 0.7 + sw);
      ctx.lineTo(tx - len * 0.14, sw * 0.5);
      ctx.lineTo(tx - len * 0.34, bodyH * 0.7 + sw);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(tx, 0);
      ctx.lineTo(tx - len * 0.32, -bodyH * 0.5 + tail * bodyH * 0.5);
      ctx.lineTo(tx - len * 0.32, bodyH * 0.5 + tail * bodyH * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    const dh = bodyH * sp.dorsal;
    ctx.beginPath();
    ctx.moveTo(len * 0.08, -bodyH * 0.4);
    ctx.lineTo(-len * 0.16, -dh);
    ctx.lineTo(-len * 0.24, -bodyH * 0.38);
    ctx.closePath();
    ctx.fill();

    if (sp.anal) {
      ctx.beginPath();
      ctx.moveTo(len * 0.02, bodyH * 0.4);
      ctx.lineTo(-len * 0.14, dh * 0.8);
      ctx.lineTo(-len * 0.2, bodyH * 0.38);
      ctx.closePath();
      ctx.fill();
    }

    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.5, bodyH * 0.5, 0, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = baseAlpha * 0.5;
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.beginPath();
    ctx.ellipse(len * 0.06, bodyH * 0.16, len * 0.3, bodyH * 0.26, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = baseAlpha;

    if (sp.pattern !== "none") {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, len * 0.5, bodyH * 0.5, 0, 0, TAU);
      ctx.clip();
      if (sp.pattern === "stripe") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
        for (let i = -1; i <= 1; i++) {
          ctx.fillRect(i * len * 0.2 - len * 0.045, -bodyH, len * 0.09, bodyH * 2);
        }
      } else if (sp.pattern === "spot" && a.spots) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        for (const s of a.spots) {
          ctx.beginPath();
          ctx.arc(s.fx * len, s.fy * bodyH, s.fr * len, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    ctx.fillStyle = "rgba(40, 42, 52, 0.9)";
    ctx.beginPath();
    ctx.arc(len * 0.28, -bodyH * 0.12, Math.max(1, len * 0.05), 0, TAU);
    ctx.fill();
  }

  function drawJelly(a) {
    const s = a.size;
    const alpha = 0.3 + a.depth * 0.3;
    const pulse = Math.sin(a.phase) * 0.12;
    const bw = s * 0.5 * (1 + pulse);
    const bh = s * 0.6 * (1 - pulse);

    // 触手
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = a.color;
    ctx.lineWidth = Math.max(1, s * 0.045);
    ctx.lineCap = "round";
    const n = a.tentacles;
    for (let i = 0; i < n; i++) {
      const tx = -bw * 0.7 + (i / (n - 1)) * bw * 1.4;
      ctx.beginPath();
      ctx.moveTo(tx, 0);
      const tlen = s * 0.8;
      for (let k = 1; k <= 4; k++) {
        const t = k / 4;
        const wob = Math.sin(a.phase * 2 + i + t * 3) * s * 0.09 * t;
        ctx.lineTo(tx + wob, t * tlen);
      }
      ctx.stroke();
    }

    // 伞盖
    ctx.globalAlpha = alpha;
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh, 0, Math.PI, TAU);
    ctx.closePath();
    ctx.fill();
    // 顶部高光
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(-bw * 0.25, -bh * 0.45, bw * 0.22, bh * 0.28, 0, 0, TAU);
    ctx.fill();
  }

  function drawCrab(a) {
    const s = a.size;
    ctx.globalAlpha = 0.62 + a.depth * 0.35;
    const sw = Math.sin(a.phase * 2);
    const bw = s * 0.5;
    const bh = s * 0.34;
    ctx.strokeStyle = a.color;
    ctx.lineWidth = Math.max(1.5, s * 0.06);
    ctx.lineCap = "round";

    // 腿（每侧 3 条）
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 3; i++) {
        const ax = (i - 1) * bw * 0.5;
        const ay = bh * 0.2;
        const ex = ax + side * (bw * 0.5 + s * 0.14);
        const ey = ay + bh * 0.95 + sw * (i - 1) * s * 0.05;
        const mx = (ax + ex) / 2 + side * s * 0.04;
        const my = ay - s * 0.04;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(mx, my, ex, ey);
        ctx.stroke();
      }
    }

    // 钳子（前方两侧）
    for (let side = -1; side <= 1; side += 2) {
      const cx = side * bw * 0.95;
      const cy = -bh * 0.55 + sw * s * 0.03 * side;
      ctx.beginPath();
      ctx.moveTo(side * bw * 0.5, -bh * 0.2);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * 0.13, s * 0.1, side * 0.4, 0, TAU);
      ctx.fill();
    }

    // 身体
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh, 0, 0, TAU);
    ctx.fill();

    // 眼睛
    for (let side = -1; side <= 1; side += 2) {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.arc(side * bw * 0.3, -bh * 0.55, s * 0.07, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(40,42,52,0.9)";
      ctx.beginPath();
      ctx.arc(side * bw * 0.3, -bh * 0.55, s * 0.035, 0, TAU);
      ctx.fill();
    }
  }

  function drawShrimp(a) {
    const s = a.size;
    ctx.globalAlpha = 0.55 + a.depth * 0.4;
    const bend = Math.sin(a.phase) * 0.15;
    ctx.fillStyle = a.color;

    // 身体：由前到后渐细的圆，整体向上拱起
    const segN = 6;
    for (let i = 0; i < segN; i++) {
      const t = i / (segN - 1);
      const x = (0.45 - t * 0.9) * s;
      const y = -Math.sin(t * Math.PI) * s * 0.12 - bend * s * 0.1 * t;
      const r = (0.16 - t * 0.09) * s;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, r), 0, TAU);
      ctx.fill();
    }

    // 尾扇
    const tx = -0.45 * s;
    ctx.beginPath();
    ctx.moveTo(tx, 0);
    ctx.lineTo(tx - s * 0.18, -s * 0.14);
    ctx.lineTo(tx - s * 0.1, 0);
    ctx.lineTo(tx - s * 0.18, s * 0.14);
    ctx.closePath();
    ctx.fill();

    // 触须
    ctx.strokeStyle = a.color;
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.lineCap = "round";
    const fx = 0.45 * s;
    ctx.beginPath();
    ctx.moveTo(fx, 0);
    ctx.quadraticCurveTo(fx + s * 0.3, -s * 0.12, fx + s * 0.52, -s * 0.04 + bend * s * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx, 0);
    ctx.quadraticCurveTo(fx + s * 0.3, s * 0.06, fx + s * 0.55, s * 0.14 + bend * s * 0.1);
    ctx.stroke();

    // 眼睛
    ctx.fillStyle = "rgba(40, 42, 52, 0.9)";
    ctx.beginPath();
    ctx.arc(fx - s * 0.06, -s * 0.05, Math.max(1, s * 0.04), 0, TAU);
    ctx.fill();
  }

  const DRAW = { fish: drawFish, jelly: drawJelly, crab: drawCrab, shrimp: drawShrimp };

  function drawAgent(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    if (a.orient === "swim") {
      ctx.rotate(a.heading);
      if (Math.cos(a.heading) < 0) ctx.scale(1, -1); // 朝左时翻转，保持背部朝上
    } else if (Math.cos(a.heading) < 0) {
      ctx.scale(-1, 1); // 直立生物：水平翻转面向移动方向
    }
    DRAW[a.kind](a);
    ctx.restore();
  }

  // 底部沙质海床：固定在界面底部，海草由此扎根
  function drawSeabed() {
    const top = h - SEABED;
    ctx.globalAlpha = 1;
    // 海床上方一层柔和的深水过渡，让坐底更自然
    const grad = ctx.createLinearGradient(0, top - 70, 0, h);
    grad.addColorStop(0, "rgba(20, 80, 105, 0)");
    grad.addColorStop(1, "rgba(18, 70, 95, 0.35)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, top - 70, w, 70 + SEABED);
    // 沙质带 + 起伏
    ctx.fillStyle = "#cdb878";
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, top + 4);
    for (let x = 0; x <= w; x += 46) {
      ctx.quadraticCurveTo(x + 23, top - 5, x + 46, top + 4);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    // 沙面高光
    ctx.fillStyle = "rgba(255, 248, 214, 0.35)";
    ctx.fillRect(0, top + 2, w, 3);
  }

  function drawWeed(wd, time) {
    for (let b = 0; b < wd.blades; b++) {
      const baseX = wd.x + (b - (wd.blades - 1) / 2) * wd.width * 0.9;
      const baseY = h - SEABED + 8;
      const segs = 6;
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const sway = Math.sin(time * wd.swaySpeed + wd.phase + b + t * 2.2) * wd.sway * t;
        pts.push({
          x: baseX + sway,
          y: baseY - t * wd.height,
          half: (wd.width * 0.5) * (1 - t * 0.7),
        });
      }
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = wd.color;
      ctx.beginPath();
      ctx.moveTo(pts[0].x - pts[0].half, pts[0].y);
      for (let i = 1; i <= segs; i++) ctx.lineTo(pts[i].x - pts[i].half, pts[i].y);
      for (let i = segs; i >= 0; i--) ctx.lineTo(pts[i].x + pts[i].half, pts[i].y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // 切后台回来不跳变
    const time = now / 1000;
    ctx.clearRect(0, 0, w, h);

    drawSeabed();
    for (const wd of weeds) drawWeed(wd, time);
    for (const a of agents) {
      update(a, dt);
      drawAgent(a);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scene:layout", resize, { passive: true });
  resize();
  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });
})();
