"use client";
import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/shared/Button";
import { SrsBadge, LevelBadge } from "@/components/shared/Badge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useWords } from "@/hooks/useWords";
import { useExpressions } from "@/hooks/useExpressions";
import { useGenerate } from "@/hooks/useGenerate";
import { formatNextReview } from "@/lib/srs";
import { TOPICS, TOPIC_LABELS, TOPIC_CATEGORIES, LEVEL_OPTIONS } from "@/types";
import type { Word } from "@/types";
import { Plus, RefreshCw } from "lucide-react";

export default function VocabularyPage() {
  const { words, addWords } = useWords();
  const { expressions, addExpressions } = useExpressions();
  const { generate, loading } = useGenerate();

  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [genTopic, setGenTopic] = useState<string>(TOPICS[0]);
  const [genLevel, setGenLevel] = useState("N3");
  const [showGenModal, setShowGenModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const filteredWords: Word[] = words.filter((w) => {
    if (selectedTopic !== "all") return w.topic === selectedTopic;
    if (selectedCategory !== "all") {
      const cat = TOPIC_CATEGORIES.find((c) => c.label === selectedCategory);
      return cat ? (cat.topics as readonly string[]).includes(w.topic) : true;
    }
    return true;
  });

  const visibleTopics = selectedCategory === "all"
    ? TOPICS
    : TOPIC_CATEGORIES.find((c) => c.label === selectedCategory)?.topics ?? [];

  const handleGenerate = async () => {
    const result = await generate({ type: "words", topic: genTopic, level: genLevel, count: 20 });
    if (result?.words) { addWords(result.words); setShowGenModal(false); }
  };

  const handleGenerateExprs = async () => {
    const result = await generate({ type: "expressions", count: 5 });
    if (result?.expressions) addExpressions(result.expressions);
  };

  if (!mounted) return null;

  return (
    <PageLayout maxWidth="lg">
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">词库</h1>
          <p className="text-sm text-muted mt-0.5">
            {words.length} 个单词 · {expressions.length} 个表达
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateExprs} disabled={loading}>
            {loading ? <LoadingSpinner size={14} /> : <RefreshCw size={14} />}
            生成表达
          </Button>
          <Button size="sm" onClick={() => setShowGenModal(true)}>
            <Plus size={14} />
            生成单词
          </Button>
        </div>
      </div>

      {/* Two-level filter */}
      <div className="flex flex-col gap-2 mb-5">
        {/* Category row */}
        <div className="flex gap-2 flex-wrap">
          <TopicBtn
            label={`全部 (${words.length})`}
            active={selectedCategory === "all"}
            onClick={() => { setSelectedCategory("all"); setSelectedTopic("all"); }}
          />
          {TOPIC_CATEGORIES.map((cat) => {
            const cnt = words.filter((w) => (cat.topics as readonly string[]).includes(w.topic)).length;
            if (cnt === 0) return null;
            return (
              <TopicBtn
                key={cat.label}
                label={`${cat.label} (${cnt})`}
                active={selectedCategory === cat.label}
                onClick={() => { setSelectedCategory(cat.label); setSelectedTopic("all"); }}
              />
            );
          })}
        </div>
        {/* Topic row */}
        {visibleTopics.length > 0 && (
          <div className="flex gap-1.5 flex-wrap pl-1">
            {visibleTopics.map((t) => {
              const cnt = words.filter((w) => w.topic === t).length;
              if (cnt === 0) return null;
              return (
                <TopicBtn
                  key={t}
                  label={`${TOPIC_LABELS[t] ?? t} (${cnt})`}
                  active={selectedTopic === t}
                  onClick={() => setSelectedTopic(selectedTopic === t ? "all" : t)}
                  small
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Word table */}
      <div className="rounded-xl border border-surface overflow-hidden w-full">
        {filteredWords.length === 0 ? (
          <div className="py-20 text-center text-muted text-sm">
            暂无单词 · 点击「生成单词」添加内容
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface/50 text-muted text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-2.5">单词</th>
                <th className="text-left px-4 py-2.5 hidden sm:table-cell">罗马字</th>
                <th className="text-left px-4 py-2.5">释义</th>
                <th className="text-left px-4 py-2.5 hidden md:table-cell">等级</th>
                <th className="text-left px-4 py-2.5">SRS</th>
                <th className="text-left px-4 py-2.5 hidden lg:table-cell">复习</th>
              </tr>
            </thead>
            <tbody>
              {filteredWords.map((w, i) => (
                <tr
                  key={w.id}
                  className={`border-t border-surface/40 hover:bg-surface/20 transition-colors ${
                    i % 2 === 1 ? "bg-surface/10" : ""
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <span className="font-jp font-bold text-foreground">{w.word}</span>
                    <span className="text-muted text-xs ml-2 font-jp">{w.kana}</span>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell font-mono text-muted text-xs">{w.romaji}</td>
                  <td className="px-4 py-2.5 text-foreground/80">{w.meaning_zh[0]}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell"><LevelBadge level={w.level} /></td>
                  <td className="px-4 py-2.5"><SrsBadge stage={w.srsStage} /></td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-muted text-xs">{formatNextReview(w.nextReview)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate modal */}
      {showGenModal && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-foreground mb-4">AI 生成单词</h3>
            <div className="flex flex-col gap-3 mb-5">
              <div>
                <label className="text-xs text-muted mb-1 block">主题分类</label>
                <select
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  className="w-full bg-surface border border-surface rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                >
                  {TOPIC_CATEGORIES.map((cat) => (
                    <optgroup key={cat.label} label={cat.label}>
                      {cat.topics.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">难度级别</label>
                <select
                  value={genLevel}
                  onChange={(e) => setGenLevel(e.target.value)}
                  className="w-full bg-surface border border-surface rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                >
                  {LEVEL_OPTIONS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowGenModal(false)} className="flex-1">取消</Button>
              <Button onClick={handleGenerate} disabled={loading} className="flex-1">
                {loading ? <LoadingSpinner size={14} /> : "生成 20 词"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function TopicBtn({ label, active, onClick, small }: { label: string; active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full text-xs transition-colors ${small ? "px-2 py-0.5" : "px-3 py-1"} ${
        active ? "bg-accent text-white" : "bg-surface text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
