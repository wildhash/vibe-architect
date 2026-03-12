/** Shared TypeScript types for Vibe Architect UI */

// ---------------------------------------------------------------------------
// LiveKit event schema (mirrors backend make_event output)
// ---------------------------------------------------------------------------

export type EventType =
  | "status"
  | "energy"
  | "recommendation"
  | "visual_trigger"
  | "phase_change"
  | "warning";

export interface VibeEvent {
  type: EventType;
  ts: string; // ISO 8601
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Crowd energy
// ---------------------------------------------------------------------------

export interface EnergyPayload {
  energy: number; // 1-10
  movement: string; // idle | swaying | bouncing | hands_up | jumping | surge
  confidence: number; // 0-1
  summary: string;
}

// ---------------------------------------------------------------------------
// Performance phase
// ---------------------------------------------------------------------------

export type PerformancePhase =
  | "warmup"
  | "groove"
  | "build"
  | "drop"
  | "plateau"
  | "recovery"
  | "transition";

export interface PhasePayload {
  phase: PerformancePhase;
  avg_energy: number;
  movement: string;
}

// ---------------------------------------------------------------------------
// Track recommendation
// ---------------------------------------------------------------------------

export interface RecommendationPayload {
  title: string;
  artist: string;
  bpm: number;
  key: string;
  transition_notes: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Visual trigger
// ---------------------------------------------------------------------------

export interface VisualTriggerPayload {
  color_hex: string;
  strobe_intensity: number; // 0-10
  pattern: string;
  reason: string;
  ts: number;
}

// ---------------------------------------------------------------------------
// UI control state
// ---------------------------------------------------------------------------

export interface ControlState {
  autonomousMode: boolean;
  voiceFeedback: boolean;
  visualTriggers: boolean;
  suggestOnly: boolean;
}

// ---------------------------------------------------------------------------
// Connection state (superset of LiveKit ConnectionState)
// ---------------------------------------------------------------------------

export type AppConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";
