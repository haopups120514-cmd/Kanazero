"use client";
import { useState, useEffect, useCallback } from "react";
import type { Expression, SrsStage } from "@/types";
import * as storage from "@/lib/storage";
import { nextStage, nextReviewTime } from "@/lib/srs";

export function useExpressions() {
  const [expressions, setExpressions] = useState<Expression[]>([]);

  useEffect(() => {
    setExpressions(storage.getExpressions());
  }, []);

  const addExpressions = useCallback((incoming: Expression[]) => {
    const updated = storage.addExpressions(incoming);
    setExpressions(updated);
  }, []);

  const recordResult = useCallback(
    (id: string, correct: boolean) => {
      const expr = expressions.find((e) => e.id === id);
      if (!expr) return;
      const newStage = nextStage(expr.srsStage, correct) as SrsStage;
      const updated = expressions.map((e) =>
        e.id === id
          ? {
              ...e,
              srsStage: newStage,
              nextReview: nextReviewTime(newStage),
              lastReview: Date.now(),
              correctCount: e.correctCount + (correct ? 1 : 0),
              wrongCount: e.wrongCount + (correct ? 0 : 1),
            }
          : e
      );
      storage.setExpressions(updated);
      setExpressions(updated);
    },
    [expressions]
  );

  return { expressions, addExpressions, recordResult };
}
