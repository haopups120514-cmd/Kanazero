"use client";
import { useState } from "react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export default function SetupPage() {
  const [pw, setPw] = useState("");
  const [data, setData] = useState<{ qr: string; secret: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/setup?pw=${encodeURIComponent(pw)}`);
      const d = await res.json();
      if (d.error) setError(d.error);
      else setData(d);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-xs flex flex-col items-center gap-5">
        <div className="text-center">
          <div className="text-xl font-bold text-foreground mb-1">添加到 Google Authenticator</div>
          <p className="text-xs text-muted">仅限管理员访问</p>
        </div>

        <div className="w-full bg-bg-card border border-surface rounded-2xl p-6 flex flex-col items-center gap-4">
          {!data ? (
            <>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                placeholder="输入管理密码"
                autoFocus
                className="w-full bg-surface border border-surface rounded-xl px-4 py-2.5 text-center text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent transition-colors"
              />
              {error && <p className="text-xs text-error">{error}</p>}
              <button
                onClick={handleUnlock}
                disabled={loading || !pw}
                className="w-full bg-accent hover:bg-accent-dim disabled:opacity-40 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <LoadingSpinner size={16} /> : "解锁"}
              </button>
            </>
          ) : (
            <>
              <img src={data.qr} alt="TOTP QR Code" className="w-48 h-48 rounded-xl" />
              <div className="w-full text-center">
                <p className="text-xs text-muted mb-1.5">手动输入密钥</p>
                <code className="block bg-surface rounded-lg px-3 py-2 font-mono text-sm text-accent break-all text-center">
                  {data.secret}
                </code>
              </div>
              <div className="text-xs text-muted/60 text-center leading-relaxed">
                打开 Google Authenticator →<br />
                右下角 + → 扫描二维码<br />
                账户名显示为 <span className="text-foreground">KanaZero</span>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-muted/40 text-center">
          设置完成后关闭此页面，此后通过验证码登录
        </p>
      </div>
    </div>
  );
}
