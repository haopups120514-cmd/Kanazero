"use client";
import type { DailyActivity } from "@/types";

interface ActivityHeatmapProps {
  activity: DailyActivity;
  days?: number;
}

function getColor(count: number): string {
  if (count === 0) return "#1e2040";
  if (count < 5) return "#166534";
  if (count < 15) return "#16a34a";
  return "#4ade80";
}

function dateToISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function ActivityHeatmap({ activity, days = 91 }: ActivityHeatmapProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build array of dates from oldest to newest
  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d);
  }

  // Pad to full weeks (start from Monday)
  const firstDay = dates[0].getDay(); // 0=Sun
  const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;
  const paddedDates: (Date | null)[] = [
    ...Array(mondayOffset).fill(null),
    ...dates,
  ];

  // Split into weeks
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < paddedDates.length; i += 7) {
    weeks.push(paddedDates.slice(i, i + 7));
  }

  const weekLabels = ["", "一", "", "三", "", "五", ""];
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const first = week.find((d) => d !== null);
    if (first && first.getMonth() !== lastMonth) {
      lastMonth = first.getMonth();
      monthLabels.push({
        label: `${first.getMonth() + 1}月`,
        col: wi,
      });
    }
  });

  const totalCount = Object.values(activity).reduce((s, v) => s + v, 0);
  const streak = (() => {
    let s = 0;
    const d = new Date(today);
    while (true) {
      const key = dateToISO(d);
      if ((activity[key] ?? 0) > 0) { s++; d.setDate(d.getDate() - 1); }
      else if (key === dateToISO(today)) { d.setDate(d.getDate() - 1); }
      else break;
    }
    return s;
  })();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>过去 {days} 天 · 共 {totalCount} 次练习</span>
        <span>连续 <span className="text-accent font-semibold">{streak}</span> 天</span>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-1 mr-1">
            {weekLabels.map((l, i) => (
              <div key={i} className="w-3 h-3 text-[9px] text-muted flex items-center">
                {l}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((date, di) => {
                if (!date) {
                  return <div key={di} className="w-3 h-3 rounded-sm" style={{ backgroundColor: "transparent" }} />;
                }
                const key = dateToISO(date);
                const count = activity[key] ?? 0;
                const isToday = key === dateToISO(today);
                return (
                  <div
                    key={di}
                    title={`${key}: ${count} 次`}
                    className={`w-3 h-3 rounded-sm transition-colors ${isToday ? "ring-1 ring-accent/60" : ""}`}
                    style={{ backgroundColor: getColor(count) }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Month labels */}
        <div className="flex gap-1 mt-1 ml-4 min-w-max">
          {weeks.map((_, wi) => {
            const label = monthLabels.find((m) => m.col === wi);
            return (
              <div key={wi} className="w-3 text-[9px] text-muted text-center">
                {label?.label ?? ""}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1 text-[10px] text-muted">
        <span>少</span>
        {[0, 3, 10, 20].map((v) => (
          <div
            key={v}
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: getColor(v) }}
          />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}
