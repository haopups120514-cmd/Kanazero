"use client";
import { useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import * as storage from "@/lib/storage";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getClient() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function collectLocalData() {
  return {
    words: storage.getWords(),
    expressions: storage.getExpressions(),
    bjtQuestions: storage.getBJTQuestions(),
    activity: storage.getActivity(),
    stats: storage.getStats(),
    updatedAt: Date.now(),
  };
}

function applyRemoteData(data: ReturnType<typeof collectLocalData>) {
  storage.setWords(data.words ?? []);
  storage.setExpressions(data.expressions ?? []);
  storage.setBJTQuestions(data.bjtQuestions ?? []);
  storage.setActivity(data.activity ?? {});
  storage.setStats(data.stats ?? storage.getStats());
}

export type SyncStatus = "idle" | "syncing" | "ok" | "error";

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isConfigured = Boolean(supabaseUrl && supabaseKey);

  const generateCode = useCallback(async (): Promise<string | null> => {
    const client = getClient();
    if (!client) { setErrorMsg("未配置 Supabase 环境变量"); setStatus("error"); return null; }
    setStatus("syncing");
    try {
      const code = randomCode();
      const data = collectLocalData();
      const { error } = await client.from("sync_codes").upsert({ code, data, updated_at: new Date().toISOString() });
      if (error) throw error;
      setStatus("ok");
      return code;
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "生成失败");
      setStatus("error");
      return null;
    }
  }, []);

  const push = useCallback(async (code: string): Promise<boolean> => {
    const client = getClient();
    if (!client || !code) return false;
    setStatus("syncing");
    try {
      const data = collectLocalData();
      const { error } = await client.from("sync_codes").upsert({ code, data, updated_at: new Date().toISOString() });
      if (error) throw error;
      setStatus("ok");
      return true;
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "同步失败");
      setStatus("error");
      return false;
    }
  }, []);

  const pull = useCallback(async (code: string): Promise<boolean> => {
    const client = getClient();
    if (!client || !code) { setErrorMsg("请先输入同步码"); setStatus("error"); return false; }
    setStatus("syncing");
    try {
      const { data, error } = await client
        .from("sync_codes")
        .select("data, updated_at")
        .eq("code", code.toUpperCase())
        .single();
      if (error) throw error;
      if (!data) throw new Error("未找到该同步码");

      const remote = data.data as ReturnType<typeof collectLocalData>;
      const local = collectLocalData();

      // Conflict: take whichever is newer
      if (remote.updatedAt >= (local.updatedAt ?? 0)) {
        applyRemoteData(remote);
      }
      setStatus("ok");
      return true;
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "拉取失败");
      setStatus("error");
      return false;
    }
  }, []);

  return { generateCode, push, pull, status, errorMsg, isConfigured };
}
