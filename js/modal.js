// 弹出卡片：暗色毛玻璃蒙层 + 主题色卡片。内容区目前留白占位。
window.Modal = (function () {
  const root = document.getElementById("modal-root");

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
        <div class="modal-card__content">
          <p class="modal-card__placeholder">这里的内容即将上线，敬请期待。</p>
        </div>
      </div>
    </div>`;
  root.appendChild(overlay);

  const card = overlay.querySelector(".modal-card");
  const closeBtn = overlay.querySelector(".modal-card__close");
  const iconEl = overlay.querySelector(".modal-card__icon");
  const titleEl = overlay.querySelector(".modal-card__title");
  const subtitleEl = overlay.querySelector(".modal-card__subtitle");

  function open(island) {
    overlay.style.setProperty("--card-color", island.color);
    card.querySelector(".modal-card__bar").style.background = island.color;
    iconEl.textContent = island.emoji;
    titleEl.textContent = island.name;
    subtitleEl.textContent = island.theme;
    overlay.classList.add("is-open");
    document.body.style.cursor = "default";
  }

  function close() {
    overlay.classList.remove("is-open");
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  return { open, close };
})();
