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

  const handleCheckIn = async (qrContent: string) => {
    if (status === 'processing' || status === 'success') return
    setStatus('processing')
    
    // ログインチェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('チェックインにはログインが必要です')
      router.push('/login')
      return
    }

    // 1. QRコード（シークレット）の検証
    const { data: secretData, error: secretError } = await supabase
      .from('event_secrets')
      .select('event_id')
      .eq('secret_code', qrContent)
      .single()

    if (secretError || !secretData) {
      console.error(secretError)
      setStatus('error')
      setMessage('無効なQRコード、または削除されています')
      return
    }

    // 2. 重複チェック
    const { data: existing } = await supabase
      .from('participations')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', secretData.event_id)
      .single()

    if (existing) {
      setStatus('error')
      setMessage('すでにこのイベントにはチェックイン済みです')
      return
    }

    // 3. 参加登録
    const { error: insertError } = await supabase
      .from('participations')
      .insert({
        user_id: user.id,
        event_id: secretData.event_id,
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

  // 表示部分は変更なし
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col font-sans text-gray-900">
      
      <header className="w-full bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain sm:h-10" />
            <h1 className="text-base font-bold text-blue-600 tracking-wide hidden sm:block">しずおかコネクト</h1>
          </div>
          <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-100">QRチェックイン</span>
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
                    styles={{ container: { width: '100%', height: '100%' }, video: { width: '100%', height: '100%', objectFit: 'cover' }}}
                  />
                  <div className="absolute inset-0 border-[30px] border-black/30 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white/50 rounded-lg"></div>
                  </div>
                </div>
                <button onClick={() => router.push('/mypage')} className="mt-4 text-gray-500 text-sm underline py-2">キャンセル</button>
              </div>
            )}

            {status === 'success' && (
              <div className="py-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-500 mx-auto">✓</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">完了しました</h3>
                <button onClick={() => router.push('/mypage')} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-md mt-4">マイページへ</button>
              </div>
            )}

            {status === 'error' && (
              <div className="py-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-500 mx-auto">✕</div>
                <p className="text-gray-600 mb-6 font-medium bg-red-50 px-4 py-2 rounded text-xs">{message}</p>
                <button onClick={() => setStatus('scan_mode')} className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold mb-2">再読み込み</button>
                <button onClick={() => router.push('/mypage')} className="w-full border border-gray-200 text-gray-500 py-3 rounded-lg font-bold">戻る</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CheckInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckInContent />
    </Suspense>
  )
}