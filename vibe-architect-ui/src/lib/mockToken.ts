/**
 * mockToken.ts — Generate a mock/dev LiveKit token for local development.
 *
 * In production, tokens are generated server-side via the LiveKit server SDK.
 * This file provides a fallback token from env vars for local dev convenience.
 *
 * VITE_LIVEKIT_TOKEN  — pre-generated token (set in .env.local)
 */

export function getMockToken(): string {
  return import.meta.env.VITE_LIVEKIT_TOKEN ?? "";
}

export function getMockUrl(): string {
  return import.meta.env.VITE_LIVEKIT_URL ?? "ws://localhost:7880";
}
