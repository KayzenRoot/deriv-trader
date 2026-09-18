#!/usr/bin/env node
// Package boundary check (DT-WP-01 section 6 + V1-MODULE-DEPENDENCY-AUDIT).
// Static, dependency-free: scans workspace `from "..."` imports and enforces direction.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Map workspace package name -> short package key.
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

// Layer rank: lower = more foundational. Imports may only flow toward lower ranks
// (or within the same rank for shared cross-cutting concerns).
const LAYER = new Map([
  ["domain", 0],
  ["config", 1],
  ["events", 1],
  ["auth", 2],
  ["connections", 2],
  ["secret-store", 2],
  ["testing", 2],
  ["market-data", 3],
  ["scanner", 3],
  ["strategies", 3],
  ["risk", 3],
  ["deriv-adapter", 4],
  ["execution", 4],
  ["research", 4],
  ["reporting", 4],
  ["db", 4],
  ["ui", 5],
  ["trader", 6],
  ["web", 7],
]);

function keyOfWorkspace(ws) {
  if (ws === "apps/web") return "web";
  if (ws === "apps/trader") return "trader";
  return ws.slice("packages/".length);
}

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === ".next") continue;
      yield* walk(full);
    } else if (/\.(ts|tsx|mts|js|mjs)$/.test(entry) && !entry.endsWith(".test.")) {
      yield full;
    }
  }
}

const IMPORT_RE = /from\s+["'](@deriv-trader\/[a-z-]+)["']|import\s*\(\s*["'](@deriv-trader\/[a-z-]+)["']\s*\)/g;

function pkgKeyFromImport(spec) {
  const short = spec.slice("@deriv-trader/".length);
  return short;
}

const violations = [];

for (const ws of WORKSPACES) {
  const key = keyOfWorkspace(ws);
  const srcDir = join(ROOT, ws, "src");
  const fromRank = LAYER.get(key);
  if (fromRank === undefined) {
    violations.push(`${ws}: unknown layer rank for key ${key}`);
    continue;
  }
  for (const file of walk(srcDir)) {
    // apps/web src lives under apps/web/{app,src}; also scan app dir.
    const content = readFileSync(file, "utf8");
    let m;
    while ((m = IMPORT_RE.exec(content)) !== null) {
      const spec = m[1] ?? m[2];
      const target = pkgKeyFromImport(spec);
      const toRank = LAYER.get(target);
      if (toRank === undefined) {
        violations.push(`${file}: unknown workspace import ${spec}`);
        continue;
      }
      // Same-rank imports are allowed only for shared cross-cutting concerns.
      // Otherwise imports must point inward (target rank < importer rank).
      if (toRank > fromRank) {
        violations.push(
          `${file}: ${key} (layer ${fromRank}) must not depend outward on ${target} (layer ${toRank})`,
        );
      }
    }
    // Hard rules independent of rank.
    if (key === "strategies") {
      if (/(deriv-adapter|execution).*buy|placeOrder|executeOrder/i.test(content)) {
        violations.push(`${file}: strategies must not call broker buy/order implementation`);
      }
      if (content.includes("@deriv-trader/deriv-adapter") && /buy|order/i.test(content)) {
        // Soft flag only when buy/order tokens appear alongside the import.
        violations.push(`${file}: strategies must not import broker order path`);
      }
    }
    if (key === "ui" || key === "web") {
      if (content.includes("@deriv-trader/secret-store")) {
        violations.push(`${file}: UI/web must not import SecretStore`);
      }
    }
    if (key === "risk" && content.includes("@deriv-trader/ui")) {
      violations.push(`${file}: risk must not depend on UI state`);
    }
    if (key === "research") {
      if (content.includes("@deriv-trader/execution") && /buy|sell|placeOrder|execute/i.test(content)) {
        violations.push(`${file}: research cannot emit economic orders`);
      }
    }
  }
  // apps/web also has app/ dir (Next App Router).
  if (ws === "apps/web") {
    for (const extra of [join(ROOT, ws, "app")]) {
      for (const file of walk(extra)) {
        const content = readFileSync(file, "utf8");
        if (content.includes("@deriv-trader/secret-store")) {
          violations.push(`${file}: UI/web must not import SecretStore`);
        }
        let m2;
        while ((m2 = IMPORT_RE.exec(content)) !== null) {
          const spec = m2[1] ?? m2[2];
          const target = pkgKeyFromImport(spec);
          const toRank = LAYER.get(target);
          if (toRank !== undefined && toRank > (LAYER.get("web") ?? 7)) {
            violations.push(`${file}: web must not depend outward on ${target}`);
          }
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

console.log("[dep-boundaries] package boundaries OK");
