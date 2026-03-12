import { AppConnectionState } from "../lib/types";

interface StatusBarProps {
  connectionState: AppConnectionState;
  currentBpm: number;
  currentKey: string;
  phase: string;
  onDisconnect?: () => void;
}

const STATE_LABELS: Record<AppConnectionState, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting",
  connected: "Live",
  reconnecting: "Reconnecting",
  error: "Error",
};

export function StatusBar({
  connectionState,
  currentBpm,
  currentKey,
  phase,
  onDisconnect,
}: StatusBarProps) {
  return (
    <div className="status-bar">
      <span className="brand">Vibe Architect</span>

      <div className={`status-dot ${connectionState}`} />
      <span className="status-label">{STATE_LABELS[connectionState]}</span>

      {connectionState === "connected" && (
        <>
          <div className="status-metric">
            BPM <span>{currentBpm}</span>
          </div>
          <div className="status-metric">
            Key <span>{currentKey}</span>
          </div>
          <div className="status-metric">
            Phase <span>{phase.toUpperCase()}</span>
          </div>
        </>
      )}

      <div className="spacer" />

      {connectionState === "connected" && onDisconnect && (
        <button className="disconnect-btn" onClick={onDisconnect}>
          Leave
        </button>
      )}
    </div>
  );
}
