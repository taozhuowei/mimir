# CLAUDE.md

Rules + links only. On conflict, the docs below win.

## Docs (read first)

- [README.md](README.md) — product (产品需求 节) + commands, env vars, deployment.
- [docs/](docs/) — PRD modules: [product.md](docs/product.md) [state.md](docs/state.md) [view.md](docs/view.md) [animation.md](docs/animation.md) [glossary.md](docs/glossary.md).
- [TODO.md](TODO.md) — execution plan / stage tracking.

## Commands

Expose only 3 yarn scripts; never add more. New tooling → `config/scripts/` or git hooks.

- `yarn install` — installs simple-git-hooks (pre-commit / commit-msg / pre-push).
- `yarn dev` — `node config/scripts/build/index.js --dev --target h5,mp,server`: write `.env.development.local` → kill `:4123`/`:4124` → gate → watch `vite` h5 `:4123` + `vite-plugin-uni -p mp-weixin` + `tsx server` `:4124` (proxies `/api` `/static` → `:4124`).
- `yarn prod` — same entry `--prod`: gate → vite h5 → uni mp → tsc server → `config/scripts/perf_baseline_gate.js`.

Invoke directly, not via yarn:

- `node config/scripts/quality_gate.js full | staged` (CI `verify` runs `full`).
- `yarn vitest run --config app/frontend/vitest.config.ts --dir app/frontend/test [-t "<pat>"|<file>]`
- `yarn vitest run --config app/server/vitest.config.ts --dir app/server/test [-t "<pat>"|<file>]`
- `yarn vue-tsc --noEmit -p app/frontend/tsconfig.json` / `yarn tsc --noEmit -p app/server/tsconfig.json`
- `yarn eslint app/frontend/src/ app/frontend/test/ app/server/src/ app/server/test/`
- Skip gate while debugging: pass `--skip-quality` to the build orchestrator.

## Constraints

- Type-check frontend with `vue-tsc`, never `tsc`.
- Do not rely on `:4124/` in dev — returns 404 by design (guard `app/server/src/app.ts:243`).
- Branch dev/prod per-object, not per-port.
- Run unit tests with `--dir app/frontend/test` or `--dir app/server/test` (matching `--config`).
- `pre-push` runs the full gate; bypass only per the two README emergencies.
- `.env.*.local` is gitignored; create `.env.production.local` by hand before deploy.
- Only spread kind is `single_card`; ship no placeholder spread code.
- Never put a comment opener (`//` or `/*`) immediately before `#ifdef`/`#ifndef`/`#endif`/`#else` in `.ts`/`.vue` — anywhere, incl. JSDoc/backticks. To mention in prose: drop the `#`, or precede with a non-comment word/paren. `.md` is exempt.
- H5 build must inline entry CSS into `<head><style data-critical>` via the `app/frontend/vite/plugins/critical-css-inline.ts` plugin; ship no render-blocking `<link rel="stylesheet">` in the H5 `index.html`.
- H5 build must collapse synchronous imports from `/src/pages/`, `/src/flows/` and `/src/core/` into the entry chunk (`vite.config.ts` `manualChunks`); do not emit secondary `pages-*.js` / `flows-*.js` / `core-*.js` chunks. The only runtime lazy-load on H5 is the 78 card-face `<image>` srcs. mp-weixin is unaffected by both rules.
