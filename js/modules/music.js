// 音乐岛：沉浸式播放器（本地 MP3 + LRC + 飘荡封面）
window.MusicModule = (function () {
  const VOLUME_KEY = "music-player-volume";
  const DEPTH = [
    { scale: 0.55, opacity: 1, blur: 0, duration: 38, z: 1 },
    { scale: 0.78, opacity: 1, blur: 0, duration: 28, z: 2 },
    { scale: 1, opacity: 1, blur: 0, duration: 20, z: 3 },
  ];

  let root = null;
  let audio = null;
  let state = null;

  function getPlaylist() {
    return window.MUSIC_PLAYLIST || { ambientCovers: [], tracks: [] };
  }

  function encodeAssetPath(path) {
    if (!path) return path;
    return path.split("/").map(encodeURIComponent).join("/");
  }

  function parseLrc(text) {
    const lines = [];
    const re = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;
    const skip = /^(词|曲|编曲|制作人|监制|LRC|lrc)/;
    text.split(/\r?\n/).forEach((raw) => {
      const m = raw.match(re);
      if (!m) return;
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      let ms = m[3] ? parseInt(m[3].padEnd(3, "0").slice(0, 3), 10) : 0;
      const lyric = m[4].trim();
      if (!lyric || skip.test(lyric) || /lrc-toomic/i.test(lyric)) return;
      lines.push({ time: min * 60 + sec + ms / 1000, text: lyric });
    });
    lines.sort((a, b) => a.time - b.time);
    return lines;
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function findActiveLine(lines, t) {
    if (!lines.length) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= t + 0.05) idx = i;
      else break;
    }
    return idx;
  }

  function buildCoverElements(container, covers) {
    const list = covers.length ? covers : [];
    if (!list.length) return;
    const isMobile = window.matchMedia("(max-width: 760px)").matches;
    const count = Math.min(Math.max(list.length, isMobile ? 4 : 5), isMobile ? 6 : 10);
    const picked = [];
    for (let i = 0; i < count; i++) {
      picked.push(list[i % list.length]);
    }

    picked.forEach((src, i) => {
      const depthIdx = Math.floor(Math.random() * DEPTH.length);
      const d = DEPTH[depthIdx];
      const el = document.createElement("img");
      el.className = "music-cover";
      el.src = encodeAssetPath(src);
      el.alt = "";
      el.draggable = false;
      el.style.setProperty("--cover-scale", d.scale);
      el.style.setProperty("--cover-duration", d.duration + "s");
      el.style.setProperty("--cover-z", d.z);
      el.style.left = 5 + Math.random() * 85 + "%";
      el.style.top = 5 + Math.random() * 75 + "%";
      el.style.animationDelay = -(Math.random() * d.duration) + "s";
      el.style.animationDuration = d.duration + "s";
      el.addEventListener("error", () => {
        el.style.display = "none";
      });
      container.appendChild(el);
    });
  }

  function createDom(island) {
    const bg = island.sprite || "assets/islands/music.png";
    const bgUrl = encodeAssetPath(bg.startsWith("/") ? bg.slice(1) : bg);
    const wrap = document.createElement("div");
    wrap.className = "music-scene";
    wrap.innerHTML = `
      <div class="music-scene__bg"></div>
      <div class="music-scene__covers"></div>
      <div class="music-player">
        <div class="music-player__now">
          <img class="music-player__cover" src="" alt="" draggable="false" />
          <div class="music-player__meta">
            <h3 class="music-player__title">—</h3>
            <p class="music-player__artist">—</p>
          </div>
          <button type="button" class="music-player__list-toggle" aria-label="歌曲列表">☰</button>
        </div>
        <div class="music-player__lyrics-wrap">
          <ul class="music-player__lyrics"></ul>
          <p class="music-player__lyrics-empty">暂无歌词</p>
        </div>
        <div class="music-player__controls">
          <button type="button" class="music-player__btn" data-action="prev" aria-label="上一首">⏮</button>
          <button type="button" class="music-player__btn music-player__btn--play" data-action="toggle" aria-label="播放">▶</button>
          <button type="button" class="music-player__btn" data-action="next" aria-label="下一首">⏭</button>
        </div>
        <div class="music-player__progress">
          <span class="music-player__time" data-role="current">0:00</span>
          <input type="range" class="music-player__seek" min="0" max="1000" value="0" aria-label="播放进度" />
          <span class="music-player__time" data-role="duration">0:00</span>
        </div>
        <div class="music-player__volume">
          <span class="music-player__vol-icon" aria-hidden="true">🔊</span>
          <input type="range" class="music-player__vol" min="0" max="100" value="80" aria-label="音量" />
        </div>
        <p class="music-player__hint"></p>
      </div>
      <aside class="music-player__list-panel" hidden>
        <div class="music-player__list-head">
          <span>播放列表</span>
          <button type="button" class="music-player__list-close" aria-label="关闭列表">✕</button>
        </div>
        <ul class="music-player__list"></ul>
      </aside>`;
    const bgEl = wrap.querySelector(".music-scene__bg");
    bgEl.style.backgroundImage =
      "linear-gradient(180deg, rgba(255, 255, 255, 0.32) 0%, rgba(220, 228, 240, 0.48) 45%, rgba(12, 28, 48, 0.62) 100%), url('" +
      bgUrl +
      "')";
    bgEl.style.backgroundPosition = "center";
    bgEl.style.backgroundSize = "cover";
    bgEl.style.backgroundRepeat = "no-repeat";
    return wrap;
  }

  function renderPlaylist(listEl, tracks, currentId) {
    listEl.innerHTML = "";
    if (!tracks.length) {
      listEl.innerHTML = '<li class="music-player__list-empty">请在 js/music-playlist.js 中配置歌曲</li>';
      return;
    }
    tracks.forEach((track, i) => {
      const li = document.createElement("li");
      li.className = "music-player__list-item" + (track.id === currentId ? " is-active" : "");
      li.dataset.index = String(i);
      li.innerHTML = `<span class="music-player__list-num">${i + 1}</span><span class="music-player__list-text">${track.title}<small>${track.artist || ""}</small></span>`;
      listEl.appendChild(li);
    });
  }

  function renderLyrics(lyricsEl, emptyEl, lines) {
    lyricsEl.innerHTML = "";
    if (!lines.length) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    lines.forEach((line, i) => {
      const li = document.createElement("li");
      li.className = "music-player__lyric";
      li.dataset.index = String(i);
      li.textContent = line.text;
      lyricsEl.appendChild(li);
    });
  }

  function highlightLyric(lines, idx) {
    if (!state.lyricEls.length) return;
    state.lyricEls.forEach((el, i) => {
      el.classList.toggle("is-active", i === idx);
    });
    if (idx >= 0 && state.lyricEls[idx]) {
      state.lyricEls[idx].scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function setPlayIcon(playing) {
    state.playBtn.textContent = playing ? "⏸" : "▶";
    state.playBtn.setAttribute("aria-label", playing ? "暂停" : "播放");
  }

  function updateSeekUI() {
    if (state.seeking || !audio) return;
    const dur = audio.duration || 0;
    const cur = audio.currentTime || 0;
    state.currentTimeEl.textContent = formatTime(cur);
    state.durationEl.textContent = formatTime(dur);
    state.seek.value = dur ? String(Math.round((cur / dur) * 1000)) : "0";
  }

  async function loadTrack(index, autoplay) {
    const playlist = getPlaylist();
    const tracks = playlist.tracks || [];
    if (!tracks.length) {
      state.hintEl.textContent = "请将 MP3/LRC 放入 assets/music/ 并在 js/music-playlist.js 中配置";
      return;
    }

    state.index = ((index % tracks.length) + tracks.length) % tracks.length;
    const track = tracks[state.index];
    state.lines = [];
    state.lastLyricIdx = -1;
    renderLyrics(state.lyricsEl, state.lyricsEmpty, []);
    highlightLyric([], -1);

    state.titleEl.textContent = track.title;
    state.artistEl.textContent = track.artist || "";
    state.coverImg.src = track.cover ? encodeAssetPath(track.cover) : "";
    state.coverImg.onerror = () => {
      state.coverImg.style.visibility = "hidden";
    };
    state.coverImg.onload = () => {
      state.coverImg.style.visibility = "visible";
    };

    renderPlaylist(state.listEl, tracks, track.id);

    audio.pause();
    audio.src = encodeAssetPath(track.file);

    if (track.lrc) {
      try {
        const res = await fetch(encodeAssetPath(track.lrc));
        if (res.ok) {
          const text = await res.text();
          state.lines = parseLrc(text);
          renderLyrics(state.lyricsEl, state.lyricsEmpty, state.lines);
          state.lyricEls = Array.from(state.lyricsEl.querySelectorAll(".music-player__lyric"));
        }
      } catch (_) {
        /* ignore */
      }
    }

    try {
      await audio.load();
    } catch (_) {
      state.hintEl.textContent = "音频文件未找到，请检查路径：" + track.file;
      setPlayIcon(false);
      return;
    }

    if (autoplay) {
      try {
        await audio.play();
        setPlayIcon(true);
        state.hintEl.textContent = "";
      } catch (_) {
        state.hintEl.textContent = "点击播放按钮开始播放";
        setPlayIcon(false);
      }
    } else {
      setPlayIcon(false);
      state.hintEl.textContent = "点击播放按钮开始播放";
    }
    updateSeekUI();
  }

  function bindEvents() {
    state.playBtn.addEventListener("click", async () => {
      if (!audio.src) return;
      if (audio.paused) {
        try {
          await audio.play();
          setPlayIcon(true);
          state.hintEl.textContent = "";
        } catch (_) {
          state.hintEl.textContent = "无法播放，请检查音频文件";
        }
      } else {
        audio.pause();
        setPlayIcon(false);
      }
    });

    state.root.querySelector('[data-action="prev"]').addEventListener("click", () => {
      loadTrack(state.index - 1, false);
    });
    state.root.querySelector('[data-action="next"]').addEventListener("click", () => {
      loadTrack(state.index + 1, false);
    });

    state.seek.addEventListener("input", () => {
      state.seeking = true;
      const dur = audio.duration || 0;
      const val = parseInt(state.seek.value, 10) / 1000;
      state.currentTimeEl.textContent = formatTime(dur * val);
    });
    state.seek.addEventListener("change", () => {
      const dur = audio.duration || 0;
      audio.currentTime = (parseInt(state.seek.value, 10) / 1000) * dur;
      state.seeking = false;
      updateSeekUI();
    });

    const savedVol = parseFloat(localStorage.getItem(VOLUME_KEY));
    const vol = isFinite(savedVol) ? savedVol : 0.8;
    audio.volume = vol;
    state.vol.value = String(Math.round(vol * 100));
    state.vol.addEventListener("input", () => {
      const v = parseInt(state.vol.value, 10) / 100;
      audio.volume = v;
      localStorage.setItem(VOLUME_KEY, String(v));
      state.volIcon.textContent = v === 0 ? "🔇" : v < 0.35 ? "🔈" : "🔊";
    });

    let lastTick = 0;
    audio.addEventListener("timeupdate", () => {
      updateSeekUI();
      const now = performance.now();
      if (now - lastTick < 100) return;
      lastTick = now;
      const idx = findActiveLine(state.lines, audio.currentTime);
      if (idx !== state.lastLyricIdx) {
        state.lastLyricIdx = idx;
        highlightLyric(state.lines, idx);
      }
    });

    audio.addEventListener("ended", () => {
      loadTrack(state.index + 1, false);
    });

    audio.addEventListener("loadedmetadata", updateSeekUI);

    state.listToggle.addEventListener("click", () => {
      state.listPanel.hidden = !state.listPanel.hidden;
    });
    state.listClose.addEventListener("click", () => {
      state.listPanel.hidden = true;
    });
    state.listEl.addEventListener("click", (e) => {
      const item = e.target.closest(".music-player__list-item");
      if (!item || item.dataset.index == null) return;
      loadTrack(parseInt(item.dataset.index, 10), false);
      state.listPanel.hidden = true;
    });
  }

  function mount(container, island) {
    unmount();
    root = createDom(island);
    container.appendChild(root);

    audio = new Audio();
    audio.preload = "metadata";

    const playlist = getPlaylist();
    buildCoverElements(root.querySelector(".music-scene__covers"), playlist.ambientCovers || []);

    state = {
      root,
      index: 0,
      lines: [],
      lyricEls: [],
      lastLyricIdx: -1,
      seeking: false,
      playBtn: root.querySelector('[data-action="toggle"]'),
      seek: root.querySelector(".music-player__seek"),
      vol: root.querySelector(".music-player__vol"),
      volIcon: root.querySelector(".music-player__vol-icon"),
      currentTimeEl: root.querySelector('[data-role="current"]'),
      durationEl: root.querySelector('[data-role="duration"]'),
      lyricsEl: root.querySelector(".music-player__lyrics"),
      lyricsEmpty: root.querySelector(".music-player__lyrics-empty"),
      titleEl: root.querySelector(".music-player__title"),
      artistEl: root.querySelector(".music-player__artist"),
      coverImg: root.querySelector(".music-player__cover"),
      hintEl: root.querySelector(".music-player__hint"),
      listToggle: root.querySelector(".music-player__list-toggle"),
      listPanel: root.querySelector(".music-player__list-panel"),
      listClose: root.querySelector(".music-player__list-close"),
      listEl: root.querySelector(".music-player__list"),
    };

    bindEvents();
    renderPlaylist(state.listEl, playlist.tracks || [], null);
    loadTrack(0, false);
  }

  function unmount() {
    if (audio) {
      audio.pause();
      audio.src = "";
      audio = null;
    }
    state = null;
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
  }

  return { mount, unmount };
})();

window.ISLAND_MODULES = Object.assign(window.ISLAND_MODULES || {}, {
  music: window.MusicModule,
});
