"use client";
import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/shared/Button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useSettings } from "@/hooks/useSettings";
import { useWords } from "@/hooks/useWords";
import { useSync } from "@/hooks/useSync";
import * as storage from "@/lib/storage";
import type { Settings } from "@/types";
import { TOPIC_CATEGORIES } from "@/types";
import { Save, Trash2, Upload, Download, RefreshCw, Copy, Check, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function SettingsPage() {
  const { settings, update } = useSettings();
  const { words, clearAll } = useWords();
  const { generateCode, push, pull, status: syncStatus, errorMsg, isConfigured } = useSync();
  const { isDark, toggle: toggleTheme } = useTheme();

  const [form, setForm] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [syncCode, setSyncCode] = useState("");
  const [pullInput, setPullInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  useEffect(() => {
    setMounted(true);
    setForm(settings);
    setSyncCode(settings.syncCode ?? "");
    setPullInput(settings.syncCode ?? "");
  }, [settings]);

  const handleSave = () => {
    update({ ...form, syncCode });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearData = () => {
    if (confirm("确定清空所有学习数据？此操作不可撤销。")) {
      clearAll();
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleGenerateCode = async () => {
    const code = await generateCode();
    if (code) {
      setSyncCode(code);
      update({ ...form, syncCode: code });
      setSyncMsg("同步码已生成，数据已上传");
    }
  };

  const handlePush = async () => {
    const ok = await push(syncCode);
    setSyncMsg(ok ? "数据已推送到云端 ✓" : errorMsg);
  };

  const handlePull = async () => {
    const ok = await pull(pullInput);
    if (ok) {
      setSyncCode(pullInput);
      update({ ...form, syncCode: pullInput });
      setSyncMsg("数据已拉取，请刷新页面");
      setTimeout(() => window.location.reload(), 1200);
    } else {
      setSyncMsg(errorMsg);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(syncCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Export / Import ──────────────────────────────────────────────────────
  const handleExport = () => {
    const data = {
      words: storage.getWords(),
      expressions: storage.getExpressions(),
      bjtQuestions: storage.getBJTQuestions(),
      activity: storage.getActivity(),
      stats: storage.getStats(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kanazero-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.words) storage.setWords(data.words);
        if (data.expressions) storage.setExpressions(data.expressions);
        if (data.bjtQuestions) storage.setBJTQuestions(data.bjtQuestions);
        if (data.activity) storage.setActivity(data.activity);
        if (data.stats) storage.setStats(data.stats);
        alert("导入成功！页面即将刷新。");
        window.location.reload();
      } catch {
        alert("文件格式错误，请选择正确的备份文件。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!mounted) return null;

  const syncing = syncStatus === "syncing";

  return (
    <PageLayout maxWidth="sm">
      <h1 className="text-xl font-bold text-foreground mb-6 w-full">设置</h1>

      <div className="flex flex-col gap-4 w-full">

        {/* API Key */}
        <Section title="Anthropic API Key">
          <p className="text-xs text-muted mb-2">
            AI 功能已可直接使用，无需填写。如果你有自己的 Key 想单独使用，可以填入（仅存本地，不会上传）。
          </p>
          <input
            type="password"
            value={form.apiKeyOverride}
            onChange={(e) => setForm({ ...form, apiKeyOverride: e.target.value })}
            placeholder="sk-ant-... (可选)"
            className="w-full bg-surface border border-surface rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent font-mono"
          />
          <p className="text-xs text-muted/50 mt-1.5">
            在 <span className="text-accent font-mono">console.anthropic.com</span> 获取 · 使用 Claude Sonnet 模型
          </p>
        </Section>

        {/* Pomodoro */}
        <Section title="番茄时钟">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">每节时长</span>
            <div className="flex gap-1.5">
              {[10, 15, 20, 25, 30].map((m) => (
                <Chip key={m} label={`${m}m`} active={form.pomodoroMinutes === m} onClick={() => setForm({ ...form, pomodoroMinutes: m })} />
              ))}
            </div>
          </div>
        </Section>

        {/* Theme */}
        <Section title="主题外观">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {isDark ? <Moon size={15} className="text-muted" /> : <Sun size={15} className="text-muted" />}
              <span className="text-sm text-muted">{isDark ? "深色模式" : "浅色模式"}</span>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isDark ? "bg-accent" : "bg-surface"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isDark ? "translate-x-[22px]" : "translate-x-0.5"}`} />
            </button>
          </div>
          <p className="text-xs text-muted/50 mt-2">首次加载时跟随系统设置，可手动切换并记住选择</p>
        </Section>

        {/* Daily goal */}
        <Section title="每日目标">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">每日练习词数</span>
            <div className="flex gap-1.5">
              {[10, 20, 30, 50].map((n) => (
                <Chip key={n} label={String(n)} active={form.dailyGoal === n} onClick={() => setForm({ ...form, dailyGoal: n })} />
              ))}
            </div>
          </div>
        </Section>

        {/* Display */}
        <Section title="显示">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted">显示假名</span>
              <button
                onClick={() => setForm({ ...form, showFurigana: !form.showFurigana })}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${form.showFurigana ? "bg-accent" : "bg-surface"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.showFurigana ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">字体大小</span>
              <div className="flex gap-1.5">
                {(["sm", "md", "lg"] as const).map((s) => (
                  <Chip key={s} label={s === "sm" ? "小" : s === "md" ? "中" : "大"} active={form.fontSize === s} onClick={() => setForm({ ...form, fontSize: s })} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Preferred topics */}
        <Section title="偏好主题">
          {TOPIC_CATEGORIES.map((cat) => (
            <div key={cat.label} className="mb-3">
              <p className="text-xs text-muted mb-2">{cat.label}</p>
              <div className="flex flex-wrap gap-2">
                {cat.topics.map((t) => {
                  const sel = form.preferredTopics.includes(t);
                  return (
                    <Chip
                      key={t}
                      label={t}
                      active={sel}
                      onClick={() => setForm({
                        ...form,
                        preferredTopics: sel
                          ? form.preferredTopics.filter((x) => x !== t)
                          : [...form.preferredTopics, t],
                      })}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </Section>

        {/* Cloud sync */}
        <Section title="☁️ 云同步">
          {!isConfigured ? (
            <p className="text-xs text-muted">
              需要配置 Supabase 环境变量（部署到 Vercel 后可用）。<br />
              <span className="text-muted/60">NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Generate new code */}
              <div>
                <p className="text-xs text-muted mb-2">生成同步码，在其他设备输入即可同步数据</p>
                {syncCode ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-surface rounded-lg px-3 py-2 font-mono text-lg tracking-widest text-accent text-center">
                      {syncCode}
                    </code>
                    <button onClick={handleCopyCode} className="p-2 rounded-lg bg-surface hover:bg-accent/20 text-muted hover:text-accent transition-colors">
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button onClick={handlePush} disabled={syncing} className="p-2 rounded-lg bg-surface hover:bg-accent/20 text-muted hover:text-accent transition-colors">
                      {syncing ? <LoadingSpinner size={16} /> : <RefreshCw size={16} />}
                    </button>
                  </div>
                ) : (
                  <Button size="sm" onClick={handleGenerateCode} disabled={syncing}>
                    {syncing ? <LoadingSpinner size={14} /> : "生成同步码"}
                  </Button>
                )}
              </div>

              {/* Pull by code */}
              <div>
                <p className="text-xs text-muted mb-2">在此设备输入同步码拉取数据</p>
                <div className="flex gap-2">
                  <input
                    value={pullInput}
                    onChange={(e) => setPullInput(e.target.value.toUpperCase())}
                    placeholder="输入6位同步码"
                    maxLength={6}
                    className="flex-1 bg-surface border border-surface rounded-lg px-3 py-2 text-sm font-mono text-foreground uppercase tracking-widest focus:outline-none focus:border-accent"
                  />
                  <Button size="sm" onClick={handlePull} disabled={syncing || pullInput.length < 6}>
                    {syncing ? <LoadingSpinner size={14} /> : "拉取"}
                  </Button>
                </div>
              </div>

              {syncMsg && (
                <p className={`text-xs ${syncStatus === "error" ? "text-error" : "text-success"}`}>
                  {syncMsg}
                </p>
              )}
            </div>
          )}
        </Section>

        {/* Export / Import */}
        <Section title="数据备份">
          <p className="text-xs text-muted mb-3">导出 JSON 文件作为手动备份，或从备份恢复数据。</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download size={14} />
              导出数据
            </Button>
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface text-muted hover:border-accent hover:text-accent text-xs font-medium cursor-pointer transition-colors">
              <Upload size={14} />
              导入数据
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </Section>

        {/* Save */}
        <div className="flex justify-between items-center pt-2">
          <Button onClick={handleSave}>
            <Save size={14} />
            {saved ? "已保存 ✓" : "保存设置"}
          </Button>
          <Button variant="danger" size="sm" onClick={handleClearData}>
            <Trash2 size={14} />
            清空数据
          </Button>
        </div>

        <p className="text-xs text-muted/40 text-center">
          词库 {words.length} 个 · 数据存储于浏览器 localStorage
        </p>
      </div>
    </PageLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-surface rounded-xl p-5">
      <h2 className="text-sm font-semibold text-foreground mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-xs transition-colors ${active ? "bg-accent text-white" : "bg-surface text-muted hover:text-foreground"}`}
    >
      {label}
    </button>
  );
}
