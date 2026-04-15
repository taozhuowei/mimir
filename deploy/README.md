# 部署指南

本目录提供把 Scales Tarot 部署到单台 Linux 服务器的示例配置。架构采用 **host nginx + systemd 托管 Node**：

```
HTTPS 请求 ──► nginx (443)
                ├─ /assets/*  → 磁盘（长缓存）
                ├─ /static/*  → 磁盘（30d immutable）
                ├─ /api/*     → http://127.0.0.1:3000 (Node)
                └─ 其它路径   → 磁盘 / index.html 回落
```

Node 进程**只**监听 `127.0.0.1`，不暴露到公网；nginx 独占公网 TCP 443/80。

## 1. 前置条件

在目标机器（Ubuntu/Debian 为例）：

```bash
sudo apt update
sudo apt install -y nginx nodejs certbot python3-certbot-nginx
node --version    # 需 >= 20.0.0 < 23
```

建一个专用用户与目录：

```bash
sudo useradd -r -m -d /opt/scales-tarot -s /usr/sbin/nologin tarot
sudo mkdir -p /opt/scales-tarot
sudo chown tarot:tarot /opt/scales-tarot
```

## 2. 构建并上传产物

在**本地**仓库根目录：

```bash
npm ci
npm run build:h5      # 仅构建 H5，不走小程序；mp 需要时用 npm run build
```

构建完成后，以下目录需要同步到服务器：

| 本地路径 | 服务器路径 | 说明 |
|---|---|---|
| `server/dist/` | `/opt/scales-tarot/server/dist/` | 编译后的后端 |
| `server/public/` | `/opt/scales-tarot/server/public/` | 牌图/主题静态资源 |
| `dist/build/h5/` | `/opt/scales-tarot/dist/build/h5/` | 前端 SPA 产物 |
| `package.json` | `/opt/scales-tarot/package.json` | 运行时依赖清单 |
| `package-lock.json` | `/opt/scales-tarot/package-lock.json` | 锁定版本 |

最少一次 rsync：

```bash
rsync -a --delete server/dist/ server/public/ dist/build/h5/ \
      package.json package-lock.json \
      tarot@your-server:/opt/scales-tarot/staging/
# 远端：验证后再切换 active 软链到 staging/
```

在服务器上安装**生产依赖**：

```bash
cd /opt/scales-tarot
sudo -u tarot npm ci --omit=dev
```

## 3. 环境变量

把仓库根的 `.env.example` 拷贝到服务器的 `/etc/scales-tarot.env`：

```bash
sudo install -o root -g tarot -m 0640 .env.example /etc/scales-tarot.env
sudo nano /etc/scales-tarot.env
```

生产典型值：

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=info
STATIC_BASE_URL=https://your-domain.com
```

`CORS_ORIGIN` 留空表示"只允许同源请求"，对同站 SPA 是最严格也是最常见的配置。

## 4. 安装 systemd 单元

```bash
sudo install -m 0644 deploy/systemd/scales-tarot.service.example \
     /etc/systemd/system/scales-tarot.service
sudo systemctl daemon-reload
sudo systemctl enable --now scales-tarot
sudo systemctl status scales-tarot
sudo journalctl -u scales-tarot -f
```

自检：

```bash
curl -s http://127.0.0.1:3000/api/healthz
# {"status":"ok",...}
curl -s http://127.0.0.1:3000/api/readyz
# {"status":"ready","cards":78}
```

## 5. 安装 nginx 站点

```bash
sudo install -m 0644 deploy/nginx.conf.example \
     /etc/nginx/sites-available/scales-tarot.conf
sudo sed -i 's/your-domain.com/实际域名/g' /etc/nginx/sites-available/scales-tarot.conf
sudo ln -s /etc/nginx/sites-available/scales-tarot.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

先用 HTTP 打通（浏览器访问 `http://实际域名/`），再申请 TLS 证书：

```bash
sudo certbot --nginx -d your-domain.com
```

certbot 会自动改写 nginx 配置，并写入一条 systemd timer 做 90 天自动续期。

## 6. 日常发版流程

```bash
# 本地
npm ci
npm run build:h5
rsync -a --delete server/dist/ server/public/ dist/build/h5/ \
      package.json package-lock.json \
      tarot@your-server:/opt/scales-tarot/

# 服务器
cd /opt/scales-tarot && sudo -u tarot npm ci --omit=dev
sudo systemctl restart scales-tarot
```

nginx 不需要 reload，因为静态文件路径未变；如果只改了前端产物，**连 Node 都不用重启**，浏览器刷新即可生效。

## 7. 日志、状态、回滚

| 操作 | 命令 |
|---|---|
| 实时日志 | `sudo journalctl -u scales-tarot -f` |
| 最近 1 小时错误 | `sudo journalctl -u scales-tarot -p err --since "1 hour ago"` |
| 运行状态 | `sudo systemctl status scales-tarot` |
| 重启 | `sudo systemctl restart scales-tarot` |
| 停服 | `sudo systemctl stop scales-tarot` |
| nginx 配置校验 | `sudo nginx -t` |
| nginx 热更 | `sudo systemctl reload nginx` |

回滚：保留上一版本的 `server/dist/`、`dist/build/h5/` 到 `/opt/scales-tarot/releases/<timestamp>/`，切换软链即可。可选：把 `/opt/scales-tarot/current` 做成软链指向 `releases/<timestamp>`，`systemd` `WorkingDirectory` 指向 `current`。

## 8. 备选：Docker Compose

本项目暂未提供 Dockerfile / compose.yml。若后续需要跨机器复制或 CI 自动发布，可在当前结构上增加：

- `Dockerfile`：多阶段，`node:20-alpine` builder → `node:20-alpine` runtime
- `docker-compose.yml`：一个 `app` 服务（Node）+ 一个 `web` 服务（nginx），共享卷挂载 `server/public` 与 `dist/build/h5`
- 复用本目录 `nginx.conf.example`，只需把 `proxy_pass http://127.0.0.1:3000` 改成 `proxy_pass http://app:3000`

nginx 与 systemd 这套先跑起来，再切 Docker 不会有额外成本。
