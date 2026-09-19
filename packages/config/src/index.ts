/**
 * Typed application configuration (DT-WP-01 Phase F).
 * Centralizes env parsing/validation. Required real credentials are never
 * mandatory for generic local build/test.
 */
import { z } from "zod";
import type { Environment } from "@deriv-trader/domain";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DERIV_TRADER_ENV: z.enum(["DEMO", "REAL"]).default("DEMO"),
  DERIV_TRADER_DATA_ROOT: z.string().min(1).default("./data"),
  TRADER_HOST: z.string().min(1).default("127.0.0.1"),
  TRADER_PORT: z.coerce.number().int().min(1).max(65535).default(3101),
  BUILD_SHA: z.string().min(1).default("local-dev"),
  SUPABASE_URL: z.string().optional().default(""),
  SUPABASE_ANON_KEY: z.string().optional().default(""),
  DERIV_APP_ID: z.string().optional().default(""),
  DERIV_OPTIONS_REST_BASE_URL: z.string().default("https://api.derivws.com"),
  DERIV_OPTIONS_PUBLIC_WS_URL: z
    .string()
    .default("wss://api.derivws.com/trading/v1/options/ws/public"),
  // --- Deriv public transport tuning (DT-WP-02; all configurable) ---
  DERIV_WS_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(15000),
  DERIV_WS_HEARTBEAT_MS: z.coerce.number().int().min(5000).max(300000).default(30000),
  DERIV_WS_RECONNECT_BASE_MS: z.coerce.number().int().min(100).max(60000).default(1000),
  DERIV_WS_RECONNECT_MAX_MS: z.coerce.number().int().min(1000).max(300000).default(30000),
  // --- API budgets: documented Deriv defaults at DT-WP-02 compile time ---
  API_BUDGET_PROPOSAL_PER_MIN: z.coerce.number().int().min(1).default(360),
  API_BUDGET_PROPOSAL_PER_HOUR: z.coerce.number().int().min(1).default(14400),
  API_BUDGET_OTHER_PER_MIN: z.coerce.number().int().min(1).default(220),
  API_BUDGET_OTHER_PER_HOUR: z.coerce.number().int().min(1).default(14400),
  API_BUDGET_PROPOSAL_RESERVE: z.coerce.number().min(0).max(0.9).default(0.3),
  // REST IP windows per official limits; authenticated-user 80/min is
  // explicitly deferred (WP-02 performs no authenticated REST).
  API_BUDGET_REST_PER_MIN: z.coerce.number().int().min(1).default(300),
  API_BUDGET_REST_PER_10MIN: z.coerce.number().int().min(1).default(1000),
  // --- Scanner economics (DT-WP-02) ---
  SCANNER_PAYOUT_THRESHOLD: z.coerce.number().min(0).default(0.8),
  SCANNER_PROBE_AMOUNT: z.coerce.number().positive().default(10),
  SCANNER_PROBE_CURRENCY: z.string().min(1).default("USD"),
  SCANNER_PROBE_BASIS: z.string().min(1).default("stake"),
  SCANNER_PROPOSAL_TTL_MS: z.coerce.number().int().min(1000).default(30000),
  // --- Freshness authority TTLs/tolerances (R3; operational tuning) ---
  SCANNER_REGISTRY_TTL_MS: z.coerce.number().int().min(1000).default(1800000),
  SCANNER_CAPABILITY_TTL_MS: z.coerce.number().int().min(1000).default(900000),
  SCANNER_SKEW_TOLERANCE_S: z.coerce.number().int().min(1).default(60),
  // --- Continuous read-only loop cadence (R7; bounded, overlap-guarded) ---
  SCANNER_LOOP_UNIVERSE_MS: z.coerce.number().int().min(1000).default(60000),
  SCANNER_LOOP_PULSE_MS: z.coerce.number().int().min(1000).default(15000),
  // --- Local capture (DT-WP-02) ---
  CAPTURE_BATCH_ROWS: z.coerce.number().int().min(10).max(100000).default(500),
  CAPTURE_ROLL_MS: z.coerce.number().int().min(1000).default(60000),
  DATA_DISK_WARN_MB: z.coerce.number().int().min(0).default(1024),
  DATA_DISK_STOP_MB: z.coerce.number().int().min(0).default(256),
});

export type AppConfig = {
  readonly nodeEnv: "development" | "test" | "production";
  readonly environment: Environment;
  readonly dataRoot: string;
  readonly traderHost: string;
  readonly traderPort: number;
  readonly buildSha: string;
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly derivAppId: string;
  readonly derivOptionsRestBaseUrl: string;
  readonly derivOptionsPublicWsUrl: string;
  readonly wsRequestTimeoutMs: number;
  readonly wsHeartbeatMs: number;
  readonly wsReconnectBaseMs: number;
  readonly wsReconnectMaxMs: number;
  readonly budgetProposalPerMin: number;
  readonly budgetProposalPerHour: number;
  readonly budgetOtherPerMin: number;
  readonly budgetOtherPerHour: number;
  readonly budgetProposalReserve: number;
  readonly budgetRestPerMin: number;
  readonly budgetRestPer10Min: number;
  readonly scannerPayoutThreshold: number;
  readonly scannerProbeAmount: number;
  readonly scannerProbeCurrency: string;
  readonly scannerProbeBasis: string;
  readonly scannerProposalTtlMs: number;
  readonly scannerRegistryTtlMs: number;
  readonly scannerCapabilityTtlMs: number;
  readonly scannerSkewToleranceS: number;
  readonly scannerLoopUniverseMs: number;
  readonly scannerLoopPulseMs: number;
  readonly captureBatchRows: number;
  readonly captureRollMs: number;
  readonly diskWarnMb: number;
  readonly diskStopMb: number;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse({
    NODE_ENV: env["NODE_ENV"],
    DERIV_TRADER_ENV: env["DERIV_TRADER_ENV"],
    DERIV_TRADER_DATA_ROOT: env["DERIV_TRADER_DATA_ROOT"],
    TRADER_HOST: env["TRADER_HOST"],
    TRADER_PORT: env["TRADER_PORT"],
    BUILD_SHA: env["BUILD_SHA"],
    SUPABASE_URL: env["SUPABASE_URL"],
    SUPABASE_ANON_KEY: env["SUPABASE_ANON_KEY"],
    DERIV_APP_ID: env["DERIV_APP_ID"],
    DERIV_OPTIONS_REST_BASE_URL: env["DERIV_OPTIONS_REST_BASE_URL"],
    DERIV_OPTIONS_PUBLIC_WS_URL: env["DERIV_OPTIONS_PUBLIC_WS_URL"],
    DERIV_WS_REQUEST_TIMEOUT_MS: env["DERIV_WS_REQUEST_TIMEOUT_MS"],
    DERIV_WS_HEARTBEAT_MS: env["DERIV_WS_HEARTBEAT_MS"],
    DERIV_WS_RECONNECT_BASE_MS: env["DERIV_WS_RECONNECT_BASE_MS"],
    DERIV_WS_RECONNECT_MAX_MS: env["DERIV_WS_RECONNECT_MAX_MS"],
    API_BUDGET_PROPOSAL_PER_MIN: env["API_BUDGET_PROPOSAL_PER_MIN"],
    API_BUDGET_PROPOSAL_PER_HOUR: env["API_BUDGET_PROPOSAL_PER_HOUR"],
    API_BUDGET_OTHER_PER_MIN: env["API_BUDGET_OTHER_PER_MIN"],
    API_BUDGET_OTHER_PER_HOUR: env["API_BUDGET_OTHER_PER_HOUR"],
    API_BUDGET_PROPOSAL_RESERVE: env["API_BUDGET_PROPOSAL_RESERVE"],
    API_BUDGET_REST_PER_MIN: env["API_BUDGET_REST_PER_MIN"],
    API_BUDGET_REST_PER_10MIN: env["API_BUDGET_REST_PER_10MIN"],
    SCANNER_PAYOUT_THRESHOLD: env["SCANNER_PAYOUT_THRESHOLD"],
    SCANNER_PROBE_AMOUNT: env["SCANNER_PROBE_AMOUNT"],
    SCANNER_PROBE_CURRENCY: env["SCANNER_PROBE_CURRENCY"],
    SCANNER_PROBE_BASIS: env["SCANNER_PROBE_BASIS"],
    SCANNER_PROPOSAL_TTL_MS: env["SCANNER_PROPOSAL_TTL_MS"],
    SCANNER_REGISTRY_TTL_MS: env["SCANNER_REGISTRY_TTL_MS"],
    SCANNER_CAPABILITY_TTL_MS: env["SCANNER_CAPABILITY_TTL_MS"],
    SCANNER_SKEW_TOLERANCE_S: env["SCANNER_SKEW_TOLERANCE_S"],
    SCANNER_LOOP_UNIVERSE_MS: env["SCANNER_LOOP_UNIVERSE_MS"],
    SCANNER_LOOP_PULSE_MS: env["SCANNER_LOOP_PULSE_MS"],
    CAPTURE_BATCH_ROWS: env["CAPTURE_BATCH_ROWS"],
    CAPTURE_ROLL_MS: env["CAPTURE_ROLL_MS"],
    DATA_DISK_WARN_MB: env["DATA_DISK_WARN_MB"],
    DATA_DISK_STOP_MB: env["DATA_DISK_STOP_MB"],
  });
  return {
    nodeEnv: parsed.NODE_ENV,
    environment: parsed.DERIV_TRADER_ENV,
    dataRoot: parsed.DERIV_TRADER_DATA_ROOT,
    traderHost: parsed.TRADER_HOST,
    traderPort: parsed.TRADER_PORT,
    buildSha: parsed.BUILD_SHA,
    supabaseUrl: parsed.SUPABASE_URL,
    supabaseAnonKey: parsed.SUPABASE_ANON_KEY,
    derivAppId: parsed.DERIV_APP_ID,
    derivOptionsRestBaseUrl: parsed.DERIV_OPTIONS_REST_BASE_URL,
    derivOptionsPublicWsUrl: parsed.DERIV_OPTIONS_PUBLIC_WS_URL,
    wsRequestTimeoutMs: parsed.DERIV_WS_REQUEST_TIMEOUT_MS,
    wsHeartbeatMs: parsed.DERIV_WS_HEARTBEAT_MS,
    wsReconnectBaseMs: parsed.DERIV_WS_RECONNECT_BASE_MS,
    wsReconnectMaxMs: parsed.DERIV_WS_RECONNECT_MAX_MS,
    budgetProposalPerMin: parsed.API_BUDGET_PROPOSAL_PER_MIN,
    budgetProposalPerHour: parsed.API_BUDGET_PROPOSAL_PER_HOUR,
    budgetOtherPerMin: parsed.API_BUDGET_OTHER_PER_MIN,
    budgetOtherPerHour: parsed.API_BUDGET_OTHER_PER_HOUR,
    budgetProposalReserve: parsed.API_BUDGET_PROPOSAL_RESERVE,
    budgetRestPerMin: parsed.API_BUDGET_REST_PER_MIN,
    budgetRestPer10Min: parsed.API_BUDGET_REST_PER_10MIN,
    scannerPayoutThreshold: parsed.SCANNER_PAYOUT_THRESHOLD,
    scannerProbeAmount: parsed.SCANNER_PROBE_AMOUNT,
    scannerProbeCurrency: parsed.SCANNER_PROBE_CURRENCY,
    scannerProbeBasis: parsed.SCANNER_PROBE_BASIS,
    scannerProposalTtlMs: parsed.SCANNER_PROPOSAL_TTL_MS,
    scannerRegistryTtlMs: parsed.SCANNER_REGISTRY_TTL_MS,
    scannerCapabilityTtlMs: parsed.SCANNER_CAPABILITY_TTL_MS,
    scannerSkewToleranceS: parsed.SCANNER_SKEW_TOLERANCE_S,
    scannerLoopUniverseMs: parsed.SCANNER_LOOP_UNIVERSE_MS,
    scannerLoopPulseMs: parsed.SCANNER_LOOP_PULSE_MS,
    captureBatchRows: parsed.CAPTURE_BATCH_ROWS,
    captureRollMs: parsed.CAPTURE_ROLL_MS,
    diskWarnMb: parsed.DATA_DISK_WARN_MB,
    diskStopMb: parsed.DATA_DISK_STOP_MB,
  };
}

/**
 * Resolve the local data root deterministically and keep it inside the repo
 * unless an absolute path is explicitly provided.
 */
export function resolveDataRoot(config: Pick<AppConfig, "dataRoot">, repoRoot: string): string {
  const root = config.dataRoot.trim();
  if (root.startsWith("/") || /^[A-Za-z]:[\\/]/.test(root)) return root;
  const clean = root
    .replace(/^\.\//, "")
    .replace(/\.\./g, "")
    .replace(/^\/+/, "")
    .replace(/^\\+/, "");
  return `${repoRoot.replace(/\/$/, "")}/${clean}`;
}

export function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host.toLowerCase() === "localhost";
}
