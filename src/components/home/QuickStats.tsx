"use client";
import type { Stats } from "@/types";
import { dueItems } from "@/lib/srs";
import type { Word, Expression } from "@/types";

interface QuickStatsProps {
  stats: Stats;
  todayCount: number;
  dailyGoal: number;
  words: Word[];
  expressions: Expression[];
}

export function QuickStats({
  stats,
  todayCount,
  dailyGoal,
  words,
  expressions,
}: QuickStatsProps) {
  const dueCount =
    dueItems(words.filter((w) => w.srsStage > 0)).length +
    dueItems(expressions.filter((e) => e.srsStage > 0)).length;
  const progress = Math.min(1, todayCount / dailyGoal);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label="今日练习"
        value={todayCount}
        sub={`目标 ${dailyGoal}`}
        extra={
          <div className="mt-1.5 h-1 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        }
      />
      <StatCard
        label="待复习"
        value={dueCount}
        sub="个词汇"
        accent={dueCount > 0 ? "error" : undefined}
      />
      <StatCard
        label="总掌握"
        value={stats.totalWords}
        sub="个单词"
      />
      <StatCard
        label="连续打卡"
        value={stats.currentStreak}
        sub="天"
        accent="accent"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  extra,
}: {
  label: string;
  value: number;
  sub: string;
  accent?: "accent" | "error";
  extra?: React.ReactNode;
}) {
  const valueColor =
    accent === "accent"
      ? "text-accent"
      : accent === "error"
      ? "text-error"
      : "text-foreground";

  return (
    <div className="bg-bg-card border border-surface rounded-xl p-4">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${valueColor}`}>{value}</div>
      <div className="text-xs text-muted/60">{sub}</div>
      {extra}
    </div>
  );
}
