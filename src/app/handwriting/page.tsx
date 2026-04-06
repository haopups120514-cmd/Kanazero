"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/shared/Button";
import { useWords } from "@/hooks/useWords";
import { useSettings } from "@/hooks/useSettings";
import { useSpeech } from "@/hooks/useSpeech";
import { useProgress } from "@/hooks/useProgress";
import { dueItems } from "@/lib/srs";
import type { Word } from "@/types";
import { Volume2 } from "lucide-react";

type Phase = "writing" | "result";

export default function HandwritingPage() {
  const { words, recordResult } = useWords();
  const { settings } = useSettings();
  const { speak, speaking } = useSpeech();
  const { recordActivity } = useProgress();

  const [queue, setQueue] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("writing");
  const [input, setInput] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || words.length === 0) return;
    const due = dueItems(words.filter((w) => w.srsStage > 0));
    const fresh = words.filter((w) => w.srsStage === 0);
    setQueue([...due, ...fresh]);
  }, [words, mounted]);

  const current = queue[index];

  // Focus input & speak on new word
  useEffect(() => {
    if (!current) return;
    speak(current.word);
    setTimeout(() => inputRef.current?.focus(), 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.id]);

  const handleSubmit = useCallback(() => {
    if (!current || !input.trim()) return;
    const answer = input.trim();
    // Accept kanji or kana reading
    const correct = answer === current.word || answer === current.kana;
    setIsCorrect(correct);
    setPhase("result");
    recordResult(current.id, correct);
    recordActivity(1);
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));
    speak(current.word);
  }, [current, input, recordResult, recordActivity, speak]);

  const handleNext = useCallback(() => {
    setInput("");
    setPhase("writing");
    if (index + 1 >= queue.length) {
      setIndex(0);
      setScore({ correct: 0, wrong: 0 });
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, queue.length]);

  const handleRetry = () => {
    setInput("");
    setPhase("writing");
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (phase === "writing") handleSubmit();
      else handleNext();
    }
  };

  if (!mounted) return null;

  if (queue.length === 0) {
    return (
      <PageLayout center maxWidth="sm">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="text-5xl">✍️</div>
          <h2 className="text-xl font-bold text-foreground">手写练习</h2>
          <p className="text-muted text-sm">词库还没有单词，先在词库页面生成一些吧</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout center maxWidth="sm" noPadding>
      {/* Header */}
      <div className="w-full px-6 pt-6 pb-2 flex items-center justify-between">
        <span className="text-xs text-muted">{index + 1} / {queue.length}</span>
        {score.correct + score.wrong > 0 && (
          <span className="text-xs">
            <span className="text-success">{score.correct}✓</span>
            <span className="text-muted"> · </span>
            <span className="text-error">{score.wrong}✗</span>
          </span>
        )}
      </div>

      {current && (
        <div className="flex flex-col items-center gap-6 w-full px-6 pb-10 pt-2">
          {/* Prompt */}
          <div className="w-full bg-bg-card border border-surface rounded-2xl p-5 text-center">
            <p className="text-xs text-muted mb-1">{current.pos} · {current.topic}</p>
            <p className="text-3xl font-bold text-foreground mb-1">{current.meaning_zh}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-lg text-accent font-mono">{current.kana}</span>
              <button
                onClick={() => speak(current.word)}
                className={`p-1 rounded-lg transition-colors
                  ${speaking ? "text-accent" : "text-muted hover:text-accent"}`}
              >
                <Volume2 size={16} />
              </button>
            </div>
            {settings.showFurigana && phase === "result" && (
              <p className="text-4xl font-bold text-foreground mt-3">{current.word}</p>
            )}
          </div>

          {/* Writing area */}
          <div className="w-full">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="用 Apple Pencil 书写…"
              rows={3}
              disabled={phase === "result"}
              className={`w-full bg-surface/40 border-2 rounded-2xl px-5 py-4 text-center font-serif text-4xl
                text-foreground placeholder:text-muted/30 focus:outline-none transition-colors resize-none
                leading-relaxed
                ${phase === "result"
                  ? isCorrect
                    ? "border-success/60 bg-success/5"
                    : "border-error/60 bg-error/5"
                  : "border-surface focus:border-accent"
                }`}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              autoCapitalize="none"
            />
          </div>

          {/* Result feedback */}
          {phase === "result" && (
            <div className={`w-full rounded-2xl px-5 py-3 border text-center
              ${isCorrect ? "bg-success/10 border-success/30" : "bg-error/10 border-error/30"}`}
            >
              {isCorrect ? (
                <p className="text-success font-medium">正确！</p>
              ) : (
                <p className="text-error font-medium">
                  正确答案：<span className="font-serif text-xl">{current.word}</span>
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          {phase === "writing" && (
            <Button onClick={handleSubmit} size="lg" className="w-full max-w-xs" disabled={!input.trim()}>
              提交
            </Button>
          )}

          {phase === "result" && (
            <div className="flex gap-3 w-full max-w-xs">
              {!isCorrect && (
                <Button variant="outline" onClick={handleRetry} className="flex-1">
                  再写一次
                </Button>
              )}
              <Button onClick={handleNext} className="flex-1">
                {index + 1 >= queue.length ? "完成 →" : "下一个 →"}
              </Button>
            </div>
          )}

          {phase === "writing" && (
            <p className="text-xs text-muted/40">根据读音写出汉字，Enter 提交</p>
          )}
        </div>
      )}
    </PageLayout>
  );
}
