"use client";
import type { SessionStepType } from "@/types";

interface SessionProgressProps {
  steps: SessionStepType[];
  currentIndex: number;
}

const KIND_ICON: Record<string, string> = {
  word: "W",
  expression: "E",
  bjt: "B",
};

const KIND_COLOR: Record<string, string> = {
  word: "#7c85ff",
  expression: "#4ade80",
  bjt: "#fb923c",
};

export function SessionProgress({ steps, currentIndex }: SessionProgressProps) {
  const visible = steps.slice(0, Math.min(steps.length, 30));

  return (
    <div className="flex items-center gap-1 flex-wrap justify-center">
      {visible.map((step, i) => {
        const color = KIND_COLOR[step.kind];
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div
            key={i}
            title={`${KIND_ICON[step.kind]} #${i + 1}`}
            className={`w-2 h-2 rounded-full transition-all ${
              isCurrent ? "w-3 h-3" : ""
            }`}
            style={{
              backgroundColor: isDone
                ? color + "80"
                : isCurrent
                ? color
                : "#374151",
              boxShadow: isCurrent ? `0 0 6px ${color}` : "none",
            }}
          />
        );
      })}
      {steps.length > 30 && (
        <span className="text-xs text-muted ml-1">+{steps.length - 30}</span>
      )}
      <span className="text-xs text-muted ml-2">
        {currentIndex + 1} / {steps.length}
      </span>
    </div>
  );
}
