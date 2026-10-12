import assert from "node:assert/strict";
import { test } from "node:test";
import { createRouter, type Params, type Router } from "./router.ts";

function assertMatch<T>(
  router: Router<T>,
  method: string,
  path: string,
  expected: [T, Params] | null,
) {
  const res = router.match(method, path);

  if (expected === null) {
    assert.deepEqual(res, null);
  } else {
    assert.ok(res);
    assert.deepEqual(res, expected);
  }
}

test("Basic Usage: GET, post hello", () => {
  const router = createRouter();
  router.add("GET", "/hello", "get hello");
  router.add("POST", "/hello", "post hello");
  router.add("PURGE", "/hello", "purge hello");

  assertMatch(router, "GET", "/hello", ["get hello", {}]);
  assertMatch(router, "POST", "/hello", ["post hello", {}]);
  assertMatch(router, "PURGE", "/hello", ["purge hello", {}]);
  assertMatch(router, "PUT", "/hello", null);
  assertMatch(router, "GET", "/", null);
});

test("Result matches URLPattern", async (t) => {
  function check(pattern: string, path: string) {
    const router = createRouter();
    router.add("GET", pattern, "get");
    const actual = router.match("GET", path);
    const expected = new URLPattern({ pathname: pattern }).exec({ pathname: path });
    if (expected !== null) {
      assert.ok(actual);
      assert.deepEqual(actual[1], expected.pathname.groups);
    } else {
      assert.deepEqual(actual, null);
    }
  }

  await t.test("common", () => {
    check("/", "/");
    check("/hello", "/hello");
    check("/hello", "/hello/");
    check("/hello", "/world");
    check("/hello", "/hello/world");
    check("/a/b/c", "/a/b/c");
  });
  await t.test("wildcard", () => {
    check("/hello/*", "/hello/world");
    check("/hello/*", "/hello/");
    check("/hello/*", "/hello");
    check("/hello/*", "/hello/123/456");

    check("/wild/*/card", "/wild/card");
    check("/wild/*/card", "/wild/xxx/card");
    check("/wild/*/card", "/wild/xxx/yyy/card");

    check("/a/*/b/*", "/a/x/b");
    check("/a/*/b/*", "/a/x/b/c");
    check("/a/*/b/*", "/a/x/bz");
  });
  await t.test("named group", () => {
    check("/hello/:name", "/hello/world");
    check("/hello/:name", "/hello/");
    check("/hello/:name", "/hello");
    check("/hello/:name", "/hello/123/456");
    check("/hello/:name", "/hello-world");

    check("/foo/:bar/baz", "/foo/bar/baz");
    check("/foo/:bar/baz", "/foo/xxx/yyy/baz");
    check("/foo/:bar/baz", "/foo/baz");

    check("/:foo/bar/:baz", "/foo/bar/baz");
    check("/:foo/bar/:baz", "/foo/bar");
  });

  await t.test("wildcard + named group", () => {
    check("/api/*/:name", "/api/posts/123");
    check("/api/*/:name", "/api/posts/123/456");
    check("/api/*/:name", "/api/123/");
    check("/api/*/:name", "/api/123");

    check("/api/:name/*", "/api/posts/123");
    check("/api/:name/*", "/api/posts/123/456");
    check("/api/:name/*", "/api/posts/");
    check("/api/:name/*", "/api/posts");
  });

  await t.test("parser error", () => {
    assert.throws(() => {
      new URLPattern({ pathname: "/:foo/:foo" });
    });
    assert.throws(() => {
      createRouter().add("GET", "/:foo/:foo", "error");
    });
  });
});

test("Fallback", async (t) => {
  await t.test("basic", () => {
    const router = createRouter();
    router.add("GET", "/api/abc", "get api");
    router.add("GET", "/api/*", "fallback");

    assertMatch(router, "GET", "/api/abc", ["get api", {}]);
    assertMatch(router, "GET", "/api/def", ["fallback", { 0: "def" }]);
  });

  await t.test("trailing slash", () => {
    const router = createRouter();
    router.add("GET", "/api/*", "fallback");
    router.add("GET", "/api", "top");
    router.add("GET", "/api/posts", "posts");

    assertMatch(router, "GET", "/api", ["top", {}]);
    assertMatch(router, "GET", "/api/posts", ["fallback", { 0: "posts" }]);
  });
});

test("Non ascii characters", () => {
  const router = createRouter();
  router.add("GET", "/$/:name", "get $ name");
  router.add("GET", "/()/:name", "get () name");

  assertMatch(router, "GET", "/$/hono", ["get $ name", { name: "hono" }]);
  assertMatch(router, "GET", "/()/hono", ["get () name", { name: "hono" }]);
});

test("Same path", () => {
  const router = createRouter();
  router.add("GET", "/hey", "hey A");
  router.add("GET", "/hey", "hey B");

  assertMatch(router, "GET", "/hey", ["hey A", {}]);
});

test("Routing with a hostname", () => {
  const router = createRouter();
  router.add("GET", "www1.example.com/hello", "www1");
  router.add("GET", "www2.example.com/hello", "www2");

  assertMatch(router, "GET", "www1.example.com/hello", ["www1", {}]);
  assertMatch(router, "GET", "www2.example.com/hello", ["www2", {}]);
  assertMatch(router, "GET", "/hello", null);
});

test("Unknown method", () => {
  const router = createRouter();
  router.add("GET", "/", "index");
  router.add("ALL", "/all", "all");

  assertMatch(router, "UNKNOWN_METHOD", "/", null);
});
