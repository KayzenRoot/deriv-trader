#!/usr/bin/env node
// Bounded live public Deriv Options API smoke (DT-WP-02 §14).
// NOT ordinary CI: explicit evidence command only. No credentials, no auth
// socket, no buy/sell. Small bounded call count with timeouts; a proposal
// rejection is evidence, never a reason to retry.
import WebSocket from "ws";

const URL = process.env["DERIV_OPTIONS_PUBLIC_WS_URL"] ?? "wss://api.derivws.com/trading/v1/options/ws/public";
const CONNECT_TIMEOUT_MS = 10_000;
const CALL_TIMEOUT_MS = 10_000;
const MAX_TICKS = 3;
const MAX_PROPOSALS = 2;

function fail(reason, detail = {}) {
  console.log(JSON.stringify({ status: "BLOCKED", reason, ...detail }, null, 2));
  process.exit(2);
}

function openSocket(url) {
  return new Promise((resolve, reject) => {
    let socket;
    try {
      socket = new WebSocket(url);
    } catch (error) {
      reject(error);
      return;
    }
    const timer = setTimeout(() => {
      try {
        socket.close();
      } catch {
        // ignore close errors on timeout
      }
      reject(new Error("connect timeout"));
    }, CONNECT_TIMEOUT_MS);
    socket.on("open", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function call(socket, payload, timeoutMs = CALL_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const reqId = Math.floor(Math.random() * 1e9) + 1;
    const timer = setTimeout(() => reject(new Error("call timeout")), timeoutMs);
    const onMessage = (data) => {
      let parsed;
      try {
        parsed = JSON.parse(String(data));
      } catch {
        return;
      }
      if (parsed?.req_id !== reqId) return;
      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(parsed);
    };
    socket.on("message", onMessage);
    socket.send(JSON.stringify({ ...payload, req_id: reqId }));
  });
}

const startedAt = new Date().toISOString();
let requests = 0;
const counted = async (socket, payload) => {
  requests += 1;
  return call(socket, payload);
};

let socket;
try {
  socket = await openSocket(URL);
} catch (error) {
  fail("connect-failed", { endpoint: URL, startedAt, detail: String(error) });
}

try {
  const symbolsRes = await counted(socket, { active_symbols: "brief" });
  const symbols = symbolsRes?.active_symbols ?? [];
  const current = symbols.filter((s) => typeof s?.underlying_symbol === "string");
  if (current.length === 0) {
    fail("no-symbols", { endpoint: URL, startedAt, requests });
  }
  const pick =
    current.find((s) => s.market === "forex" && s.exchange_is_open === 1 && s.is_trading_suspended === 0) ??
    current[0];
  const symbol = pick.underlying_symbol;

  const contractsRes = await counted(socket, { contracts_for: symbol });
  const available = contractsRes?.contracts_for?.available ?? [];
  const hasCall = available.some((c) => c?.contract_type === "CALL");
  const hasPut = available.some((c) => c?.contract_type === "PUT");

  const ticks = [];
  const tickReqId = Math.floor(Math.random() * 1e9) + 1;
  requests += 1;
  const tickPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("tick timeout")), CALL_TIMEOUT_MS);
    let subscriptionId = null;
    const onMessage = (data) => {
      let parsed;
      try {
        parsed = JSON.parse(String(data));
      } catch {
        return;
      }
      if (parsed?.subscription?.id) subscriptionId = parsed.subscription.id;
      if (parsed?.tick?.quote !== undefined && parsed?.tick?.epoch !== undefined) {
        ticks.push({ quote: parsed.tick.quote, epoch: parsed.tick.epoch });
        if (ticks.length >= MAX_TICKS) {
          clearTimeout(timer);
          socket.off("message", onMessage);
          resolve(subscriptionId);
        }
      }
    };
    socket.on("message", onMessage);
    socket.send(JSON.stringify({ ticks: symbol, subscribe: 1, req_id: tickReqId }));
  });
  let subscriptionId = null;
  try {
    subscriptionId = await tickPromise;
  } catch {
    subscriptionId = null;
  }
  if (subscriptionId) {
    requests += 1;
    try {
      await call(socket, { forget: subscriptionId }, 5000);
    } catch {
      // best-effort cleanup
    }
  }

  const proposals = [];
  const candidates = [];
  if (hasCall) candidates.push("CALL");
  if (hasPut && candidates.length < MAX_PROPOSALS) candidates.push("PUT");
  for (const contractType of candidates.slice(0, MAX_PROPOSALS)) {
    try {
      requests += 1;
      const res = await call(socket, {
        proposal: 1,
        amount: 0.35,
        basis: "stake",
        contract_type: contractType,
        currency: "USD",
        duration: 60,
        duration_unit: "s",
        underlying_symbol: symbol,
      });
      const proposal = res?.proposal ?? null;
      proposals.push({
        contractType,
        ok: proposal !== null && typeof proposal?.id === "string",
        hasEconomics:
          proposal !== null && proposal?.ask_price !== undefined && proposal?.payout !== undefined,
        rejected: proposal === null,
      });
    } catch {
      proposals.push({ contractType, ok: false, hasEconomics: false, rejected: true });
    }
  }

  try {
    socket.close();
  } catch {
    // ignore
  }
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        endpoint: URL,
        startedAt,
        finishedAt: new Date().toISOString(),
        requests,
        parserVersion: "deriv-options-2026-09-18",
        activeSymbols: current.length,
        pickedSymbol: symbol,
        contractsAvailable: available.length,
        hasCall,
        hasPut,
        ticksReceived: ticks.length,
        tickSubscriptionCleaned: subscriptionId !== null,
        proposals,
      },
      null,
      2,
    ),
  );
} catch (error) {
  try {
    socket.close();
  } catch {
    // ignore
  }
  fail("call-failed", { endpoint: URL, startedAt, requests, detail: String(error) });
}
