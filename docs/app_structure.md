# 目录架构索引

> 目录架构权威入口。CLAUDE.md 为导航，冲突以本索引指向的分文档为准。
> 各目录架构说明已下沉到该目录自身 README，本页仅作导航，不再内联整棵树。

## 顶层导航

- 根目录结构与项目总览：[../README.md](../README.md)
- 前端 `app/`：[../app/README.md](../app/README.md)
- 后端 `server/`：[../server/README.md](../server/README.md)
- 构建编排与质量门禁 `scripts/`：[../scripts/README.md](../scripts/README.md)
- 根级工具配置 `config/`：[../config/README.md](../config/README.md)
- 权威文档 `docs/`：[README.md](README.md)

## 架构总则

`app/src/` 内部按职责分层（`core/` 底层框架库 / `state/` 业务编排（过渡落点） / `tools/` 开发工具 / `shared/` 跨页面共享 / `pages/` / `styles/`），各层职责见 [../app/README.md](../app/README.md)。
