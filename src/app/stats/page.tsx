"use client";
import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { ActivityHeatmap } from "@/components/home/ActivityHeatmap";
import { useProgress } from "@/hooks/useProgress";
import { useWords } from "@/hooks/useWords";
import { Card } from "@/components/shared/Card";
import { stageLabel, stageColor } from "@/lib/srs";
import type { SrsStage } from "@/types";

export default function StatsPage() {
  const { activity, stats } = useProgress();
  const { words } = useWords();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const accuracy =
    stats.totalCorrect + stats.totalWrong > 0
      ? Math.round((stats.totalCorrect / (stats.totalCorrect + stats.totalWrong)) * 100)
      : 0;

  const srsDistribution: Record<SrsStage, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  words.forEach((w) => { srsDistribution[w.srsStage]++; });

  const worstWords = [...words]
    .filter((w) => w.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .slice(0, 10);

  if (!mounted) return null;

  return (
    <PageLayout maxWidth="lg">
      <h1 className="text-xl font-bold text-foreground mb-6 w-full">学习统计</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 w-full">
        <StatCard label="总学习词数" value={stats.totalWords} unit="词" />
        <StatCard label="总正确率" value={accuracy} unit="%" color="text-success" />
        <StatCard label="最高WPM" value={stats.bestWpm} unit="wpm" color="text-accent" />
        <StatCard label="学习时长" value={stats.totalMinutes} unit="分钟" />
      </div>

      <Card className="mb-6 w-full">
        <h2 className="text-sm font-semibold text-foreground mb-4">学习热力图</h2>
        <ActivityHeatmap activity={activity} />
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 w-full">
        <Card>
          <h2 className="text-sm font-semibold text-foreground mb-4">单词掌握分布</h2>
          <div className="flex flex-col gap-2.5">
            {([0, 1, 2, 3, 4, 5] as SrsStage[]).map((stage) => {
              const count = srsDistribution[stage];
              const pct = words.length > 0 ? (count / words.length) * 100 : 0;
              const color = stageColor(stage);
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-xs w-8 flex-shrink-0" style={{ color }}>{stageLabel(stage)}</span>
                  <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-xs text-muted w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-foreground mb-4">BJT 模拟题</h2>
          <div className="flex flex-col gap-3">
            {[
              { label: "已答题数", value: stats.bjtStats.correct + stats.bjtStats.wrong },
              { label: "正确", value: stats.bjtStats.correct, color: "text-success" },
              { label: "错误", value: stats.bjtStats.wrong, color: "text-error" },
              {
                label: "正确率",
                value:
                  stats.bjtStats.correct + stats.bjtStats.wrong > 0
                    ? `${Math.round((stats.bjtStats.correct / (stats.bjtStats.correct + stats.bjtStats.wrong)) * 100)}%`
                    : "—",
                color: "text-accent",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted">{label}</span>
                <span className={`font-mono ${color ?? "text-foreground"}`}>{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {worstWords.length > 0 && (
        <Card className="w-full">
          <h2 className="text-sm font-semibold text-foreground mb-4">常错单词 TOP10</h2>
          <div className="flex flex-col gap-0.5">
            {worstWords.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface/30"
              >
                <div className="flex items-center gap-3">
                  <span className="font-jp font-bold text-foreground">{w.word}</span>
                  <span className="text-muted text-xs">{w.kana}</span>
                  <span className="text-muted/50 text-xs">{w.meaning_zh}</span>
                </div>
                <span className="text-error text-xs font-mono">错 {w.wrongCount} 次</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageLayout>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: number | string; unit?: string; color?: string }) {
  return (
    <div className="bg-bg-card border border-surface rounded-xl p-4">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color ?? "text-foreground"}`}>
        {value}
        {unit && <span className="text-sm font-normal text-muted ml-1">{unit}</span>}
      </div>
    </div>
  );
}
