import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getMockToken, getMockUrl } from "../lib/mockToken";

const MISSING_SELECTION_ERROR =
  "Selected audio input is no longer available; reverted to default input.";

interface ConnectionPanelProps {
  onConnect: (url: string, token: string, audioDeviceId?: string) => void;
  isConnecting: boolean;
  error?: string;
}

export function ConnectionPanel({ onConnect, isConnecting, error }: ConnectionPanelProps) {
  const [url, setUrl] = useState(getMockUrl());
  const [token, setToken] = useState(getMockToken());

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDeviceId, setAudioDeviceId] = useState("");
  const [deviceError, setDeviceError] = useState("");
  const [hasEnumeratedDevices, setHasEnumeratedDevices] = useState(false);

  const refreshAudioDevices = useCallback(async () => {
    setDeviceError("");

    if (!navigator.mediaDevices?.enumerateDevices) {
      setDeviceError("Audio device selection is not supported in this browser.");
      setHasEnumeratedDevices(true);
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      setAudioDevices(audioInputs);
    } catch (err) {
      setDeviceError(err instanceof Error ? err.message : "Failed to list audio devices.");
    } finally {
      setHasEnumeratedDevices(true);
    }
  }, []);

  useEffect(() => {
    if (!hasEnumeratedDevices) return;
    if (!audioDeviceId) return;
    if (!audioDevices.some((d) => d.deviceId === audioDeviceId)) {
      setAudioDeviceId("");
      setDeviceError(MISSING_SELECTION_ERROR);
    }
  }, [audioDeviceId, audioDevices, hasEnumeratedDevices]);

  const hasDeviceLabels = useMemo(() => {
    if (audioDevices.length === 0) return true;
    return audioDevices.some((d) => Boolean(d.label));
  }, [audioDevices]);

  const requestMicPermissionForLabels = useCallback(async () => {
    setDeviceError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setDeviceError("Microphone access is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      for (const track of stream.getTracks()) track.stop();
      await refreshAudioDevices();
    } catch (err) {
      setDeviceError(err instanceof Error ? err.message : "Microphone permission denied.");
    }
  }, [refreshAudioDevices]);

  useEffect(() => {
    if (!navigator.mediaDevices) return;

    void refreshAudioDevices();

    const handler = () => {
      void refreshAudioDevices();
    };

    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, [refreshAudioDevices]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && token.trim()) {
      onConnect(url.trim(), token.trim(), audioDeviceId || undefined);
    }
  };

  return (
    <div className="connection-screen">
      <form className="connection-panel" onSubmit={handleSubmit}>
        <div>
          <h1>Vibe Architect</h1>
          <p>Autonomous DJ copilot — multimodal realtime AI</p>
        </div>

        <div className="field">
          <label htmlFor="lk-url">LiveKit WebSocket URL</label>
          <input
            id="lk-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="wss://your-livekit-host"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="lk-token">Auth Token</label>
          <input
            id="lk-token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIs…"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="lk-audio-device">Audio Input Device</label>
          <select
            id="lk-audio-device"
            value={audioDeviceId}
            onChange={(e) => {
              if (deviceError === MISSING_SELECTION_ERROR) setDeviceError("");
              setAudioDeviceId(e.target.value);
            }}
            disabled={isConnecting}
          >
            <option value="">Default input</option>
            {audioDevices.map((d, idx) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Audio input ${idx + 1}`}
              </option>
            ))}
          </select>

          {audioDevices.length === 0 ? (
            <div className="help-text">
              No audio inputs detected. If you are routing a DJ master output, make sure your
              virtual cable or USB audio interface is installed and connected.
            </div>
          ) : (
            <div className="help-text">
              Select your virtual cable or line-in (e.g., BlackHole 2ch, CABLE Output, USB
              interface) for clean BPM/drop analysis.
            </div>
          )}

          {!hasDeviceLabels && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void requestMicPermissionForLabels()}
              disabled={isConnecting}
            >
              Allow mic access to show device names
            </button>
          )}
        </div>

        {deviceError && <div className="error-msg">{deviceError}</div>}
        {error && <div className="error-msg">{error}</div>}

        <button
          type="submit"
          className="btn-connect"
          disabled={isConnecting || !url.trim() || !token.trim()}
        >
          {isConnecting ? "Connecting…" : "Enter Booth"}
        </button>
      </form>
    </div>
  );
}
