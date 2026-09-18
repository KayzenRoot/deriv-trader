/**
 * Public-channel Connection Supervisor (DT-WP-02 Phase A).
 * DISCONNECTED -> BACKOFF -> CONNECTING -> SYNCING -> HEALTHY (+DEGRADED/STOPPED).
 * Bounded exponential backoff with jitter, idempotent subscription restore
 * (exactly once), stale invalidation via epoch, conservative heartbeat.
 */
import type { Clock, ConnectionHealth, ConnectionState } from "@deriv-trader/domain";
import { systemClock } from "@deriv-trader/domain";

export interface SupervisorHooks {
  /** Open the underlying transport (resolves when usable). */
  readonly connect: () => Promise<void>;
  /** Re-establish intended subscriptions exactly once after reconnect. */
  readonly restoreSubscriptions: () => Promise<void>;
  /** Conservative liveness probe; true keeps HEALTHY. */
  readonly heartbeat: () => Promise<boolean>;
  /** Called whenever pre-existing tick/proposal authority must go stale. */
  readonly onInvalidate: (epoch: number) => void;
  readonly clock?: Clock;
  readonly random?: () => number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly maxAttempts?: number;
  readonly heartbeatMs?: number;
}

export class ConnectionSupervisor {
  private state: ConnectionState = "DISCONNECTED";
  private epoch = 0;
  private reconnectCount = 0;
  private lastError: string | null = null;
  private lastTransitionAt: string;
  private stopped = false;
  private looping = false;
  private readonly hooks: {
    readonly connect: () => Promise<void>;
    readonly restoreSubscriptions: () => Promise<void>;
    readonly heartbeat: () => Promise<boolean>;
    readonly onInvalidate: (epoch: number) => void;
    readonly clock: Clock;
    readonly random: () => number;
    readonly baseDelayMs: number;
    readonly maxDelayMs: number;
    readonly maxAttempts: number;
    readonly heartbeatMs: number;
  };
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatScheduled = false;

  constructor(hooks: SupervisorHooks) {
    const clock = hooks.clock ?? systemClock();
    this.hooks = {
      connect: hooks.connect,
      restoreSubscriptions: hooks.restoreSubscriptions,
      heartbeat: hooks.heartbeat,
      onInvalidate: hooks.onInvalidate,
      clock,
      random: hooks.random ?? Math.random,
      baseDelayMs: hooks.baseDelayMs ?? 1000,
      maxDelayMs: hooks.maxDelayMs ?? 30000,
      maxAttempts: hooks.maxAttempts ?? Number.POSITIVE_INFINITY,
      heartbeatMs: hooks.heartbeatMs ?? 30000,
    };
    this.lastTransitionAt = new Date(clock.nowMs()).toISOString();
  }

  getState(): ConnectionState {
    return this.state;
  }

  getEpoch(): number {
    return this.epoch;
  }

  health(): ConnectionHealth {
    return {
      state: this.state,
      reconnectCount: this.reconnectCount,
      lastErrorCategory: this.lastError,
      lastTransitionAt: this.lastTransitionAt,
    };
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.lastTransitionAt = new Date(this.hooks.clock.nowMs()).toISOString();
  }

  private invalidate(reason: string): void {
    this.epoch += 1;
    this.lastError = reason;
    this.hooks.onInvalidate(this.epoch);
  }

  delayForAttempt(attempt: number): number {
    const grown = this.hooks.baseDelayMs * 2 ** Math.max(0, attempt);
    const bounded = Math.min(grown, this.hooks.maxDelayMs);
    const jitter = Math.floor(this.hooks.random() * Math.min(bounded, 1000));
    return bounded + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async start(): Promise<void> {
    if (this.looping || this.stopped) return;
    this.looping = true;
    await this.runOnce();
    this.looping = false;
    this.scheduleHeartbeat();
  }

  private isStopped(): boolean {
    return this.stopped;
  }

  private async runOnce(): Promise<void> {
    let attempt = 0;
    while (!this.isStopped()) {
      if (attempt > 0) {
        this.setState("BACKOFF");
        await this.sleep(this.delayForAttempt(attempt - 1));
        if (this.isStopped()) return;
      }
      this.setState("CONNECTING");
      try {
        await this.hooks.connect();
      } catch {
        attempt += 1;
        this.reconnectCount += 1;
        this.invalidate("CONNECTION_LOST");
        if (attempt >= this.hooks.maxAttempts) {
          this.setState("DEGRADED");
          return;
        }
        continue;
      }
      this.setState("SYNCING");
      try {
        await this.hooks.restoreSubscriptions();
      } catch {
        attempt += 1;
        this.reconnectCount += 1;
        this.invalidate("CONNECTION_LOST");
        continue;
      }
      this.setState("HEALTHY");
      this.lastError = null;
      return;
    }
  }

  /** External signal that the socket dropped: stale everything, reconnect. */
  async handleConnectionLost(reason = "CONNECTION_LOST"): Promise<void> {
    if (this.isStopped()) return;
    this.invalidate(reason);
    this.reconnectCount += 1;
    if (this.looping) return;
    this.looping = true;
    this.setState("BACKOFF");
    await this.sleep(this.delayForAttempt(0));
    if (!this.isStopped()) await this.runOnce();
    this.looping = false;
  }

  private scheduleHeartbeat(): void {
    if (this.heartbeatScheduled || this.stopped) return;
    this.heartbeatScheduled = true;
    this.heartbeatTimer = setInterval(() => {
      void (async () => {
        if (this.state !== "HEALTHY" || this.stopped) return;
        let alive: boolean;
        try {
          alive = await this.hooks.heartbeat();
        } catch {
          alive = false;
        }
        if (!alive) {
          this.setState("DEGRADED");
          await this.handleConnectionLost("CONNECTION_LOST");
        }
      })();
    }, this.hooks.heartbeatMs);
    this.heartbeatTimer.unref();
  }

  stop(): Promise<void> {
    this.stopped = true;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.setState("STOPPED");
    return Promise.resolve();
  }
}
