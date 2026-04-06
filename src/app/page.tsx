"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { ActivityHeatmap } from "@/components/home/ActivityHeatmap";
import { QuickStats } from "@/components/home/QuickStats";
import { useProgress } from "@/hooks/useProgress";
import { useWords } from "@/hooks/useWords";
import { useExpressions } from "@/hooks/useExpressions";
import { useSettings } from "@/hooks/useSettings";
import { Keyboard } from "lucide-react";

export default function HomePage() {
  const { activity, stats, todayCount } = useProgress();
  const { words } = useWords();
  const { expressions } = useExpressions();
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <PageLayout maxWidth="md">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1 tracking-tight">
          KanaZero
        </h1>
        <p className="text-muted text-sm">ゼロから始める日本語タイピング学習</p>
      </div>

      {/* Start button */}
      <div className="flex justify-center mb-10">
        <Link
          href="/practice"
          className="flex items-center gap-3 bg-accent hover:bg-accent-dim text-white px-10 py-4 rounded-2xl font-bold text-lg transition-colors shadow-lg"
        >
          <Keyboard size={22} />
          今日の練習を始める
        </Link>
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
