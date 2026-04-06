"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useWords } from "@/hooks/useWords";
import { useSettings } from "@/hooks/useSettings";
import { useSpeech } from "@/hooks/useSpeech";
import { useProgress } from "@/hooks/useProgress";
import { dueItems } from "@/lib/srs";
import { matchJapanese, matchChinese, normalizeChinese } from "@/lib/japaneseMatch";
import type { Word } from "@/types";
import { TOPIC_CATEGORIES } from "@/types";
import { Volume2 } from "lucide-react";

type HandwritingMode = 1 | 2 | 3;

const MODE_LABELS: Record<HandwritingMode, { label: string; desc: string }> = {
  1: { label: "辅助", desc: "照抄日语" },
  2: { label: "中→日", desc: "看义写词" },
  3: { label: "日→中", desc: "看词写义" },
};

interface Feedback {
  correct: boolean;
  correctAnswer: string;
}

export default function HandwritingPage() {
  const { words, recordResult, updateWord } = useWords();
  const { settings } = useSettings();
  const { speak } = useSpeech();
  const { recordActivity } = useProgress();

  const [mode, setMode] = useState<HandwritingMode>(2);
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [queue, setQueue] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [mounted, setMounted] = useState(false);
  const [aiChecking, setAiChecking] = useState(false);

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

  // Reset on mode change
  useEffect(() => {
    setInput("");
    setFeedback(null);
    setAiChecking(false);
  }, [mode]);

  const current = queue[index];

  // Speak Japanese word on card change (all modes)
  useEffect(() => {
    if (!current) return;
    if (mode !== 3) speak(current.word);
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [index, current?.id, mode]); // eslint-disable-line

  // Auto-advance 1s after correct answer
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

  const handleSubmit = useCallback(async () => {
    if (!current || !input.trim() || feedback?.correct || aiChecking) return;
    const answer = input.trim();

    if (mode === 3) {
      // Mode 3: Chinese answer — two-layer matching

      // Layer 1: local match against meaning_zh array
      if (matchChinese(answer, current.meaning_zh)) {
        setFeedback({ correct: true, correctAnswer: current.meaning_zh[0] });
        recordResult(current.id, true);
        recordActivity(1);
        setScore((s) => ({ correct: s.correct + 1, wrong: s.wrong }));
        speak(current.word);
        return;
      }

      // Layer 2: AI judgment fallback
      setAiChecking(true);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "chinese_judgment",
            wordJa: current.word,
            wordKana: current.kana,
            userInput: answer,
            apiKeyOverride: settings.apiKeyOverride || undefined,
          }),
        });
        const data = await res.json();
        const correct: boolean = !!data.correct;

        if (correct) {
          // Learn: append user's answer to this word's meaning_zh array
          const freshWord = words.find((w) => w.id === current.id);
          const currentMeanings = freshWord?.meaning_zh ?? current.meaning_zh;
          const normalized = normalizeChinese(answer);
          if (!currentMeanings.includes(normalized)) {
            updateWord(current.id, { meaning_zh: [...currentMeanings, normalized] });
          }
        }

        setFeedback({ correct, correctAnswer: current.meaning_zh[0] });
        recordResult(current.id, correct);
        recordActivity(1);
        setScore((s) => ({
          correct: s.correct + (correct ? 1 : 0),
          wrong: s.wrong + (correct ? 0 : 1),
        }));
        speak(current.word);
        if (!correct) {
          setTimeout(() => { setInput(""); setFeedback(null); inputRef.current?.focus(); }, 1800);
        }
      } catch {
        setFeedback({ correct: false, correctAnswer: current.meaning_zh[0] });
        recordResult(current.id, false);
        recordActivity(1);
        setScore((s) => ({ correct: s.correct, wrong: s.wrong + 1 }));
        setTimeout(() => { setInput(""); setFeedback(null); inputRef.current?.focus(); }, 1800);
      } finally {
        setAiChecking(false);
      }
    } else {
      // Mode 1 & 2: Japanese answer
      const correct = matchJapanese(answer, [current.word, current.kana]);
      setFeedback({ correct, correctAnswer: current.word });
      recordResult(current.id, correct);
      recordActivity(1);
      setScore((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        wrong: s.wrong + (correct ? 0 : 1),
      }));
      speak(current.word);
      if (!correct) {
        setTimeout(() => { setInput(""); setFeedback(null); inputRef.current?.focus(); }, 1800);
      }
    }
  }, [current, input, feedback, aiChecking, mode, settings.apiKeyOverride, words, recordResult, recordActivity, speak, updateWord]);

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
      <div className="flex flex-col items-center w-full px-6 pt-[18vh] pb-16 gap-3">

        {/* Mode switcher */}
        <div className="w-full flex gap-2 mb-1">
          {([1, 2, 3] as HandwritingMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all
                ${mode === m
                  ? "bg-accent text-white shadow-sm"
                  : "bg-surface text-muted hover:text-foreground"
                }`}
            >
              <div>{MODE_LABELS[m].label}</div>
              <div className={`text-[10px] mt-0.5 ${mode === m ? "text-white/70" : "text-muted/60"}`}>
                {MODE_LABELS[m].desc}
              </div>
            </button>
          ))}
        </div>

        {/* Topic selector */}
        {availableTopics.length > 1 && (
          <div className="w-full flex gap-1.5 flex-wrap">
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
            {/* Question card — content varies by mode */}
            <div className="w-full bg-bg-card border border-surface rounded-2xl p-5 text-center">
              {mode === 1 && (
                /* 辅助模式: show everything — meaning, kanji, kana */
                <>
                  <p className="text-xs text-muted mb-2">{current.pos} · {current.topic}</p>
                  <p className="text-lg text-foreground font-medium mb-2">
                    {current.meaning_zh.join(" / ")}
                  </p>
                  <p className="font-jp text-4xl font-bold text-foreground mb-1">{current.word}</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-base text-accent/80 font-jp">{current.kana}</span>
                    <button onClick={() => speak(current.word)} className="text-muted/40 hover:text-accent transition-colors">
                      <Volume2 size={14} />
                    </button>
                  </div>
                </>
              )}

              {mode === 2 && (
                /* 中→日: show Chinese only */
                <>
                  <p className="text-xs text-muted mb-3">{current.pos} · {current.topic}</p>
                  <p className="text-3xl font-bold text-foreground">{current.meaning_zh[0]}</p>
                  {current.meaning_zh.length > 1 && (
                    <p className="text-xs text-muted/60 mt-1">{current.meaning_zh.slice(1).join(" / ")}</p>
                  )}
                  {settings.showFurigana && feedback && (
                    <div className="mt-3 pt-3 border-t border-surface/40">
                      <p className="font-jp text-4xl font-bold text-foreground">{current.word}</p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-sm text-accent/80 font-jp">{current.kana}</span>
                        <button onClick={() => speak(current.word)} className="text-muted/40 hover:text-accent transition-colors">
                          <Volume2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {mode === 3 && (
                /* 日→中: show Japanese only */
                <>
                  <p className="text-xs text-muted mb-2">{current.pos} · {current.topic}</p>
                  <p className="font-jp text-5xl font-bold text-foreground mb-2">{current.word}</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-base text-accent/80 font-jp">{current.kana}</span>
                    <button onClick={() => speak(current.word)} className="text-muted/40 hover:text-accent transition-colors">
                      <Volume2 size={14} />
                    </button>
                  </div>
                  {feedback && (
                    <p className="text-sm text-muted mt-3 pt-3 border-t border-surface/40">
                      参考：{current.meaning_zh.join(" / ")}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Handwriting input — canvas-style */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === 3 ? "写出中文意思…" : "在此书写…"}
              disabled={!!feedback?.correct || aiChecking}
              lang={mode === 3 ? "zh" : "ja"}
              className={`w-full bg-bg-card border-2 border-dashed rounded-2xl p-4 text-center font-jp text-5xl
                text-foreground placeholder:text-muted/20 focus:outline-none transition-colors resize-none h-40
                ${aiChecking ? "opacity-60" : ""}
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

            {/* Two submit buttons */}
            <div className="w-full flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || !!feedback?.correct || aiChecking}
                className="flex-1 py-4 bg-accent text-white rounded-2xl text-sm font-medium
                  disabled:opacity-40 transition-all hover:bg-accent-dim active:scale-[0.98]
                  flex items-center justify-center gap-2"
              >
                {aiChecking ? <><LoadingSpinner size={14} />验证中…</> : "提交"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || !!feedback?.correct || aiChecking}
                className="flex-1 py-4 bg-accent text-white rounded-2xl text-sm font-medium
                  disabled:opacity-40 transition-all hover:bg-accent-dim active:scale-[0.98]
                  flex items-center justify-center gap-2"
              >
                {aiChecking ? <><LoadingSpinner size={14} />验证中…</> : "提交"}
              </button>
            </div>

            {/* Inline feedback */}
            {feedback && !aiChecking && (
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
