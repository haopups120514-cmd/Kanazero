import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export function Card({ className = "", glass = false, children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-surface bg-bg-card p-4 ${
        glass ? "backdrop-blur-sm bg-opacity-80" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
