"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { ActivityHeatmap } from "@/components/home/ActivityHeatmap";
import { QuickStats } from "@/components/home/QuickStats";
import { useProgress } from "@/hooks/useProgress";
import { useWords } from "@/hooks/useWords";
import { useExpressions } from "@/hooks/useExpressions";
import { useSettings } from "@/hooks/useSettings";
import { dueItems } from "@/lib/srs";
import { playCelebration } from "@/lib/sounds";
import { Keyboard, RotateCcw, ClipboardCheck } from "lucide-react";

export default function HomePage() {
  const { activity, stats, todayCount } = useProgress();
  const { words } = useWords();
  const { expressions } = useExpressions();
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);
  const celebratedRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  const dueCount = mounted
    ? dueItems(words.filter((w) => w.srsStage > 0)).length +
      dueItems(expressions.filter((e) => e.srsStage > 0)).length
    : 0;

  const todayStudied = mounted ? (() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return words.filter((w) => w.lastReview >= start.getTime() && w.lastReview > 0).length;
  })() : 0;

  const goalMet = mounted && todayCount >= settings.dailyGoal && todayCount > 0;

  // 首次达到今日目标时播放庆祝音效
  useEffect(() => {
    if (goalMet && !celebratedRef.current) {
      celebratedRef.current = true;
      playCelebration();
    }
  }, [goalMet]);

  return (
    <PageLayout maxWidth="md">
      {/* Hero */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-1 tracking-tight">
          KanaZero
        </h1>
        <p className="text-muted text-sm">ゼロから始める日本語タイピング学習</p>
      </div>

      {/* 今日目标完成庆祝横幅 */}
      {goalMet && (
        <div className="mb-6 bg-success/10 border border-success/30 rounded-2xl px-5 py-4 text-center">
          <p className="text-xl mb-0.5">🎉</p>
          <p className="text-success font-bold text-sm">今日目标完成！</p>
          <p className="text-muted text-xs mt-0.5">已练习 {todayCount} 个，继续保持</p>
        </div>
      )}

      {/* 智能开始按钮：有待复习词汇时优先引导复习 */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <Link
          href={dueCount > 0 ? "/review" : "/practice"}
          className="flex items-center gap-3 bg-accent hover:bg-accent-dim text-white px-10 py-4 rounded-2xl font-bold text-lg transition-colors shadow-lg"
        >
          {dueCount > 0 ? <RotateCcw size={22} /> : <Keyboard size={22} />}
          {dueCount > 0 ? `复习 ${dueCount} 个词汇` : "今日の練習を始める"}
        </Link>
        {dueCount > 0 && (
          <Link href="/practice" className="text-sm text-muted hover:text-foreground transition-colors">
            练习新词 →
          </Link>
        )}
        {todayStudied > 0 && (
          <Link
            href="/quiz"
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-surface text-muted hover:text-foreground hover:bg-surface/80 text-sm transition-colors"
          >
            <ClipboardCheck size={15} />
            今日测验 · {todayStudied} 个词
          </Link>
        )}
      </div>

      {mounted && (
        <>
          <QuickStats
            stats={stats}
            todayCount={todayCount}
            dailyGoal={settings.dailyGoal}
            words={words}
            expressions={expressions}
          />

          <div className="mt-6 bg-bg-card border border-surface rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">学习记录</h2>
            <ActivityHeatmap activity={activity} />
          </div>

          <div className="mt-4 text-center text-xs text-muted">
            词库: <span className="text-accent">{words.length}</span> 个 ·{" "}
            表达: <span className="text-accent">{expressions.length}</span> 个 ·{" "}
            <Link href="/vocabulary" className="underline hover:text-foreground">
              管理词库 →
            </Link>
          </div>
        </>
      )}
    </PageLayout>
  );
}
