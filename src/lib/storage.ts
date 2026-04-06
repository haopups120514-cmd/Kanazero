import type { Word, Expression, BJTQuestion, DailyActivity, Settings, Stats } from "@/types";
import { DEFAULT_SETTINGS, DEFAULT_STATS } from "@/types";

export const KEYS = {
  WORDS: "bjt_words_v1",
  EXPRESSIONS: "bjt_expressions_v1",
  BJT_QUESTIONS: "bjt_questions_v1",
  ACTIVITY: "bjt_activity_v1",
  SETTINGS: "bjt_settings_v1",
  STATS: "bjt_stats_v1",
} as const;

function get<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full – ignore
  }
}

// ─── Words ────────────────────────────────────────────────────────────────────

export function getWords(): Word[] {
  return get<Word[]>(KEYS.WORDS, []);
}

export function setWords(words: Word[]): void {
  set(KEYS.WORDS, words);
}

export function addWords(incoming: Word[]): Word[] {
  const existing = getWords();
  const ids = new Set(existing.map((w) => w.id));
  const novel = incoming.filter((w) => !ids.has(w.id));
  const updated = [...existing, ...novel];
  setWords(updated);
  return updated;
}

// ─── Expressions ──────────────────────────────────────────────────────────────

export function getExpressions(): Expression[] {
  return get<Expression[]>(KEYS.EXPRESSIONS, []);
}

export function setExpressions(exprs: Expression[]): void {
  set(KEYS.EXPRESSIONS, exprs);
}

export function addExpressions(incoming: Expression[]): Expression[] {
  const existing = getExpressions();
  const ids = new Set(existing.map((e) => e.id));
  const novel = incoming.filter((e) => !ids.has(e.id));
  const updated = [...existing, ...novel];
  setExpressions(updated);
  return updated;
}

// ─── BJT Questions ────────────────────────────────────────────────────────────

export function getBJTQuestions(): BJTQuestion[] {
  return get<BJTQuestion[]>(KEYS.BJT_QUESTIONS, []);
}

export function setBJTQuestions(qs: BJTQuestion[]): void {
  set(KEYS.BJT_QUESTIONS, qs);
}

export function addBJTQuestions(incoming: BJTQuestion[]): BJTQuestion[] {
  const existing = getBJTQuestions();
  const ids = new Set(existing.map((q) => q.id));
  const novel = incoming.filter((q) => !ids.has(q.id));
  const updated = [...existing, ...novel];
  setBJTQuestions(updated);
  return updated;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export function getActivity(): DailyActivity {
  return get<DailyActivity>(KEYS.ACTIVITY, {});
}

export function setActivity(activity: DailyActivity): void {
  set(KEYS.ACTIVITY, activity);
}

export function recordActivity(count: number): void {
  const today = new Date().toISOString().slice(0, 10);
  const activity = getActivity();
  activity[today] = (activity[today] ?? 0) + count;
  set(KEYS.ACTIVITY, activity);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...get<Partial<Settings>>(KEYS.SETTINGS, {}) };
}

export function setSettings(s: Settings): void {
  set(KEYS.SETTINGS, s);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function getStats(): Stats {
  return { ...DEFAULT_STATS, ...get<Partial<Stats>>(KEYS.STATS, {}) };
}

export function setStats(s: Stats): void {
  set(KEYS.STATS, s);
}

export function updateStats(patch: Partial<Stats>): Stats {
  const current = getStats();
  const updated = { ...current, ...patch };
  setStats(updated);
  return updated;
}
