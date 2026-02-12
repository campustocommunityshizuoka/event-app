'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 入力チェック
    if (!email || !password) {
      alert('メールアドレスとパスワードを入力してください。')
      return
    }

    setLoading(true)
    setMessage('')

    // 登録後の戻り先URL
    const returnUrl = `${window.location.origin}/auth/callback?next=/mypage`

    // Supabase登録処理
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: returnUrl,
      },
    })

    if (error) {
      alert('エラー: ' + error.message)
    } else {
      // 成功時
      if (data.user && !data.session) {
        setMessage('確認メールを送信しました！\n届いたメール内のリンクをクリックして登録を完了してください。')
      } else {
        alert('登録完了！ログインします。')
        window.location.href = '/mypage'
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col font-sans text-gray-900">
      
      <header className="w-full bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
          <h1 className="text-base font-bold text-blue-600 tracking-wide hidden sm:block">しずおかコネクト</h1>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          
          <div className="bg-green-600 p-6 text-center">
            <h2 className="text-xl font-bold text-white tracking-tight">新規アカウント作成</h2>
            <p className="text-green-100 text-xs mt-2 opacity-90">新しい冒険を始めましょう！</p>
          </div>

          <div className="p-6 sm:p-8">
            {message ? (
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-sm whitespace-pre-wrap font-bold">
                {message}
              </div>
            ) : (
              <form onSubmit={handleSignUp} className="flex flex-col gap-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">メールアドレス</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-base outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100"
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
                    minLength={6}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-base outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    placeholder="6文字以上で入力"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-green-600 py-3.5 font-bold text-white shadow-md hover:bg-green-700 disabled:opacity-50 active:scale-[0.98] mt-2"
                >
                  {loading ? '処理中...' : '登録してメールを送る'}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-gray-500 hover:text-blue-600 underline">
                すでにアカウントをお持ちの方はこちら (ログイン)
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}