"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export type PomodoroStatus = "idle" | "running" | "paused" | "done";

export function usePomodoro(minutes = 15) {
  const totalSeconds = minutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [status, setStatus] = useState<PomodoroStatus>("idle");
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number>(totalSeconds);
  const rafRef = useRef<number>(0);
  const statusRef = useRef<PomodoroStatus>("idle");

  // Keep statusRef in sync so effects can read it without stale closure
  useEffect(() => { statusRef.current = status; }, [status]);

  // When totalSeconds changes (user updated settings), reset if idle
  useEffect(() => {
    if (statusRef.current === "idle") {
      cancelAnimationFrame(rafRef.current);
      startTimeRef.current = null;
      pausedAtRef.current = totalSeconds;
      setRemaining(totalSeconds);
    }
  }, [totalSeconds]);

  const tick = useCallback(() => {
    if (startTimeRef.current === null) return;
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const left = Math.max(0, pausedAtRef.current - elapsed);
    setRemaining(left);
    if (left <= 0) {
      setStatus("done");
      statusRef.current = "done";
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    setStatus("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    pausedAtRef.current = remaining;
    startTimeRef.current = null;
    setStatus("paused");
  }, [remaining]);

  const resume = useCallback(() => {
    startTimeRef.current = Date.now();
    setStatus("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    startTimeRef.current = null;
    pausedAtRef.current = totalSeconds;
    setRemaining(totalSeconds);
    setStatus("idle");
  }, [totalSeconds]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const minutes_ = Math.floor(remaining / 60);
  const seconds_ = remaining % 60;
  const display = `${String(minutes_).padStart(2, "0")}:${String(seconds_).padStart(2, "0")}`;
  const progress = (totalSeconds - remaining) / totalSeconds;

  return { remaining, status, display, progress, start, pause, resume, reset };
}
