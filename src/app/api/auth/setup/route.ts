import { NextRequest, NextResponse } from "next/server";
import { generateURI } from "otplib";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const secret = process.env.TOTP_SECRET;
  const setupPassword = process.env.SETUP_PASSWORD;

  if (!secret) {
    return NextResponse.json({ error: "未配置 TOTP_SECRET" }, { status: 500 });
  }
  if (setupPassword) {
    const provided = req.nextUrl.searchParams.get("pw");
    if (provided !== setupPassword) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }
  }

  const uri = generateURI({ issuer: "KanaZero", label: "KanaZero", secret, strategy: "totp" });
  const qr = await QRCode.toDataURL(uri, { width: 240, margin: 2 });
  return NextResponse.json({ qr, secret });
}
