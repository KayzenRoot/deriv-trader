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
