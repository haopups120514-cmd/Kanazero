"use client";
import { useState, useCallback } from "react";
import type { Word, Expression, BJTQuestion } from "@/types";
import { getSettings } from "@/lib/storage";

interface GenerateOptions {
  type: "words" | "expressions" | "bjt_questions";
  topic?: string;
  level?: string;
  count?: number;
  examType?: string;
}

interface GenerateResult {
  words?: Word[];
  expressions?: Expression[];
  bjtQuestions?: BJTQuestion[];
}

export function useGenerate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (opts: GenerateOptions): Promise<GenerateResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const settings = getSettings();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...opts,
          apiKeyOverride: settings.apiKeyOverride || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "生成失败");
      }
      const data = await res.json();
      return data as GenerateResult;
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}
