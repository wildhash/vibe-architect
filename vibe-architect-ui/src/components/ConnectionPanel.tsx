import React, { useState } from "react";
import { getMockToken, getMockUrl } from "../lib/mockToken";

interface ConnectionPanelProps {
  onConnect: (url: string, token: string) => void;
  isConnecting: boolean;
  error?: string;
}

export function ConnectionPanel({ onConnect, isConnecting, error }: ConnectionPanelProps) {
  const [url, setUrl] = useState(getMockUrl());
  const [token, setToken] = useState(getMockToken());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && token.trim()) {
      onConnect(url.trim(), token.trim());
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
