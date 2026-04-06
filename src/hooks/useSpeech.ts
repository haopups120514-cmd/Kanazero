"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// 日语声音优先级（从最自然到最机械）
const JA_VOICE_PRIORITY = [
  "O-ren",          // macOS 高质量女声
  "Kyoko",          // macOS 标准女声
  "Google 日本語",   // Chrome 神经网络声音
  "Microsoft Haruka", // Windows 高质量
  "Microsoft Ayumi",
];

let cachedVoice: SpeechSynthesisVoice | null = null;

function getBestJapaneseVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  for (const name of JA_VOICE_PRIORITY) {
    const v = voices.find((v) => v.name.includes(name));
    if (v) { cachedVoice = v; return v; }
  }
  const fallback = voices.find((v) => v.lang.startsWith("ja"));
  if (fallback) { cachedVoice = fallback; return fallback; }
  return null;
}

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceName, setVoiceName] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);

    const load = () => {
      const v = getBestJapaneseVoice();
      if (v) setVoiceName(v.name);
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const speak = useCallback((text: string) => {
    if (!supported) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ja-JP";
    utter.rate = 0.88;
    utter.pitch = 1.05;
    utter.volume = 1;

    const voice = getBestJapaneseVoice();
    if (voice) utter.voice = voice;

    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utter);
  }, [supported]);

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speak, cancel, speaking, supported, voiceName };
}
