"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Keyboard,
  RotateCcw,
  BookOpen,
  FileQuestion,
  BarChart2,
  Settings,
  MessageSquare,
  PenTool,
} from "lucide-react";

const NAV = [
  { href: "/", icon: Home, label: "首页" },
  { href: "/practice", icon: Keyboard, label: "练习" },
  { href: "/handwriting", icon: PenTool, label: "手写" },
  { href: "/expressions", icon: MessageSquare, label: "表达" },
  { href: "/review", icon: RotateCcw, label: "复习" },
  { href: "/vocabulary", icon: BookOpen, label: "词库" },
  { href: "/bjt", icon: FileQuestion, label: "题库" },
  { href: "/stats", icon: BarChart2, label: "统计" },
  { href: "/settings", icon: Settings, label: "设置" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-16 flex flex-col items-center py-4 gap-1 bg-bg-card border-r border-surface z-40">
      {/* Logo */}
      <div className="mb-3 text-center leading-tight">
        <div className="text-accent font-bold font-mono text-sm">K</div>
        <div className="text-accent/70 font-jp text-xs">あ</div>
      </div>

      {NAV.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={`flex flex-col items-center gap-1 w-12 h-12 rounded-lg transition-colors
              ${active
                ? "bg-accent/20 text-accent"
                : "text-muted hover:text-foreground hover:bg-surface"
              }`}
          >
            <Icon size={20} className="mt-2" />
            <span className="text-[9px] leading-none">{label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
