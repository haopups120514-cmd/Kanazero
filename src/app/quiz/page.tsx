"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useSpeech } from "@/hooks/useSpeech";
import { useWords } from "@/hooks/useWords";
import { matchJapanese, matchChinese } from "@/lib/japaneseMatch";
import { playCorrect, playWrong } from "@/lib/sounds";
import type { Word } from "@/types";
import { Volume2, CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";

type QuestionType = "mc" | "fill" | "ja_to_zh";

interface QuizQ {
  wordId: string;
  type: QuestionType;
  wordJa: string;
  wordKana: string;
  // MC
  prompt?: string;
  options?: string[];
  // Fill
  blanked?: string;
  exampleZh?: string;
  // Result
  answer: string;         // correct answer (word)
  meanings: string[];     // meaning_zh array
}

function blankWord(example: string, word: string, kana: string): string {
  if (!example) return "";
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const result = example
    .replace(new RegExp(esc(word), "g"), "＿＿＿")
    .replace(new RegExp(esc(kana), "g"), "＿＿＿");
  return result !== example ? result : "";
}

function buildQuiz(studied: Word[], allWords: Word[]): QuizQ[] {
  return studied.map((w, i) => {
    const cycle = i % 3;

    // Fill-in-blank: only if we can actually blank the word
    if (cycle === 1) {
      const blanked = blankWord(w.example_ja, w.word, w.kana);
      if (blanked) {
        return {
          wordId: w.id, type: "fill",
          wordJa: w.word, wordKana: w.kana,
          blanked, exampleZh: w.example_zh,
          answer: w.word, meanings: w.meaning_zh,
        };
      }
    }

    // ja_to_zh: show Japanese, type Chinese meaning
    if (cycle === 2) {
      return {
        wordId: w.id, type: "ja_to_zh",
        wordJa: w.word, wordKana: w.kana,
        answer: w.meaning_zh[0], meanings: w.meaning_zh,
      };
    }

    // MC: show Chinese meaning, pick correct Japanese word
    const distractors = allWords
      .filter((x) => x.id !== w.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((x) => x.word);
    const options = [w.word, ...distractors].sort(() => Math.random() - 0.5);
    return {
      wordId: w.id, type: "mc",
      wordJa: w.word, wordKana: w.kana,
      prompt: w.meaning_zh[0], options,
      answer: w.word, meanings: w.meaning_zh,
    };
  });
}

export default function QuizPage() {
  const { words } = useWords();
  const { speak } = useSpeech();

  const [mounted, setMounted] = useState(false);
  const [questions, setQuestions] = useState<QuizQ[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: string } | null>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [done, setDone] = useState(false);
  const [wrongWords, setWrongWords] = useState<QuizQ[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialQRef = useRef<QuizQ[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || words.length === 0) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const studied = words.filter(
      (w) => w.lastReview >= todayStart.getTime() && w.lastReview > 0
    );
    const q = buildQuiz(studied, words);
    setQuestions(q);
    initialQRef.current = q;
  }, [mounted, words]);

  const current = questions[index];

  useEffect(() => {
    if (current?.type !== "mc") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [index, current?.type]);

  const submit = useCallback((ans: string) => {
    if (!current || feedback) return;
    const correct =
      current.type === "ja_to_zh"
        ? matchChinese(ans, current.meanings)
        : matchJapanese(ans, [current.answer, current.wordKana]);

    setFeedback({ correct, answer: current.answer });
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));
    if (correct) { playCorrect(); speak(current.wordJa); }
    else { playWrong(); setWrongWords((p) => p.some(q => q.wordId === current.wordId) ? p : [...p, current]); }
  }, [current, feedback, speak]);

  const next = useCallback(() => {
    setFeedback(null);
    setInput("");
    setSelected(null);
    if (index + 1 >= questions.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, questions.length]);

  const restart = () => {
    const q = [...initialQRef.current].sort(() => Math.random() - 0.5);
    setQuestions(q);
    setIndex(0);
    setInput("");
    setSelected(null);
    setFeedback(null);
    setScore({ correct: 0, wrong: 0 });
    setWrongWords([]);
    setDone(false);
  };

  if (!mounted) return null;

  // No words studied today
  if (questions.length === 0) {
    return (
      <PageLayout center maxWidth="sm">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="text-5xl">📋</div>
          <h2 className="text-xl font-bold text-foreground">今日测验</h2>
          <p className="text-muted text-sm">今天还没有学习记录</p>
          <p className="text-muted/60 text-xs">先去练习或复习一些单词，再来测验吧</p>
        </div>
      </PageLayout>
    );
  }

  // Done screen
  if (done) {
    const total = score.correct + score.wrong;
    const pct = Math.round((score.correct / total) * 100);
    return (
      <PageLayout center maxWidth="sm">
        <div className="flex flex-col items-center gap-5 w-full">
          <Trophy size={48} className={pct >= 80 ? "text-yellow-400" : "text-muted"} />
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">今日测验完成！</h2>
            <p className="text-muted text-sm mt-1">
              {pct >= 80 ? "棒极了！你今天学得很扎实 🎉" :
               pct >= 60 ? "不错！还有一些词需要加强 💪" :
               "加油！这些词再多练几遍 📚"}
            </p>
          </div>

          <div className="flex gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-success">{score.correct}</div>
              <div className="text-xs text-muted">正确</div>
            </div>
            <div className="text-3xl font-bold text-muted">/</div>
            <div>
              <div className="text-3xl font-bold text-foreground">{total}</div>
              <div className="text-xs text-muted">总题数</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent">{pct}%</div>
              <div className="text-xs text-muted">正确率</div>
            </div>
          </div>

          {wrongWords.length > 0 && (
            <div className="w-full bg-error/5 border border-error/20 rounded-xl p-4">
              <p className="text-xs text-error mb-2 font-medium">需要加强的词：</p>
              <div className="flex flex-wrap gap-2">
                {wrongWords.map((q) => (
                  <button
                    key={q.wordId}
                    onClick={() => speak(q.wordJa)}
                    className="flex items-center gap-1 bg-bg-card border border-surface rounded-full px-3 py-1 text-xs font-jp text-foreground hover:border-accent transition-colors"
                  >
                    <Volume2 size={11} className="text-muted" />
                    {q.wordJa}
                    <span className="text-muted ml-1">{q.meanings[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={restart}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-dim transition-colors"
          >
            <RotateCcw size={16} />
            再来一遍
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="sm">
      {/* Progress */}
      <div className="w-full mb-4">
        <div className="flex justify-between text-xs text-muted mb-1.5">
          <span>{index + 1} / {questions.length}</span>
          <span>
            <span className="text-success">{score.correct}✓</span>
            {score.wrong > 0 && <span className="text-error ml-2">{score.wrong}✗</span>}
          </span>
        </div>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {current && (
        <div className="flex flex-col gap-4 w-full">
          {/* Type label */}
          <div className="text-xs text-muted/60 text-center">
            {current.type === "mc" && "选择正确的日语单词"}
            {current.type === "fill" && "填写例句中缺失的单词"}
            {current.type === "ja_to_zh" && "写出这个词的中文意思"}
          </div>

          {/* Question card */}
          <div className="w-full bg-bg-card border border-surface rounded-2xl p-6 text-center">
            {current.type === "mc" && (
              <p className="text-2xl font-bold text-foreground">{current.prompt}</p>
            )}
            {current.type === "fill" && (
              <>
                <p className="font-jp text-xl text-foreground leading-relaxed mb-2">
                  {current.blanked}
                </p>
                <p className="text-xs text-muted">{current.exampleZh}</p>
              </>
            )}
            {current.type === "ja_to_zh" && (
              <>
                <p className="font-jp text-5xl font-bold text-foreground mb-2">
                  {current.wordJa}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-accent/80 font-jp">{current.wordKana}</span>
                  <button onClick={() => speak(current.wordJa)} className="text-muted/40 hover:text-accent transition-colors">
                    <Volume2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* MC options */}
          {current.type === "mc" && (
            <div className="grid grid-cols-2 gap-2">
              {current.options!.map((opt) => {
                const isCorrect = opt === current.answer;
                const isSelected = opt === selected;
                let cls = "w-full py-3 px-4 rounded-xl text-sm font-jp font-medium border transition-all ";
                if (feedback) {
                  if (isCorrect) cls += "bg-success/15 border-success/40 text-success";
                  else if (isSelected && !isCorrect) cls += "bg-error/15 border-error/40 text-error";
                  else cls += "bg-surface border-surface/50 text-muted/50";
                } else {
                  cls += isSelected
                    ? "bg-accent/10 border-accent text-accent"
                    : "bg-bg-card border-surface text-foreground hover:border-accent/50";
                }
                return (
                  <button key={opt} className={cls}
                    onClick={() => { if (feedback) return; setSelected(opt); submit(opt); }}>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Text input for fill / ja_to_zh */}
          {(current.type === "fill" || current.type === "ja_to_zh") && (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) submit(input.trim()); }}
                placeholder={current.type === "fill" ? "输入缺失的单词…" : "输入中文意思…"}
                disabled={!!feedback}
                lang={current.type === "fill" ? "ja" : "zh"}
                className={`flex-1 bg-bg-card border-2 rounded-xl px-4 py-3 text-center font-jp text-lg
                  text-foreground placeholder:text-muted/30 focus:outline-none transition-colors
                  ${feedback
                    ? feedback.correct ? "border-success/60 bg-success/5" : "border-error/60 bg-error/5"
                    : "border-surface focus:border-accent/50"
                  }`}
                autoComplete="off" autoCorrect="off" spellCheck={false}
              />
              {!feedback && (
                <button
                  onClick={() => input.trim() && submit(input.trim())}
                  disabled={!input.trim()}
                  className="px-4 py-3 bg-accent text-white rounded-xl text-sm font-medium disabled:opacity-40 transition-all"
                >
                  确认
                </button>
              )}
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div className={`w-full rounded-xl px-4 py-3 flex items-center gap-3 border
              ${feedback.correct
                ? "bg-success/10 border-success/30"
                : "bg-error/10 border-error/30"
              }`}>
              {feedback.correct
                ? <CheckCircle2 size={18} className="text-success flex-none" />
                : <XCircle size={18} className="text-error flex-none" />
              }
              <div className="flex-1">
                {feedback.correct
                  ? <span className="text-success text-sm font-medium">正确！</span>
                  : <span className="text-error text-sm">
                      正确答案：<span className="font-jp font-bold ml-1">{feedback.answer}</span>
                    </span>
                }
              </div>
              <button
                onClick={() => { speak(current.wordJa); }}
                className="text-muted/50 hover:text-accent transition-colors"
              >
                <Volume2 size={15} />
              </button>
            </div>
          )}

          {/* Next button */}
          {feedback && (
            <button
              onClick={next}
              autoFocus
              className="w-full py-3 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-dim transition-colors"
            >
              {index + 1 >= questions.length ? "查看结果" : "下一题 →"}
            </button>
          )}
        </div>
      )}
    </PageLayout>
  );
}
