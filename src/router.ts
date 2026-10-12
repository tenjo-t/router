// Forked from Hono's TrieRouter: https://github.com/honojs/hono/tree/main/src/router/trie-router

export interface Router<T> {
  add(method: string, path: string, handler: T): void;
  match(method: string, path: string): Result<T>;
}

export type Params = Record<string, string>;
export type Result<T> = [T, Params] | null;

function splitPath(path: string): string[] {
  const parts = path.split("/");
  const groups = new Set();
  for (const p of parts) {
    if (p[0] !== ":") continue;
    const name = p.slice(1);
    if (groups.has(name)) {
      throw new TypeError(
        `Failed to parse pathname from "${path}": parser error: pattern contains duplicate name ${name}`,
      );
    }
    groups.add(name);
  }
  return parts;
}

type Pattern = string | "*";
function getPattern(label: string): Pattern | null {
  if (label === "*") return "*";
  if (label[0] === ":") {
    return label.slice(1);
  }
  return null;
}

interface HandlerSet<T> {
  handler: T;
  score: number;
}
interface Node<T> {
  children: Record<string, Node<T> | undefined>;
  methods: Record<string, HandlerSet<T>>;
  patterns: Node<T>[];
  pattern?: Pattern | "*";
}

function createNode<T>(): Node<T> {
  return {
    children: Object.create(null),
    methods: {},
    patterns: [],
  };
}

function add<T>(node: Node<T>, score: number, method: string, path: string, handler: T) {
  let cur = node;
  for (const part of splitPath(path)) {
    const pattern = getPattern(part);

    if (pattern == null) {
      cur = cur.children[part] ??= createNode();
      continue;
    }

    const child = (cur.children[part] ??= createNode());
    if (child.pattern == null) {
      child.pattern = pattern;
      cur.patterns.push(child);
    }
    cur = child;
  }

  cur.methods[method] ??= { handler, score };
}

function match<T>(node: Node<T>, method: string, path: string): Result<T> {
  let handler = null as [HandlerSet<T>, Params] | null;
  let nodes: [Node<T>, Params, number][] = [[node, {}, 0]];
  const parts = splitPath(path);

  function setHandler(h: HandlerSet<T> | undefined, p: Params) {
    if (h && (handler == null || h.score < handler[0].score)) {
      handler = [h, p];
    }
  }

  for (let i = 0, len = parts.length; i < len; i++) {
    const part = parts[i];
    const isLast = i === len - 1;
    const temp: [Node<T>, Params, number][] = [];

    for (let j = 0, len2 = nodes.length; j < len2; j++) {
      const [node, params, unnamed] = nodes[j];
      const next = node.children[part];

      if (node.pattern === "*") {
        const p = { ...params };
        p[unnamed - 1] += `/${part}`;
        if (isLast) {
          // pattern: /*
          // path:    /foo/bar
          //               ^
          setHandler(node.methods[method], p);
        } else {
          // pattern: /*
          // path:    /foo/bar/baz
          //               ^
          temp.push([node, p, unnamed]);
        }
      }

      if (next) {
        if (isLast) {
          if (part === "") {
            // pattern: /foo/*
            // path:    /foo/
            //              ^
            setHandler(next.children["*"]?.methods[method], { ...params, [unnamed]: "" });
          }
          // pattern: /foo/
          // path:    /foo/
          //               ^
          setHandler(next.methods[method], params);
        } else {
          // pattern: /foo/bar
          // path:    /foo/bar
          //           ^
          temp.push([next, params, unnamed]);
        }
      }

      for (let k = 0, len3 = node.patterns.length; k < len3; k++) {
        const child = node.patterns[k];
        const pattern = child.pattern as Pattern | "*";

        if (pattern === "*") {
          const p = { ...params };
          p[unnamed] = part;
          if (isLast) {
            // pattern: /*
            // path:    /foo/
            //           ^
            setHandler(child.methods[method], p);
            continue;
          }
          // pattern: /*
          // path:    /foo/bar
          //           ^
          temp.push([child, p, unnamed + 1]);
          continue;
        }

        if (part === "") continue;
        const name = pattern;

        if (isLast) {
          // pattern: /:name
          // path:    /foo
          //           ^
          setHandler(child.methods[method], { ...params, [name]: part });
        } else {
          // pattern: /:name/bar
          // path:    /foo/bar
          //           ^
          temp.push([child, { ...params, [name]: part }, unnamed]);
        }
      }
    }
    nodes = temp;
  }

  return handler && [handler[0].handler, handler[1]];
}

export function createRouter<T>(): Router<T> {
  let score = 0;
  const node = createNode<T>();
  const router: Router<T> = {
    add(method, path, handler) {
      score += 1;
      add(node, score, method, path, handler);
    },
    match(method, path) {
      return match(node, method, path);
    },
  };

  return router;
}
