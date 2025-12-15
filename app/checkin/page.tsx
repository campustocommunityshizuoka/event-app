'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import { Scanner } from '@yudiel/react-qr-scanner'

function CheckInContent() {
  const searchParams = useSearchParams()
  const urlToken = searchParams ? searchParams.get('token') : null
  const router = useRouter()

  const [status, setStatus] = useState<'scan_mode' | 'processing' | 'success' | 'error'>('scan_mode')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (urlToken) handleCheckIn(urlToken)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken])

  const handleCheckIn = async (tokenRaw: string) => {
    if (status === 'processing' || status === 'success') return

    setStatus('processing')
    let token = tokenRaw
    try {
      if (tokenRaw.includes('token=')) {
        const url = new URL(tokenRaw)
        const extracted = url.searchParams.get('token')
        if (extracted) token = extracted
      }
    } catch (e) { console.log(e) }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('チェックインにはログインが必要です')
      router.push('/login')
      return
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from('event-token')
      .select('*')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      setStatus('error')
      setMessage('無効なQRコードです')
      return
    }

    const { data: existing } = await supabase
      .from('participations')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_id', tokenData.event_id)
      .single()

    if (existing) {
      setStatus('error')
      setMessage('すでにチェックイン済みです')
      return
    }

    const { error: insertError } = await supabase
      .from('participations')
      .insert({
        user_id: user.id,
        event_id: tokenData.event_id,
        checked_in_at: new Date().toISOString(),
      })

    if (insertError) {
      setStatus('error')
      setMessage('登録失敗: ' + insertError.message)
    } else {
      setStatus('success')
    }
  }

  const handleScan = (result: { rawValue: string }[]) => {
    if (result && result.length > 0 && result[0].rawValue) {
      handleCheckIn(result[0].rawValue)
    }
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
          <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-100">
            QRチェックイン
          </span>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          
          <div className={`p-5 text-center transition-colors duration-300 ${
            status === 'success' ? 'bg-green-500' : 
            status === 'error' ? 'bg-red-500' : 
            'bg-blue-600'
          }`}>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {status === 'scan_mode' && 'QR Check-in'}
              {status === 'processing' && 'Processing...'}
              {status === 'success' && 'Complete'}
              {status === 'error' && 'Failed'}
            </h2>
            <p className="text-white/90 text-xs mt-1">
              {status === 'scan_mode' && 'QRコードを読み取ってください'}
              {status === 'processing' && '確認中...'}
              {status === 'success' && 'チェックインしました'}
              {status === 'error' && 'エラーが発生しました'}
            </p>
          </div>

          <div className="p-5">
            
            {status === 'scan_mode' && (
              <div className="flex flex-col items-center">
                <div className="w-full aspect-square bg-gray-900 rounded-xl overflow-hidden shadow-inner relative border-4 border-gray-100">
                  <Scanner 
                    onScan={handleScan}
                    constraints={{ facingMode: 'environment' }}
                    styles={{
                      container: { width: '100%', height: '100%' },
                      video: { width: '100%', height: '100%', objectFit: 'cover' }
                    }}
                  />
                  {/* スキャン枠 */}
                  <div className="absolute inset-0 border-[20px] sm:border-[30px] border-black/30 pointer-events-none flex items-center justify-center">
                    <div className="w-40 h-40 sm:w-48 sm:h-48 border-2 border-white/50 rounded-lg relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                    </div>
                  </div>
                </div>
                
                <p className="mt-4 text-[10px] text-gray-400 text-center">
                  カメラを許可してください
                </p>

                <button 
                  onClick={() => router.push('/mypage')}
                  className="mt-4 text-gray-500 text-sm hover:text-gray-800 underline py-2"
                >
                  キャンセル
                </button>
              </div>
            )}

            {status === 'processing' && (
              <div className="py-12 flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 text-sm">照合中...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="py-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-500">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">完了しました</h3>
                <p className="text-gray-600 mb-6 text-sm">イベントをお楽しみください</p>
                
                <button 
                  onClick={() => router.push('/mypage')}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md active:scale-[0.98]"
                >
                  マイページへ
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="py-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-500">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">エラー</h3>
                <p className="text-gray-600 mb-6 font-medium bg-red-50 px-4 py-2 rounded text-xs w-full break-all">
                  {message}
                </p>
                
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={() => setStatus('scan_mode')} 
                    className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700 transition-colors shadow-sm active:scale-[0.98]"
                  >
                    再読み込み
                  </button>
                  <button 
                    onClick={() => router.push('/mypage')}
                    className="w-full bg-white border border-gray-200 text-gray-500 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors text-sm active:scale-[0.98]"
                  >
                    戻る
                  </button>
                </div>
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

export default function CheckInPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">Loading...</div>}>
      <CheckInContent />
    </Suspense>
  )
}