"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { TypingEngine } from "@/components/practice/TypingEngine";
import { WordCard } from "@/components/practice/WordCard";
import { Button } from "@/components/shared/Button";
import { SrsBadge } from "@/components/shared/Badge";
import { useWords } from "@/hooks/useWords";
import { useExpressions } from "@/hooks/useExpressions";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { useSettings } from "@/hooks/useSettings";
import { useProgress } from "@/hooks/useProgress";
import { dueItems, formatNextReview } from "@/lib/srs";
import * as storage from "@/lib/storage";
import type { Word, Expression } from "@/types";

type ReviewItem = { kind: "word"; item: Word } | { kind: "expression"; item: Expression };

function buildQueue(): ReviewItem[] {
  const w = storage.getWords();
  const e = storage.getExpressions();
  const dueWords = dueItems(w.filter((x) => x.srsStage > 0)).map(
    (x) => ({ kind: "word" as const, item: x })
  );
  const dueExprs = dueItems(e.filter((x) => x.srsStage > 0)).map(
    (x) => ({ kind: "expression" as const, item: x })
  );
  return [...dueWords, ...dueExprs];
}

export default function ReviewPage() {
  // Only need recordResult side-effects from hooks; queue is built from storage directly
  const { recordResult: recordWordResult } = useWords();
  const { recordResult: recordExprResult } = useExpressions();
  const { settings } = useSettings();
  const { recordActivity } = useProgress();

  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const sessionQueueRef = useRef<ReviewItem[]>([]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Build queue once on mount from storage — never rebuilds mid-session
  useEffect(() => {
    setMounted(true);
    const initial = buildQueue();
    setQueue(initial);
    sessionQueueRef.current = initial;
  }, []);

  const current = queue[index];
  const target =
    current?.kind === "word"
      ? current.item.romaji
      : current?.kind === "expression"
      ? (current.item.answer_romaji ?? "")
      : "";

  const engine = useTypingEngine(target);

  useEffect(() => {
    if (!current) return;
    engine.reset(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current]);

  useEffect(() => {
    if (!engine.isComplete || !current) return;
    if (engine.advancedRef.current) return;
    engine.advancedRef.current = true;

    const result = engine.getResult();
    const correct = result.errorCount === 0;
    if (current.kind === "word") recordWordResult(current.item.id, correct);
    else recordExprResult(current.item.id, correct);
    recordActivity(1);
    setDone((d) => d + 1);
    setTimeout(() => setIndex((i) => i + 1), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.isComplete]);

  if (!mounted) return null;

  if (queue.length === 0) {
    return (
      <PageLayout center maxWidth="sm">
        <div className="text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-foreground mb-2">暂无待复习内容</h2>
          <p className="text-muted text-sm">所有单词都在计划中，去练习新词吧！</p>
        </div>
      </PageLayout>
    );
  }

  if (index >= queue.length) {
    return (
      <PageLayout center maxWidth="sm">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            复习完成！共 {done} 个
          </h2>
          <p className="text-muted text-sm mb-4">太棒了，继续保持！</p>
          <Button onClick={() => {
            setQueue([...sessionQueueRef.current]);
            setIndex(0);
            setDone(0);
          }}>
            重新复习
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout center maxWidth="md">
      {/* Header info */}
      <div className="text-center mb-8">
        <div className="text-xs text-muted uppercase tracking-widest mb-2">间隔复习</div>
        <div className="text-sm text-muted">
          {index + 1} / {queue.length}
          {current?.kind === "word" && (
            <span className="ml-3">
              <SrsBadge stage={(current as { kind: "word"; item: Word }).item.srsStage} />
            </span>
          )}
        </div>
      </div>

      {current?.kind === "word" && (
        <div className="flex flex-col items-center gap-8 w-full">
          <WordCard
            word={(current as { kind: "word"; item: Word }).item}
            showFurigana={settings.showFurigana}
            autoSpeak
          />
          <TypingEngine
            target={(current as { kind: "word"; item: Word }).item.romaji}
            charStates={engine.charStates}
            typed={engine.typed}
            onKey={engine.handleKey}
            wpm={engine.wpm}
            accuracy={engine.accuracy}
            errorCount={engine.errorCount}
            fontSize={settings.fontSize}
          />
          <p className="text-xs text-muted/40">
            下次复习: {formatNextReview((current as { kind: "word"; item: Word }).item.nextReview)}
          </p>
        </div>
      )}

      {current?.kind === "expression" && (
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="bg-surface/50 rounded-xl px-6 py-4 border border-surface text-center w-full">
            <p className="text-foreground">{(current as { kind: "expression"; item: Expression }).item.scenario_zh}</p>
          </div>
          <TypingEngine
            target={(current as { kind: "expression"; item: Expression }).item.answer_romaji ?? ""}
            charStates={engine.charStates}
            typed={engine.typed}
            onKey={engine.handleKey}
            wpm={engine.wpm}
            accuracy={engine.accuracy}
            errorCount={engine.errorCount}
            fontSize={settings.fontSize}
          />
        </div>
      )}
    </PageLayout>
  );
}
