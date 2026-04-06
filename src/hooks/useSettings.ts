"use client";
import { useState, useEffect, useCallback } from "react";
import type { Settings } from "@/types";
import { getSettings, setSettings } from "@/lib/storage";
import { DEFAULT_SETTINGS } from "@/types";

export function useSettings() {
  const [settings, setLocalSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setLocalSettings(getSettings());

    const handleChange = () => setLocalSettings(getSettings());
    window.addEventListener("kz-settings-changed", handleChange);
    return () => window.removeEventListener("kz-settings-changed", handleChange);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    const updated = { ...getSettings(), ...patch };
    setSettings(updated);
    setLocalSettings(updated);
  }, []);

  return { settings, update };
}
