"use client";
import { useEffect } from "react";
import type { Word } from "@/types";
import { LevelBadge, PosBadge } from "@/components/shared/Badge";
import { useSpeech } from "@/hooks/useSpeech";
import { Volume2, VolumeX } from "lucide-react";

interface WordCardProps {
  word: Word;
  showFurigana?: boolean;
  showExample?: boolean;
  autoSpeak?: boolean;
}

export function WordCard({
  word,
  showFurigana = true,
  showExample = false,
  autoSpeak = false,
}: WordCardProps) {
  const { speak, speaking, supported } = useSpeech();

  // 新单词出现时自动朗读
  useEffect(() => {
    if (autoSpeak && supported) {
      const timer = setTimeout(() => speak(word.word), 300);
      return () => clearTimeout(timer);
    }
  }, [word.id, autoSpeak, supported, speak, word.word]);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {/* Meaning + badges */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="text-lg text-foreground font-medium">{word.meaning_zh}</span>
        <PosBadge pos={word.pos} />
        <LevelBadge level={word.level} />
      </div>

      {/* Kanji + 朗读按钮 */}
      <div className="flex flex-col items-center gap-1">
        {showFurigana && (
          <div className="font-jp text-xl text-accent/70 tracking-widest leading-none">
            {word.kana}
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="font-jp text-6xl font-bold text-foreground leading-none">
            {word.word}
          </div>

          {/* 喇叭按钮 */}
          {supported && (
            <button
              onClick={() => speak(word.word)}
              title="朗读发音"
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all
                ${speaking
                  ? "bg-accent text-white scale-110"
                  : "bg-surface text-muted hover:bg-accent/20 hover:text-accent"
                }`}
            >
              {speaking ? <Volume2 size={18} /> : <Volume2 size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Romaji */}
      <div className="font-mono text-base text-muted tracking-widest">
        [{word.romaji}]
      </div>

      {/* Example */}
      {showExample && (
        <div className="mt-2 max-w-md bg-surface/40 rounded-xl px-5 py-3 border border-surface text-center">
          <div className="flex items-start gap-2 justify-center">
            <p className="font-jp text-sm text-foreground/80 leading-7">{word.example_ja}</p>
            {supported && (
              <button
                onClick={() => speak(word.example_ja)}
                className="flex-shrink-0 mt-1.5 text-muted hover:text-accent transition-colors"
                title="朗读例句"
              >
                <Volume2 size={14} />
              </button>
            )}
          </div>
          <p className="text-xs text-muted/60 mt-1">{word.example_zh}</p>
        </div>
      )}

      {/* Topic */}
      <div className="text-xs text-muted/40">{word.topic}</div>
    </div>
  );
}
