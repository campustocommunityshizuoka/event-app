'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

function AuthErrorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('認証情報を確認しています...')

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (window.location.hash.includes('access_token')) {
        setMessage('認証成功！画面を移動します...')
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.push('/update-password')
        } else {
          setMessage('セッション復元に失敗しました。メール送信からやり直してください。')
        }
      } else {
        const errorDescription = searchParams.get('error_description')
        setMessage(errorDescription || '認証リンクが無効か期限切れです。')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [router, searchParams])

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col font-sans text-gray-900">
      
      <header className="w-full bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-8 w-auto object-contain sm:h-10"
          />
          <h1 className="text-base font-bold text-blue-600 tracking-wide hidden sm:block">
            しずおかコネクト
          </h1>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          
          <div className={`${message.includes('成功') ? 'bg-blue-600' : 'bg-red-500'} p-5 text-center transition-colors duration-300`}>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {message.includes('成功') ? 'Processing' : 'Authentication Error'}
            </h2>
          </div>

          <div className="p-6 text-center">
            <div className="mb-6 flex justify-center">
              {message.includes('成功') ? (
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
            </div>

            <p className="text-gray-600 mb-8 leading-relaxed text-sm">
              {message}
            </p>

            {!message.includes('成功') && (
              <div className="flex flex-col gap-3">
                <a 
                  href="/reset-password" 
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm block text-center active:scale-[0.98]"
                >
                  再設定をやり直す
                </a>
                <a 
                  href="/login" 
                  className="w-full bg-white border border-gray-200 text-gray-500 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors block text-sm text-center active:scale-[0.98]"
                >
                  ログインへ戻る
                </a>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-6 text-gray-400 text-[10px] text-center">
          &copy; Shizuoka Connect.
        </footer>
      </main>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  )
}