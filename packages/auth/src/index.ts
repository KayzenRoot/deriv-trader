/**
 * Auth boundary (DT-WP-01 Phase E).
 * Supabase Auth abstractions + typed contracts. No real Supabase project
 * is required to run tests/build; the client factory returns null when
 * credentials are absent so local foundation stays offline-safe.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { UserId } from "@deriv-trader/domain";

export type UserRole = "USER" | "ADMIN";

export interface AuthUser {
  readonly id: UserId;
  readonly email: string | null;
  readonly role: UserRole;
}

export interface AuthSession {
  readonly user: AuthUser;
  readonly accessToken: string;
  readonly expiresAt: string | null;
}

export interface AuthClientOptions {
  readonly url: string;
  readonly anonKey: string;
}

export function isAuthConfigured(options: Partial<AuthClientOptions>): options is AuthClientOptions {
  return Boolean(options.url) && Boolean(options.anonKey);
}

/**
 * Create a Supabase Auth client, or null when running without credentials
 * (local build/test/CI). Never throws for missing config.
 */
export function createAuthClient(
  options: Partial<AuthClientOptions>,
): SupabaseClient | null {
  if (!isAuthConfigured(options)) return null;
  return createClient(options.url, options.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function toAuthUser(id: string, email: string | null, role: UserRole = "USER"): AuthUser {
  return { id: id as UserId, email, role };
}
