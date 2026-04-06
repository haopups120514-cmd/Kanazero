"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "kz_kbd_hint_dismissed";

const SHORTCUTS = [
  { key: "Enter", desc: "继续 / 提交" },
  { key: "Esc", desc: "返回上一页" },
  { key: "Space", desc: "朗读单词" },
];

export function KeyboardHint() {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    const mobile = window.matchMedia("(pointer: coarse)").matches;
    setIsMobile(mobile);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  // On touch devices show keyboard recommendation instead of shortcuts
  if (isMobile) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
        <div className="bg-bg-card border border-surface rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-xl">
          <div className="text-xs text-muted">
            ⌨️ <span className="text-foreground">推荐连接外接键盘使用</span>，体验更佳
          </div>
          <button onClick={dismiss} className="text-muted hover:text-foreground shrink-0">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-bg-card border border-surface rounded-2xl px-4 py-3 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">快捷键</span>
          <button onClick={dismiss} className="text-muted hover:text-foreground">
            <X size={14} />
          </button>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-muted">
              <kbd className="px-1.5 py-0.5 rounded bg-surface text-foreground font-mono text-[10px]">{key}</kbd>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
