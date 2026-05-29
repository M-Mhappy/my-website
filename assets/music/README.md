# 音乐岛素材说明

将本地音乐文件放入此目录，并在 `js/music-playlist.js` 中配置歌单。

## 目录结构

```
assets/music/
  demo-01.mp3          # 歌曲音频
  demo-01.lrc          # 对应歌词（标准 LRC 格式）
  covers/
    cover-01.jpg       # 专辑封面（用于飘荡装饰 + 歌曲封面）
    cover-02.jpg
    ...
```

## 添加一首歌

1. 把 MP3 放入 `assets/music/`，例如 `my-song.mp3`
2. 把 LRC 歌词放入同目录，例如 `my-song.lrc`（文件名建议与 MP3 一致）
3. 把封面图放入 `assets/music/covers/`
4. 编辑 `js/music-playlist.js`：
   - 在 `tracks` 数组添加条目（`file`、`lrc`、`cover` 路径）
   - 在 `ambientCovers` 数组添加封面路径（用于背景飘荡，建议 5–10 张）

## LRC 格式示例

```
[00:12.00]第一句歌词
[00:18.50]第二句歌词
[01:02.00]副歌部分
```

支持 `[mm:ss.xx]` 与 `[mm:ss]` 两种时间戳。

## 封面飘荡

`ambientCovers` 中的图片会在播放器背景层缓慢飘荡，不同景深对应不同大小与模糊度。图片加载失败时会自动隐藏，不影响播放器使用。
