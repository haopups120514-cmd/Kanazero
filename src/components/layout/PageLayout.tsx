"use client";
import { Sidebar } from "./Sidebar";
import { PomodoroBar } from "./PomodoroBar";

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
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <PomodoroBar />

      {/*
        Content area: starts after 64px sidebar.
        To visually center on the full viewport we compensate with pr-16.
        This makes mx-auto center relative to the full screen, not just the remaining space.
      */}
      <div
        className={`
          flex-1 ml-16 pr-16
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
