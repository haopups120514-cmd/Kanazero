import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { wordsPrompt, expressionsPrompt, bjtQuestionsPrompt } from "@/lib/prompts";
import type { Word, Expression, BJTQuestion } from "@/types";

const SONNET_MODEL = "claude-sonnet-4-20250514";

function makeClient(apiKeyOverride?: string) {
  const apiKey = apiKeyOverride || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("未配置 ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey });
}

async function callClaude(
  client: Anthropic,
  prompt: string,
  model = SONNET_MODEL,
  maxTokens = 4096,
): Promise<string> {
  const msg = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}

function parseJSON<T>(raw: string): T {
  // Strip markdown code blocks if present
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  return JSON.parse(stripped) as T;
}

function nanoid(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, topic, level, count = 20, apiKeyOverride, examType, fileContent } = body as {
      type: string;
      topic?: string;
      level?: string;
      count?: number;
      apiKeyOverride?: string;
      examType?: string;
      fileContent?: string;
    };

    const client = makeClient(apiKeyOverride);

    if (type === "words") {
      if (!topic) return NextResponse.json({ error: "topic is required" }, { status: 400 });
      const raw = await callClaude(client, wordsPrompt(topic, level ?? "J3", count));
      const items = parseJSON<Omit<Word, "id" | "topic" | "srsStage" | "nextReview" | "lastReview" | "correctCount" | "wrongCount" | "createdAt">[]>(raw);
      const words: Word[] = items.map((item) => ({
        ...item,
        // Normalize: ensure meaning_zh is always an array (Claude may return string)
        meaning_zh: Array.isArray(item.meaning_zh)
          ? item.meaning_zh
          : [item.meaning_zh as unknown as string],
        id: nanoid(),
        topic: topic,
        srsStage: 0,
        nextReview: 0,
        lastReview: 0,
        correctCount: 0,
        wrongCount: 0,
        createdAt: Date.now(),
      }));
      return NextResponse.json({ words });
    }

    if (type === "expressions") {
      const raw = await callClaude(client, expressionsPrompt(count, topic));
      const items = parseJSON<Omit<Expression, "id" | "srsStage" | "nextReview" | "lastReview" | "correctCount" | "wrongCount" | "createdAt">[]>(raw);
      const expressions: Expression[] = items.map((item) => ({
        ...item,
        id: nanoid(),
        type: "expression" as const,
        srsStage: 0,
        nextReview: 0,
        lastReview: 0,
        correctCount: 0,
        wrongCount: 0,
        createdAt: Date.now(),
      }));
      return NextResponse.json({ expressions });
    }

    if (type === "bjt_questions") {
      const raw = await callClaude(client, bjtQuestionsPrompt(count, examType ?? "BJT"));
      const items = parseJSON<Omit<BJTQuestion, "id" | "done" | "createdAt">[]>(raw);
      const bjtQuestions: BJTQuestion[] = items.map((item) => ({
        ...item,
        id: nanoid(),
        examType: examType ?? "BJT",
        done: false,
        createdAt: Date.now(),
      }));
      return NextResponse.json({ bjtQuestions });
    }

    // ── 文件解析：将文本解析为题目格式 ────────────────────────────────────────
    if (type === "parse_questions") {
      if (!fileContent) return NextResponse.json({ error: "fileContent is required" }, { status: 400 });
      const parsePrompt = `你是日语考试题目解析专家。用户上传了一份题目文件，请将其中的选择题解析为标准JSON格式。

考试类型：${examType ?? "未知"}

文件内容：
${fileContent.slice(0, 8000)}

请将能识别的选择题解析为以下JSON数组格式（最多解析 ${count} 道题），没有选择题则返回空数组：
[
  {
    "type": "reading",
    "scenario_ja": "题目上下文或原文（日语，如无则留空）",
    "scenario_zh": "中文说明（如无则留空）",
    "question_ja": "题目（日语）",
    "question_zh": "题目中文（如无则与日语相同或翻译）",
    "options": [
      {"label": "A", "text_ja": "选项", "text_zh": "选项中文"},
      {"label": "B", "text_ja": "选项", "text_zh": "选项中文"},
      {"label": "C", "text_ja": "选项", "text_zh": "选项中文"},
      {"label": "D", "text_ja": "选项", "text_zh": "选项中文"}
    ],
    "answer": "正确答案label",
    "explanation_zh": "解析（如有答案说明则填入，否则留空）"
  }
]

只返回JSON数组，不要其他内容。`;
      const raw = await callClaude(client, parsePrompt, SONNET_MODEL, 8192);
      const items = parseJSON<Omit<BJTQuestion, "id" | "done" | "createdAt">[]>(raw);
      const bjtQuestions: BJTQuestion[] = items.map((item) => ({
        ...item,
        id: nanoid(),
        examType: examType ?? "BJT",
        done: false,
        createdAt: Date.now(),
      }));
      return NextResponse.json({ bjtQuestions });
    }

    // ── BJT 错误纠正：AI 老师点评 ──────────────────────────────────────────
    if (type === "bjt_correction") {
      const { question, wrongLabel } = body as {
        question: BJTQuestion;
        wrongLabel: string;
      };
      const wrongOpt = question.options.find((o) => o.label === wrongLabel);
      const rightOpt = question.options.find((o) => o.label === question.answer);
      const prompt = `你是一位耐心的BJT商务日语老师。学生刚刚做错了一道题，请用温和的语气纠正他，帮助他真正理解。

【题目场景】
${question.scenario_ja}
（${question.scenario_zh}）

【问题】${question.question_zh}

【学生选了】${wrongOpt?.label}. ${wrongOpt?.text_ja}（${wrongOpt?.text_zh}）
【正确答案】${rightOpt?.label}. ${rightOpt?.text_ja}（${rightOpt?.text_zh}）

【题目解析】${question.explanation_zh}

请做到：
1. 先简短肯定学生的思路（找到他为什么选错的可能原因）
2. 解释正确答案的语法/表达要点
3. 给一个类似的记忆口诀或联想方法（如果有）
4. 全部用中文，200字以内，轻松易懂的语气`;

      const text = await callClaude(client, prompt);
      return NextResponse.json({ correction: text });
    }

    // ── 中文回答判定：AI 判断日→中模式的作答是否正确 ──────────────────────────
    if (type === "chinese_judgment") {
      const { wordJa, wordKana, userInput } = body as {
        wordJa: string;
        wordKana: string;
        userInput: string;
      };
      const prompt = `判断任务：日语单词「${wordJa}」（${wordKana}），用户写出了中文「${userInput}」。请判断这个中文回答是否正确表达了这个日语单词的含义。只回答"正确"或"错误"，不要任何其他内容。`;
      const result = await callClaude(client, prompt, SONNET_MODEL, 20);
      const correct = result.trim().startsWith("正确");
      return NextResponse.json({ correct });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
