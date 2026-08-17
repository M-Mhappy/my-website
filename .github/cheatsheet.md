# 服务器运维速查手册

> 适用于本项目的云服务器（nginx + /var/www/my-website + GitHub Actions CI/CD）。
> 所有命令在服务器终端（root）中执行；标注「本地」的在你自己电脑上执行。
> 此文件放在 `.github/` 下，仅供仓库查阅，**不会**被部署到服务器。

---

## 1️⃣ 看网站文件

```bash
ls /var/www/my-website                        # 网站根目录有哪些文件
ls /var/www/my-website/assets/music           # 音乐文件
df -h                                         # 磁盘还剩多少空间
du -sh /var/www/my-website                    # 网站占了多少空间
```

## 2️⃣ 检查网站/音乐是否正常（服务器本地）

服务器本地 curl 不受 WAF 拦截，比外网检查好使：

```bash
# 首页状态码（200=正常）
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/

# 单首音乐（200 + audio/mpeg=正常；中文打不出来就用 Tab 补全文件名）
curl -sI "http://127.0.0.1/assets/music/周杰倫 - 晴天.mp3" | head -3

# 一键检查 3 首歌 + 首页（每行一个状态码，全是 200 就 OK）
for p in "/" "/assets/music/周杰倫 - 晴天.mp3" "/assets/music/周杰倫 - 不能說的秘密.mp3" "/assets/music/周杰倫 - 心雨.mp3"; do
  curl -s -o /dev/null -w "%{http_code}  $p\n" "http://127.0.0.1$p"
done
```

## 3️⃣ nginx 操作

先确认 nginx 是**宿主机**还是 **docker** 里跑的：

```bash
docker ps 2>/dev/null | grep -i nginx    # 有输出 → docker 版；没输出 → 看下一条
ps aux | grep -v grep | grep nginx       # 有输出 → 宿主机版
```

**宿主机版：**

```bash
nginx -t                    # 检查配置有没有写错（改配置前必跑）
systemctl reload nginx      # 重载配置（不中断服务）
systemctl restart nginx     # 重启 nginx
systemctl status nginx      # 看运行状态
```

**Docker 版**（把 `<容器名>` 换成 `docker ps` 查到的名字）：

```bash
docker exec <容器名> nginx -t          # 检查配置
docker restart <容器名>                 # 重启容器
docker logs --tail 50 <容器名>          # 看 nginx 容器日志
```

## 4️⃣ 看日志（排查问题第一站）

```bash
tail -f /var/log/nginx/error.log     # 错误日志，实时滚动（Ctrl+C 退出）
tail -50 /var/log/nginx/access.log   # 最近 50 条访问日志
journalctl -u nginx -n 30            # systemd 里最近的 nginx 日志
```

## 5️⃣ git / 部署（本地电脑上操作）

```bash
git status                 # 有没有未提交的改动
git add . && git commit -m "说明" && git push   # 提交并推送，触发 GitHub Actions
git log --oneline -5       # 最近 5 次提交
```

推送后去 GitHub 仓库页面 → **Actions** 标签页看流水线是否全绿。

## 6️⃣ 部署后自检三板斧（推荐养成习惯）

```bash
# 1) 确认网站目录没被塞进 git 垃圾（下面这条应无输出，或只有正常文件）
ls -A /var/www/my-website | grep -E "^(objects|refs|HEAD|config|hooks|index)$"

# 2) 首页 200
curl -s -o /dev/null -w "首页: %{http_code}\n" http://127.0.0.1/

# 3) 音乐 200
curl -s -o /dev/null -w "音乐: %{http_code}\n" "http://127.0.0.1/assets/music/周杰倫 - 晴天.mp3"
```

---

## 两个小提醒

- **中文文件名**：终端里输入中文如果出现乱码，先 `ls` 复制文件名，或按 `Tab` 自动补全，别手打。
- **改 nginx 配置前**：永远先跑 `nginx -t`（或 docker 版 `docker exec <容器> nginx -t`），配置有错会直接告诉你哪行写错了，避免改崩导致整个网站打不开。
