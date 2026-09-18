/**
 * Reporting boundary (DT-WP-01 Phase F). Report DTOs/interfaces only.
 */
export interface ReportSummary {
  readonly title: string;
  readonly generatedAt: string;
  readonly environment: "DEMO" | "REAL";
  readonly note: string;
}

export function foundationReport(buildSha: string): ReportSummary {
  return {
    title: "Deriv Trader Foundation",
    generatedAt: new Date().toISOString(),
    environment: "DEMO",
    note: `foundation skeleton (build ${buildSha}); no trading statistics fabricated`,
  };
}
