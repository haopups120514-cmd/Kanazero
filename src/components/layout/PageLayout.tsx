"use client";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { PomodoroBar } from "./PomodoroBar";
import { Eye } from "lucide-react";

interface PageLayoutProps {
  children: React.ReactNode;
  /** 让内容填满高度并垂直居中 */
  center?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  noPadding?: boolean;
}

const MAX_W = {
  sm: "max-w-xl",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

export function PageLayout({
  children,
  center = false,
  maxWidth = "md",
  noPadding = false,
}: PageLayoutProps) {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setFocused(sessionStorage.getItem("kz-focus") === "1");
    const handler = (e: Event) => setFocused((e as CustomEvent<boolean>).detail);
    window.addEventListener("kz-focus-changed", handler);
    return () => window.removeEventListener("kz-focus-changed", handler);
  }, []);

  const exitFocus = () => {
    sessionStorage.setItem("kz-focus", "0");
    window.dispatchEvent(new CustomEvent("kz-focus-changed", { detail: false }));
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <PomodoroBar />

      {/* 专注模式下的还原按钮 */}
      {focused && (
        <button
          onClick={exitFocus}
          title="退出专注模式"
          className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-surface/80 backdrop-blur-sm text-muted hover:text-foreground transition-colors"
        >
          <Eye size={14} />
        </button>
      )}

      <div
        className={`
          flex-1 ${focused ? "" : "ml-16 pr-16"}
          flex flex-col
          ${center ? "items-center justify-center" : "items-center"}
          ${noPadding ? "" : "px-6 py-8"}
          overflow-y-auto
        `}
      >
        <div className={`w-full ${MAX_W[maxWidth]} ${center ? "flex flex-col items-center" : ""}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
