import { NextRequest, NextResponse } from "next/server";
import { verifySync } from "otplib";

export async function POST(req: NextRequest) {
  const { code } = await req.json() as { code: string };
  const secret = process.env.TOTP_SECRET;
  if (!secret) {
    return NextResponse.json({ valid: false, error: "未配置 TOTP_SECRET" });
  }
  const valid = verifySync({
    secret,
    token: code.replace(/\s/g, ""),
    strategy: "totp",
    period: 30,
    epochTolerance: 1,
  });
  return NextResponse.json({ valid });
}
