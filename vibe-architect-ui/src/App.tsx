import { useState, useCallback, useEffect } from "react";
import {
  LiveKitRoom,
  useRoomContext,
  useDataChannel,
} from "@livekit/components-react";
import { RoomEvent, ConnectionState, MediaDeviceFailure } from "livekit-client";

import { ConnectionPanel } from "./components/ConnectionPanel";
import { StatusBar } from "./components/StatusBar";
import { CrowdCam } from "./components/CrowdCam";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { EventLog } from "./components/EventLog";
import { ControlStrip } from "./components/ControlStrip";

import {
  AppConnectionState,
  ControlState,
  EnergyPayload,
  PhasePayload,
  RecommendationPayload,
  VibeEvent,
  VisualTriggerPayload,
} from "./lib/types";

import "./styles.css";

const MAX_LOG_EVENTS = 120;

// ---------------------------------------------------------------------------
// Inner component — rendered inside LiveKitRoom so hooks work
// ---------------------------------------------------------------------------

function BoothInterface({
  controls,
  onToggleControl,
  onDisconnect,
}: {
  controls: ControlState;
  onToggleControl: (key: keyof ControlState) => void;
  onDisconnect: () => void;
}) {
  const room = useRoomContext();

  const [connectionState, setConnectionState] = useState<AppConnectionState>("connecting");
  const [events, setEvents] = useState<VibeEvent[]>([]);
  const [energy, setEnergy] = useState(5);
  const [movement, setMovement] = useState("idle");
  const [phase, setPhase] = useState("warmup");
  const [currentBpm, _setCurrentBpm] = useState(128);
  const [currentKey, _setCurrentKey] = useState("Am");
  const [lastRec, setLastRec] = useState<RecommendationPayload | null>(null);
  const [lastVisual, setLastVisual] = useState<VisualTriggerPayload | null>(null);

  // Map LiveKit ConnectionState to app state
  useEffect(() => {
    const syncState = () => {
      const s = room.state;
      if (s === ConnectionState.Connected) setConnectionState("connected");
      else if (s === ConnectionState.Connecting || s === ConnectionState.Reconnecting)
        setConnectionState(s === ConnectionState.Reconnecting ? "reconnecting" : "connecting");
      else setConnectionState("disconnected");
    };
    syncState();
    room.on(RoomEvent.ConnectionStateChanged, syncState);
    return () => { room.off(RoomEvent.ConnectionStateChanged, syncState); };
  }, [room]);

  // Data channel — receives structured events from agent (topic "" matches all)
  useDataChannel("vibe-events", (msg) => {
    try {
      const evt: VibeEvent = JSON.parse(
        new TextDecoder().decode(msg.payload)
      );

      setEvents((prev) => {
        const updated = [...prev, evt];
        return updated.length > MAX_LOG_EVENTS ? updated.slice(-MAX_LOG_EVENTS) : updated;
      });

      if (evt.type === "energy") {
        const p = evt.payload as unknown as EnergyPayload;
        setEnergy(p.energy);
        setMovement(p.movement);
      } else if (evt.type === "phase_change") {
        const p = evt.payload as unknown as PhasePayload;
        setPhase(p.phase);
      } else if (evt.type === "recommendation") {
        setLastRec(evt.payload as unknown as RecommendationPayload);
      } else if (evt.type === "visual_trigger") {
        setLastVisual(evt.payload as unknown as VisualTriggerPayload);
      }
    } catch {
      // Ignore malformed messages
    }
  });

  // Send control state changes back to agent
  useEffect(() => {
    if (room.state !== ConnectionState.Connected) return;
    const msg = JSON.stringify({
      type: "set_autonomous",
      value: controls.autonomousMode,
    });
    room.localParticipant
      .publishData(new TextEncoder().encode(msg), { reliable: true })
      .catch(() => {});
  }, [controls.autonomousMode, room]);

  return (
    <div className="app-layout">
      <StatusBar
        connectionState={connectionState}
        currentBpm={currentBpm}
        currentKey={currentKey}
        phase={phase}
        onDisconnect={onDisconnect}
      />

      <div className="main-content">
        {/* Left: Crowd Cam */}
        <CrowdCam energy={energy} movement={movement} />

        {/* Center: Phase + Visualizer + Recommendation */}
        <div className="panel center-panel">
          <div className="phase-display">
            <span className="phase-label">Performance Phase</span>
            <span className={`phase-value ${phase}`}>{phase}</span>
          </div>

          <AudioVisualizer />

          {lastRec && (
            <div className="recommendation-card">
              <span className="panel-title">Next Track</span>
              <span className="rec-title">{lastRec.title}</span>
              <div className="rec-meta">
                <span>{lastRec.artist}</span>
                <span><span>{lastRec.bpm}</span> BPM</span>
                <span>Key <span>{lastRec.key}</span></span>
              </div>
              <span className="rec-notes">{lastRec.transition_notes}</span>
            </div>
          )}

          {lastVisual && (
            <div className="visual-trigger-card">
              <div
                className="vis-swatch"
                style={{ background: lastVisual.color_hex }}
              />
              <div className="vis-info">
                <span className="vis-pattern">{lastVisual.pattern}</span>
                <span className="vis-details">
                  Strobe {lastVisual.strobe_intensity}/10 · {lastVisual.reason}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Event Log */}
        <EventLog events={events} />
      </div>

      <ControlStrip
        controls={controls}
        onToggle={onToggleControl}
        onDisconnect={onDisconnect}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App component
// ---------------------------------------------------------------------------

export default function App() {
  const [livekitUrl, setLivekitUrl] = useState("");
  const [token, setToken] = useState("");
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>(undefined);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [connected, setConnected] = useState(false);

  const [controls, setControls] = useState<ControlState>({
    autonomousMode: true,
    voiceFeedback: true,
    visualTriggers: true,
    suggestOnly: false,
  });

  const handleConnect = useCallback((url: string, tok: string, selectedAudioDeviceId?: string) => {
    setConnectionError("");
    setIsConnecting(true);
    setLivekitUrl(url);
    setToken(tok);
    setAudioDeviceId(selectedAudioDeviceId);
    setConnected(true);
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnected(false);
    setToken("");
    setLivekitUrl("");
    setIsConnecting(false);
    setConnectionError("");
  }, []);

  const handleToggle = useCallback((key: keyof ControlState) => {
    setControls((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (!connected) {
    return (
      <ConnectionPanel
        onConnect={handleConnect}
        isConnecting={isConnecting}
        error={connectionError}
      />
    );
  }

  return (
    <LiveKitRoom
      serverUrl={livekitUrl}
      token={token}
      connect={true}
      audio={{
        deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: { ideal: 2 },
      }}
      video={true}
      onDisconnected={handleDisconnect}
      onError={(err) => {
        setConnectionError(err.message);
        setConnected(false);
        setIsConnecting(false);
      }}
      onMediaDeviceFailure={(failure, kind) => {
        if (!failure) return;
        const msg =
          failure === MediaDeviceFailure.PermissionDenied
            ? "Permission denied."
            : failure === MediaDeviceFailure.NotFound
              ? "Device not found."
              : failure === MediaDeviceFailure.DeviceInUse
                ? "Device is already in use."
                : String(failure);

        setConnectionError(`Media device failure (${kind ?? "unknown"}): ${msg}`);

        const shouldClearAudioSelection =
          kind === "audioinput" &&
          (failure === MediaDeviceFailure.NotFound ||
            failure === MediaDeviceFailure.DeviceInUse);
        if (shouldClearAudioSelection) setAudioDeviceId(undefined);
        setConnected(false);
        setIsConnecting(false);
      }}
      onConnected={() => setIsConnecting(false)}
    >
      <BoothInterface
        controls={controls}
        onToggleControl={handleToggle}
        onDisconnect={handleDisconnect}
      />
    </LiveKitRoom>
  );
}
