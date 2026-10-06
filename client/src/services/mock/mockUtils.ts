import { ApiError } from '../http/apiClient';

/** Helpers for mock adapters ONLY. Never import from UI code. */

export function delay(ms = 250 + Math.random() * 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function mockError(status: number, code: string, message: string, fieldErrors?: Record<string, string>): ApiError {
  return new ApiError({ status, code, message, fieldErrors });
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** Deterministic PRNG for reproducible seed data. */
export function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
