"use client";
import { useState, useEffect, useCallback } from "react";
import type { Settings } from "@/types";
import { getSettings, setSettings } from "@/lib/storage";
import { DEFAULT_SETTINGS } from "@/types";

export function useSettings() {
  const [settings, setLocalSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setLocalSettings(getSettings());
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    setLocalSettings(updated);
  }, [settings]);

  return { settings, update };
}
