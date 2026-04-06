"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSettings } from "@/lib/storage";

// ─── IndexedDB audio cache ────────────────────────────────────────────────────

const DB_NAME = "kz-audio-v1";
const DB_STORE = "audio";
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

async function dbGet(key: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function dbSet(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).put(blob, key);
  } catch { /* ignore */ }
}

// ─── In-session URL cache (avoids creating duplicate object URLs) ─────────────

const sessionCache = new Map<string, string>(); // key → object URL

// ─── VoiceVox fetch ───────────────────────────────────────────────────────────

const ENDPOINTS = [
  (text: string, speaker: number) =>
    `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(text)}&speaker=${speaker}`,
];

async function fetchVoiceVoxBlob(text: string, speaker: number): Promise<Blob | null> {
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint(text, speaker), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;

      const ct = res.headers.get("content-type") ?? "";

      if (ct.startsWith("audio/")) {
        const blob = await res.blob();
        if (blob.size > 0) return blob;
        continue;
      }

      // v3 API returns JSON with audio URLs
      if (ct.includes("application/json")) {
        const json = await res.json();
        if (!json.success) continue;

        // Prefer the fixed-size download URL over streaming (easier to cache)
        const audioUrl: string | undefined = json.mp3DownloadUrl ?? json.mp3StreamingUrl ?? json.wavDownloadUrl;
        if (audioUrl) {
          const ar = await fetch(audioUrl, { signal: AbortSignal.timeout(10000) });
          if (ar.ok) {
            const blob = await ar.blob();
            if (blob.size > 0) return blob;
          }
        }
      }
    } catch { /* try next endpoint */ }
  }
  return null;
}

// ─── Web Speech API fallback ──────────────────────────────────────────────────

function webSpeechFallback(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ja-JP";
  utter.rate = 0.88;
  utter.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const jaVoice =
    voices.find((v) => ["O-ren", "Kyoko", "Google 日本語"].some((n) => v.name.includes(n))) ??
    voices.find((v) => v.lang.startsWith("ja"));
  if (jaVoice) utter.voice = jaVoice;
  window.speechSynthesis.speak(utter);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speakerRef = useRef<number>(1);

  // Keep speakerRef in sync with settings (reacts to settings changes)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => { speakerRef.current = getSettings().voicevoxSpeaker ?? 1; };
    load();
    window.addEventListener("kz-settings-changed", load);
    return () => window.removeEventListener("kz-settings-changed", load);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text || !supported) return;

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    setSpeaking(true);
    const speaker = speakerRef.current;
    const cacheKey = `${speaker}:${text}`;

    try {
      // 1. Check session cache
      let audioUrl = sessionCache.get(cacheKey) ?? null;

      // 2. Check IndexedDB cache
      if (!audioUrl) {
        const cached = await dbGet(cacheKey);
        if (cached) {
          audioUrl = URL.createObjectURL(cached);
          sessionCache.set(cacheKey, audioUrl);
        }
      }

      // 3. Fetch from VoiceVox
      if (!audioUrl) {
        const blob = await fetchVoiceVoxBlob(text, speaker);
        if (blob) {
          await dbSet(cacheKey, blob);
          audioUrl = URL.createObjectURL(blob);
          sessionCache.set(cacheKey, audioUrl);
        }
      }

      // 4. Play audio
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => { setSpeaking(false); audioRef.current = null; };
        audio.onerror = () => {
          setSpeaking(false);
          audioRef.current = null;
          webSpeechFallback(text);
        };
        await audio.play();
        return;
      }
    } catch { /* fall through */ }

    // 5. Web Speech API fallback
    webSpeechFallback(text);
    setSpeaking(false);
  }, [supported]);

  const cancel = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speak, cancel, speaking, supported };
}

// ─── VoiceVox speaker list (for settings UI) ─────────────────────────────────

export const VOICEVOX_SPEAKERS = [
  { id: 1,  name: "ずんだもん" },
  { id: 0,  name: "四国めたん" },
  { id: 2,  name: "春日部つむぎ" },
  { id: 3,  name: "雨晴はう" },
  { id: 4,  name: "波音リツ" },
  { id: 8,  name: "冥鳴ひまり" },
] as const;
