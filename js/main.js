// 入口：根据配置生成岛屿、绑定交互、编排加载与入场动画。
(function () {
  const stage = document.getElementById("islands");
  const islands = window.ISLANDS || [];
  /** 岛屿布局的设计基准宽度（与 css --scene-w 桌面值一致） */
  const DESIGN_BOARD_W = 1236;
  const islandNodes = [];

  function buildIsland(data) {
    const el = document.createElement("div");
    el.className = "island";
    el.id = "island-" + data.id;
    el.style.left = data.x + "%";
    el.style.top = data.y + "px";
    el.style.width = data.size + "px";
    el.style.setProperty("--island-color", data.color);
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", data.name);

    const visual = data.sprite
      ? `<img class="island__img" src="${data.sprite}" alt="${data.name}" draggable="false" />`
      : `<div class="island__placeholder" data-emoji="${data.emoji}"></div>`;

    el.innerHTML = `
      <span class="island__label"><span class="dot"></span>${data.emoji} ${data.name}</span>
      <div class="island__rise">
        <div class="island__floater" style="animation-duration:${data.float.dur}s;animation-delay:${data.float.delay}s">
          <div class="island__inner">${visual}</div>
        </div>
      </div>`;

    const activate = () => window.Modal.open(data);
    el.addEventListener("click", activate);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });

    return el;
  }

  islands.forEach((data) => {
    const el = buildIsland(data);
    stage.appendChild(el);
    islandNodes.push({ el, data });
  });

  // 设置整体场景高度，并通知各画布层按此高度自适应（解决脚本顺序 / 视口变化）
  const scene = document.getElementById("scene");
  const board = document.getElementById("board");

  /** 按海洋栏实际宽度等比缩放岛屿尺寸与纵向间距，避免窄屏重叠、宽屏过小 */
  function applyResponsiveIslands() {
    if (!board || !islandNodes.length) return 0;
    const raw = board.offsetWidth / DESIGN_BOARD_W;
    const scale = Math.max(0.45, Math.min(1.08, raw));
    document.documentElement.style.setProperty("--layout-scale", scale.toFixed(4));

    for (const { el, data } of islandNodes) {
      el.style.width = Math.round(data.size * scale) + "px";
      el.style.top = Math.round(data.y * scale) + "px";
    }
    const boardH = Math.round((window.BOARD_HEIGHT || 1380) * scale);
    stage.style.height = boardH + "px";
    return boardH;
  }

  function layoutScene() {
    if (!scene) return;
    const boardH = applyResponsiveIslands();
    const content = board ? Math.max(board.offsetHeight, boardH) : boardH;
    const sceneH = Math.max(content, window.innerHeight);
    scene.style.height = sceneH + "px";
    window.SCENE_HEIGHT = sceneH;
    window.dispatchEvent(new Event("scene:layout"));
  }

  layoutScene();
  window.addEventListener("resize", layoutScene, { passive: true });
  window.addEventListener("load", layoutScene, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", layoutScene, { passive: true });
  }

  // 加载页省略号动画（Safari 不支持 content 属性 CSS 动画）
  const loaderDots = document.getElementById("loaderDots");
  let dotsTimer = 0;
  if (loaderDots) {
    const frames = ["", ".", "..", "..."];
    let idx = 0;
    dotsTimer = setInterval(() => {
      idx = (idx + 1) % frames.length;
      loaderDots.textContent = frames[idx];
    }, 350);
  }

  const still = new URLSearchParams(location.search).has("still");

  function reveal() {
    const nodes = Array.from(stage.children);
    const profile = document.getElementById("profile");
    const loader = document.getElementById("loader");

    if (still) {
      clearInterval(dotsTimer);
      nodes.forEach((node) => node.classList.add("is-in"));
      profile.classList.add("is-in");
      loader.classList.add("is-hidden");
      return;
    }

    nodes.forEach((node, i) => {
      node.style.setProperty("--d", (i * 0.12).toFixed(2) + "s");
      requestAnimationFrame(() => node.classList.add("is-in"));
    });
    setTimeout(() => profile.classList.add("is-in"), nodes.length * 120 + 300);
    setTimeout(() => {
      clearInterval(dotsTimer);
      loader.classList.add("is-hidden");
    }, 600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", reveal, { once: true });
  } else {
    reveal();
  }
})();
