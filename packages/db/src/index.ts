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
