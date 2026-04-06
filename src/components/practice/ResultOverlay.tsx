"use client";
import type { SessionResult } from "@/types";
import { Button } from "@/components/shared/Button";

interface ResultOverlayProps {
  result: SessionResult;
  onContinue: () => void;
  onEnd: () => void;
}

export function ResultOverlay({ result, onContinue, onEnd }: ResultOverlayProps) {
  const accuracy =
    result.correct + result.wrong > 0
      ? Math.round((result.correct / (result.correct + result.wrong)) * 100)
      : 0;

  return (
    <div className="flex items-center justify-center min-h-screen animate-fade-in">
      <div className="bg-bg-card border border-surface rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl text-center">
        <div className="text-4xl mb-2">☕</div>
        <h2 className="text-xl font-bold text-foreground mb-1">休息一下吧</h2>
        <p className="text-muted text-sm mb-6">番茄时钟结束 · 已完成本节练习</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-surface/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-accent font-mono">
              {result.wordsTyped}
            </div>
            <div className="text-xs text-muted mt-1">单词</div>
          </div>
          <div className="bg-surface/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-success font-mono">
              {accuracy}%
            </div>
            <div className="text-xs text-muted mt-1">准确率</div>
          </div>
          <div className="bg-surface/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-accent-glow font-mono">
              {result.wpm}
            </div>
            <div className="text-xs text-muted mt-1">WPM</div>
          </div>
        </div>

        <div className="text-sm text-muted mb-6">
          练习了 {Math.round(result.duration / 60)} 分钟 ·{" "}
          表达 {result.expressionsTyped} 道 · BJT {result.bjtAnswered} 题
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="ghost" onClick={onEnd}>
            结束练习
          </Button>
          <Button onClick={onContinue}>
            继续练习 →
          </Button>
        </div>
      </div>
    </div>
  );
}
