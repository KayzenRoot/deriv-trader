/**
 * Prospective capture rows and bounded batch writer (DT-WP-02 Phase F).
 * Normalized ticks and proposal snapshots carry event/receive provenance,
 * parser/schema versions and the collector Git SHA. Backpressure degrades
 * optional capture explicitly instead of blocking runtime correctness.
 */
import type { MarketTick, ProposalQuote } from "@deriv-trader/domain";

export interface TickRow {
  readonly underlyingSymbol: string;
  readonly eventTime: number;
  readonly receiveTime: string;
  readonly quote: number;
  readonly pipSize: number | null;
  readonly sourceConnectionId: string;
  readonly sequence: number;
  readonly gap: boolean;
  readonly outOfOrder: boolean;
  readonly duplicate: boolean;
  readonly parserVersion: string;
  readonly buildSha: string;
}

export interface ProposalRow {
  readonly underlyingSymbol: string;
  readonly contractType: string;
  readonly durationSeconds: number;
  readonly amount: number;
  readonly basis: string;
  readonly currency: string;
  readonly askPrice: number | null;
  readonly payout: number | null;
  readonly effectivePayout: number | null;
  readonly breakEven: number | null;
  readonly proposalId: string | null;
  readonly state: string;
  readonly requestedAt: string;
  readonly receivedAt: string;
  readonly parserVersion: string;
  readonly buildSha: string;
}

export function toTickRow(
  tick: MarketTick,
  provenance: { parserVersion: string; buildSha: string },
): TickRow {
  return {
    underlyingSymbol: tick.underlyingSymbol,
    eventTime: tick.eventTime,
    receiveTime: tick.receiveTime,
    quote: tick.quote,
    pipSize: tick.pipSize,
    sourceConnectionId: tick.sourceConnectionId,
    sequence: tick.sequence,
    gap: tick.gap,
    outOfOrder: tick.outOfOrder,
    duplicate: tick.duplicate,
    parserVersion: provenance.parserVersion,
    buildSha: provenance.buildSha,
  };
}

export function toProposalRow(
  quote: ProposalQuote,
  provenance: { parserVersion: string; buildSha: string },
): ProposalRow {
  return {
    underlyingSymbol: quote.assumptions.underlyingSymbol,
    contractType: quote.assumptions.contractType,
    durationSeconds: quote.assumptions.durationSeconds,
    amount: quote.assumptions.amount,
    basis: quote.assumptions.basis,
    currency: quote.assumptions.currency,
    askPrice: quote.askPrice,
    payout: quote.payout,
    effectivePayout: quote.effectivePayout,
    breakEven: quote.breakEven,
    proposalId: quote.proposalId,
    state: quote.state,
    requestedAt: quote.requestedAt,
    receivedAt: quote.receivedAt,
    parserVersion: provenance.parserVersion,
    buildSha: provenance.buildSha,
  };
}

export type CaptureDegradation = "NONE" | "RAW_PAYLOADS_OFF" | "RESEARCH_PAUSED";

export interface BatchWriterOptions {
  readonly maxRows: number;
  readonly onFlush: (rows: TickRow[] | ProposalRow[]) => void;
  readonly shouldDegrade?: () => CaptureDegradation;
}

/**
 * Bounded batch accumulator. Flushes at maxRows; when degraded, research
 * rows are dropped explicitly (counted) instead of blocking callers.
 */
export class BatchWriter<T extends TickRow | ProposalRow> {
  private buffer: T[] = [];
  private dropped = 0;
  private readonly maxRows: number;
  private readonly onFlush: (rows: T[]) => void;
  private readonly shouldDegrade: () => CaptureDegradation;

  constructor(options: {
    readonly maxRows: number;
    readonly onFlush: (rows: T[]) => void;
    readonly shouldDegrade?: () => CaptureDegradation;
  }) {
    this.maxRows = options.maxRows;
    this.onFlush = options.onFlush;
    this.shouldDegrade = options.shouldDegrade ?? (() => "NONE");
  }

  push(row: T): void {
    if (this.shouldDegrade() === "RESEARCH_PAUSED") {
      this.dropped += 1;
      return;
    }
    this.buffer.push(row);
    if (this.buffer.length >= this.maxRows) this.flush();
  }

  flush(): T[] {
    const rows = this.buffer;
    this.buffer = [];
    if (rows.length > 0) this.onFlush(rows);
    return rows;
  }

  pending(): number {
    return this.buffer.length;
  }

  droppedCount(): number {
    return this.dropped;
  }
}
