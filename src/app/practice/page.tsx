"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/PageLayout";
import { TypingEngine } from "@/components/practice/TypingEngine";
import { WordCard } from "@/components/practice/WordCard";
import { BJTQuestionCard } from "@/components/practice/BJTQuestionCard";
import { SessionProgress } from "@/components/practice/SessionProgress";
import { ResultOverlay } from "@/components/practice/ResultOverlay";
import { Button } from "@/components/shared/Button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useWords } from "@/hooks/useWords";
import { useSettings } from "@/hooks/useSettings";
import { useGenerate } from "@/hooks/useGenerate";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { usePomodoro } from "@/hooks/usePomodoro";
import { useProgress } from "@/hooks/useProgress";
import { buildSession } from "@/lib/session";
import * as storage from "@/lib/storage";
import type { SessionStepType, SessionResult, BJTQuestion } from "@/types";
import { KeyboardHint } from "@/components/shared/KeyboardHint";
import { TOPICS } from "@/types";

type Phase = "loading" | "practicing" | "result";

const SESSION_KEY = "bjt_session_v1";

interface SavedSession {
  steps: SessionStepType[];
  stepIndex: number;
  startTime: number;
  accum: { wordsTyped: number; bjtAnswered: number; correct: number; wrong: number; totalWpm: number; wpmCount: number };
}

function saveSession(s: SavedSession) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
}

function loadSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

export default function PracticePage() {
  const router = useRouter();
  const { words, addWords, recordResult: recordWordResult } = useWords();
  const { settings } = useSettings();
  const { generate, loading: genLoading } = useGenerate();
  const { recordActivity, updateStats, stats } = useProgress();

  const [phase, setPhase] = useState<Phase>("loading");
  const [steps, setSteps] = useState<SessionStepType[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const sessionStartRef = useRef<number>(Date.now());

  const [bjtQuestions, setBjtQuestions] = useState<BJTQuestion[]>([]);
  const [bjtSelected, setBjtSelected] = useState<string | undefined>(undefined);
  const [bjtShowResult, setBjtShowResult] = useState(false);

  const { status: pomStatus, start: pomStart } = usePomodoro(settings.pomodoroMinutes);
  const resultAccumRef = useRef({ wordsTyped: 0, bjtAnswered: 0, correct: 0, wrong: 0, totalWpm: 0, wpmCount: 0 });

  const currentStep = steps[stepIndex];
  const currentWord = currentStep?.kind === "word"
    ? words.find((w) => w.id === (currentStep as { kind: "word"; wordId: string }).wordId)
    : undefined;
  const currentBJT = currentStep?.kind === "bjt"
    ? bjtQuestions.find((q) => q.id === (currentStep as { kind: "bjt"; questionId: string }).questionId)
    : undefined;

  const typingTarget = currentWord?.romaji ?? "";
  const engine = useTypingEngine(typingTarget);

  // Initialize — restore session if exists, otherwise start fresh
  useEffect(() => {
    async function init() {
      const bq = storage.getBJTQuestions();
      setBjtQuestions(bq);

      const saved = loadSession();
      if (saved && saved.steps.length > 0 && saved.stepIndex < saved.steps.length) {
        // Restore saved session
        setSteps(saved.steps);
        setStepIndex(saved.stepIndex);
        resultAccumRef.current = saved.accum;
        sessionStartRef.current = saved.startTime;
        setPhase("practicing");
        pomStart();
        return;
      }

      // Fresh session
      let w = storage.getWords();
      if (w.length < 20) {
        const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
        const result = await generate({ type: "words", topic, level: "J3", count: 20 });
        if (result?.words) {
          w = storage.addWords(result.words);
          addWords(result.words);
        }
      }
      let freshBQ = bq;
      if (freshBQ.length < 5) {
        const result = await generate({ type: "bjt_questions", count: 5 });
        if (result?.bjtQuestions) {
          freshBQ = storage.addBJTQuestions(result.bjtQuestions);
          setBjtQuestions(freshBQ);
        }
      }

      const session = buildSession(w, freshBQ);
      if (session.length === 0) { setPhase("result"); return; }

      setSteps(session);
      setStepIndex(0);
      sessionStartRef.current = Date.now();
      resultAccumRef.current = { wordsTyped: 0, bjtAnswered: 0, correct: 0, wrong: 0, totalWpm: 0, wpmCount: 0 };
      setPhase("practicing");
      pomStart();
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist session whenever step changes
  useEffect(() => {
    if (phase !== "practicing" || steps.length === 0) return;
    saveSession({
      steps,
      stepIndex,
      startTime: sessionStartRef.current,
      accum: { ...resultAccumRef.current },
    });
  }, [steps, stepIndex, phase]);

  // Reset engine on step change
  useEffect(() => {
    if (phase !== "practicing" || !currentStep) return;
    if (currentStep.kind === "word") engine.reset(typingTarget);
    setBjtSelected(undefined);
    setBjtShowResult(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, phase]);

  useEffect(() => {
    if (pomStatus === "done") finishSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomStatus]);

  // Auto-advance on word complete
  useEffect(() => {
    if (phase !== "practicing" || currentStep?.kind !== "word") return;
    if (!engine.isComplete || engine.advancedRef.current) return;
    engine.advancedRef.current = true;

    const result = engine.getResult();
    if (currentWord) {
      recordWordResult(currentWord.id, result.errorCount === 0);
      resultAccumRef.current.wordsTyped++;
      if (result.errorCount === 0) resultAccumRef.current.correct++;
      else resultAccumRef.current.wrong++;
      if (result.wpm > 0) {
        resultAccumRef.current.totalWpm += result.wpm;
        resultAccumRef.current.wpmCount++;
      }
      recordActivity(1);
    }
    setTimeout(() => advance(), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.isComplete]);

  const advance = useCallback(() => {
    setStepIndex((i) => {
      const next = i + 1;
      if (next >= steps.length) { finishSession(); return i; }
      return next;
    });
  }, [steps.length]); // eslint-disable-line

  const finishSession = useCallback(() => {
    clearSession();
    const acc = resultAccumRef.current;
    const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    const avgWpm = acc.wpmCount > 0 ? Math.round(acc.totalWpm / acc.wpmCount) : 0;
    setSessionResult({
      wordsTyped: acc.wordsTyped,
      expressionsTyped: 0,
      bjtAnswered: acc.bjtAnswered,
      correct: acc.correct,
      wrong: acc.wrong,
      wpm: avgWpm,
      duration,
    });
    setPhase("result");
    updateStats({
      totalWords: stats.totalWords + acc.wordsTyped,
      totalCorrect: stats.totalCorrect + acc.correct,
      totalWrong: stats.totalWrong + acc.wrong,
      totalSessions: stats.totalSessions + 1,
      totalMinutes: stats.totalMinutes + Math.round(duration / 60),
      bestWpm: Math.max(stats.bestWpm, avgWpm),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats]);

  const handleBJTSelect = (label: string) => {
    if (bjtShowResult) return;
    setBjtSelected(label);
    setBjtShowResult(true);
    resultAccumRef.current.bjtAnswered++;
    const correct = label === currentBJT?.answer;
    if (correct) resultAccumRef.current.correct++;
    else resultAccumRef.current.wrong++;
    if (currentBJT) {
      const updated = bjtQuestions.map((q) =>
        q.id === currentBJT.id ? { ...q, done: true, correct } : q
      );
      storage.setBJTQuestions(updated);
      setBjtQuestions(updated);
    }
  };

  if (phase === "loading") {
    return (
      <PageLayout center maxWidth="sm">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size={32} />
          <p className="text-muted text-sm">
            {genLoading ? "AI 正在生成练习内容…" : "准备中…"}
          </p>
        </div>
      </PageLayout>
    );
  }

  if (phase === "result" && sessionResult) {
    return (
      <PageLayout center maxWidth="sm" noPadding>
        <ResultOverlay
          result={sessionResult}
          onContinue={() => {
            resultAccumRef.current = { wordsTyped: 0, bjtAnswered: 0, correct: 0, wrong: 0, totalWpm: 0, wpmCount: 0 };
            const newSession = buildSession(storage.getWords(), storage.getBJTQuestions());
            setSteps(newSession);
            setStepIndex(0);
            sessionStartRef.current = Date.now();
            setPhase("practicing");
          }}
          onEnd={() => { clearSession(); router.push("/"); }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout center maxWidth="md" noPadding>
      <div className="w-full px-6 pt-6 pb-2">
        <SessionProgress steps={steps} currentIndex={stepIndex} />
      </div>

      <div className="flex flex-col items-center gap-8 w-full px-6 py-8 animate-slide-up">
        {currentStep?.kind === "word" && currentWord && (
          <>
            <WordCard word={currentWord} showFurigana={settings.showFurigana} autoSpeak />
            <TypingEngine
              target={currentWord.romaji}
              charStates={engine.charStates}
              typed={engine.typed}
              onKey={engine.handleKey}
              wpm={engine.wpm}
              accuracy={engine.accuracy}
              errorCount={engine.errorCount}
              fontSize={settings.fontSize}
            />
          </>
        )}

        {currentStep?.kind === "bjt" && currentBJT && (
          <>
            <BJTQuestionCard
              question={currentBJT}
              selected={bjtSelected}
              onSelect={handleBJTSelect}
              showResult={bjtShowResult}
            />
            {bjtShowResult && <Button onClick={advance}>下一题 →</Button>}
          </>
        )}

        <div className="text-xs text-muted/30">ESC 返回</div>
      </div>
      <KeyboardHint />
    </PageLayout>
  );
}
