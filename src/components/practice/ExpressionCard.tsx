"use client";
import type { Expression } from "@/types";

interface ExpressionCardProps {
  expression: Expression;
  showAnswer?: boolean;
  userInput?: string;
  isCorrect?: boolean;
}

export function ExpressionCard({
  expression,
  showAnswer = false,
  userInput,
  isCorrect,
}: ExpressionCardProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center max-w-xl">
      {/* Scenario label */}
      <div className="text-xs text-muted uppercase tracking-widest">情景表达</div>

      {/* Scenario description */}
      <div className="text-foreground text-lg leading-relaxed bg-surface/50 rounded-lg px-6 py-4 border border-surface">
        {expression.scenario_zh}
      </div>

      {/* Answer (shown after submission) */}
      {showAnswer && (
        <div className="flex flex-col items-center gap-2 mt-2">
          <div className="font-jp text-2xl text-success">{expression.answer_ja}</div>
          <div className="text-muted text-sm">{expression.answer_kana}</div>
          {userInput && (
            <div className={`text-sm mt-1 ${isCorrect ? "text-success" : "text-error"}`}>
              你的输入: {userInput}
            </div>
          )}
          <div className="text-xs text-muted/60 mt-2 max-w-sm leading-relaxed">
            {expression.explanation_zh}
          </div>
        </div>
      )}
    </div>
  );
}
