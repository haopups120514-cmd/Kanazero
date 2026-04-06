"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

const AUTH_KEY = "kz_verified";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "verified" | "locked">("loading");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const verified = localStorage.getItem(AUTH_KEY);
    setState(verified === "1" ? "verified" : "locked");
  }, []);

  useEffect(() => {
    if (state === "locked") setTimeout(() => inputRef.current?.focus(), 100);
  }, [state]);

  const handleVerify = useCallback(async () => {
    if (code.replace(/\s/g, "").length < 6) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json() as { valid: boolean; error?: string };
      if (data.valid) {
        localStorage.setItem(AUTH_KEY, "1");
        setState("verified");
      } else {
        setError("验证码错误，请重试");
        setCode("");
        inputRef.current?.focus();
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setChecking(false);
    }
  }, [code]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleVerify();
  };

  if (state === "loading") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (state === "verified") return <>{children}</>;

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="text-center">
          <div className="text-4xl font-bold text-accent font-mono mb-1">K<span className="font-jp">あ</span></div>
          <div className="text-xl font-bold text-foreground">KanaZero</div>
          <div className="text-xs text-muted mt-1">ゼロから始める日本語タイピング学習</div>
        </div>

        {/* Input card */}
        <div className="w-full bg-bg-card border border-surface rounded-2xl p-6 flex flex-col items-center gap-4">
          <p className="text-sm text-muted text-center">请输入 Google Authenticator 验证码</p>

          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
            onKeyDown={handleKeyDown}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            className="w-full bg-surface border border-surface rounded-xl px-4 py-3 text-center font-mono text-3xl tracking-widest text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors"
          />

          {error && <p className="text-xs text-error">{error}</p>}

          <button
            onClick={handleVerify}
            disabled={checking || code.length < 6}
            className="w-full bg-accent hover:bg-accent-dim disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {checking ? <LoadingSpinner size={16} /> : "验证"}
          </button>
        </div>

        <p className="text-xs text-muted/40 text-center">验证成功后本设备将永久记住</p>
      </div>
    </div>
  );
}
