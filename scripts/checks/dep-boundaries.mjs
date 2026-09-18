#!/usr/bin/env node
// Package boundary check (DT-WP-01 section 6 + V1-MODULE-DEPENDENCY-AUDIT).
// Explicit allowlist/adjacency policy per workspace — not numeric ranks.
// Static, dependency-free: scans workspace `from "..."` imports and enforces
// the canonical allowed relationships, then runs built-in negative self-tests
// proving forbidden imports are rejected (not just that the repo is clean).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const WORKSPACES = [
  "apps/web",
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

/**
 * Canonical allowed dependencies per workspace key.
 * Read as: key may import ONLY the listed targets (plus external npm deps).
 * Anything else — including same-layer crossings like risk -> strategies —
 * is a violation even if no such import exists in the repo today.
 */
const ALLOWED = new Map([
  ["domain", []],
  ["config", ["domain"]],
  ["events", ["domain"]],
  ["testing", ["domain"]],
  ["auth", ["domain"]],
  ["connections", ["domain"]],
  ["secret-store", ["domain"]],
  ["market-data", ["domain"]],
  ["scanner", ["domain", "market-data"]],
  ["strategies", ["domain", "market-data"]],
  ["risk", ["domain"]],
  ["deriv-adapter", ["domain"]],
  ["execution", ["domain", "risk", "deriv-adapter"]],
  ["db", ["domain"]],
  ["research", ["domain", "market-data", "strategies"]],
  ["reporting", ["domain"]],
  ["ui", ["domain"]],
  [
    "trader",
    [
      "domain",
      "config",
      "events",
      "auth",
      "connections",
      "secret-store",
      "deriv-adapter",
      "market-data",
      "scanner",
      "strategies",
      "risk",
      "execution",
      "db",
      "research",
      "reporting",
    ],
  ],
  [
    "web",
    [
      "domain",
      "config",
      "events",
      "auth",
      "connections",
      "market-data",
      "scanner",
      "strategies",
      "risk",
      "reporting",
      "research",
      "ui",
      "db",
    ],
  ],
]);

function keyOfWorkspace(ws) {
  if (ws === "apps/web") return "web";
  if (ws === "apps/trader") return "trader";
  return ws.slice("packages/".length);
}

function isAllowed(from, to) {
  const allowed = ALLOWED.get(from);
  if (allowed === undefined) return false;
  return allowed.includes(to);
}

/** Built-in negative verification: forbidden pairs must be rejected. */
function runSelfTests() {
  const mustReject = [
    ["strategies", "risk"],
    ["strategies", "execution"],
    ["strategies", "deriv-adapter"],
    ["strategies", "db"],
    ["strategies", "ui"],
    ["strategies", "web"],
    ["strategies", "secret-store"],
    ["risk", "strategies"],
    ["risk", "scanner"],
    ["risk", "market-data"],
    ["risk", "ui"],
    ["risk", "web"],
    ["risk", "execution"],
    ["execution", "strategies"],
    ["execution", "db"],
    ["execution", "ui"],
    ["execution", "web"],
    ["execution", "secret-store"],
    ["research", "execution"],
    ["research", "deriv-adapter"],
    ["research", "risk"],
    ["research", "secret-store"],
    ["ui", "secret-store"],
    ["ui", "deriv-adapter"],
    ["ui", "execution"],
    ["web", "secret-store"],
    ["web", "deriv-adapter"],
    ["web", "execution"],
    ["web", "trader"],
  ];
  const mustAllow = [
    ["config", "domain"],
    ["events", "domain"],
    ["scanner", "market-data"],
    ["strategies", "market-data"],
    ["execution", "risk"],
    ["execution", "deriv-adapter"],
    ["research", "strategies"],
    ["trader", "execution"],
    ["trader", "risk"],
    ["web", "ui"],
    ["web", "domain"],
  ];
  let failures = 0;
  for (const [from, to] of mustReject) {
    if (isAllowed(from, to)) {
      console.error(`[dep-boundaries:self-test] FAIL: policy allows forbidden ${from} -> ${to}`);
      failures += 1;
    }
  }
  for (const [from, to] of mustAllow) {
    if (!isAllowed(from, to)) {
      console.error(`[dep-boundaries:self-test] FAIL: policy rejects required ${from} -> ${to}`);
      failures += 1;
    }
  }
  const total = mustReject.length + mustAllow.length;
  if (failures > 0) {
    console.error(`[dep-boundaries:self-test] FAIL: ${failures}/${total} policy self-tests failed`);
    process.exit(1);
  }
  console.log(`[dep-boundaries:self-test] ${total}/${total} policy self-tests passed`);
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
      if (/\.test\.(ts|tsx|mts|js|mjs)$/.test(entry)) continue;
      yield full;
    }
  }
}

const IMPORT_RE = /from\s+["'](@deriv-trader\/[a-z-]+)["']|import\s*\(\s*["'](@deriv-trader\/[a-z-]+)["']\s*\)/g;

function pkgKeyFromImport(spec) {
  return spec.slice("@deriv-trader/".length);
}

runSelfTests();

const violations = [];

for (const ws of WORKSPACES) {
  const key = keyOfWorkspace(ws);
  if (!ALLOWED.has(key)) {
    violations.push(`${ws}: unknown workspace key ${key} (missing allowlist entry)`);
    continue;
  }
  const scanDirs =
    ws === "apps/web"
      ? [join(ROOT, ws, "lib"), join(ROOT, ws, "app")]
      : ws === "apps/trader"
        ? [join(ROOT, ws, "src")]
        : [join(ROOT, ws, "src")];
  for (const srcDir of scanDirs) {
    for (const file of walk(srcDir)) {
      const content = readFileSync(file, "utf8");
      let m;
      while ((m = IMPORT_RE.exec(content)) !== null) {
        const spec = m[1] ?? m[2];
        const target = pkgKeyFromImport(spec);
        if (!ALLOWED.has(target) && target !== "web" && target !== "trader") {
          violations.push(`${file}: unknown workspace import ${spec}`);
          continue;
        }
        if (!isAllowed(key, target)) {
          violations.push(`${file}: ${key} must not depend on ${target} (allowlist)`);
        }
      }
      if ((key === "ui" || key === "web") && content.includes("@deriv-trader/secret-store")) {
        if (!violations.some((v) => v.startsWith(file) && v.includes("secret-store"))) {
          violations.push(`${file}: UI/web must not import SecretStore`);
        }
      }
      if (key === "strategies" && content.includes("@deriv-trader/deriv-adapter")) {
        if (!violations.some((v) => v.startsWith(file) && v.includes("deriv-adapter"))) {
          violations.push(`${file}: strategies must not import broker adapter`);
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error("[dep-boundaries] FAIL: package boundary violations:");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log("[dep-boundaries] package boundaries OK (allowlist enforced)");
