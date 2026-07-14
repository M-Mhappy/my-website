(function () {
  const stage = document.getElementById("islands");
  const loader = document.getElementById("loader");
  const loaderDots = document.getElementById("loaderDots");
  const profile = document.getElementById("profile");
  const modules = window.ISLANDS || [];

  function buildModule(item, index) {
    const tile = document.createElement("article");
    tile.className = "archive-tile" + (index === 0 ? " archive-tile--lead" : "");
    tile.id = item.id;
    tile.tabIndex = 0;
    tile.setAttribute("role", "button");
    tile.setAttribute("aria-label", item.name);
    tile.style.setProperty("--accent", item.color);
    tile.style.setProperty("--delay", `${index * 90}ms`);

    tile.innerHTML = `
      <img class="archive-tile__image" src="${item.sprite}" alt="${item.name}" draggable="false" />
      <div class="archive-tile__shade"></div>
      <div class="archive-tile__content">
        <p class="archive-tile__eyebrow">${item.eyebrow}</p>
        <h2 class="archive-tile__title">${item.name}</h2>
        <p class="archive-tile__summary">${item.summary}</p>
        <span class="archive-tile__action">${item.action}</span>
      </div>
    `;

    const open = () => window.Modal && window.Modal.open(item);
    tile.addEventListener("click", open);
    tile.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });

    return tile;
  }

  function renderModules() {
    if (!stage) return;
    stage.innerHTML = "";
    modules.forEach((item, index) => {
      stage.appendChild(buildModule(item, index));
    });
  }

  function animateLoaderDots() {
    if (!loaderDots) return 0;
    const frames = ["", ".", "..", "..."];
    let current = 0;
    return window.setInterval(() => {
      current = (current + 1) % frames.length;
      loaderDots.textContent = frames[current];
    }, 320);
  }

  function reveal(timer) {
    window.clearInterval(timer);
    document.body.classList.add("is-ready");
    profile && profile.classList.add("is-in");
    stage && stage.querySelectorAll(".archive-tile").forEach((tile) => tile.classList.add("is-in"));
    loader && loader.classList.add("is-hidden");
  }

  const timer = animateLoaderDots();
  renderModules();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => reveal(timer), { once: true });
  } else {
    reveal(timer);
  }
})();
