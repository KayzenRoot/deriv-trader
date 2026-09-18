import { describe, expect, it, vi } from "vitest";
import { PublicWsClient, type WsSocket } from "./transport.js";

function makeClock(start = 0): { nowMs: () => number; advance: (ms: number) => void } {
  let now = start;
  return {
    nowMs: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

interface FakeSocket extends WsSocket {
  readonly sent: string[];
  emitOpen(): void;
  emitMessage(payload: unknown): void;
  emitClose(): void;
}

function makeFakeSocket(): FakeSocket {
  const handlers = new Map<string, ((data?: unknown) => void)[]>();
  const socket: FakeSocket = {
    readyState: 0,
    sent: [],
    send(data: string): void {
      socket.sent.push(data);
    },
    close(): void {
      (socket as { readyState: number }).readyState = 3;
    },
    on(event, handler): void {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    },
    removeAllListeners(): void {
      handlers.clear();
    },
    emitOpen(): void {
      (socket as { readyState: number }).readyState = 1;
      for (const h of handlers.get("open") ?? []) h();
    },
    emitMessage(payload: unknown): void {
      for (const h of handlers.get("message") ?? []) h(JSON.stringify(payload));
    },
    emitClose(): void {
      (socket as { readyState: number }).readyState = 3;
      for (const h of handlers.get("close") ?? []) h();
    },
  };
  return socket;
}

describe("public WS transport", () => {
  it("correlates req_id and reuses one socket", async () => {
    const sockets: FakeSocket[] = [];
    const client = new PublicWsClient("wss://example.test/public", {
      socketFactory: () => {
        const s = makeFakeSocket();
        sockets.push(s);
        queueMicrotask(() => {
          s.emitOpen();
        });
        return s;
      },
    });
    const first = client.request({ active_symbols: "brief" });
    const second = client.request({ ticks: "frxEURUSD" });
    // Poll for the effect (both sends flushed), not socket creation, so the
    // continuations after connect() have drained before assertions.
    await vi.waitFor(() => {
      expect(sockets[0]?.sent).toHaveLength(2);
    });
    const firstPayload = JSON.parse(sockets[0]?.sent[0] ?? "{}") as { req_id: number };
    const secondPayload = JSON.parse(sockets[0]?.sent[1] ?? "{}") as { req_id: number };
    expect(secondPayload.req_id).toBe(firstPayload.req_id + 1);
    sockets[0]?.emitMessage({ req_id: firstPayload.req_id, active_symbols: [] });
    sockets[0]?.emitMessage({ req_id: secondPayload.req_id, tick: {} });
    await expect(first).resolves.toMatchObject({ req_id: firstPayload.req_id });
    await expect(second).resolves.toMatchObject({ req_id: secondPayload.req_id });
    expect(client.pendingCount()).toBe(0);
    await client.close();
  });

  it("times out pending requests on the fake clock", async () => {
    const clock = makeClock(0);
    const sockets: FakeSocket[] = [];
    const client = new PublicWsClient("wss://example.test/public", {
      clock,
      socketFactory: () => {
        const s = makeFakeSocket();
        sockets.push(s);
        queueMicrotask(() => {
          s.emitOpen();
        });
        return s;
      },
    });
    const pending = client.request({ active_symbols: "brief" }, { timeoutMs: 100 });
    // Wait until the request was actually sent (pending registered) before
    // advancing the fake clock past its deadline.
    await vi.waitFor(() => {
      expect(sockets[0]?.sent).toHaveLength(1);
    });
    clock.advance(101);
    client.sweepTimeouts();
    await expect(pending).rejects.toThrow(/timed out/);
    await client.close();
  });

  it("routes subscriptions and supports forget cleanup", async () => {
    const sockets: FakeSocket[] = [];
    const client = new PublicWsClient("wss://example.test/public", {
      socketFactory: () => {
        const s = makeFakeSocket();
        sockets.push(s);
        queueMicrotask(() => {
          s.emitOpen();
        });
        return s;
      },
    });
    const seen: unknown[] = [];
    const sub = client.subscribe({ ticks: "frxEURUSD" }, (message: unknown) => {
      seen.push(message);
    });
    await vi.waitFor(() => {
      expect(sockets[0]?.sent).toHaveLength(1);
    });
    const reqPayload = JSON.parse(sockets[0]?.sent[0] ?? "{}") as { req_id: number };
    sockets[0]?.emitMessage({
      req_id: reqPayload.req_id,
      subscription: { id: "sub-1" },
      tick: { symbol: "frxEURUSD" },
    });
    const handle = await sub;
    expect(client.subscriptionCount()).toBe(1);
    sockets[0]?.emitMessage({
      subscription: { id: "sub-1" },
      tick: { symbol: "frxEURUSD", quote: 1.1, epoch: 5 },
    });
    expect(seen).toHaveLength(1);
    const forgetCall = client.forget("sub-1");
    await vi.waitFor(() => {
      expect((sockets[0]?.sent ?? []).length).toBeGreaterThan(1);
    });
    const forgetPayload = JSON.parse(sockets[0]?.sent[1] ?? "{}") as {
      forget?: string;
      req_id: number;
    };
    expect(forgetPayload.forget).toBe("sub-1");
    sockets[0]?.emitMessage({ req_id: forgetPayload.req_id, forget: 1 });
    await expect(forgetCall).resolves.toBe(true);
    expect(client.subscriptionCount()).toBe(0);
    await handle.unsubscribe().catch(() => undefined);
    await client.close();
  });

  it("maps broker errors without leaking raw payloads", async () => {
    const { mapBrokerError, extractErrorParts } = await import("./errors.js");
    const mapped = mapBrokerError("RateLimit", "slow down");
    expect(mapped.category).toBe("RATE_LIMITED");
    expect(JSON.stringify(mapped)).not.toContain("slow down");
    expect(mapBrokerError(null, null).category).toBe("UNKNOWN_FAIL_CLOSED");
    expect(extractErrorParts({ error: { code: "X", message: "Y" } })).toEqual({
      code: "X",
      message: "Y",
    });
  });
});
