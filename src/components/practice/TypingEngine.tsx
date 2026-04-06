"use client";
import { useEffect, useRef } from "react";
import type { CharState } from "@/types";

interface TypingEngineProps {
  target: string;
  charStates: CharState[];
  typed: string;
  onKey: (e: KeyboardEvent) => void;
  wpm: number;
  accuracy: number;
  errorCount: number;
  fontSize?: "sm" | "md" | "lg";
}

const CHAR_SIZE: Record<string, string> = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-5xl",
};

export function TypingEngine({
  target,
  charStates,
  typed: _typed,
  onKey,
  wpm,
  accuracy,
  errorCount,
  fontSize = "md",
}: TypingEngineProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      onKey(e);
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [onKey]);

  // Re-focus if user clicks elsewhere
  useEffect(() => {
    const handler = () => inputRef.current?.focus();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const sizeClass = CHAR_SIZE[fontSize];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Hidden input to capture keystrokes */}
      <input
        ref={inputRef}
        className="typing-capture"
        readOnly
        value=""
        onChange={() => {}}
        aria-label="typing input"
      />

      {/* Character display */}
      <div
        className={`font-typing ${sizeClass} tracking-widest flex flex-wrap justify-center gap-0.5`}
        aria-live="polite"
      >
        {target.split("").map((char, i) => {
          const state = charStates[i] ?? "pending";
          return (
            <span
              key={i}
              className={`char-${state} transition-colors duration-100`}
            >
              {char === " " ? "\u00a0" : char}
            </span>
          );
        })}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 text-sm text-muted font-mono">
        <span>
          <span className="text-accent font-semibold">{wpm}</span> WPM
        </span>
        <span>
          <span className="text-accent font-semibold">{accuracy}</span>% 准确率
        </span>
        {errorCount > 0 && (
          <span className="text-error">
            {errorCount} 错误
          </span>
        )}
      </div>
    </div>
  );
}
