/**
 * Symbol & Contract Registry (DT-WP-02 Phase C).
 * The universe is built dynamically from active_symbols + contracts_for.
 * No hard-coded tradable-symbol list. Duration support (60/180/300s) is never
 * inferred from missing metadata — it must be proven by proposal probing
 * (scanner layer) and recorded explicitly per symbol + direction (R2: a CALL
 * proof never proves PUT).
 */
import type {
  ActiveInstrument,
  Clock,
  ContractCapability,
  ContractDirection,
  ExpirySeconds,
  MarketDataSource,
} from "@deriv-trader/domain";
import { systemClock } from "@deriv-trader/domain";

export type InstrumentState =
  | "ACTIVE_ELIGIBLE"
  | "ACTIVE_UNSUPPORTED"
  | "CLOSED"
  | "INACTIVE"
  | "STALE"
  | "ERROR";

export interface ProvenDirection {
  readonly expiry: ExpirySeconds;
  readonly directions: readonly ContractDirection[];
}

export interface RegistryRecord {
  readonly instrument: ActiveInstrument;
  readonly capabilities: ContractCapability[];
  readonly state: InstrumentState;
  /** Proven support keyed per expiry, directions proven independently. */
  readonly provenExpiries: ProvenDirection[];
  readonly lastSymbolsRefreshAt: string;
  readonly lastCapabilityRefreshAt: string | null;
  readonly error: string | null;
}

export interface RegistryFilter {
  readonly allow: readonly string[] | null;
  readonly block: readonly string[];
}

export interface RegistryOptions {
  readonly clock?: Clock;
  readonly capabilityTtlMs?: number;
  readonly filter?: RegistryFilter;
}

const EXPIRIES: ExpirySeconds[] = [60, 180, 300];

export class SymbolRegistry {
  private readonly source: MarketDataSource;
  private readonly clock: Clock;
  private readonly capabilityTtlMs: number;
  private filter: RegistryFilter;
  private records = new Map<string, RegistryRecord>();
  private symbolsAge = 0;

  constructor(source: MarketDataSource, options: RegistryOptions = {}) {
    this.source = source;
    this.clock = options.clock ?? systemClock();
    this.capabilityTtlMs = options.capabilityTtlMs ?? 15 * 60_000;
    this.filter = options.filter ?? { allow: null, block: [] };
  }

  setFilter(filter: RegistryFilter): void {
    // Allow/block lists narrow the universe; they can never widen it.
    this.filter = filter;
    for (const [symbol, record] of this.records) {
      this.records.set(symbol, { ...record, state: this.applyState(record) });
    }
  }

  symbols(): RegistryRecord[] {
    return [...this.records.values()];
  }

  get(underlyingSymbol: string): RegistryRecord | null {
    return this.records.get(underlyingSymbol) ?? null;
  }

  size(): number {
    return this.records.size;
  }

  private stamp(): string {
    return new Date(this.clock.nowMs()).toISOString();
  }

  private applyState(record: RegistryRecord): InstrumentState {
    const { instrument } = record;
    if (this.filter.block.includes(instrument.underlyingSymbol)) return "INACTIVE";
    if (this.filter.allow !== null && !this.filter.allow.includes(instrument.underlyingSymbol)) {
      return "INACTIVE";
    }
    if (instrument.tradingSuspended || !instrument.exchangeOpen) return "CLOSED";
    if (record.error) return "ERROR";
    const hasCallPut = record.capabilities.some(
      (c) => c.contractType === "CALL" || c.contractType === "PUT",
    );
    if (!hasCallPut) return "ACTIVE_UNSUPPORTED";
    if (!record.provenExpiries.some((p) => p.directions.length > 0)) return "ACTIVE_UNSUPPORTED";
    return "ACTIVE_ELIGIBLE";
  }

  async refreshSymbols(): Promise<RegistryRecord[]> {
    const instruments = await this.source.getActiveSymbols();
    const now = this.stamp();
    const seen = new Set<string>();
    for (const instrument of instruments) {
      seen.add(instrument.underlyingSymbol);
      const previous = this.records.get(instrument.underlyingSymbol);
      const record: RegistryRecord = {
        instrument,
        capabilities: previous?.capabilities ?? [],
        state: "STALE",
        provenExpiries: previous?.provenExpiries ?? [],
        lastSymbolsRefreshAt: now,
        lastCapabilityRefreshAt: previous?.lastCapabilityRefreshAt ?? null,
        error: null,
      };
      this.records.set(instrument.underlyingSymbol, {
        ...record,
        state: this.applyState(record),
      });
    }
    for (const symbol of [...this.records.keys()]) {
      if (!seen.has(symbol)) this.records.delete(symbol);
    }
    this.symbolsAge = this.clock.nowMs();
    return this.symbols();
  }

  async refreshCapabilities(underlyingSymbol: string, force = false): Promise<RegistryRecord | null> {
    const record = this.records.get(underlyingSymbol);
    if (!record) return null;
    const ageMs = record.lastCapabilityRefreshAt
      ? this.clock.nowMs() - Date.parse(record.lastCapabilityRefreshAt)
      : Number.POSITIVE_INFINITY;
    if (!force && ageMs < this.capabilityTtlMs) return record;
    try {
      const capabilities = await this.source.getContractsFor(underlyingSymbol);
      const updated: RegistryRecord = {
        ...record,
        capabilities,
        lastCapabilityRefreshAt: this.stamp(),
        error: null,
      };
      const withState = { ...updated, state: this.applyState(updated) };
      this.records.set(underlyingSymbol, withState);
      return withState;
    } catch (error) {
      const failed: RegistryRecord = {
        ...record,
        error: error instanceof Error ? error.message.slice(0, 200) : "unknown",
      };
      this.records.set(underlyingSymbol, { ...failed, state: "ERROR" });
      return this.records.get(underlyingSymbol) ?? null;
    }
  }

  /**
   * Record proven expiry support for one direction (from bounded proposal
   * probing). A CALL proof never proves PUT and vice versa (R2).
   */
  proveExpiry(underlyingSymbol: string, expiry: ExpirySeconds, direction: ContractDirection): void {
    const record = this.records.get(underlyingSymbol);
    if (!record) return;
    const existing = record.provenExpiries.find((p) => p.expiry === expiry);
    if (existing?.directions.includes(direction)) return;
    const provenExpiries = record.provenExpiries
      .filter((p) => p.expiry !== expiry)
      .concat([
        {
          expiry,
          directions: [...(existing?.directions ?? []), direction].sort(),
        },
      ])
      .sort((a, b) => EXPIRIES.indexOf(a.expiry) - EXPIRIES.indexOf(b.expiry));
    const updated = { ...record, provenExpiries };
    this.records.set(underlyingSymbol, { ...updated, state: this.applyState(updated) });
  }

  isProven(underlyingSymbol: string, direction: ContractDirection, expiry: ExpirySeconds): boolean {
    return (
      this.records
        .get(underlyingSymbol)
        ?.provenExpiries.find((p) => p.expiry === expiry)
        ?.directions.includes(direction) === true
    );
  }

  symbolsAgeMs(): number {
    return this.clock.nowMs() - this.symbolsAge;
  }
}
