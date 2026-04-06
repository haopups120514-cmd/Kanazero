import type { SrsStage } from "@/types";
import { stageLabel, stageColor } from "@/lib/srs";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}
      style={color ? { backgroundColor: color + "33", color } : undefined}
    >
      {children}
    </span>
  );
}

export function SrsBadge({ stage }: { stage: SrsStage }) {
  const color = stageColor(stage);
  return <Badge color={color}>{stageLabel(stage)}</Badge>;
}

export function LevelBadge({ level }: { level: string }) {
  return (
    <Badge className="bg-accent/20 text-accent-glow">
      {level}
    </Badge>
  );
}

export function PosBadge({ pos }: { pos: string }) {
  return (
    <Badge className="bg-surface text-muted">
      {pos}
    </Badge>
  );
}
