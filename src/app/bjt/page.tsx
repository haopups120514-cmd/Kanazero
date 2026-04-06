"use client";
import { useState, useEffect, useRef } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { BJTQuestionCard } from "@/components/practice/BJTQuestionCard";
import { Button } from "@/components/shared/Button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useGenerate } from "@/hooks/useGenerate";
import * as storage from "@/lib/storage";
import type { BJTQuestion } from "@/types";
import { EXAM_TYPES } from "@/types";
import { Plus, RotateCcw, Upload } from "lucide-react";

export default function QuestionBankPage() {
  const [allQuestions, setAllQuestions] = useState<BJTQuestion[]>([]);
  const [examType, setExamType] = useState<string>("BJT");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [showResult, setShowResult] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { generate, loading } = useGenerate();

  useEffect(() => {
    setMounted(true);
    setAllQuestions(storage.getBJTQuestions());
  }, []);

  // Questions filtered by selected exam type
  const questions = allQuestions.filter((q) => (q.examType ?? "BJT") === examType);

  // Reset navigation when exam type changes
  useEffect(() => {
    setCurrent(0);
    setSelected(undefined);
    setShowResult(false);
  }, [examType]);

  const handleSelect = (label: string) => {
    setSelected(label);
    setShowResult(true);
    const targetId = questions[current]?.id;
    const updated = allQuestions.map((q) =>
      q.id === targetId ? { ...q, done: true, correct: label === q.answer } : q
    );
    storage.setBJTQuestions(updated);
    setAllQuestions(updated);
  };

  const handleGenerate = async () => {
    const result = await generate({ type: "bjt_questions", count: 5, examType });
    if (result?.bjtQuestions) {
      const updated = storage.addBJTQuestions(result.bjtQuestions);
      setAllQuestions(updated);
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
    const reset = allQuestions.map((q) =>
      (q.examType ?? "BJT") === examType ? { ...q, done: false, correct: undefined } : q
    );
    storage.setBJTQuestions(reset);
    setAllQuestions(reset);
    setCurrent(0);
    setSelected(undefined);
    setShowResult(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.type === "application/pdf") {
      alert("暂不支持直接上传 PDF，请将题目复制为文本后保存为 .txt 文件再上传。");
      return;
    }

    setParsing(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "parse_questions", fileContent: text, examType, count: 20 }),
      });
      if (!res.ok) throw new Error("解析失败");
      const data = await res.json();
      if (data.bjtQuestions?.length > 0) {
        const updated = storage.addBJTQuestions(data.bjtQuestions);
        setAllQuestions(updated);
        alert(`成功解析 ${data.bjtQuestions.length} 道题目并入库。`);
      } else {
        alert("未能从文件中识别出选择题，请检查文件格式。");
      }
    } catch {
      alert("解析出错，请重试。");
    } finally {
      setParsing(false);
    }
  };

  const correct = questions.filter((q) => q.done && q.correct).length;
  const done = questions.filter((q) => q.done).length;

  if (!mounted) return null;

  const examTypeCounts = EXAM_TYPES.map((et) => ({
    type: et,
    count: allQuestions.filter((q) => (q.examType ?? "BJT") === et).length,
  }));

  return (
    <PageLayout maxWidth="md">
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">题库</h1>
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
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted border border-surface rounded-lg hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
          >
            {parsing ? <LoadingSpinner size={12} /> : <Upload size={12} />}
            上传题库
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.json" className="hidden" onChange={handleFileUpload} />
          <Button size="sm" onClick={handleGenerate} disabled={loading}>
            {loading ? <LoadingSpinner size={14} /> : <Plus size={14} />}
            生成题目
          </Button>
        </div>
      </div>

      {/* Exam type tabs */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {examTypeCounts.map(({ type: et, count }) => (
          <button
            key={et}
            onClick={() => setExamType(et)}
            className={`px-3 py-1 rounded-lg text-xs transition-colors ${
              examType === et
                ? "bg-accent text-white"
                : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            {et}
            {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
          </button>
        ))}
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-4xl">📝</div>
          <p className="text-muted text-sm">
            暂无 {examType} 题目，点击「生成题目」或「上传题库」开始
          </p>
          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? <LoadingSpinner size={16} /> : "AI 生成题目"}
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={parsing}>
              {parsing ? <LoadingSpinner size={16} /> : <Upload size={14} />}
              上传题库
            </Button>
          </div>
          <p className="text-xs text-muted/50">上传 .txt 或 .json 文件，AI 自动解析选择题</p>
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
