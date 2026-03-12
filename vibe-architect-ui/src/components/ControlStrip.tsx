import { ControlState } from "../lib/types";
import {
  Bot,
  Volume2,
  VolumeX,
  Zap,
  ZapOff,
  Eye,
  EyeOff,
} from "lucide-react";
import clsx from "clsx";

interface ControlStripProps {
  controls: ControlState;
  onToggle: (key: keyof ControlState) => void;
  onDisconnect: () => void;
}

export function ControlStrip({ controls, onToggle, onDisconnect }: ControlStripProps) {
  return (
    <div className="control-strip">
      <button
        className={clsx("control-btn", controls.autonomousMode && "active")}
        onClick={() => onToggle("autonomousMode")}
        title="Toggle autonomous mode"
      >
        <Bot size={13} />
        {controls.autonomousMode ? "Auto ON" : "Auto OFF"}
      </button>

      <button
        className={clsx("control-btn", controls.voiceFeedback && "active")}
        onClick={() => onToggle("voiceFeedback")}
        title="Toggle voice feedback"
      >
        {controls.voiceFeedback ? <Volume2 size={13} /> : <VolumeX size={13} />}
        Voice
      </button>

      <button
        className={clsx("control-btn", controls.visualTriggers && "active")}
        onClick={() => onToggle("visualTriggers")}
        title="Toggle visual triggers"
      >
        {controls.visualTriggers ? <Zap size={13} /> : <ZapOff size={13} />}
        Visuals
      </button>

      <button
        className={clsx("control-btn", controls.suggestOnly && "active")}
        onClick={() => onToggle("suggestOnly")}
        title="Suggest-only mode (no auto-actions)"
      >
        {controls.suggestOnly ? <Eye size={13} /> : <EyeOff size={13} />}
        Suggest Only
      </button>

      <div className="spacer" />

      <button className="disconnect-btn" onClick={onDisconnect}>
        Leave Booth
      </button>
    </div>
  );
}
