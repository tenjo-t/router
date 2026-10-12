# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Node 24 (installed via nvm) is required: tests run `.ts` files directly via Node's built-in type stripping, and rely on the global `URLPattern`.

- Build: `npm run build` (tsdown → `dist/index.mjs` + `dist/index.d.mts`, entry `src/router.ts`)
- Test: `npm test` (`node --test "src/**/*.test.ts"`)
- Single test: `node --test --test-name-pattern="Fallback" src/router.test.ts`

No linter is configured.

## Architecture

`@tenjot/router` is a single-file, dependency-free trie router (`src/router.ts`), forked from [Hono's TrieRouter](https://github.com/honojs/hono/tree/main/src/router/trie-router) (MIT — keep Hono's copyright line in `LICENSE`). Hono's implementation is a useful reference when changing matching behavior. `createRouter<T>()` returns `{ add(method, path, handler), match(method, path) }`; `match` returns `[handler, params]` or `null`.

Key behaviors:

- **URLPattern compatibility is the spec.** Params produced by `match` must equal the `pathname.groups` that the real `URLPattern({ pathname })` yields for the same path — the "Result matches URLPattern" test compares against it directly. Unnamed `*` wildcards produce numeric keys (`0`, `1`, …), `*` can span multiple segments, and `/foo/*` matches `/foo/` (with an empty `0`) but not `/foo`. A duplicate `:name` throws a `TypeError` mimicking URLPattern's message.
- **Trie of path segments.** Paths are split on `/`; each node has static `children` (keyed by the literal segment, including `*` / `:name` labels) and a `patterns` list of dynamic children. `match` walks breadth-first, keeping every candidate `[node, params, unnamedIndex]` state per segment, since static, named and wildcard branches can match simultaneously.
- **Priority = registration order.** Each `add` gets an increasing `score`; when multiple routes match, the lowest score (first registered) wins — not the most specific. Re-adding the same method+path keeps the first handler.
- Methods are opaque strings (no special `ALL` handling); a path may carry a hostname prefix (e.g. `www1.example.com/hello`), which is simply treated as the first segment.

Use `import type` for type-only imports — Node's type stripping does not elide them.
