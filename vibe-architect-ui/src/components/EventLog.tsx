import { useEffect, useRef } from "react";
import { VibeEvent } from "../lib/types";

interface EventLogProps {
  events: VibeEvent[];
}

function formatPayload(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "energy":
      return `Energy ${payload.energy}/10 · ${payload.movement} · ${payload.summary}`;
    case "recommendation":
      return `→ ${payload.title} by ${payload.artist} · ${payload.bpm} BPM · ${payload.key} · ${payload.transition_notes}`;
    case "visual_trigger":
      return `Visuals: ${payload.color_hex} · Strobe ${payload.strobe_intensity} · ${payload.pattern} · ${payload.reason}`;
    case "phase_change":
      return `Phase: ${String(payload.phase).toUpperCase()} · avg ${payload.avg_energy} · ${payload.movement}`;
    case "warning":
      return String(payload.message ?? JSON.stringify(payload));
    case "status":
      return String(payload.message ?? JSON.stringify(payload));
    default:
      return JSON.stringify(payload);
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso.slice(11, 19);
  }
}

export function EventLog({ events }: EventLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div className="panel event-log">
      <span className="panel-title">Event Log</span>

      <div className="event-log-list">
        {events.length === 0 && (
          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
            Waiting for events…
          </span>
        )}
        {events.map((evt, idx) => (
          <div key={idx} className={`event-item ${evt.type}`}>
            <span className="event-type">{evt.type}</span>
            <span className="event-text">{formatPayload(evt.type, evt.payload)}</span>
            <span className="event-ts">{formatTime(evt.ts)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
