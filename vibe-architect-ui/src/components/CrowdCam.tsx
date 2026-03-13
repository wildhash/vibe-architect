import { useEffect, useRef } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";

interface CrowdCamProps {
  energy: number;
  movement: string;
}

export function CrowdCam({ energy, movement }: CrowdCamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!localParticipant) return;
    const el = videoRef.current;
    if (!el) return;

    const pub = localParticipant.getTrackPublication(Track.Source.Camera);
    const track = pub?.track;
    if (track) {
      track.attach(el);
      return () => {
        track.detach(el);
      };
    }
  }, [localParticipant]);

  const isHigh = energy >= 7;

  return (
    <div className="panel crowd-cam">
      <div className="cam-header">
        <span className="panel-title">Crowd Cam</span>
      </div>

      <div className="cam-wrapper">
        <video ref={videoRef} autoPlay muted playsInline />
        {!localParticipant && (
          <div className="cam-placeholder">
            <span>No camera feed</span>
          </div>
        )}
        <div className="cam-overlay">
          <span className="cam-badge">LIVE</span>
          <span className="cam-badge">{movement}</span>
        </div>
      </div>

      <div className="energy-meter">
        <div className="energy-label-row">
          <span className="panel-title">Crowd Energy</span>
          <span className="energy-score">{energy}</span>
        </div>
        <div className="energy-bars">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className={`energy-bar${i < energy ? " active" + (isHigh ? " high" : "") : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
