"use client";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export default function SetupPage() {
  const [data, setData] = useState<{ qr: string; secret: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("加载失败"));
  }, []);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-xs flex flex-col items-center gap-5">
        <div className="text-center">
          <div className="text-xl font-bold text-foreground mb-1">添加到 Google Authenticator</div>
          <p className="text-xs text-muted">扫描二维码，或手动输入密钥</p>
        </div>

        <div className="w-full bg-bg-card border border-surface rounded-2xl p-6 flex flex-col items-center gap-4">
          {!data && !error && <LoadingSpinner size={32} />}
          {error && <p className="text-sm text-error">{error}</p>}
          {data && (
            <>
              {/* QR Code */}
              <img src={data.qr} alt="TOTP QR Code" className="w-48 h-48 rounded-xl" />

              {/* Manual secret */}
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
