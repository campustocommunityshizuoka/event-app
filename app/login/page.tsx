'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Provider } from '@supabase/supabase-js' // 型定義を追加

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Googleログイン処理
  const handleSocialLogin = async (provider: Provider) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/mypage`,
      },
    })

    if (error) {
      alert('エラーが発生しました: ' + error.message)
      setLoading(false)
    }
  }

  // メールログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('ログインエラー: ' + error.message)
    } else {
      router.push('/mypage')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col font-sans text-gray-900">
      
      <header className="w-full bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain sm:h-10" />
            <h1 className="text-base font-bold text-blue-600 tracking-wide hidden sm:block">しずおかコネクト</h1>
          </div>
          <span className="text-[10px] sm:text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">ログイン</span>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          
          <div className="bg-blue-600 p-6 text-center">
            <h2 className="text-xl font-bold text-white tracking-tight">ログイン</h2>
            <p className="text-blue-100 text-xs mt-2 opacity-90">アカウント情報を入力してください</p>
          </div>

          <div className="p-6 sm:p-8">
            
            {/* ▼▼▼ 追加: Googleログインボタン ▼▼▼ */}
            <div className="flex flex-col gap-3 mb-6">
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-3 font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.04-3.71 1.04-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Googleでログイン
              </button>
            </div>

            <div className="relative flex items-center justify-center py-2 mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <span className="relative bg-white px-2 text-xs text-gray-400">またはメールアドレスで</span>
            </div>
            {/* ▲▲▲ 追加ここまで ▲▲▲ */}

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">メールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-base outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">パスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-base outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="パスワードを入力"
                />
                <div className="mt-2 text-right">
                  <Link href="/reset-password" className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline py-1 inline-block">
                    パスワードを忘れた方はこちら
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 py-3.5 font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98]"
                >
                  {loading ? '処理中...' : 'ログインする'}
                </button>
                
                <div className="relative flex items-center justify-center py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <span className="relative bg-white px-2 text-xs text-gray-400">または</span>
                </div>

                {/* ★新規登録リンク（ご要望通り維持しています）★ */}
                <Link 
                  href="/signup" 
                  className="w-full rounded-lg border border-gray-300 bg-white py-3.5 font-bold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-[0.98] text-center block"
                >
                  新規アカウント作成はこちら
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}