#!/usr/bin/env bash
# =============================================================
# 服务器一键修复脚本（在服务器上执行，不是本地！）
# 用法:  sudo bash fix-server.sh [网站根目录，默认 /var/www/my-website]
# 作用:
#   1. 把音乐文件从旧路径 music/ 移到代码实际引用的 assets/music/
#   2. 把误入 web 根目录的 git 仓库元数据 + 部署 zip 移出（备份到 /root，不删除）
#   3. 自检
# 说明: 所有"移除"均为移动到备份目录，确认无误后可自行删除备份。
# =============================================================
set -euo pipefail

WEBROOT="${1:-/var/www/my-website}"
STAMP="$(date +%Y%m%d-%H%M%S)"
JUNK="/root/webroot-junk-$STAMP"

[ -d "$WEBROOT" ] || { echo "错误: 目录不存在 $WEBROOT"; exit 1; }

echo "==> [1/3] 音乐文件: 旧路径 music/ -> 新路径 assets/music/（代码实际引用）"
mkdir -p "$WEBROOT/assets/music/covers"
MP3_N=$(find "$WEBROOT/music" -maxdepth 1 -name '*.mp3' 2>/dev/null | wc -l)
if [ "$MP3_N" -gt 0 ]; then
  mv "$WEBROOT"/music/*.mp3 "$WEBROOT/assets/music/"
  mv "$WEBROOT"/music/*.lrc "$WEBROOT/assets/music/" 2>/dev/null || true
  mv "$WEBROOT"/music/covers/* "$WEBROOT/assets/music/covers/" 2>/dev/null || true
  echo "    已移动 $MP3_N 个 mp3（lrc/封面一并处理）"
else
  echo "    music/ 下没有 mp3，跳过（可能已被移走）"
fi

echo "==> [2/3] 清理 web 根目录里的 git 元数据与部署包（备份到 $JUNK）"
mkdir -p "$JUNK"
cd "$WEBROOT"
for item in HEAD config config.worktree description FETCH_HEAD index shallow \
            objects refs hooks info logs modules rules workflows \
            my-website-deploy.zip; do
  if [ -e "$item" ]; then
    mv "$item" "$JUNK/" && echo "    移出: $item"
  fi
done

echo "==> [3/3] 自检 assets/music/"
for f in "周杰倫 - 晴天.mp3" "周杰倫 - 不能說的秘密.mp3" "周杰倫 - 心雨.mp3" \
         "晴天-MusicEnc.lrc" "不能说的秘密-MusicEnc.lrc" "心雨-MusicEnc.lrc"; do
  if [ -f "$WEBROOT/assets/music/$f" ]; then
    echo "    OK:  $f ($(du -h "$WEBROOT/assets/music/$f" | cut -f1))"
  else
    echo "    MISS: $f"
  fi
done

echo ""
echo "完成。备份目录: $JUNK"
echo "浏览器打开音乐页试播；或服务器上验证:"
echo "  curl -sI 'http://127.0.0.1/assets/music/%E5%91%A8%E6%9D%B0%E5%80%AB%20-%20%E6%99%B4%E5%A4%A9.mp3' | head -1"
echo "  期望: HTTP/1.1 200 OK  +  Content-Type: audio/mpeg"
