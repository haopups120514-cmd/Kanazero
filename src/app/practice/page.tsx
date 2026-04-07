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
import { TOPICS, TOPIC_CATEGORIES } from "@/types";

type Phase = "loading" | "empty" | "practicing" | "result";

const SESSION_KEY = "bjt_session_v1";

interface SavedSession {
  steps: SessionStepType[];
  stepIndex: number;
  startTime: number;
  topic: string;
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
  const { words, recordResult: recordWordResult } = useWords();
  const { settings } = useSettings();
  const { generate, loading: genLoading } = useGenerate();
  const { recordActivity, updateStats, stats } = useProgress();

  const [phase, setPhase] = useState<Phase>("loading");
  const [steps, setSteps] = useState<SessionStepType[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [selectedTopic, setSelectedTopic] = useState("all");
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

  // Build and start a practice session from (optionally filtered) words
  const startNewSession = useCallback((topicFilter: string, bq: BJTQuestion[]) => {
    const allWords = storage.getWords();
    if (allWords.length === 0) { setPhase("empty"); return; }
    const filtered = topicFilter === "all" ? allWords : allWords.filter((w) => w.topic === topicFilter);
    const wordsForSession = filtered.length > 0 ? filtered : allWords;
    const session = buildSession(wordsForSession, bq);
    if (session.length === 0) { setPhase("empty"); return; }
    clearSession();
    setSteps(session);
    setStepIndex(0);
    sessionStartRef.current = Date.now();
    resultAccumRef.current = { wordsTyped: 0, bjtAnswered: 0, correct: 0, wrong: 0, totalWpm: 0, wpmCount: 0 };
    setPhase("practicing");
    pomStart();
  }, [pomStart]);

  // Initialize — restore session if exists, otherwise start fresh
  useEffect(() => {
    async function init() {
      let bq = storage.getBJTQuestions();
      setBjtQuestions(bq);

      const saved = loadSession();
      if (saved && saved.steps.length > 0 && saved.stepIndex < saved.steps.length) {
        setSteps(saved.steps);
        setStepIndex(saved.stepIndex);
        setSelectedTopic(saved.topic ?? "all");
        resultAccumRef.current = saved.accum;
        sessionStartRef.current = saved.startTime;
        setPhase("practicing");
        pomStart();
        return;
      }

      // Check words — no auto-generation, guide to vocabulary if empty
      const w = storage.getWords();
      if (w.length === 0) { setPhase("empty"); return; }

      // Auto-generate BJT questions if needed (topic-agnostic, always keep stocked)
      if (bq.length < 5) {
        const result = await generate({ type: "bjt_questions", count: 5 });
        if (result?.bjtQuestions) {
          bq = storage.addBJTQuestions(result.bjtQuestions);
          setBjtQuestions(bq);
        }
      }

      startNewSession("all", bq);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restart session when topic changes mid-practice
  useEffect(() => {
    if (phase !== "practicing") return;
    const bq = storage.getBJTQuestions();
    startNewSession(selectedTopic, bq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic]);
  useEffect(() => {
    if (phase !== "practicing" || steps.length === 0) return;
    saveSession({
      steps,
      stepIndex,
      startTime: sessionStartRef.current,
      topic: selectedTopic,
      accum: { ...resultAccumRef.current },
    });
  }, [steps, stepIndex, phase, selectedTopic]);

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
            {genLoading ? "AI 正在生成题目…" : "准备中…"}
          </p>
        </div>
      </PageLayout>
    );
  }

  if (phase === "empty") {
    return (
      <PageLayout center maxWidth="sm">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="text-5xl">📚</div>
          <h2 className="text-xl font-bold text-foreground">词库为空</h2>
          <p className="text-muted text-sm">请先去词库页生成单词，再回来练习</p>
          <Button onClick={() => router.push("/vocabulary")}>去词库 →</Button>
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
            const bq = storage.getBJTQuestions();
            startNewSession(selectedTopic, bq);
          }}
          onEnd={() => { clearSession(); router.push("/"); }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout center maxWidth="md" noPadding>
      {/* Topic selector */}
      <div className="w-full px-6 pt-4 pb-0">
        <div className="flex gap-1.5 flex-wrap">
          <TopicPill label="全部" active={selectedTopic === "all"} onClick={() => setSelectedTopic("all")} />
          {TOPIC_CATEGORIES.map((cat) =>
            cat.topics.map((t) => {
              const hasWords = words.some((w) => w.topic === t);
              if (!hasWords) return null;
              return (
                <TopicPill key={t} label={t} active={selectedTopic === t} onClick={() => setSelectedTopic(t)} />
              );
            })
          )}
        </div>
      </div>

      <div className="w-full px-6 pt-3 pb-2">
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

function TopicPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
        active ? "bg-accent text-white" : "bg-surface text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
