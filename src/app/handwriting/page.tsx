"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useWords } from "@/hooks/useWords";
import { useSettings } from "@/hooks/useSettings";
import { useSpeech } from "@/hooks/useSpeech";
import { useProgress } from "@/hooks/useProgress";
import { dueItems } from "@/lib/srs";
import { matchJapanese } from "@/lib/japaneseMatch";
import type { Word } from "@/types";
import { TOPIC_CATEGORIES } from "@/types";
import { Volume2 } from "lucide-react";

interface Feedback {
  correct: boolean;
  correctAnswer: string;
}

export default function HandwritingPage() {
  const { words, recordResult } = useWords();
  const { settings } = useSettings();
  const { speak } = useSpeech();
  const { recordActivity } = useProgress();

  const [selectedTopic, setSelectedTopic] = useState("all");
  const [queue, setQueue] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Rebuild queue when words or topic changes
  useEffect(() => {
    if (!mounted) return;
    const filtered = selectedTopic === "all" ? words : words.filter((w) => w.topic === selectedTopic);
    const source = filtered.length > 0 ? filtered : words;
    const due = dueItems(source.filter((w) => w.srsStage > 0));
    const fresh = source.filter((w) => w.srsStage === 0);
    setQueue([...due, ...fresh]);
    setIndex(0);
    setFeedback(null);
    setInput("");
  }, [words, mounted, selectedTopic]);

  const current = queue[index];

  // Speak and focus on card change
  useEffect(() => {
    if (!current) return;
    speak(current.word);
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [index, current?.id]); // eslint-disable-line

  // Auto-advance 1 second after correct answer
  useEffect(() => {
    if (!feedback?.correct) return;
    const t = setTimeout(() => {
      setInput("");
      setFeedback(null);
      if (index + 1 >= queue.length) {
        setIndex(0);
        setScore({ correct: 0, wrong: 0 });
      } else {
        setIndex((i) => i + 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [feedback, index, queue.length]);

  const handleSubmit = useCallback(() => {
    if (!current || !input.trim() || feedback?.correct) return;
    // matchJapanese handles hira/kata equivalence, long-vowel variants, punctuation
    const correct = matchJapanese(input.trim(), [current.word, current.kana]);
    setFeedback({ correct, correctAnswer: current.word });
    recordResult(current.id, correct);
    recordActivity(1);
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));
    speak(current.word);
    if (!correct) {
      setTimeout(() => {
        setInput("");
        setFeedback(null);
        inputRef.current?.focus();
      }, 1800);
    }
  }, [current, input, feedback, recordResult, recordActivity, speak]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!mounted) return null;

  const availableTopics = TOPIC_CATEGORIES.flatMap((c) => c.topics).filter((t) =>
    words.some((w) => w.topic === t)
  );

  if (words.length === 0) {
    return (
      <PageLayout center maxWidth="sm">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="text-5xl">✍</div>
          <h2 className="text-xl font-bold text-foreground">手写练习</h2>
          <p className="text-muted text-sm">词库还没有单词，先在词库页面生成一些吧</p>
        </div>
      </PageLayout>
    );
  }

  if (queue.length === 0) {
    return (
      <PageLayout center maxWidth="sm">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="text-5xl">✍</div>
          <p className="text-muted text-sm">该分类暂无单词</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="sm" noPadding>
      {/*
        Content positioned in the upper 3/4 of the screen.
        pt-[20vh] starts content ~20% from top — not at top, not centered.
        pb-16 reserves space below so content doesn't hug the bottom.
      */}
      <div className="flex flex-col items-center w-full px-6 pt-[20vh] pb-16 gap-3">
        {/* Topic selector */}
        {availableTopics.length > 1 && (
          <div className="w-full flex gap-1.5 flex-wrap mb-1">
            <TopicPill label="全部" active={selectedTopic === "all"} onClick={() => setSelectedTopic("all")} />
            {availableTopics.map((t) => (
              <TopicPill key={t} label={t} active={selectedTopic === t} onClick={() => setSelectedTopic(t)} />
            ))}
          </div>
        )}

        {/* Progress row */}
        <div className="w-full flex items-center justify-between">
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
          <>
            {/* Question card */}
            <div className="w-full bg-bg-card border border-surface rounded-2xl p-5 text-center">
              <p className="text-xs text-muted mb-1">{current.pos} · {current.topic}</p>
              <p className="text-3xl font-bold text-foreground mb-1">{current.meaning_zh}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-lg text-accent font-jp">{current.kana}</span>
                <button
                  onClick={() => speak(current.word)}
                  className="text-muted/40 hover:text-accent transition-colors"
                >
                  <Volume2 size={16} />
                </button>
              </div>
              {settings.showFurigana && feedback && (
                <p className="text-4xl font-bold font-jp text-foreground mt-3">{current.word}</p>
              )}
            </div>

            {/* Handwriting input — canvas-style textarea */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="在此书写…"
              disabled={!!feedback?.correct}
              lang="ja"
              className={`w-full bg-bg-card border-2 border-dashed rounded-2xl p-4 text-center font-jp text-5xl
                text-foreground placeholder:text-muted/20 focus:outline-none transition-colors resize-none h-40
                ${feedback
                  ? feedback.correct
                    ? "border-success/60 bg-success/5"
                    : "border-error/60 bg-error/5"
                  : "border-surface/50 focus:border-accent/50"
                }`}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {/* Two submit buttons — left and right for left/right hand users */}
            <div className="w-full flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || !!feedback?.correct}
                className="flex-1 py-4 bg-accent text-white rounded-2xl text-sm font-medium
                  disabled:opacity-40 transition-all hover:bg-accent-dim active:scale-[0.98]"
              >
                提交
              </button>
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || !!feedback?.correct}
                className="flex-1 py-4 bg-accent text-white rounded-2xl text-sm font-medium
                  disabled:opacity-40 transition-all hover:bg-accent-dim active:scale-[0.98]"
              >
                提交
              </button>
            </div>

            {/* Inline feedback */}
            {feedback && (
              <div className={`w-full rounded-xl px-4 py-2.5 text-center border text-sm
                ${feedback.correct
                  ? "bg-success/10 border-success/30 text-success"
                  : "bg-error/10 border-error/30 text-error"
                }`}>
                {feedback.correct
                  ? "正解！自动跳转…"
                  : <>正确答案：<span className="font-jp text-xl">{feedback.correctAnswer}</span></>
                }
              </div>
            )}
          </>
        )}
      </div>
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
