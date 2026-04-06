"use client";
import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { BJTQuestionCard } from "@/components/practice/BJTQuestionCard";
import { Button } from "@/components/shared/Button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useGenerate } from "@/hooks/useGenerate";
import * as storage from "@/lib/storage";
import type { BJTQuestion } from "@/types";
import { Plus, RotateCcw } from "lucide-react";

export default function BJTPage() {
  const [questions, setQuestions] = useState<BJTQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [showResult, setShowResult] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { generate, loading } = useGenerate();

  useEffect(() => {
    setMounted(true);
    setQuestions(storage.getBJTQuestions());
  }, []);

  const handleSelect = (label: string) => {
    setSelected(label);
    setShowResult(true);
    const updated = questions.map((q, i) =>
      i === current ? { ...q, done: true, correct: label === q.answer } : q
    );
    storage.setBJTQuestions(updated);
    setQuestions(updated);
  };

  const handleGenerate = async () => {
    const result = await generate({ type: "bjt_questions", count: 5 });
    if (result?.bjtQuestions) {
      const updated = storage.addBJTQuestions(result.bjtQuestions);
      setQuestions(updated);
    }
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(undefined);
      setShowResult(false);
    }
  };

  const handleReset = () => {
    const reset = questions.map((q) => ({ ...q, done: false, correct: undefined }));
    storage.setBJTQuestions(reset);
    setQuestions(reset);
    setCurrent(0);
    setSelected(undefined);
    setShowResult(false);
  };

  const correct = questions.filter((q) => q.done && q.correct).length;
  const done = questions.filter((q) => q.done).length;

  if (!mounted) return null;

  return (
    <PageLayout maxWidth="md">
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">BJT 模拟题</h1>
          {questions.length > 0 && (
            <p className="text-xs text-muted mt-0.5">
              已答 {done}/{questions.length} · 正确 {correct}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw size={14} />
            重置
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={loading}>
            {loading ? <LoadingSpinner size={14} /> : <Plus size={14} />}
            生成题目
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="text-4xl">📝</div>
          <p className="text-muted text-sm">暂无题目，点击「生成题目」开始</p>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <LoadingSpinner size={16} /> : "AI 生成题目"}
          </Button>
        </div>
      ) : (
        <>
          {/* Question nav pills */}
          <div className="flex gap-1.5 flex-wrap mb-6">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => {
                  setCurrent(i);
                  setSelected(q.done ? q.answer : undefined);
                  setShowResult(q.done);
                }}
                className={`w-7 h-7 rounded text-xs font-mono transition-colors ${
                  i === current
                    ? "bg-accent text-white"
                    : q.done
                    ? q.correct
                      ? "bg-success/20 text-success"
                      : "bg-error/20 text-error"
                    : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Question card */}
          <BJTQuestionCard
            question={questions[current]}
            selected={
              showResult
                ? questions[current].done
                  ? questions[current].correct
                    ? questions[current].answer
                    : selected
                  : selected
                : selected
            }
            onSelect={handleSelect}
            showResult={showResult}
          />

          <div className="mt-6 flex justify-center">
            {showResult && current < questions.length - 1 && (
              <Button onClick={handleNext}>下一题 →</Button>
            )}
            {showResult && current === questions.length - 1 && (
              <div className="text-center flex flex-col items-center gap-3">
                <div className="text-success font-semibold">
                  全部完成！正确率 {done > 0 ? Math.round((correct / done) * 100) : 0}%
                </div>
                <Button onClick={handleGenerate} disabled={loading}>
                  {loading ? <LoadingSpinner size={14} /> : "生成更多题目"}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </PageLayout>
  );
}
