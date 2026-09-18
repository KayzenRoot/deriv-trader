/**
 * Runtime schemas for current Deriv Options public API payloads (DT-WP-02).
 * Tolerant of documented optional/nullable fields and unknown extras;
 * strict about critical identity fields. Unknown critical states fail closed
 * in normalize.ts — never here by accident.
 */
import { z } from "zod";

const numberOrString = z.union([z.number(), z.string()]);

const boolish = z.union([z.boolean(), z.number()]);

export const activeSymbolSchema = z
  .object({
    underlying_symbol: z.string().min(1),
    underlying_symbol_name: z.string().optional(),
    underlying_symbol_type: z.string().optional(),
    market: z.string().optional(),
    submarket: z.string().optional(),
    subgroup: z.string().optional(),
    exchange_is_open: boolish.optional(),
    is_trading_suspended: boolish.optional(),
    pip_size: z.union([z.number(), z.string(), z.null()]).optional(),
    trade_count: z.union([z.number(), z.null()]).optional(),
  })
  .loose();

export const activeSymbolsResponseSchema = z
  .object({
    active_symbols: z.array(activeSymbolSchema).optional(),
    msg_type: z.string().optional(),
  })
  .loose();

export const contractItemSchema = z
  .object({
    contract_category: z.string().optional(),
    contract_type: z.string().optional(),
    expiry_type: z.string().optional(),
    sentiment: z.union([z.string(), z.null()]).optional(),
    barriers: z.number().optional(),
    market: z.string().optional(),
    submarket: z.string().optional(),
    underlying_symbol: z.string().optional(),
  })
  .loose();

export const contractsForResponseSchema = z
  .object({
    contracts_for: z
      .object({
        available: z.array(contractItemSchema).optional(),
        hit_count: z.number().optional(),
      })
      .loose()
      .optional(),
    msg_type: z.string().optional(),
  })
  .loose();

export const tickPayloadSchema = z
  .object({
    symbol: z.string().optional(),
    quote: numberOrString.optional(),
    epoch: numberOrString.optional(),
    id: z.string().optional(),
  })
  .loose();

export const tickResponseSchema = z
  .object({
    tick: tickPayloadSchema.optional(),
    subscription: z.object({ id: z.string().optional() }).loose().optional(),
    msg_type: z.string().optional(),
  })
  .loose();

export const historyResponseSchema = z
  .object({
    history: z
      .object({
        prices: z.array(numberOrString),
        times: z.array(numberOrString),
      })
      .loose()
      .optional(),
    pip_size: z.number().optional(),
    msg_type: z.string().optional(),
  })
  .loose();

export const proposalPayloadSchema = z
  .object({
    id: z.string().optional(),
    ask_price: z.union([z.number(), z.string(), z.null()]).optional(),
    payout: z.union([z.number(), z.string(), z.null()]).optional(),
  })
  .loose();

export const proposalResponseSchema = z
  .object({
    proposal: proposalPayloadSchema.optional(),
    subscription: z.object({ id: z.string().optional() }).loose().optional(),
    msg_type: z.string().optional(),
  })
  .loose();

export const brokerErrorSchema = z
  .object({
    error: z
      .object({
        code: z.string().optional(),
        message: z.string().optional(),
      })
      .loose(),
  })
  .loose();

export type ActiveSymbolRaw = z.infer<typeof activeSymbolSchema>;
export type ContractItemRaw = z.infer<typeof contractItemSchema>;
export type TickPayloadRaw = z.infer<typeof tickPayloadSchema>;
export type ProposalPayloadRaw = z.infer<typeof proposalPayloadSchema>;
