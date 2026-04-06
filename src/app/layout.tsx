import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import { AuthGate } from "@/components/AuthGate";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jp",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KanaZero — ゼロから始める日本語タイピング学習",
  description: "ゼロから始める日本語タイピング学習",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  openGraph: {
    title: "KanaZero",
    description: "ゼロから始める日本語タイピング学習",
    images: [{ url: "/favicon.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#7c85ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <AuthGate>
          {children}
        </AuthGate>
        <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
        }} />
      </body>

    </html>
  );
}
