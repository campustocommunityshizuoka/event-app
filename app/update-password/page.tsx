'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // 画面が開いたら、URLに含まれる認証情報をSupabaseに認識させる
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
     
      // まだセッションがない場合、SupabaseがURLハッシュ(#access_token=...)を
      // 自動検知してログイン完了するのを少し待つ必要がある
      if (!session) {
        // auth.onAuthStateChange を使ってログイン完了イベントを待つ
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || session) {
            setSessionChecked(true)
          }
        })
        return () => subscription.unsubscribe()
      } else {
        setSessionChecked(true)
      }
    }
    checkSession()
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      alert('エラー: ' + error.message)
    } else {
      alert('パスワードを変更しました！マイページへ移動します。')
      router.push('/mypage')
    }
    setLoading(false)
  }

  // --- セッション確認中 (ローディング表示) ---
  if (!sessionChecked) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 text-gray-600">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-xs">認証情報を確認中...</span>
        </div>
      </div>
    )
  }

  // --- メイン画面 ---
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
            パスワード設定
          </span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          
          {/* カードヘッダー */}
          <div className="bg-blue-600 p-6 text-center">
            <h2 className="text-xl font-bold text-white tracking-tight">
              新しいパスワード
            </h2>
            <p className="text-blue-100 text-xs mt-2 opacity-90">
              セキュリティのため6文字以上で設定してください
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <form onSubmit={handleUpdate} className="flex flex-col gap-5">
              
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-base outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="6文字以上で入力"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 py-3.5 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] text-sm sm:text-base mt-2"
              >
                {loading ? '更新中...' : 'パスワードを変更する'}
              </button>
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