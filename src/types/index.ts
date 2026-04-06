// ─── Core Data Models ───────────────────────────────────────────────────────

export type SrsStage = 0 | 1 | 2 | 3 | 4 | 5;

export interface Word {
  id: string;
  word: string;           // 会議
  kana: string;           // かいぎ
  romaji: string;         // kaigi
  meaning_zh: string[];   // ["会议", "开会"] — 多个可接受的中文释义
  pos: string;            // 名詞
  example_ja: string;
  example_zh: string;
  level: string;          // N1-N5 / J1-J5 / 初級 etc.
  topic: string;
  srsStage: SrsStage;
  nextReview: number;     // unix ms
  lastReview: number;
  correctCount: number;
  wrongCount: number;
  createdAt: number;
}

export interface Expression {
  id: string;
  type: "expression";
  scenario_zh: string;
  answer_ja: string;
  answer_kana: string;
  answer_romaji: string;
  acceptable_answers: string[];
  explanation_zh: string;
  srsStage: SrsStage;
  nextReview: number;
  lastReview: number;
  correctCount: number;
  wrongCount: number;
  createdAt: number;
}

export interface BJTQuestion {
  id: string;
  type: "listening_reading" | "reading" | "expression";
  examType?: string;       // "BJT" | "JLPT N1" | "JLPT N2" | "JLPT N3" | "JPT"
  scenario_ja: string;
  scenario_zh: string;
  question_ja: string;
  question_zh: string;
  options: { label: string; text_ja: string; text_zh: string }[];
  answer: string;
  explanation_zh: string;
  done: boolean;
  correct?: boolean;
  createdAt: number;
}

export const EXAM_TYPES = ["BJT", "JLPT N1", "JLPT N2", "JLPT N3", "JPT"] as const;
export type ExamType = typeof EXAM_TYPES[number];

// ─── SRS Review Item ─────────────────────────────────────────────────────────

export interface ReviewItem {
  id: string;
  type: "word" | "expression";
  nextReview: number;
  srsStage: SrsStage;
}

// ─── Daily Activity (Heatmap) ─────────────────────────────────────────────────

export type DailyActivity = Record<string, number>; // "2026-04-07": 23

// ─── Session ──────────────────────────────────────────────────────────────────

export type SessionStepType =
  | { kind: "word"; wordId: string }
  | { kind: "expression"; expressionId: string }
  | { kind: "bjt"; questionId: string };

export interface SessionResult {
  wordsTyped: number;
  expressionsTyped: number;
  bjtAnswered: number;
  correct: number;
  wrong: number;
  wpm: number;
  duration: number; // seconds
}

// ─── Typing Engine ────────────────────────────────────────────────────────────

export type CharState = "pending" | "correct" | "wrong" | "current";

export interface TypingResult {
  target: string;
  correct: boolean;
  errorCount: number;
  durationMs: number;
  wpm: number;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface Settings {
  apiKeyOverride: string;
  pomodoroMinutes: number;
  showFurigana: boolean;
  dailyGoal: number;
  preferredTopics: string[];
  fontSize: "sm" | "md" | "lg";
  syncCode: string;
  voicevoxSpeaker: number;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKeyOverride: "",
  pomodoroMinutes: 15,
  showFurigana: true,
  dailyGoal: 20,
  preferredTopics: [],
  fontSize: "md",
  syncCode: "",
  voicevoxSpeaker: 1,
};

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface Stats {
  totalWords: number;
  totalCorrect: number;
  totalWrong: number;
  totalSessions: number;
  totalMinutes: number;
  bestWpm: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
  topicProgress: Record<string, { learned: number; total: number }>;
  bjtStats: { correct: number; wrong: number };
  worstWords: Array<{ wordId: string; wrongCount: number }>;
}

export const DEFAULT_STATS: Stats = {
  totalWords: 0,
  totalCorrect: 0,
  totalWrong: 0,
  totalSessions: 0,
  totalMinutes: 0,
  bestWpm: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: "",
  topicProgress: {},
  bjtStats: { correct: 0, wrong: 0 },
  worstWords: [],
};

// ─── Topics ───────────────────────────────────────────────────────────────────

export const TOPIC_CATEGORIES = [
  {
    label: "考试类",
    topics: ["BJT商务日语", "JLPT N3", "JLPT N2", "JLPT N1"] as const,
  },
  {
    label: "场景类",
    topics: ["日常会話", "職場・ビジネス", "買い物・レストラン", "旅行・交通", "病院・健康"] as const,
  },
  {
    label: "进阶类",
    topics: ["ニュース日本語", "IT・テクノロジー", "敬語マスター"] as const,
  },
] as const;

export const TOPICS = TOPIC_CATEGORIES.flatMap((c) => [...c.topics]);

export type Topic = typeof TOPICS[number];

export const TOPIC_LABELS: Record<string, string> = {
  "BJT商务日语":      "BJT商务",
  "JLPT N3":          "JLPT N3",
  "JLPT N2":          "JLPT N2",
  "JLPT N1":          "JLPT N1",
  "日常会話":          "日常会话",
  "職場・ビジネス":    "职场商务",
  "買い物・レストラン": "购物餐厅",
  "旅行・交通":        "旅行交通",
  "病院・健康":        "医疗健康",
  "ニュース日本語":    "新闻日语",
  "IT・テクノロジー":  "IT科技",
  "敬語マスター":      "敬语精通",
};

export const LEVEL_OPTIONS = [
  { value: "N5", label: "JLPT N5 入门" },
  { value: "N4", label: "JLPT N4 初级" },
  { value: "N3", label: "JLPT N3 中级" },
  { value: "N2", label: "JLPT N2 中高级" },
  { value: "N1", label: "JLPT N1 高级" },
  { value: "J5", label: "BJT J5" },
  { value: "J4", label: "BJT J4" },
  { value: "J3", label: "BJT J3" },
  { value: "J2", label: "BJT J2" },
  { value: "J1", label: "BJT J1" },
];
