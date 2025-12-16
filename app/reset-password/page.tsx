'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // ★修正箇所: callbackルートを経由させる
    // 認証コードを交換してから update-password ページへ遷移させます
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `https://event-app.shizuoka-connect.com/auth/callback?next=/update-password`, 
    })

    if (error) {
      setMessage('エラー: ' + error.message)
    } else {
      setMessage('再設定用のメールを送信しました。メールボックスを確認してください。')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col font-sans text-gray-900">
      
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
            パスワード再設定
          </span>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          
          <div className="bg-blue-600 p-6 text-center">
            <h2 className="text-xl font-bold text-white tracking-tight">
              パスワードをお忘れの方
            </h2>
            <p className="text-blue-100 text-xs mt-2 opacity-90">
              登録メールアドレスを入力してください
            </p>
          </div>

          <div className="p-6 sm:p-8">
            
            {message && (
              <div className={`mb-6 p-4 rounded-lg text-sm border ${
                message.includes('エラー') 
                  ? 'bg-red-50 text-red-600 border-red-100' 
                  : 'bg-green-50 text-green-600 border-green-100'
              }`}>
                {message}
              </div>
            )}

            <form onSubmit={handleReset} className="flex flex-col gap-5">
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

              <div className="flex flex-col gap-3 mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 py-3.5 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] text-sm sm:text-base"
                >
                  {loading ? '送信中...' : '再設定メールを送る'}
                </button>

                <Link 
                  href="/login" 
                  className="w-full rounded-lg bg-white border border-gray-200 py-3.5 font-bold text-gray-500 shadow-sm transition hover:bg-gray-50 text-center active:scale-[0.98] text-sm sm:text-base"
                >
                  ログイン画面に戻る
                </Link>
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