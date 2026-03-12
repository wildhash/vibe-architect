"""
tools.py — Callable tools for the Vibe Architect agent.

These functions are registered with the Gemini model as function-calling tools
and are also invoked directly by the autonomous monitoring loop.
"""

from __future__ import annotations

import json
import logging
import random
import time
from typing import Any

logger = logging.getLogger("vibe_architect.tools")

# ---------------------------------------------------------------------------
# Tool: analyze_crowd_energy
# ---------------------------------------------------------------------------

_MOVEMENT_LABELS = [
    "idle",
    "swaying",
    "bouncing",
    "hands_up",
    "jumping",
    "surge",
]


def analyze_crowd_energy() -> dict[str, Any]:
    """
    Estimate crowd energy from the latest video frame context.

    In production this would receive a JPEG frame and call a vision model.
    For the hackathon demo, returns a plausible simulated reading that
    can be overridden by real Gemini vision output.

    Returns:
        {
            "energy": 1-10,
            "movement": str,
            "confidence": 0.0-1.0,
            "summary": str
        }
    """
    energy = random.randint(4, 9)
    movement = random.choice(_MOVEMENT_LABELS)
    confidence = round(random.uniform(0.6, 0.95), 2)
    summary = f"Crowd at energy {energy}/10, movement: {movement}."
    result = {
        "energy": energy,
        "movement": movement,
        "confidence": confidence,
        "summary": summary,
    }
    logger.info("analyze_crowd_energy → %s", result)
    return result


# ---------------------------------------------------------------------------
# Tool: suggest_next_track
# ---------------------------------------------------------------------------

_TRACK_POOL = [
    {"title": "Acid Rain", "artist": "Objekt", "bpm": 134, "key": "Dm"},
    {"title": "Can You Feel It", "artist": "Fingers Inc.", "bpm": 122, "key": "Am"},
    {"title": "Strings of Life", "artist": "Rhythim Is Rhythim", "bpm": 127, "key": "Fm"},
    {"title": "Pacific State", "artist": "808 State", "bpm": 119, "key": "Bm"},
    {"title": "Voodoo Ray", "artist": "A Guy Called Gerald", "bpm": 126, "key": "Em"},
    {"title": "The Bells", "artist": "Jeff Mills", "bpm": 148, "key": "Am"},
    {"title": "Spastik", "artist": "Plastikman", "bpm": 130, "key": "Gm"},
    {"title": "Sandstorm", "artist": "Darude", "bpm": 136, "key": "Bm"},
    {"title": "Music Sounds Better With You", "artist": "Stardust", "bpm": 124, "key": "F#m"},
    {"title": "Insomnia", "artist": "Faithless", "bpm": 138, "key": "Dm"},
]

_MOOD_TRANSITIONS = {
    "escalate": "Build into this — ride the bass, delay the drop.",
    "reset": "Drop the energy briefly; use the intro breakdown to breathe.",
    "surprise": "Hard cut or backspin into this for maximum effect.",
    "maintain": "Smooth blend — beatmatch tightly, swap on the 32.",
}


def suggest_next_track(
    current_bpm: int,
    current_key: str,
    mood_shift: str,
) -> dict[str, Any]:
    """
    Recommend the next track based on BPM, harmonic key, and desired mood shift.

    Args:
        current_bpm: Current playing BPM.
        current_key: Current track key (e.g. "Am", "Fm").
        mood_shift: One of escalate | reset | surprise | maintain.

    Returns:
        {
            "title": str,
            "artist": str,
            "bpm": int,
            "key": str,
            "transition_notes": str,
            "confidence": float
        }
    """
    # Pick a track reasonably close in BPM
    candidates = [t for t in _TRACK_POOL if abs(t["bpm"] - current_bpm) <= 16]
    if not candidates:
        candidates = _TRACK_POOL

    track = random.choice(candidates)
    notes = _MOOD_TRANSITIONS.get(mood_shift, "Smooth blend.")
    confidence = round(random.uniform(0.70, 0.92), 2)

    result = {
        "title": track["title"],
        "artist": track["artist"],
        "bpm": track["bpm"],
        "key": track["key"],
        "transition_notes": notes,
        "confidence": confidence,
    }
    logger.info("suggest_next_track(%d, %s, %s) → %s", current_bpm, current_key, mood_shift, result)
    return result


# ---------------------------------------------------------------------------
# Tool: trigger_visuals
# ---------------------------------------------------------------------------


def trigger_visuals(
    color_hex: str,
    strobe_intensity: int,
    pattern: str,
    reason: str = "",
) -> dict[str, Any]:
    """
    Emit a visual control payload to the DMX / projection system.

    In production this would POST to a venue webhook or OSC endpoint.
    For the demo, we log the structured payload and return it for UI relay.

    Args:
        color_hex: Primary colour in #RRGGBB format.
        strobe_intensity: 0 (off) → 10 (full strobe).
        pattern: Pattern name e.g. "pulse", "sweep", "flash", "spiral".
        reason: Why the trigger was fired (included in log for debugging).

    Returns:
        { "ok": True, "payload": { ... }, "ts": float }
    """
    strobe_intensity = max(0, min(10, strobe_intensity))
    payload = {
        "color_hex": color_hex,
        "strobe_intensity": strobe_intensity,
        "pattern": pattern,
        "reason": reason,
        "ts": time.time(),
    }
    logger.info("trigger_visuals → %s", json.dumps(payload))
    return {"ok": True, "payload": payload, "ts": payload["ts"]}


# ---------------------------------------------------------------------------
# Tool: detect_drop_or_transition
# ---------------------------------------------------------------------------

_DROP_EVENTS = ["drop", "build", "transition", "steady", "breakdown"]


def detect_drop_or_transition(audio_summary: str) -> dict[str, Any]:
    """
    Infer whether the current audio represents a drop, build, transition, etc.

    In production, audio_summary is a short text description from Gemini's
    audio analysis. This function augments or overrides that with local logic.

    Args:
        audio_summary: Brief text description of the current audio state.

    Returns:
        { "event": str, "confidence": float, "reason": str }
    """
    summary_lower = audio_summary.lower()

    if any(w in summary_lower for w in ("drop", "kick", "bass hit", "impact")):
        event, confidence = "drop", round(random.uniform(0.75, 0.95), 2)
        reason = "Heavy low-end transients detected."
    elif any(w in summary_lower for w in ("build", "riser", "sweep", "filter")):
        event, confidence = "build", round(random.uniform(0.70, 0.90), 2)
        reason = "Rising frequency content / filter sweep detected."
    elif any(w in summary_lower for w in ("breakdown", "sparse", "break", "silence")):
        event, confidence = "breakdown", round(random.uniform(0.65, 0.85), 2)
        reason = "Reduced density / breakdown pattern."
    elif any(w in summary_lower for w in ("transition", "mix", "crossfade")):
        event, confidence = "transition", round(random.uniform(0.70, 0.88), 2)
        reason = "Two tracks overlapping in mix."
    else:
        event, confidence = "steady", round(random.uniform(0.55, 0.80), 2)
        reason = "No strong signature detected."

    result = {"event": event, "confidence": confidence, "reason": reason}
    logger.info("detect_drop_or_transition(%r) → %s", audio_summary[:60], result)
    return result


# ---------------------------------------------------------------------------
# Tool: set_set_strategy
# ---------------------------------------------------------------------------

_STRATEGY_MAP = {
    "high_energy": {"strategy": "escalate", "notes": "Keep intensity, tighten transitions, use syncopation."},
    "low_energy": {"strategy": "reset", "notes": "Drop to a groove-setter, rebuild from roots."},
    "peak": {"strategy": "maintain", "notes": "You're at the peak — hold pressure, avoid over-building."},
    "surprise": {"strategy": "surprise", "notes": "Unexpected left-turn. Drop something totally different."},
    "warmup": {"strategy": "maintain", "notes": "Early crowd — keep it warm, don't push too hard yet."},
    "closing": {"strategy": "reset", "notes": "Wind it down gracefully; respect the ending."},
}


def set_set_strategy(target_state: str) -> dict[str, Any]:
    """
    Set the overall strategic direction of the set.

    Args:
        target_state: One of high_energy | low_energy | peak | surprise | warmup | closing.

    Returns:
        { "strategy": str, "notes": str }
    """
    result = _STRATEGY_MAP.get(
        target_state,
        {"strategy": "maintain", "notes": "Hold course — no strong signal yet."},
    )
    logger.info("set_set_strategy(%r) → %s", target_state, result)
    return result


# ---------------------------------------------------------------------------
# Tool registry — maps name → callable for dynamic dispatch from Gemini
# ---------------------------------------------------------------------------

TOOL_REGISTRY: dict[str, Any] = {
    "analyze_crowd_energy": analyze_crowd_energy,
    "suggest_next_track": suggest_next_track,
    "trigger_visuals": trigger_visuals,
    "detect_drop_or_transition": detect_drop_or_transition,
    "set_set_strategy": set_set_strategy,
}


def dispatch_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    """
    Dispatch a tool call by name with the provided arguments.
    Returns the tool result or an error dict.
    """
    fn = TOOL_REGISTRY.get(name)
    if fn is None:
        logger.warning("Unknown tool requested: %s", name)
        return {"error": f"Unknown tool: {name}"}
    try:
        return fn(**args)
    except Exception as exc:
        logger.exception("Tool %s raised: %s", name, exc)
        return {"error": str(exc)}
