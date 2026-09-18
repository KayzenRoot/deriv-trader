/**
 * Foundation status helpers (server-safe; no SecretStore in browser).
 * ECharts/Motion are referenced minimally so the foundation proves the
 * dependency graph without decorative overbuild.
 */
import * as echarts from "echarts";

export interface TraderHealth {
  readonly reachable: boolean;
  readonly status?: string | undefined;
  readonly version?: string | undefined;
  readonly environment?: string | undefined;
}

export async function getTraderHealth(): Promise<TraderHealth> {
  const base = process.env["TRADER_INTERNAL_URL"] ?? "http://127.0.0.1:3101";
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 1500);
  try {
    const response = await fetch(`${base}/v1/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return { reachable: false };
    const body = (await response.json()) as {
      status?: string;
      version?: string;
      environment?: string;
    };
    return {
      reachable: true,
      status: body.status,
      version: body.version,
      environment: body.environment,
    };
  } catch {
    return { reachable: false };
  } finally {
    clearTimeout(timeout);
  }
}

/** Minimal smoke use of ECharts: prove the lib loads without deprecated APIs. */
export function echartsSmoko(): string {
  if (typeof echarts.version !== "string" || echarts.version.length === 0) {
    throw new Error("echarts failed to load");
  }
  return "2026-09-18";
}

export const FOUNDATION_LABEL = "DEMO / FOUNDATION" as const;
