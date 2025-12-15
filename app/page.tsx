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
      
      {/* ヘッダー: スクロールしても追従するスティッキーヘッダー */}
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
          {/* ログイン済みならヘッダーにもマイページリンクを表示（PCなどで便利） */}
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
      <main className="flex-grow flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto relative">
        
        {/* 背景装飾（さりげなく） */}
        <div className="absolute top-10 left-10 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-60 h-60 bg-indigo-200 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

        {/* ヒーローセクション */}
        <div className="flex flex-col items-center text-center z-10 w-full">
          
          {/* ロゴを大きく表示 */}
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-10 rounded-full"></div>
            <img 
              src="/logo.png" 
              alt="Shizuoka Connect Logo" 
              className="relative w-32 h-32 object-contain drop-shadow-lg"
            />
          </div>

          <h1 className="text-3xl font-extrabold text-slate-800 leading-tight mb-4 tracking-tight">
            イベント参加を、<br />
            もっと<span className="text-blue-600">スマート</span>に。
          </h1>
          
          <p className="text-sm text-gray-500 mb-10 leading-relaxed max-w-xs mx-auto">
            しずおかコネクト公式チェックインアプリ。<br/>
            QRコードをかざすだけで、<br/>
            スムーズに入場・履歴管理ができます。
          </p>

          {/* アクションボタンエリア */}
          <div className="w-full flex flex-col gap-4">
            {loading ? (
              // ローディング中
              <div className="w-full h-14 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-gray-400 text-sm">
                読み込み中...
              </div>
            ) : session ? (
              // ログイン済みの場合
              <div className="flex flex-col gap-3 animate-fade-in-up">
                <Link 
                  href="/mypage"
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  <span>マイページを開く</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <p className="text-xs text-gray-400 mt-2">
                  ログイン中: {session.user.email}
                </p>
              </div>
            ) : (
              // 未ログインの場合
              <div className="flex flex-col gap-3 animate-fade-in-up">
                <Link 
                  href="/login"
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl transition-all active:scale-[0.98] text-center"
                >
                  はじめる (ログイン・登録)
                </Link>
                
                <div className="mt-4 grid grid-cols-2 gap-3 text-left">
                   <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center text-center">
                      <span className="text-2xl mb-1">📱</span>
                      <span className="text-[10px] text-gray-500 font-bold">簡単チェックイン</span>
                   </div>
                   <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center text-center">
                      <span className="text-2xl mb-1">📅</span>
                      <span className="text-[10px] text-gray-500 font-bold">履歴が残る</span>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="py-6 text-center border-t border-gray-100 bg-white/50 backdrop-blur-sm">
        <p className="text-[10px] text-gray-400">
          &copy; 2025 Shizuoka Connect.<br/>All rights reserved.
        </p>
      </footer>
    </div>
  )
}