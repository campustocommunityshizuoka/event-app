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
  title: "しずおかコネクト",
  description: "イベント参加管理アプリ",
  manifest: "/manifest.json", // これを追加
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "しずおかコネクト",
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

// ... 既存のRootLayout

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


