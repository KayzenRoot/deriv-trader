/**
 * Research boundary (DT-WP-01 Phase F).
 * Remains side-effect-free regarding economic actions by construction:
 * no imports of execution/deriv order paths, pure data helpers only.
 */
export interface ResearchDatasetMeta {
  readonly name: string;
  readonly rows: number;
  readonly symbols: readonly string[];
}

export function summarizeDataset(rows: readonly { symbol: string }[]): ResearchDatasetMeta {
  const symbols = [...new Set(rows.map((r) => r.symbol))].sort();
  return { name: "foundation", rows: rows.length, symbols };
}
