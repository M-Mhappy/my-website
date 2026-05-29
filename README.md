# 🌊 群岛 · Archipelago

以「群岛」隐喻人生不同侧面的个人主页。访客在动态海面上看到一座座岛屿，每座代表一个主题，点击弹出详情卡片。

## 技术方案

2D 高清插画 + 分层合成，**原生 HTML / CSS / JS，零运行时依赖**。
（与早期 `DEVELOPMENT_DOC.md` 的 Three.js 设想不同：本实现改用插画素材分层，保留了文档的色彩 / 字体 / 交互 / 弹卡设计语言。）

分层：海洋背景 → 光点粒子(Canvas) → 云朵 → 岛屿精灵 → 名称标签/热区 → UI 覆盖层(资料卡 / 弹卡 / 加载页)。

## 本地预览

```bash
python -m http.server 5500
# 浏览器打开 http://127.0.0.1:5500
```

`?still` 参数可跳过加载动画直接呈现静态画面（用于截图）。

## 目录结构

```
index.html
assets/islands/   岛屿素材 PNG（足球岛已就位：football-etihad.png）
assets/bg/        背景 / 云朵（可选）
assets/ui/        头像等
css/  reset.css · main.css · modal.css
js/   islands.js(配置) · particles.js · parallax.js · modal.js · main.js
```

## 如何添加 / 替换岛屿素材

1. 把岛屿图片（建议正方形、等轴矢量插画风格，背景为平涂水色）放入 `assets/islands/`。
2. 在 `js/islands.js` 中找到对应岛屿，把 `sprite: null` 改为图片路径，例如：

```js
{ id: "music", name: "音乐", sprite: "assets/islands/music-opera.png", ... }
```

3. 刷新即可。`sprite` 为 `null` 时显示占位岛屿（彩色圆球 + emoji）。

> 素材为实心方形背景时，圆形羽化遮罩（`css/main.css` 的 `.island__img`）会自动把方角融进海洋。若某张素材裁切过多或留边过大，可微调该遮罩的半径百分比。

## 可调项

- 岛屿位置 / 大小 / 浮动节奏：`js/islands.js`（`x` `y` `size` `float`）。
- 海洋配色：`css/main.css` 顶部 `--water-*` 变量。
- 资料卡文案与联系方式：`index.html` 的 `.profile` 区块。
- 弹卡内容：`js/modal.js`（当前为留白占位）。
