# @tenjot/router

A tiny, dependency-free trie-based router whose matching results are compatible with [`URLPattern`](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern).

This is a fork of [Hono](https://github.com/honojs/hono)'s [TrieRouter](https://github.com/honojs/hono/tree/main/src/router/trie-router).

## Install

```sh
npm install @tenjot/router
```

## Usage

```ts
import { createRouter } from "@tenjot/router";

const router = createRouter<string>();

router.add("GET", "/users/:id", "getUser");
router.add("GET", "/files/*", "getFile");

router.match("GET", "/users/42");
// => ["getUser", { id: "42" }]

router.match("GET", "/files/a/b.txt");
// => ["getFile", { 0: "a/b.txt" }]

router.match("POST", "/users/42");
// => null
```

The handler type `T` is up to you — it can be a function, a string, or any value.

## API

### `createRouter<T>(): Router<T>`

Creates a new router.

### `router.add(method: string, path: string, handler: T): void`

Registers `handler` for `method` and `path`. Methods are arbitrary strings and are matched exactly.

Throws a `TypeError` if `path` contains the same named parameter twice (e.g. `/:foo/:foo`), just like `URLPattern`.

### `router.match(method: string, path: string): [T, Params] | null`

Returns the matched handler and its parameters, or `null` if nothing matches. `Params` is `Record<string, string>`.

## Patterns

| Pattern        | Matches                 | Params                      |
| -------------- | ----------------------- | --------------------------- |
| `/hello`       | `/hello`                | `{}`                        |
| `/hello/:name` | `/hello/world`          | `{ name: "world" }`         |
| `/hello/*`     | `/hello/`, `/hello/a/b` | `{ 0: "" }`, `{ 0: "a/b" }` |
| `/a/*/b/*`     | `/a/x/b/c`              | `{ 0: "x", 1: "c" }`        |

- `:name` matches exactly one non-empty segment.
- `*` matches any number of characters, including `/`. Unnamed wildcards get numeric keys in order (`0`, `1`, …).
- Params are the same as `new URLPattern({ pathname }).exec({ pathname: path }).pathname.groups`; the test suite checks this against the real `URLPattern`.

## Priority

When several routes match, **the one registered first wins** — not the most specific one.

```ts
router.add("GET", "/api/abc", "abc");
router.add("GET", "/api/*", "fallback");

router.match("GET", "/api/abc"); // => ["abc", {}]
router.match("GET", "/api/def"); // => ["fallback", { 0: "def" }]
```

Register specific routes before fallbacks.

## License

[MIT](./LICENSE)

Based on Hono — Copyright (c) 2021 - present, Yusuke Wada and Hono contributors.
