// 入口：根据配置生成岛屿、绑定交互、编排加载与入场动画。
(function () {
  const stage = document.getElementById("islands");
  const islands = window.ISLANDS || [];

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

  islands.forEach((data) => stage.appendChild(buildIsland(data)));

  if (window.BOARD_HEIGHT) {
    stage.style.height = window.BOARD_HEIGHT + "px";
  }

  // 设置整体场景高度，并通知各画布层按此高度自适应（解决脚本顺序 / 视口变化）
  const scene = document.getElementById("scene");
  const board = document.getElementById("board");

  function layoutScene() {
    if (!scene) return;
    const content = board ? board.offsetHeight : window.BOARD_HEIGHT || 0;
    const sceneH = Math.max(content, window.innerHeight);
    scene.style.height = sceneH + "px";
    window.SCENE_HEIGHT = sceneH;
    window.dispatchEvent(new Event("scene:layout"));
  }

  layoutScene();
  window.addEventListener("resize", layoutScene, { passive: true });
  window.addEventListener("load", layoutScene, { passive: true });

  const still = new URLSearchParams(location.search).has("still");

  function reveal() {
    const nodes = Array.from(stage.children);
    const profile = document.getElementById("profile");
    const loader = document.getElementById("loader");

    if (still) {
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
    setTimeout(() => loader.classList.add("is-hidden"), 600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", reveal, { once: true });
  } else {
    reveal();
  }
})();
