/**
 * SecretStore boundary (DT-WP-01 Phase E).
 *
 * Canonical interface plus an in-memory/test adapter. A Windows Credential
 * Manager (or OS-keychain) production adapter is intentionally deferred:
 * adding a native dependency now would add fragility to the bootstrap with
 * no trading path to protect yet. The production boundary is defined below
 * and its integration belongs in its governed module (see evidence).
 */
import type { UserId } from "@deriv-trader/domain";

export interface SecretRef {
  readonly userId: UserId;
  readonly key: string;
}

export interface SecretStore {
  getSecret(ref: SecretRef): Promise<string | null>;
  setSecret(ref: SecretRef, value: string): Promise<void>;
  deleteSecret(ref: SecretRef): Promise<void>;
}

/** Production adapter boundary (deferred native implementation). */
export interface OsCredentialStoreOptions {
  readonly serviceName: string;
}

export type OsCredentialStoreFactory = (
  options: OsCredentialStoreOptions,
) => SecretStore;

export class InMemorySecretStore implements SecretStore {
  private readonly data = new Map<string, string>();

  private mapKey(ref: SecretRef): string {
    return `${ref.userId as string}::${ref.key}`;
  }

  async getSecret(ref: SecretRef): Promise<string | null> {
    await Promise.resolve();
    return this.data.get(this.mapKey(ref)) ?? null;
  }

  async setSecret(ref: SecretRef, value: string): Promise<void> {
    await Promise.resolve();
    if (!value) throw new Error("refusing to store empty secret");
    this.data.set(this.mapKey(ref), value);
  }

  async deleteSecret(ref: SecretRef): Promise<void> {
    await Promise.resolve();
    this.data.delete(this.mapKey(ref));
  }
}
