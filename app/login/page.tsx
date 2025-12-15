'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('エラー: ' + error.message)
    } else {
      // alert('ログイン成功！マイページへ移動します。') 
      router.push('/mypage')
    }
    setLoading(false)
  }

  // 新規登録処理
  const handleSignUp = async () => {
    setLoading(true)
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      alert('エラー: ' + error.message)
    } else {
      alert('登録完了！そのままログインします。')
      router.push('/mypage')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col font-sans text-gray-900">
      
      {/* ヘッダー: スマホ対応 (sticky) */}
      <header className="w-full bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-8 w-auto object-contain sm:h-10"
            />
            <h1 className="text-base font-bold text-blue-600 tracking-wide hidden sm:block">
              しずおかコネクト
            </h1>
          </div>
          <span className="text-[10px] sm:text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
            ログイン
          </span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          
          {/* カードヘッダー: ブランドカラーで統一 */}
          <div className="bg-blue-600 p-6 text-center">
            <h2 className="text-xl font-bold text-white tracking-tight">
              ログイン / 新規登録
            </h2>
            <p className="text-blue-100 text-xs mt-2 opacity-90">
              アカウント情報を入力してください
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              
              {/* メールアドレス入力 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-base outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="name@example.com"
                />
              </div>

              {/* パスワード入力 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-base outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="パスワードを入力"
                />
                
                {/* パスワードリセットリンク */}
                <div className="mt-2 text-right">
                  <Link 
                    href="/reset-password" 
                    className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline py-1 inline-block"
                  >
                    パスワードを忘れた方はこちら
                  </Link>
                </div>
              </div>

              {/* アクションボタン群 */}
              <div className="flex flex-col gap-3 mt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 py-3.5 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] text-sm sm:text-base"
                >
                  {loading ? '処理中...' : 'ログインする'}
                </button>
                
                {/* 分割線 */}
                <div className="relative flex items-center justify-center py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <span className="relative bg-white px-2 text-xs text-gray-400">または</span>
                </div>

                <button 
                  type="button" 
                  onClick={handleSignUp} 
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 bg-white py-3.5 font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 active:scale-[0.98] text-sm sm:text-base"
                >
                  新規登録する
                </button>
              </div>
            </form>
          </div>
        </div>

        <footer className="mt-8 text-gray-400 text-[10px] text-center">
          &copy; Shizuoka Connect. All rights reserved.
        </footer>
      </main>
    </div>
  )
}