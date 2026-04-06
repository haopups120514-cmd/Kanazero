import type { Word, BJTQuestion, SessionStepType } from "@/types";
import { dueItems } from "./srs";

/**
 * Build a session rotation: 5 words → 2 BJT → repeat.
 * Expressions are now a separate module (/expressions).
 */
export function buildSession(
  words: Word[],
  bjtQuestions: BJTQuestion[],
  maxSteps = 60
): SessionStepType[] {
  const steps: SessionStepType[] = [];

  const dueWords = dueItems(words.filter((w) => w.srsStage > 0));
  const newWords = words.filter((w) => w.srsStage === 0);
  const wordPool = shuffle([...dueWords, ...newWords]);

  const undoneBJT = bjtQuestions.filter((q) => !q.done);
  const bjtPool = shuffle(undoneBJT);

  let wi = 0;
  let bi = 0;

  // Rotation: [5 words, 2 bjt]
  while (steps.length < maxSteps) {
    for (let i = 0; i < 5 && steps.length < maxSteps; i++) {
      if (wi >= wordPool.length) break;
      steps.push({ kind: "word", wordId: wordPool[wi++].id });
    }
    for (let i = 0; i < 2 && steps.length < maxSteps; i++) {
      if (bi >= bjtPool.length) break;
      steps.push({ kind: "bjt", questionId: bjtPool[bi++].id });
    }
    if (wi >= wordPool.length && bi >= bjtPool.length) break;
  }

  return steps;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
