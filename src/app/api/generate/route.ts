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
    const { type, topic, level, count = 20, apiKeyOverride } = body as {
      type: string;
      topic?: string;
      level?: string;
      count?: number;
      apiKeyOverride?: string;
    };

    const client = makeClient(apiKeyOverride);

    if (type === "words") {
      if (!topic) return NextResponse.json({ error: "topic is required" }, { status: 400 });
      const raw = await callClaude(client, wordsPrompt(topic, level ?? "J3", count));
      const items = parseJSON<Omit<Word, "id" | "topic" | "srsStage" | "nextReview" | "lastReview" | "correctCount" | "wrongCount" | "createdAt">[]>(raw);
      const words: Word[] = items.map((item) => ({
        ...item,
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
      const raw = await callClaude(client, expressionsPrompt(count));
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
      const raw = await callClaude(client, bjtQuestionsPrompt(count));
      const items = parseJSON<Omit<BJTQuestion, "id" | "done" | "createdAt">[]>(raw);
      const bjtQuestions: BJTQuestion[] = items.map((item) => ({
        ...item,
        id: nanoid(),
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

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
