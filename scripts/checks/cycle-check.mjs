#!/usr/bin/env node
// Workspace dependency-cycle check (DT-WP-01 Phase A).
// Dependency-free DFS over `@deriv-trader/*` static imports.
// Equivalent architectural verification to madge --circular, without adding
// a conflicting native/peer toolchain to the frozen bootstrap.
import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const WORKSPACES = [
  "apps/trader",
  ...[
    "domain",
    "auth",
    "connections",
    "secret-store",
    "deriv-adapter",
    "market-data",
    "scanner",
    "strategies",
    "risk",
    "execution",
    "events",
    "db",
    "research",
    "reporting",
    "ui",
    "config",
    "testing",
  ].map((p) => `packages/${p}`),
];

const IMPORT_RE = /from\s+["'](@deriv-trader\/[a-z-]+)["']|import\s*\(\s*["'](@deriv-trader\/[a-z-]+)["']\s*\)/g;

function wsKey(ws) {
  if (ws === "apps/trader") return "trader";
  return ws.slice("packages/".length);
}

function nameToWs(spec) {
  const short = spec.slice("@deriv-trader/".length);
  if (short === "trader") return "apps/trader";
  if (short === "web") return "apps/web";
  return `packages/${short}`;
}

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === ".next") continue;
      yield* walk(full);
    } else if (/\.(ts|tsx|mts|js|mjs)$/.test(entry)) {
      yield full;
    }
  }
}

const graph = new Map();
for (const ws of WORKSPACES) {
  const deps = new Set();
  for (const file of walk(join(ROOT, ws, "src"))) {
    const content = readFileSync(file, "utf8");
    let m;
    while ((m = IMPORT_RE.exec(content)) !== null) {
      const targetWs = nameToWs(m[1] ?? m[2]);
      if (WORKSPACES.includes(targetWs) && targetWs !== ws) deps.add(targetWs);
    }
  }
  graph.set(ws, deps);
}

const visited = new Set();
const stack = [];
const cycles = [];

function dfs(node) {
  if (stack.includes(node)) {
    cycles.push([...stack.slice(stack.indexOf(node)), node].join(" -> "));
    return;
  }
  if (visited.has(node)) return;
  visited.add(node);
  stack.push(node);
  for (const dep of graph.get(node) ?? []) dfs(dep);
  stack.pop();
}

for (const ws of WORKSPACES) dfs(ws);

if (cycles.length > 0) {
  console.error("[cycle-check] FAIL: circular workspace dependencies:");
  for (const c of cycles) console.error(`  - ${c} (key: ${wsKey(c.split(" -> ")[0])})`);
  process.exit(1);
}

console.log("[cycle-check] no workspace cycles");
