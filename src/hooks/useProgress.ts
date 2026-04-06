"use client";
import { useState, useEffect, useCallback } from "react";
import type { DailyActivity, Stats } from "@/types";
import { DEFAULT_STATS } from "@/types";
import * as storage from "@/lib/storage";

export function useProgress() {
  const [activity, setActivity] = useState<DailyActivity>({});
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);

  useEffect(() => {
    setActivity(storage.getActivity());
    setStats(storage.getStats());
  }, []);

  const recordActivity = useCallback((count: number) => {
    storage.recordActivity(count);
    setActivity(storage.getActivity());
  }, []);

  const updateStats = useCallback((patch: Partial<Stats>) => {
    const updated = storage.updateStats(patch);
    setStats(updated);
  }, []);

  const getStreak = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if ((activity[key] ?? 0) > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else if (key === today) {
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [activity]);

  const todayCount = (() => {
    const today = new Date().toISOString().slice(0, 10);
    return activity[today] ?? 0;
  })();

  return { activity, stats, recordActivity, updateStats, getStreak, todayCount };
}
