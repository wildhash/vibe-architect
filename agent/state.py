"""
state.py — Lightweight typed state management for the Vibe Architect agent session.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class VisualTrigger:
    color_hex: str
    strobe_intensity: int
    pattern: str
    reason: str
    ts: float = field(default_factory=time.time)


@dataclass
class Recommendation:
    title: str
    artist: str
    bpm: int
    key: str
    transition_notes: str
    confidence: float
    ts: float = field(default_factory=time.time)


@dataclass
class AgentState:
    # Room / session identity
    room_id: str = ""
    session_id: str = ""

    # Current mix context
    current_bpm: int = 128
    current_key: str = "Am"

    # Rolling energy window (last N energy readings)
    energy_window: list[int] = field(default_factory=list)
    energy_window_size: int = 10

    # Current crowd assessment
    current_energy: int = 5
    current_movement: str = "idle"

    # Performance phase inference
    # warmup | groove | build | drop | plateau | recovery | transition
    performance_phase: str = "warmup"

    # Desired next action
    # hold | push_energy | reset_groove | tease_drop | transition_track | trigger_visuals
    desired_action: str = "hold"

    # Last visual trigger sent to UI
    last_visual: Optional[VisualTrigger] = None

    # Last track recommendation emitted
    last_recommendation: Optional[Recommendation] = None

    # Autonomous mode toggle (overridable from UI)
    autonomous_mode: bool = True

    # Timestamps
    session_start: float = field(default_factory=time.time)
    last_energy_update: float = field(default_factory=time.time)
    last_visual_trigger: float = 0.0
    last_recommendation_ts: float = 0.0

    def update_energy(self, energy: int) -> None:
        """Append a new energy reading and maintain the rolling window."""
        self.energy_window.append(energy)
        if len(self.energy_window) > self.energy_window_size:
            self.energy_window = self.energy_window[-self.energy_window_size :]
        self.current_energy = energy
        self.last_energy_update = time.time()

    def rolling_avg_energy(self) -> float:
        """Return the rolling average energy over the window."""
        if not self.energy_window:
            return 5.0
        return sum(self.energy_window) / len(self.energy_window)

    def can_trigger_visuals(self, cooldown_seconds: float = 8.0) -> bool:
        """Prevent over-triggering visuals by enforcing a cooldown."""
        return (time.time() - self.last_visual_trigger) >= cooldown_seconds

    def can_emit_recommendation(self, cooldown_seconds: float = 20.0) -> bool:
        """Prevent spam recommendations."""
        return (time.time() - self.last_recommendation_ts) >= cooldown_seconds

    def record_visual_trigger(self, trigger: VisualTrigger) -> None:
        self.last_visual = trigger
        self.last_visual_trigger = time.time()

    def record_recommendation(self, rec: Recommendation) -> None:
        self.last_recommendation = rec
        self.last_recommendation_ts = time.time()
