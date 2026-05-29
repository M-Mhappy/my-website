// 群岛配置：每座岛屿一条记录。
//   name    标签/卡片标题（优先用具体地标名，缺省回退主题名）
//   theme   主题（标签副标题 / 卡片副标题）
//   sprite  素材路径；为 null 时渲染占位岛屿，后续替换为真实素材即可
//   x       岛屿中心在 board 宽度中的百分比位置 (%)
//   y       岛屿中心距 board 顶部的距离 (px)
//   size    岛屿宽度 (px)
//   float   浮动动画时长(秒) 与延迟(秒)，错开更自然
window.ISLANDS = [
  // --- 第 1 行：左偏 + 右偏 ---
  {
    id: "growth",
    name: "成长轨迹",
    theme: "Growth",
    emoji: "🗺️",
    color: "#F9A825",
    sprite: "assets/islands/growth.webp",
    x: 28, y: 160, size: 264,
    float: { dur: 6.2, delay: 0.0 },
  },
  {
    id: "experience",
    name: "个人经历",
    theme: "Experience",
    emoji: "🌳",
    color: "#66BB6A",
    sprite: "assets/islands/experience.webp",
    x: 72, y: 165, size: 288,
    float: { dur: 5.6, delay: 0.8 },
  },

  // --- 第 2 行：居中偏左 + 右偏 ---
  {
    id: "travel",
    name: "旅行",
    theme: "Travel",
    emoji: "🎈",
    color: "#4FC3F7",
    sprite: "assets/islands/travel.webp",
    x: 20, y: 430, size: 253,
    float: { dur: 6.6, delay: 1.4 },
  },
  {
    id: "literature",
    name: "文学",
    theme: "Literature",
    emoji: "📖",
    color: "#AB47BC",
    sprite: "assets/islands/literature.webp",
    x: 55, y: 470, size: 253,
    float: { dur: 5.9, delay: 0.4 },
  },

  // --- 第 3 行：居中大岛 + 右侧小岛 ---
  {
    id: "music",
    name: "音乐",
    theme: "Music",
    emoji: "🎵",
    color: "#EC407A",
    sprite: "assets/islands/music.webp",
    x: 35, y: 750, size: 275,
    float: { dur: 6.0, delay: 1.0 },
  },
  {
    id: "film",
    name: "影视",
    theme: "Film",
    emoji: "🎬",
    color: "#FF7043",
    sprite: "assets/islands/film.webp",
    x: 78, y: 790, size: 264,
    float: { dur: 6.4, delay: 0.6 },
  },

  // --- 第 4 行：足球大锚 + 美食 ---
  {
    id: "football",
    name: "伊蒂哈德球场",
    theme: "足球",
    emoji: "⚽",
    color: "#26A69A",
    sprite: "assets/islands/football-etihad.webp",
    x: 44, y: 1060, size: 363,
    float: { dur: 5.4, delay: 1.2 },
  },
  {
    id: "food",
    name: "美食",
    theme: "Food",
    emoji: "🍽️",
    color: "#FFCA28",
    sprite: "assets/islands/food.webp",
    x: 82, y: 1120, size: 253,
    float: { dur: 6.1, delay: 0.2 },
  },
];

// board 需要的最小高度（最底岛 y + size/2 + 底部留白）
window.BOARD_HEIGHT = 1380;
