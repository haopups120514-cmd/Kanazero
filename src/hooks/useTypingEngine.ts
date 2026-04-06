"use client";
import { useReducer, useCallback, useRef } from "react";
import type { CharState, TypingResult } from "@/types";
import { expandRomaji } from "@/lib/romaji";

interface EngineState {
  target: string;
  validExpansions: string[];
  typed: string;
  charStates: CharState[];
  errorCount: number;
  startTime: number | null;
  isComplete: boolean;
  wpm: number;
}

type Action =
  | { type: "KEY"; char: string }
  | { type: "RESET"; target: string }
  | { type: "BACKSPACE" };

function buildCharStates(
  target: string,
  typed: string,
  _validExpansions: string[]
): CharState[] {
  const states: CharState[] = [];
  for (let i = 0; i < target.length; i++) {
    if (i < typed.length) {
      states.push(typed[i] === target[i] ? "correct" : "wrong");
    } else if (i === typed.length) {
      states.push("current");
    } else {
      states.push("pending");
    }
  }
  return states;
}

function calcWpm(errorCount: number, target: string, startTime: number): number {
  const durationMin = (Date.now() - startTime) / 60000;
  if (durationMin < 0.01) return 0;
  const chars = target.length - errorCount;
  return Math.round(Math.max(0, chars / 5 / durationMin));
}

function reducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {
    case "RESET": {
      const target = action.target;
      const validExpansions = expandRomaji(target);
      const charStates: CharState[] = target
        .split("")
        .map((_, i) => (i === 0 ? "current" : "pending"));
      return {
        target,
        validExpansions,
        typed: "",
        charStates,
        errorCount: 0,
        startTime: null,
        isComplete: false,
        wpm: 0,
      };
    }

    case "KEY": {
      if (state.isComplete) return state;
      const { char } = action;
      const startTime = state.startTime ?? Date.now();
      const pos = state.typed.length;

      if (pos >= state.target.length) return state;

      // 忽略多余的空格（打字习惯，不算错误）
      if (char === " " && state.target[pos] !== " ") return state;

      const expected = state.target[pos];
      const isCorrect = char === expected;
      const typed = isCorrect ? state.typed + char : state.typed;
      const errorCount = state.errorCount + (isCorrect ? 0 : 1);
      const isComplete = typed.length === state.target.length;
      const wpm = isComplete ? calcWpm(errorCount, state.target, startTime) : state.wpm;

      const charStates = buildCharStates(state.target, typed, state.validExpansions);
      if (!isComplete && isCorrect && typed.length < state.target.length) {
        charStates[typed.length] = "current";
      }

      return {
        ...state,
        typed,
        charStates,
        errorCount,
        startTime,
        isComplete,
        wpm,
      };
    }

    case "BACKSPACE": {
      if (state.typed.length === 0) return state;
      const typed = state.typed.slice(0, -1);
      const charStates = buildCharStates(state.target, typed, state.validExpansions);
      if (typed.length < state.target.length) {
        charStates[typed.length] = "current";
      }
      return { ...state, typed, charStates };
    }

    default:
      return state;
  }
}

function initState(target: string): EngineState {
  const validExpansions = expandRomaji(target);
  const charStates: CharState[] = target
    .split("")
    .map((_, i) => (i === 0 ? "current" : "pending"));
  return {
    target,
    validExpansions,
    typed: "",
    charStates,
    errorCount: 0,
    startTime: null,
    isComplete: false,
    wpm: 0,
  };
}

export function useTypingEngine(initialTarget: string) {
  const [state, dispatch] = useReducer(reducer, initialTarget, initState);
  const advancedRef = useRef(false);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Backspace") {
      dispatch({ type: "BACKSPACE" });
      return;
    }
    if (e.key.length === 1) {
      dispatch({ type: "KEY", char: e.key });
    }
  }, []);

  const reset = useCallback((target: string) => {
    advancedRef.current = false;
    dispatch({ type: "RESET", target });
  }, []);

  const getResult = useCallback((): TypingResult => {
    const durationMs = state.startTime ? Date.now() - state.startTime : 0;
    return {
      target: state.target,
      correct: state.errorCount === 0,
      errorCount: state.errorCount,
      durationMs,
      wpm: state.wpm,
    };
  }, [state]);

  // Accuracy: chars correctly typed / total chars typed attempts
  const accuracy =
    state.typed.length > 0
      ? Math.round(
          ((state.typed.length) /
            (state.typed.length + state.errorCount)) *
            100
        )
      : 100;

  return {
    ...state,
    accuracy,
    handleKey,
    reset,
    getResult,
    advancedRef,
  };
}
