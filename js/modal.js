// 弹出卡片：暗色毛玻璃蒙层 + 主题色卡片；支持各岛专属模块。
window.Modal = (function () {
  const root = document.getElementById("modal-root");
  const PLACEHOLDER_HTML =
    '<p class="modal-card__placeholder">这里的内容即将上线，敬请期待。</p>';

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-card__bar"></div>
      <button class="modal-card__close" aria-label="关闭">✕</button>
      <div class="modal-card__body">
        <div class="modal-card__head">
          <div class="modal-card__icon"></div>
          <div>
            <h2 class="modal-card__title"></h2>
            <p class="modal-card__subtitle"></p>
          </div>
        </div>
        <div class="modal-card__content">${PLACEHOLDER_HTML}</div>
      </div>
    </div>`;
  root.appendChild(overlay);

  const card = overlay.querySelector(".modal-card");
  const bodyEl = overlay.querySelector(".modal-card__body");
  const headEl = overlay.querySelector(".modal-card__head");
  const contentEl = overlay.querySelector(".modal-card__content");
  const closeBtn = overlay.querySelector(".modal-card__close");
  const iconEl = overlay.querySelector(".modal-card__icon");
  const titleEl = overlay.querySelector(".modal-card__title");
  const subtitleEl = overlay.querySelector(".modal-card__subtitle");

  let activeModule = null;

  function getModule(island) {
    const modules = window.ISLAND_MODULES || {};
    return modules[island.id] || null;
  }

  function resetContent() {
    if (activeModule && typeof activeModule.unmount === "function") {
      activeModule.unmount();
    }
    activeModule = null;
    card.classList.remove("modal-card--immersive");
    headEl.hidden = false;
    contentEl.innerHTML = PLACEHOLDER_HTML;
  }

  function open(island) {
    resetContent();

    overlay.style.setProperty("--card-color", island.color);
    card.querySelector(".modal-card__bar").style.background = island.color;
    iconEl.textContent = island.emoji;
    titleEl.textContent = island.name;
    subtitleEl.textContent = island.theme;

    const mod = getModule(island);
    if (mod) {
      card.classList.add("modal-card--immersive");
      headEl.hidden = true;
      contentEl.innerHTML = "";
      activeModule = mod;
      mod.mount(contentEl, island);
    }

    overlay.classList.add("is-open");
    document.body.style.cursor = "default";
  }

  function close() {
    overlay.classList.remove("is-open");
    resetContent();
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
  });

  return { open, close };
})();
