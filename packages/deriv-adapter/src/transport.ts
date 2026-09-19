/**
 * Single shared public WebSocket transport (DT-WP-02 Phase A).
 * One socket per client by default — never one per request/symbol/Runner.
 * req_id correlation, timeouts, subscription routing, forget/forget_all and
 * deterministic injection (socket factory + clock) for tests.
 */
import type { Clock } from "@deriv-trader/domain";
import { systemClock } from "@deriv-trader/domain";

/** Minimal socket surface; `ws` package satisfies this in production. */
export interface WsSocket {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  on(event: "open" | "message" | "close" | "error", handler: (data?: unknown) => void): void;
  removeAllListeners(): void;
}

export type SocketFactory = (url: string) => WsSocket;

export const OPEN_STATE = 1;

/** Carries the raw broker envelope of a rejected subscription for classification upstream. */
export class SubscribeRejectedError extends Error {
  readonly response: unknown;

  constructor(message: string, response: unknown) {
    super(message);
    this.name = "SubscribeRejectedError";
    this.response = response;
  }
}

export interface TransportOptions {
  readonly clock?: Clock;
  readonly socketFactory?: SocketFactory;
  readonly requestTimeoutMs?: number;
  readonly connectionId?: string;
}

interface PendingRequest {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly deadlineMs: number;
  readonly timer: ReturnType<typeof setTimeout>;
}

interface SubscriptionRoute {
  readonly handler: (message: unknown) => void;
}

function errorMessage(message: unknown): string {
  if (typeof message === "string") return message;
  try {
    const text: unknown = JSON.stringify(message);
    return typeof text === "string" ? text : "unknown";
  } catch {
    return "unknown";
  }
}

export class PublicWsClient {
  readonly url: string;
  readonly connectionId: string;
  private readonly clock: Clock;
  private readonly socketFactory: SocketFactory | null;
  private readonly requestTimeoutMs: number;
  private socket: WsSocket | null = null;
  private connecting: Promise<void> | null = null;
  private nextReqId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly subscriptions = new Map<string, SubscriptionRoute>();
  private readonly connectionListeners = new Set<(connected: boolean) => void>();
  private closed = false;

  constructor(url: string, options: TransportOptions = {}) {
    this.url = url;
    this.connectionId = options.connectionId ?? `public-${String(Math.floor(Math.random() * 1e9))}`;
    this.clock = options.clock ?? systemClock();
    this.socketFactory = options.socketFactory ?? null;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 15000;
  }

  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  private emitConnection(connected: boolean): void {
    for (const listener of this.connectionListeners) listener(connected);
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === OPEN_STATE;
  }

  pendingCount(): number {
    return this.pending.size;
  }

  subscriptionCount(): number {
    return this.subscriptions.size;
  }

  nextId(): number {
    const id = this.nextReqId;
    this.nextReqId += 1;
    return id;
  }

  async connect(): Promise<void> {
    if (this.closed) throw new Error("transport closed");
    if (this.isConnected()) return;
    if (this.connecting) return this.connecting;
    if (!this.socketFactory) throw new Error("no socket factory configured");
    this.connecting = new Promise<void>((resolve, reject) => {
      const factory = this.socketFactory;
      if (!factory) {
        reject(new Error("no socket factory configured"));
        return;
      }
      let socket: WsSocket;
      try {
        socket = factory(this.url);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      const onOpen = (): void => {
        this.socket = socket;
        this.emitConnection(true);
        resolve();
      };
      const onFailure = (data?: unknown): void => {
        reject(new Error(`connect failed: ${errorMessage(data)}`));
      };
      socket.on("open", onOpen);
      socket.on("error", onFailure);
      socket.on("close", () => {
        if (this.socket === socket) {
          this.socket = null;
          this.emitConnection(false);
          this.failPending(new Error("connection lost"));
        }
      });
      socket.on("message", (data?: unknown) => {
        this.routeMessage(data);
      });
    });
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  close(): Promise<void> {
    this.closed = true;
    this.failPending(new Error("transport closed"));
    this.subscriptions.clear();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      try {
        socket.removeAllListeners();
      } catch {
        // ignore listener cleanup errors on close
      }
      try {
        socket.close();
      } catch {
        // ignore close errors; state is already cleared
      }
    }
    this.emitConnection(false);
    return Promise.resolve();
  }

  private failPending(error: Error): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  /** Arm the automatic timeout; sweepTimeouts() remains the deterministic hook. */
  private track(reqId: number, timeoutMs: number): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        const still = this.pending.get(reqId);
        if (still) {
          this.pending.delete(reqId);
          still.reject(new Error(`request ${String(reqId)} timed out`));
        }
      }, timeoutMs);
      (timer as unknown as { unref?: () => void }).unref?.();
      this.pending.set(reqId, {
        resolve: (value: unknown) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error: Error) => {
          clearTimeout(timer);
          reject(error);
        },
        deadlineMs: this.clock.nowMs() + timeoutMs,
        timer,
      });
    });
  }

  private decode(data: unknown): string | null {
    if (typeof data === "string") return data;
    // Live sockets deliver text frames as binary buffers; decode them.
    // (Unit fakes send strings, which is why this only bites against Deriv.)
    try {
      if (data instanceof Uint8Array) return new TextDecoder().decode(data);
      if (data instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(data));
      if (Array.isArray(data)) {
        return data
          .map((chunk) => (chunk instanceof Uint8Array ? new TextDecoder().decode(chunk) : ""))
          .join("");
      }
    } catch {
      return null;
    }
    return null;
  }

  private routeMessage(data: unknown): void {
    const text = this.decode(data);
    if (text === null) return;
    let parsed: { req_id?: unknown; subscription?: unknown; error?: unknown };
    try {
      parsed = JSON.parse(text) as { req_id?: unknown; subscription?: unknown; error?: unknown };
    } catch {
      return;
    }
    const subscription = parsed.subscription as { id?: unknown } | undefined;
    if (subscription && typeof subscription.id === "string") {
      const route = this.subscriptions.get(subscription.id);
      if (route) {
        route.handler(parsed);
        return;
      }
    }
    if (typeof parsed.req_id === "number") {
      const pending = this.pending.get(parsed.req_id);
      if (pending) {
        this.pending.delete(parsed.req_id);
        clearTimeout(pending.timer);
        pending.resolve(parsed);
      }
    }
  }

  /** Check timeouts deterministically (tests drive the fake clock). */
  sweepTimeouts(): void {
    const now = this.clock.nowMs();
    for (const [reqId, pending] of this.pending) {
      if (pending.deadlineMs <= now) {
        this.pending.delete(reqId);
        clearTimeout(pending.timer);
        pending.reject(new Error(`request ${String(reqId)} timed out`));
      }
    }
  }

  async request(
    payload: Record<string, unknown>,
    opts: { timeoutMs?: number } = {},
  ): Promise<unknown> {
    await this.connect();
    const socket = this.socket;
    if (!socket) throw new Error("not connected");
    const reqId = this.nextId();
    const timeoutMs = opts.timeoutMs ?? this.requestTimeoutMs;
    const result = this.track(reqId, timeoutMs);
    socket.send(JSON.stringify({ ...payload, req_id: reqId }));
    return result;
  }

  async subscribe(
    payload: Record<string, unknown>,
    handler: (message: unknown) => void,
    opts: { timeoutMs?: number } = {},
  ): Promise<{ reqId: number; unsubscribe: () => Promise<void> }> {
    await this.connect();
    const socket = this.socket;
    if (!socket) throw new Error("not connected");
    const reqId = this.nextId();
    const timeoutMs = opts.timeoutMs ?? this.requestTimeoutMs;
    const first = this.track(reqId, timeoutMs);
    const routeKey = `req:${String(reqId)}`;
    this.subscriptions.set(routeKey, { handler });
    socket.send(JSON.stringify({ ...payload, subscribe: 1, req_id: reqId }));
    const response = (await first) as {
      subscription?: { id?: unknown };
      error?: unknown;
    };
    if (response.error) {
      this.subscriptions.delete(routeKey);
      throw new SubscribeRejectedError(
        `subscribe rejected: ${errorMessage(response.error)}`,
        response,
      );
    }
    const brokerId = response.subscription?.id;
    if (typeof brokerId === "string") {
      this.subscriptions.delete(routeKey);
      this.subscriptions.set(brokerId, { handler });
      return {
        reqId,
        unsubscribe: () => {
          // Idempotent: a second call after forget is a no-op, not a new call.
          if (!this.subscriptions.has(brokerId)) return Promise.resolve();
          return this.forget(brokerId).then(() => undefined);
        },
      };
    }
    return {
      reqId,
      unsubscribe: () => {
        this.subscriptions.delete(routeKey);
        return Promise.resolve();
      },
    };
  }

  async forget(subscriptionId: string): Promise<boolean> {
    this.subscriptions.delete(subscriptionId);
    try {
      const response = (await this.request({ forget: subscriptionId })) as {
        forget?: unknown;
      };
      return response.forget === 1;
    } catch {
      return false;
    }
  }

  async forgetAll(): Promise<void> {
    this.subscriptions.clear();
    try {
      await this.request({ forget_all: 1 });
    } catch {
      // best-effort cleanup; registry state is already cleared
    }
  }
}
