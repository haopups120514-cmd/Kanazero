"use client";
import { usePomodoro } from "@/hooks/usePomodoro";
import { useSettings } from "@/hooks/useSettings";
import { Play, Pause, RotateCcw } from "lucide-react";

export function PomodoroBar() {
  const { settings } = useSettings();
  const { display, status, progress, start, pause, resume, reset } =
    usePomodoro(settings.pomodoroMinutes);

  return (
    <div className="fixed top-3 right-4 flex items-center gap-2 z-40">
      {/* Progress arc (simple bar) */}
      <div className="relative w-28 h-1.5 bg-surface rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-accent rounded-full transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <span
        className={`font-mono text-sm tabular-nums ${
          status === "done" ? "text-error" : "text-muted"
        }`}
      >
        {display}
      </span>

      {status === "idle" && (
        <button onClick={start} className="text-muted hover:text-accent transition-colors" title="开始番茄">
          <Play size={14} />
        </button>
      )}
      {status === "running" && (
        <button onClick={pause} className="text-muted hover:text-accent transition-colors" title="暂停">
          <Pause size={14} />
        </button>
      )}
      {status === "paused" && (
        <button onClick={resume} className="text-muted hover:text-accent transition-colors" title="继续">
          <Play size={14} />
        </button>
      )}
      {(status === "done" || status === "paused") && (
        <button onClick={reset} className="text-muted hover:text-error transition-colors" title="重置">
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  );
}
