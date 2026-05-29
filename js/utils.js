// 跨模块共享工具函数
window.SHARED = {
  rand: (a, b) => a + Math.random() * (b - a),
  pick: (a) => a[(Math.random() * a.length) | 0],
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  sceneHeight: function () {
    var scene = document.getElementById("scene");
    return Math.max(
      1,
      window.SCENE_HEIGHT || (scene && scene.clientHeight) || window.innerHeight
    );
  }
};
