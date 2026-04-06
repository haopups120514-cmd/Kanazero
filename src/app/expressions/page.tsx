"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { ExpressionCard } from "@/components/practice/ExpressionCard";
import { Button } from "@/components/shared/Button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useExpressions } from "@/hooks/useExpressions";
import { useGenerate } from "@/hooks/useGenerate";
import { useProgress } from "@/hooks/useProgress";
import { useSpeech } from "@/hooks/useSpeech";
import { matchJapanese } from "@/lib/japaneseMatch";
import * as storage from "@/lib/storage";
import { dueItems } from "@/lib/srs";
import type { Expression } from "@/types";
import { TOPIC_CATEGORIES } from "@/types";
import { KeyboardHint } from "@/components/shared/KeyboardHint";
import { Volume2, Plus, RefreshCw } from "lucide-react";

type Phase = "idle" | "input" | "result";

export default function ExpressionsPage() {
  const { expressions, addExpressions, recordResult } = useExpressions();
  const { generate, loading } = useGenerate();
  const { recordActivity } = useProgress();
  const { speak, speaking } = useSpeech();

  const [queue, setQueue] = useState<Expression[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [input, setInput] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [mounted, setMounted] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genTopic, setGenTopic] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Build queue: due items first, then new
  useEffect(() => {
    if (!mounted) return;
    const due = dueItems(expressions.filter((e) => e.srsStage > 0));
    const fresh = expressions.filter((e) => e.srsStage === 0);
    setQueue([...due, ...fresh]);
  }, [expressions, mounted]);

  const current = queue[index];

  // Focus input when phase changes to input
  useEffect(() => {
    if (phase === "input") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [phase, index]);

  const handleStart = () => {
    setIndex(0);
    setPhase("input");
    setInput("");
    setScore({ correct: 0, wrong: 0 });
  };

  const handleSubmit = useCallback(() => {
    if (!current || !input.trim()) return;
    const correct = matchJapanese(input.trim(), [current.answer_ja, current.answer_kana]);
    setIsCorrect(correct);
    setPhase("result");
    recordResult(current.id, correct);
    recordActivity(1);
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }));

    // 朗读正确答案
    speak(current.answer_ja);
  }, [current, input, recordResult, recordActivity, speak]);

  const handleNext = useCallback(() => {
    if (index + 1 >= queue.length) {
      setPhase("idle");
      return;
    }
    setIndex((i) => i + 1);
    setInput("");
    setPhase("input");
  }, [index, queue.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (phase === "input") handleSubmit();
      else if (phase === "result") handleNext();
    }
  }, [phase, handleSubmit, handleNext]);

  const handleGenerate = async (topic?: string) => {
    const result = await generate({ type: "expressions", count: 5, topic });
    if (result?.expressions) addExpressions(result.expressions);
    setShowGenModal(false);
  };

  if (!mounted) return null;

  // Empty state
  if (queue.length === 0) {
    return (
      <PageLayout center maxWidth="sm">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="text-5xl">💬</div>
          <h2 className="text-xl font-bold text-foreground">情景表达练习</h2>
          <p className="text-muted text-sm">暂无表达题，先生成一批吧</p>
          <Button onClick={() => setShowGenModal(true)} disabled={loading}>
            {loading ? <LoadingSpinner size={16} /> : <Plus size={16} />}
            AI 生成表达题
          </Button>
        </div>
        <GenModal show={showGenModal} loading={loading} topic={genTopic} onTopicChange={setGenTopic}
          onConfirm={() => handleGenerate(genTopic || undefined)} onClose={() => setShowGenModal(false)} />
      </PageLayout>
    );
  }

  // Idle / finished state
  if (phase === "idle") {
    const done = score.correct + score.wrong > 0;
    return (
      <PageLayout center maxWidth="sm">
        <div className="text-center flex flex-col items-center gap-5">
          <div className="text-5xl">{done ? "✅" : "💬"}</div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">情景表达练习</h2>
            <p className="text-muted text-sm">{queue.length} 道题 · 输入日语作答</p>
          </div>

          {done && (
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success font-mono">{score.correct}</div>
                <div className="text-xs text-muted">正确</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-error font-mono">{score.wrong}</div>
                <div className="text-xs text-muted">错误</div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleStart}>
              {done ? "再练一遍" : "开始练习"}
            </Button>
            <Button variant="outline" onClick={() => setShowGenModal(true)} disabled={loading}>
              {loading ? <LoadingSpinner size={14} /> : <RefreshCw size={14} />}
              生成更多
            </Button>
          </div>
        </div>
        <GenModal show={showGenModal} loading={loading} topic={genTopic} onTopicChange={setGenTopic}
          onConfirm={() => handleGenerate(genTopic || undefined)} onClose={() => setShowGenModal(false)} />
      </PageLayout>
    );
  }

  return (
    <PageLayout center maxWidth="md">
      {/* Progress */}
      <div className="text-xs text-muted mb-6 text-center">
        {index + 1} / {queue.length}
        {score.correct + score.wrong > 0 && (
          <span className="ml-3">
            <span className="text-success">{score.correct}✓</span>
            {" · "}
            <span className="text-error">{score.wrong}✗</span>
          </span>
        )}
      </div>

      {current && (
        <div className="flex flex-col items-center gap-6 w-full">
          <ExpressionCard
            expression={current}
            showAnswer={phase === "result"}
            userInput={input}
            isCorrect={isCorrect}
          />

          {/* Answer area */}
          {phase === "result" && (
            <div className="flex flex-col items-center gap-3 w-full">
              {/* Play correct answer */}
              <button
                onClick={() => speak(current.answer_ja)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors
                  ${speaking ? "bg-accent text-white" : "bg-surface text-muted hover:text-accent hover:bg-accent/10"}`}
              >
                <Volume2 size={16} />
                {speaking ? "播放中…" : "再听一遍"}
              </button>
              <Button onClick={handleNext}>
                {index + 1 >= queue.length ? "完成 →" : "下一题 →"}
              </Button>
              <p className="text-xs text-muted/40">Enter 继续</p>
            </div>
          )}

          {phase === "input" && (
            <div className="flex flex-col items-center gap-3 w-full max-w-md">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入日语… (Enter 提交)"
                className="w-full bg-surface/50 border border-surface rounded-xl px-5 py-3 text-center font-jp text-lg text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent transition-colors"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                lang="ja"
              />
              <Button onClick={handleSubmit} disabled={!input.trim()}>
                提交
              </Button>
              <p className="text-xs text-muted/40">Enter 提交</p>
            </div>
          )}
        </div>
      )}
      <KeyboardHint />
    </PageLayout>
  );
}

interface GenModalProps {
  show: boolean;
  loading: boolean;
  topic: string;
  onTopicChange: (t: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

function GenModal({ show, loading, topic, onTopicChange, onConfirm, onClose }: GenModalProps) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-bg-card border border-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-base font-bold text-foreground mb-4">AI 生成表达题</h3>
        <div className="mb-5">
          <label className="text-xs text-muted mb-1 block">场景分类（可选）</label>
          <select
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            className="w-full bg-surface border border-surface rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
          >
            <option value="">随机多场景</option>
            {TOPIC_CATEGORIES.map((cat) => (
              <optgroup key={cat.label} label={cat.label}>
                {cat.topics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-3 py-2 text-sm text-muted hover:text-foreground transition-colors">取消</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? "生成中…" : "生成 5 题"}
          </button>
        </div>
      </div>
    </div>
  );
}
