/**
 * DB boundary (DT-WP-01 Phase E/F).
 * Postgres/Supabase-oriented interfaces + migration directory skeleton.
 * No cloud provisioning; no live connection required for build/test.
 */
export interface Migration {
  readonly version: string;
  readonly name: string;
  readonly sql: string;
}

export interface DbClient {
  readonly kind: "supabase-postgres" | "memory";
  ping(): Promise<boolean>;
}

export class MemoryDbClient implements DbClient {
  readonly kind = "memory" as const;
  ping(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

export const FOUNDATION_MIGRATIONS: readonly Migration[] = [
  {
    version: "0001",
    name: "foundation_health",
    sql: "-- Foundation placeholder migration (no tables required in WP-01).\nSELECT 1;\n",
  },
];

/**
 * Capture-session metadata (DT-WP-02 Phase F).
 * The operational plane tracks session/partition metadata only; Parquet file
 * content remains the local canonical research evidence (never high-frequency
 * rows in Postgres).
 */
export interface CaptureSession {
  readonly sessionId: string;
  readonly datasetId: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly symbols: readonly string[];
  readonly tickRows: number;
  readonly proposalRows: number;
  readonly quarantinedFiles: number;
  readonly buildSha: string;
}

export function emptyCaptureSession(sessionId: string, datasetId: string, buildSha: string): CaptureSession {
  return {
    sessionId,
    datasetId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    symbols: [],
    tickRows: 0,
    proposalRows: 0,
    quarantinedFiles: 0,
    buildSha,
  };
}
