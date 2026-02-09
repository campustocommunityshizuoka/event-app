import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "しずおかコネクト～イベント参加管理アプリ～",
  description: "イベント参加をもっとスマートに。しずおかコネクト公式チェックインアプリ。",
  icons: {
    icon: '/logo.png', // publicフォルダにあるロゴ画像をアイコンとして使用
    apple: '/logo.png', // iPhoneのホーム画面に追加した時のアイコン
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
