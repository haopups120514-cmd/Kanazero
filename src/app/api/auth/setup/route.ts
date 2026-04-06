import { NextResponse } from "next/server";
import { generateURI } from "otplib";
import QRCode from "qrcode";

export async function GET() {
  const secret = process.env.TOTP_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "未配置 TOTP_SECRET 环境变量" }, { status: 500 });
  }
  const uri = generateURI({ issuer: "KanaZero", label: "KanaZero", secret, strategy: "totp" });
  const qr = await QRCode.toDataURL(uri, { width: 240, margin: 2 });
  return NextResponse.json({ qr, secret });
}
