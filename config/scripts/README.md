# scripts

构建编排与质量门禁的实现层。**不暴露为 yarn script**——`config/scripts/build/index.js` 与 `config/scripts/quality_gate.js` 是单一真相源，新增工具进此目录或 git 钩子，不新增 yarn script（否则门禁内容漂移）。`build/index.js` 是唯一构建入口，按 `--dev|--prod` × `--target h5,mp,server` × `--skip-quality` 分发到 `dev.js` / `prod.js`。

## 目录架构

```
config/scripts/
├── build/
│   ├── index.js          # 唯一构建入口(解析 flag 并分发)
│   ├── dev.js            # dev 三 watcher 编排
│   └── prod.js           # prod 构建 + perf 门
├── lib/
│   └── port_kill.js      # 释放占用端口(SIGKILL)
├── quality_gate.js       # full | staged 代码门禁(无构建)
├── quality_scan.js       # 门禁静态扫描实现
├── quality_baseline.json # 质量基线
├── perf_baseline_gate.js # 包大小回归门禁
├── perf_baseline.json    # 性能基线
├── gitleaks_run.js       # 密钥扫描
├── dev_env.js            # 写 .env.development.local(注入 LAN IP)
└── subset_fonts.js       # 一次性：按显示文本子集化 LXGW WenKai 正文字体
```

`subset_fonts.js` 不挂进构建——仅在正文文案变更后手动复跑。它扫描 `app/frontend/src` 与 `app/server/src/data/*.json` 的字符全集，调 `python -m fontTools.subset` 生成 `*.subset.woff2`（17.5MB → ~0.56MB）写入 `app/server/public/static/themes/golden_dawn/fonts/`。前置：`python -m pip install fonttools brotli`。

源字体（上游全字集 woff2）与原始 `card_back.jpeg` 存放在 `app/server/assets-src/`（**publicDir 之外，不进构建、不下发**），仅作子集化与 WebP 转码的源。card_back 的 WebP 转换为一次性资源操作，未脚本化。

命令用法见 [CLAUDE.md](../../CLAUDE.md) 的 “Commands”。

## 技术栈

- **Node.js** 原生脚本（无构建步骤，`node config/scripts/<x>.js` 直跑）。
- **concurrently**：dev 下并行 h5 / mp / server 三 watcher。
- `vite` / `vite-plugin-uni` / `tsc`：被编排的构建器（由 `build/` 调用，非本目录依赖）。
- 基线文件（`*_baseline.json`）：质量与性能回归对照。
