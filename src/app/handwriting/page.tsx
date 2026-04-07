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
import { playCorrect, playWrong } from "@/lib/sounds";
import type { Word } from "@/types";
import { TOPIC_CATEGORIES } from "@/types";
import { Volume2, Lightbulb } from "lucide-react";

type HandwritingMode = 1 | 2 | 3 | 4;

const MODE_LABELS: Record<HandwritingMode, { label: string; desc: string }> = {
  1: { label: "辅助", desc: "照抄日语" },
  2: { label: "中→日", desc: "看义写词" },
  3: { label: "日→中", desc: "看词写义" },
  4: { label: "填空", desc: "例句填词" },
};

function blankWord(example: string, word: string, kana: string): string {
  if (!example) return "";
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const result = example
    .replace(new RegExp(esc(word), "g"), "＿＿＿")
    .replace(new RegExp(esc(kana), "g"), "＿＿＿");
  return result !== example ? result : "";
}

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
  const [streak, setStreak] = useState(0);
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
        setStreak((s) => s + 1);
        playCorrect();
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
        if (correct) { setStreak((s) => s + 1); playCorrect(); }
        else { setStreak(0); playWrong(); }
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
      // Mode 1, 2 & 4: Japanese answer
      const correct = matchJapanese(answer, [current.word, current.kana]);
      setFeedback({ correct, correctAnswer: current.word });
      recordResult(current.id, correct);
      recordActivity(1);
      setScore((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        wrong: s.wrong + (correct ? 0 : 1),
      }));
      if (correct) { setStreak((s) => s + 1); playCorrect(); }
      else { setStreak(0); playWrong(); }
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
      <div className="flex flex-col items-center w-full px-6 pt-4 pb-4 gap-3 min-h-[calc(100dvh-56px)]">

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
          <div className="flex items-center gap-3">
            {streak >= 2 && (
              <span className="text-sm font-bold text-orange-400">🔥 {streak}</span>
            )}
            {score.correct + score.wrong > 0 && (
              <span className="text-xs">
                <span className="text-success">{score.correct}✓</span>
                <span className="text-muted"> · </span>
                <span className="text-error">{score.wrong}✗</span>
              </span>
            )}
          </div>
        </div>

        {current && (
          <>
            {/* Question card — content varies by mode */}
            <div className="w-full bg-bg-card border border-surface rounded-2xl p-5 text-center">
              {mode === 1 && (
                <>
                  <p className="text-xs text-muted mb-2">{current.pos} · {current.topic}</p>
                  <p className="text-lg text-foreground font-medium mb-2">
                    {current.meaning_zh.join(" / ")}
                  </p>
                  <p className="font-jp text-4xl font-bold text-foreground mb-1">{current.word}</p>
                  <span className="text-base text-accent/80 font-jp">{current.kana}</span>
                </>
              )}

              {mode === 2 && (
                <>
                  <p className="text-xs text-muted mb-3">{current.pos} · {current.topic}</p>
                  <p className="text-3xl font-bold text-foreground">{current.meaning_zh[0]}</p>
                  {current.meaning_zh.length > 1 && (
                    <p className="text-xs text-muted/60 mt-1">{current.meaning_zh.slice(1).join(" / ")}</p>
                  )}
                  {settings.showFurigana && feedback && (
                    <div className="mt-3 pt-3 border-t border-surface/40">
                      <p className="font-jp text-4xl font-bold text-foreground">{current.word}</p>
                      <span className="text-sm text-accent/80 font-jp">{current.kana}</span>
                    </div>
                  )}
                </>
              )}

              {mode === 3 && (
                <>
                  <p className="text-xs text-muted mb-2">{current.pos} · {current.topic}</p>
                  <p className="font-jp text-5xl font-bold text-foreground mb-2">{current.word}</p>
                  <span className="text-base text-accent/80 font-jp">{current.kana}</span>
                  {feedback && (
                    <p className="text-sm text-muted mt-3 pt-3 border-t border-surface/40">
                      参考：{current.meaning_zh.join(" / ")}
                    </p>
                  )}
                </>
              )}

              {mode === 4 && (() => {
                const blanked = blankWord(current.example_ja, current.word, current.kana);
                return blanked ? (
                  <>
                    <p className="text-xs text-muted mb-3">{current.pos} · {current.topic}</p>
                    <p className="font-jp text-xl text-foreground leading-relaxed mb-2">{blanked}</p>
                    <p className="text-xs text-muted">{current.example_zh}</p>
                    {feedback && (
                      <p className="font-jp text-sm text-accent font-medium mt-3 pt-3 border-t border-surface/40">
                        答案：{current.word}（{current.kana}）
                      </p>
                    )}
                  </>
                ) : (
                  /* fallback: word not found in example — show as 中→日 with note */
                  <>
                    <p className="text-xs text-muted mb-3">{current.pos} · {current.topic}</p>
                    <p className="text-3xl font-bold text-foreground">{current.meaning_zh[0]}</p>
                    <p className="text-[10px] text-muted/40 mt-2">（无可用例句，改为中→日模式）</p>
                  </>
                );
              })()}
            </div>

            {/* Speaker button — mode 2/4 只显示图标（答案是日语），mode 1/3 显示词 */}
            <div className="w-full flex items-center justify-center gap-2">
              <button
                onClick={() => speak(current.word)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface text-muted hover:text-accent hover:bg-accent/10 transition-colors text-xs"
              >
                <Volume2 size={14} />
                {(mode === 1 || mode === 3) && (
                  <span className="font-jp">{current.word}</span>
                )}
              </button>
            </div>

            {/* Mnemonic hint: mode 1/3 always show; mode 2/4 only after feedback */}
            {current.mnemonic && (mode === 1 || mode === 3 || feedback) && (
              <div className="w-full flex items-start gap-1.5 bg-yellow-400/5 border border-yellow-400/15 rounded-xl px-3 py-2">
                <Lightbulb size={13} className="text-yellow-400 flex-none mt-0.5" />
                <p className="text-xs text-yellow-600 dark:text-yellow-300/80 leading-relaxed">{current.mnemonic}</p>
              </div>
            )}

            {/* Handwriting canvas row: [提交 | textarea | 提交] */}
            <div className="w-full flex items-stretch gap-2">
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || !!feedback?.correct || aiChecking}
                className="flex-none w-14 flex flex-col items-center justify-center gap-0.5
                  bg-accent text-white rounded-2xl text-xs font-medium
                  disabled:opacity-40 transition-all hover:bg-accent-dim active:scale-[0.98]"
              >
                {aiChecking ? <LoadingSpinner size={14} /> : <><span>提</span><span>交</span></>}
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={mode === 3 ? "写出中文意思…" : "在此书写…"}
                disabled={!!feedback?.correct || aiChecking}
                lang={mode === 3 ? "zh" : "ja"}                className={`flex-1 bg-bg-card border-2 border-dashed rounded-2xl p-4 text-center font-jp text-5xl
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

              <button
                onClick={handleSubmit}
                disabled={!input.trim() || !!feedback?.correct || aiChecking}
                className="flex-none w-14 flex flex-col items-center justify-center gap-0.5
                  bg-accent text-white rounded-2xl text-xs font-medium
                  disabled:opacity-40 transition-all hover:bg-accent-dim active:scale-[0.98]"
              >
                {aiChecking ? <LoadingSpinner size={14} /> : <><span>提</span><span>交</span></>}
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

        {/* Mode switcher — bottom */}
        <div className="w-full flex gap-2 mt-auto pt-2">
          {([1, 2, 3, 4] as HandwritingMode[]).map((m) => (
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
