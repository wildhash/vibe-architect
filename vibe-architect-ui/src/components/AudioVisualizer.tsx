import { useEffect, useRef } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";

const BAR_COUNT = 40;
const BAR_WIDTH = 4;
const BAR_GAP = 3;

export function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    const pub = localParticipant?.getTrackPublication(Track.Source.Microphone);
    const mediaStreamTrack = pub?.track?.mediaStreamTrack;

    if (!mediaStreamTrack) return;

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    const source = ctx.createMediaStreamSource(
      new MediaStream([mediaStreamTrack])
    );
    source.connect(analyser);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      source.disconnect();
      ctx.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [localParticipant]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      const ctx2d = canvas.getContext("2d")!;
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      ctx2d.scale(dpr, dpr);

      const analyser = analyserRef.current;
      if (!analyser) {
        // Animate a fake idle pattern when not connected
        const now = Date.now() / 1000;
        for (let i = 0; i < BAR_COUNT; i++) {
          const x = i * (BAR_WIDTH + BAR_GAP);
          const amp = (Math.sin(now * 2 + i * 0.4) * 0.5 + 0.5) * 0.2;
          const barH = amp * h;
          ctx2d.fillStyle = "rgba(0,255,204,0.3)";
          ctx2d.fillRect(x, h - barH, BAR_WIDTH, barH);
        }
        ctx2d.resetTransform();
        return;
      }

      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);

      const step = Math.floor(data.length / BAR_COUNT);
      for (let i = 0; i < BAR_COUNT; i++) {
        const val = data[i * step] / 255;
        const barH = val * h;
        const x = i * (BAR_WIDTH + BAR_GAP);
        const hue = val > 0.7 ? "#ff00ff" : "#00ffcc";
        ctx2d.fillStyle = hue;
        ctx2d.globalAlpha = 0.85;
        ctx2d.fillRect(x, h - barH, BAR_WIDTH, barH);
      }
      ctx2d.globalAlpha = 1;
      ctx2d.resetTransform();
    };

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return (
    <div className="audio-visualizer">
      <canvas ref={canvasRef} className="visualizer-canvas" />
    </div>
  );
}
