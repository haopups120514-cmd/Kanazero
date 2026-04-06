"use client";
import { useState, useEffect, useCallback } from "react";
import type { Word, SrsStage } from "@/types";
import * as storage from "@/lib/storage";
import { nextStage, nextReviewTime } from "@/lib/srs";

export function useWords() {
  const [words, setWords] = useState<Word[]>([]);

  useEffect(() => {
    setWords(storage.getWords());
  }, []);

  const addWords = useCallback((incoming: Word[]) => {
    const updated = storage.addWords(incoming);
    setWords(updated);
  }, []);

  const updateWord = useCallback(
    (id: string, patch: Partial<Word>) => {
      const updated = words.map((w) =>
        w.id === id ? { ...w, ...patch } : w
      );
      storage.setWords(updated);
      setWords(updated);
    },
    [words]
  );

  const recordResult = useCallback(
    (id: string, correct: boolean) => {
      const word = words.find((w) => w.id === id);
      if (!word) return;
      const newStage = nextStage(word.srsStage, correct) as SrsStage;
      const patch: Partial<Word> = {
        srsStage: newStage,
        nextReview: nextReviewTime(newStage),
        lastReview: Date.now(),
        correctCount: word.correctCount + (correct ? 1 : 0),
        wrongCount: word.wrongCount + (correct ? 0 : 1),
      };
      updateWord(id, patch);
    },
    [words, updateWord]
  );

  const clearAll = useCallback(() => {
    storage.setWords([]);
    setWords([]);
  }, []);

  return { words, addWords, updateWord, recordResult, clearAll };
}
