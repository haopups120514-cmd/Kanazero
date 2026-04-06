import type { SrsStage } from "@/types";

// SRS intervals in milliseconds: New → 1d → 3d → 7d → 14d → 30d
const INTERVALS_MS: Record<SrsStage, number> = {
  0: 0,
  1: 1 * 86400_000,
  2: 3 * 86400_000,
  3: 7 * 86400_000,
  4: 14 * 86400_000,
  5: 30 * 86400_000,
};

export function nextStage(current: SrsStage, correct: boolean): SrsStage {
  if (correct) return Math.min(5, current + 1) as SrsStage;
  return Math.max(0, current - 1) as SrsStage;
}

export function nextReviewTime(stage: SrsStage): number {
  return Date.now() + INTERVALS_MS[stage];
}

export function isDue(nextReview: number): boolean {
  return Date.now() >= nextReview;
}

export function dueItems<T extends { nextReview: number; srsStage: SrsStage }>(
  items: T[]
): T[] {
  return items.filter((i) => isDue(i.nextReview)).sort(
    (a, b) => a.nextReview - b.nextReview
  );
}

export function stageLabel(stage: SrsStage): string {
  const labels: Record<SrsStage, string> = {
    0: "新词",
    1: "初学",
    2: "熟悉",
    3: "巩固",
    4: "掌握",
    5: "精通",
  };
  return labels[stage];
}

export function stageColor(stage: SrsStage): string {
  const colors: Record<SrsStage, string> = {
    0: "#6b7280",
    1: "#f87171",
    2: "#fb923c",
    3: "#facc15",
    4: "#4ade80",
    5: "#818cf8",
  };
  return colors[stage];
}

export function formatNextReview(nextReview: number): string {
  if (isDue(nextReview)) return "待复习";
  const diff = nextReview - Date.now();
  const days = Math.floor(diff / 86400_000);
  const hours = Math.floor((diff % 86400_000) / 3600_000);
  if (days > 0) return `${days}天后`;
  if (hours > 0) return `${hours}小时后`;
  return "今天";
}
