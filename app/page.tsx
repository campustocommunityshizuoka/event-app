'use client'

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Link from 'next/link'
import { Session } from '@supabase/supabase-js'

export default function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 初回ロード時にログイン状態を確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // ログイン状態の変化を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white flex flex-col font-sans text-gray-900">
      
      {/* ヘッダー */}
      <header className="w-full bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-8 w-auto object-contain sm:h-10"
            />
            <h1 className="text-base font-bold text-blue-600 tracking-wide">
              しずおかコネクト
            </h1>
          </div>
          {/* ログイン済みならヘッダーにもマイページリンクを表示 */}
          {!loading && session && (
            <Link 
              href="/mypage" 
              className="text-[10px] font-bold text-blue-600 border border-blue-100 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
            >
              マイページ &rarr;
            </Link>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-grow flex flex-col items-center p-6 w-full max-w-lg mx-auto relative overflow-hidden">
        
        {/* 背景装飾 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl opacity-30 pointer-events-none -z-10"></div>

        {/* ヒーローセクション */}
        <div className="flex flex-col items-center text-center w-full mt-4 mb-8">
          
          <div className="mb-6 relative group">
            <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
            <img 
              src="/logo.png" 
              alt="Shizuoka Connect Logo" 
              className="relative w-28 h-28 object-contain drop-shadow-sm transform group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 leading-tight mb-3">
            地域とつながる、<br />
            毎日が<span className="text-blue-600">楽しくなる</span>。
          </h1>
          
          <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-xs mx-auto">
            イベント参加から地域ニュース、<br/>
            ボランティア募集まで。<br/>
            あなたの活動を可視化するアプリです。
          </p>

          {/* アクションボタンエリア */}
          <div className="w-full max-w-xs flex flex-col gap-4 z-10">
            {loading ? (
              <div className="w-full h-14 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-gray-400 text-sm">
                読み込み中...
              </div>
            ) : session ? (
              <div className="flex flex-col gap-3 animate-fade-in-up">
                <Link 
                  href="/mypage"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  <span>マイページへ移動</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <p className="text-xs text-gray-400 mt-1">
                  ログイン中: {session.user.email}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 animate-fade-in-up">
                <Link 
                  href="/login"
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl transition-all active:scale-[0.98] text-center"
                >
                  はじめる (ログイン・登録)
                </Link>
                <p className="text-xs text-gray-400 mt-1">
                  登録は無料ですぐに始められます
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 機能紹介グリッド */}
        <div className="w-full grid grid-cols-2 gap-3 mt-4">
            <FeatureCard 
              emoji="📱" 
              title="スマート入場" 
              desc="QRコードをかざすだけで簡単チェックイン"
            />
            <FeatureCard 
              emoji="🏆" 
              title="ランクUP" 
              desc="参加して経験値を獲得。バッジを集めよう"
            />
            <FeatureCard 
              emoji="📰" 
              title="最新ニュース" 
              desc="地域の最新情報をいち早くキャッチ"
            />
            <FeatureCard 
              emoji="🤝" 
              title="クエスト" 
              desc="ボランティアやミッションに参加しよう"
            />
        </div>

      </main>

      {/* フッター */}
      <footer className="py-6 text-center border-t border-gray-100 bg-white/50 backdrop-blur-sm mt-auto">
        <p className="text-[10px] text-gray-400">
          &copy; 2025 Shizuoka Connect.<br/>All rights reserved.
        </p>
      </footer>
    </div>
  )
}

// 機能紹介カードコンポーネント
function FeatureCard({ emoji, title, desc }: { emoji: string, title: string, desc: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:border-blue-100 hover:shadow-md transition-all">
      <span className="text-3xl mb-2">{emoji}</span>
      <h3 className="text-xs font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-[10px] text-gray-500 leading-tight">{desc}</p>
    </div>
  )
}