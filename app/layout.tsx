import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from './components/ServiceWorkerRegister';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // 1. タイトルの最適化（下層ページができた際にも自動対応できるテンプレート形式）
  title: {
    default: "しずおかコネクト",
    template: "%s | しずおかコネクト",
  },
  // 2. 検索結果に表示される説明文（ターゲットとなるキーワードを自然に配置）
  description: "静岡・浜松の地域活動やボランティアに参加できるイベント管理アプリ「しずおかコネクト」。QRコードで簡単チェックインして、経験値を溜めてランクアップしよう！",
  // 3. 検索エンジンにアプリの関連キーワードを伝える
  keywords: ["しずおかコネクト", "静岡", "浜松", "イベント", "ボランティア", "地域活動", "学生"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "しずおかコネクト",
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  // 4. SNSやLINEでURLがシェアされた際のリッチ表示（OGP）設定
  openGraph: {
    title: "しずおかコネクト",
    description: "静岡・浜松の地域活動やボランティアに参加できるイベント管理アプリ。",
    url: "https://event-app.shizuoka-connect.com",
    siteName: "しずおかコネクト",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "しずおかコネクト ロゴ",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  // 5. X（旧Twitter）でシェアされた際のカード表示設定
  twitter: {
    card: "summary",
    title: "しずおかコネクト",
    description: "静岡・浜松の地域活動やボランティアに参加できるイベント管理アプリ。",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ServiceWorkerRegister /> {/* ★ここに追加 */}
        {children}
      </body>
    </html>
  );
}