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

  // ログイン処理だけを残す
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('ログインエラー: ' + error.message) // パスワード違いなどはここで検知
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

                {/* ★ここをボタン処理からページ移動リンクに変更★ */}
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