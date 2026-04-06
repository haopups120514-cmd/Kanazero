"use client";
import { useState, useCallback } from "react";
import type { BJTQuestion } from "@/types";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { getSettings } from "@/lib/storage";

interface BJTQuestionCardProps {
  question: BJTQuestion;
  selected?: string;
  onSelect?: (label: string) => void;
  showResult?: boolean;
  showTranslation?: boolean;
  /** 禁用 AI 点评（如在 practice 页内嵌时） */
  noAICorrection?: boolean;
}

export function BJTQuestionCard({
  question,
  selected,
  onSelect,
  showResult = false,
  showTranslation = false,
  noAICorrection = false,
}: BJTQuestionCardProps) {
  const isAnswered = showResult && selected !== undefined;
  const isCorrect = selected === question.answer;

  const [correction, setCorrection] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState(false);

  const fetchCorrection = useCallback(async () => {
    if (correction || correcting) return;
    setCorrecting(true);
    try {
      const settings = getSettings();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "bjt_correction",
          question,
          wrongLabel: selected,
          apiKeyOverride: settings.apiKeyOverride || undefined,
        }),
      });
      const data = await res.json();
      if (data.correction) setCorrection(data.correction);
    } catch {
      setCorrection("（点评加载失败，请检查 API Key）");
    } finally {
      setCorrecting(false);
    }
  }, [correction, correcting, question, selected]);

  // Auto-fetch correction when wrong answer is shown
  const shouldAutoFetch =
    isAnswered && !isCorrect && !noAICorrection && !correction && !correcting;

  if (shouldAutoFetch) {
    fetchCorrection();
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Type label */}
      <div className="text-xs text-muted uppercase tracking-widest text-center">
        BJT 模拟题
      </div>

      {/* Scenario */}
      <div className="bg-surface/50 rounded-xl px-5 py-4 border border-surface text-sm leading-relaxed">
        <p className="font-jp text-foreground leading-7">{question.scenario_ja}</p>
        {showTranslation && (
          <p className="text-muted/60 mt-2 text-xs border-t border-surface/50 pt-2">
            {question.scenario_zh}
          </p>
        )}
      </div>

      {/* Question */}
      <div className="text-center px-2">
        <p className="font-jp text-foreground text-base leading-7">{question.question_ja}</p>
        {showTranslation && (
          <p className="text-muted text-sm mt-1">{question.question_zh}</p>
        )}
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const isSelected = selected === opt.label;
          const isRight = opt.label === question.answer;

          let cls =
            "border border-surface bg-surface/30 hover:border-accent/40 hover:bg-surface/50 cursor-pointer";
          if (isAnswered) {
            if (isRight)
              cls = "border border-success bg-success/10 cursor-default";
            else if (isSelected)
              cls = "border border-error bg-error/10 cursor-default";
            else
              cls = "border border-surface bg-surface/20 opacity-40 cursor-default";
          } else if (isSelected) {
            cls = "border border-accent bg-accent/10";
          }

          return (
            <button
              key={opt.label}
              onClick={() => !isAnswered && onSelect?.(opt.label)}
              disabled={isAnswered}
              className={`rounded-xl px-5 py-3.5 text-left transition-all ${cls}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5
                    ${isAnswered && isRight ? "bg-success text-white" : ""}
                    ${isAnswered && isSelected && !isRight ? "bg-error text-white" : ""}
                    ${!isAnswered ? "bg-surface text-muted" : ""}
                    ${isAnswered && !isRight && !isSelected ? "bg-surface/50 text-muted" : ""}
                  `}
                >
                  {opt.label}
                </span>
                <div>
                  <span className="font-jp text-sm text-foreground">{opt.text_ja}</span>
                  {showTranslation && (
                    <span className="text-muted/60 text-xs ml-2">— {opt.text_zh}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Result section */}
      {isAnswered && (
        <div className="flex flex-col gap-3">
          {/* Correct / Wrong banner */}
          {isCorrect ? (
            <div className="rounded-xl px-5 py-3 bg-success/10 border border-success/30 text-success text-sm flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span className="font-semibold">答对了！</span>
              <span className="text-success/80">{question.explanation_zh}</span>
            </div>
          ) : (
            <div className="rounded-xl px-5 py-3 bg-error/10 border border-error/30 text-sm">
              <div className="flex items-center gap-2 text-error font-semibold mb-2">
                <span className="text-lg">✗</span>
                <span>
                  你选了 {selected}，正确答案是{" "}
                  <span className="text-success">{question.answer}</span>
                </span>
              </div>
              <p className="text-muted text-xs leading-relaxed">{question.explanation_zh}</p>
            </div>
          )}

          {/* AI Teacher correction — only shown when wrong */}
          {!isCorrect && !noAICorrection && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🧑‍🏫</span>
                <span className="text-xs font-semibold text-accent">老师点评</span>
              </div>
              {correcting ? (
                <div className="flex items-center gap-2 text-muted text-xs">
                  <LoadingSpinner size={14} />
                  <span>Claude 正在分析你的错误…</span>
                </div>
              ) : correction ? (
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {correction}
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
