/**
 * Read-only public market source over one shared WebSocket (DT-WP-02).
 * Implements the domain MarketDataSource port using PublicWsClient +
 * ApiBudgetManager + normalization. No authenticated calls, no economic
 * actions; proposal is a quote only.
 */
import type {
  ActiveInstrument,
  Clock,
  ContractCapability,
  MarketDataSource,
  MarketTick,
  ProposalAssumptions,
  ProposalQuote,
} from "@deriv-trader/domain";
import { systemClock } from "@deriv-trader/domain";
import type { ApiBudgetManager } from "./budget.js";
import { normalizeActiveSymbol, normalizeContractItem, normalizeHistory, normalizeProposal, normalizeTick, SCHEMA_VERSION } from "./normalize.js";
import { activeSymbolsResponseSchema, contractsForResponseSchema } from "./schemas.js";
import type { PublicWsClient } from "./transport.js";

export interface MarketSourceOptions {
  readonly clock?: Clock;
  readonly connectionId?: string;
  readonly buildSha?: string;
}

export class DerivPublicMarketSource implements MarketDataSource {
  private readonly client: PublicWsClient;
  private readonly budget: ApiBudgetManager;
  private readonly clock: Clock;
  private readonly buildSha: string;
  private sequence = 0;

  constructor(client: PublicWsClient, budget: ApiBudgetManager, options: MarketSourceOptions = {}) {
    this.client = client;
    this.budget = budget;
    this.clock = options.clock ?? systemClock();
    this.buildSha = options.buildSha ?? "local-dev";
  }

  private stamp(): string {
    return new Date(this.clock.nowMs()).toISOString();
  }

  async getActiveSymbols(): Promise<ActiveInstrument[]> {
    const admit = this.budget.admit("MARKET_DISCOVERY");
    if (!admit.admitted) throw new Error(`budget throttled: ${admit.reason}`);
    const raw = await this.client.request({ active_symbols: "brief" });
    const parsed = activeSymbolsResponseSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.active_symbols) {
      throw new Error("SCHEMA_MISMATCH: active_symbols");
    }
    const out: ActiveInstrument[] = [];
    for (const item of parsed.data.active_symbols) {
      const normalized = normalizeActiveSymbol(item);
      if (normalized) out.push(normalized);
    }
    return out;
  }

  async getContractsFor(underlyingSymbol: string): Promise<ContractCapability[]> {
    const admit = this.budget.admit("MARKET_DISCOVERY");
    if (!admit.admitted) throw new Error(`budget throttled: ${admit.reason}`);
    const raw = await this.client.request({ contracts_for: underlyingSymbol });
    const parsed = contractsForResponseSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.contracts_for?.available) {
      throw new Error("SCHEMA_MISMATCH: contracts_for");
    }
    const out: ContractCapability[] = [];
    for (const item of parsed.data.contracts_for.available) {
      const normalized = normalizeContractItem(underlyingSymbol, item);
      if (normalized) out.push(normalized);
    }
    return out;
  }

  async subscribeTicks(
    underlyingSymbol: string,
    handler: (tick: MarketTick) => void,
  ): Promise<{ subscriptionId: string; unsubscribe: () => Promise<void> }> {
    const admit = this.budget.admit("MARKET_DISCOVERY");
    if (!admit.admitted) throw new Error(`budget throttled: ${admit.reason}`);
    const { unsubscribe } = await this.client.subscribe(
      { ticks: underlyingSymbol },
      (message: unknown) => {
        const envelope = message as { tick?: unknown; subscription?: { id?: string } };
        this.sequence += 1;
        const tick = normalizeTick(envelope.tick ?? null, {
          receiveTime: this.stamp(),
          sourceConnectionId: this.client.connectionId,
          sequence: this.sequence,
          reqId: null,
          subscriptionId:
            typeof envelope.subscription?.id === "string" ? envelope.subscription.id : null,
        });
        if (tick) handler({ ...tick, underlyingSymbol });
      },
    );
    return { subscriptionId: `ticks:${underlyingSymbol}`, unsubscribe };
  }

  async getTicksHistory(
    underlyingSymbol: string,
    start: number,
    end: number | "latest",
    count: number,
  ): Promise<MarketTick[]> {
    const admit = this.budget.admit("MARKET_DISCOVERY");
    if (!admit.admitted) throw new Error(`budget throttled: ${admit.reason}`);
    const bounded = Math.max(1, Math.min(Math.floor(count), 5000));
    const raw = await this.client.request({
      ticks_history: underlyingSymbol,
      start: Math.floor(start),
      end,
      style: "ticks",
      count: bounded,
      adjust_start_time: 1,
    });
    return normalizeHistory(underlyingSymbol, raw, {
      receiveTime: this.stamp(),
      sourceConnectionId: this.client.connectionId,
      reqId: null,
      subscriptionId: null,
    });
  }

  async requestProposal(assumptions: ProposalAssumptions): Promise<ProposalQuote> {
    const admit = this.budget.admit("SIGNAL_PROPOSAL");
    if (!admit.admitted) {
      return {
        key: `${assumptions.underlyingSymbol}|${assumptions.contractType}|${String(assumptions.durationSeconds)}|${assumptions.currency}|${assumptions.basis}|${String(assumptions.amount)}`,
        assumptions,
        proposalId: null,
        askPrice: null,
        payout: null,
        effectivePayout: null,
        breakEven: null,
        state: "UNKNOWN",
        requestedAt: this.stamp(),
        receivedAt: this.stamp(),
        source: `throttled:${admit.reason}`,
      };
    }
    const requestedAt = this.stamp();
    const raw = await this.client.request({
      proposal: 1,
      amount: assumptions.amount,
      basis: assumptions.basis,
      contract_type: assumptions.contractType,
      currency: assumptions.currency,
      duration: assumptions.durationSeconds,
      duration_unit: "s",
      underlying_symbol: assumptions.underlyingSymbol,
    });
    const envelope = raw as { proposal?: unknown };
    return normalizeProposal(
      assumptions,
      envelope.proposal ?? null,
      { requestedAt, receivedAt: this.stamp(), source: `deriv-public@${SCHEMA_VERSION}+${this.buildSha}` },
    );
  }

  async forget(subscriptionId: string): Promise<boolean> {
    return this.client.forget(subscriptionId);
  }

  async forgetAll(): Promise<void> {
    await this.client.forgetAll();
  }
}
