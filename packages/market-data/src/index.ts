/**
 * Market-data package entry (DT-WP-02).
 * Registry, shared ticks and freshness. No broker socket imports here —
 * the Deriv adapter is injected through the domain MarketDataSource port.
 */
export { SymbolRegistry } from "./registry.js";
export type {
  InstrumentState,
  RegistryFilter,
  RegistryOptions,
  RegistryRecord,
} from "./registry.js";
export { SharedTickHub, classifyFreshness, DEFAULT_THRESHOLDS } from "./ticks.js";
export type { FreshnessState, FreshnessInput, FreshnessThresholds } from "./ticks.js";
export { summarizeFreshness, DEFAULT_FRESHNESS_POLICY } from "./freshness.js";
export type {
  ContinuityState,
  FreshnessPolicy,
  FreshnessSnapshot,
  SkewState,
  SnapshotInput,
} from "./freshness.js";
export type { Tick, Candle, MarketFreshness, MarketSnapshot } from "./legacy.js";
