'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'

// ★あなたのメールアドレス
const ADMIN_EMAIL = 'admin@test.com' 

export default function AdminQrPage() {
  const [loading, setLoading] = useState(true)
  const [qrUrl, setQrUrl] = useState('')
  const [token, setToken] = useState('')
  const [eventName, setEventName] = useState('Event Check-in')
  const router = useRouter()

  // トークン生成ロジック
  const createNewToken = async () => {
    const { data: realEvent, error: fetchError } = await supabase
      .from('event-app')
      .select('id, name')
      .limit(1)
      .single()

    if (fetchError || !realEvent) {
      alert('エラー: イベントがありません')
      return null
    }

    setEventName(realEvent.name)

    const newToken = crypto.randomUUID()
    const newId = Date.now() 

    const { data, error } = await supabase
      .from('event-token')
      .insert({
        id: newId,
        token: newToken,
        event_id: realEvent.id,
      })
      .select()
      .single()

    if (error) {
      alert('更新失敗: ' + error.message)
      return null
    }
    return data
  }

  // 初期化ロジック
  const init = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || user.email !== ADMIN_EMAIL) {
      router.push('/')
      return
    }

    const { data: eventData } = await supabase.from('event-app').select('name').limit(1).single()
    if (eventData) setEventName(eventData.name)

    let { data: tokenData } = await supabase
      .from('event-token')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let shouldUseExisting = false
    if (tokenData) {
      const createdDate = new Date(tokenData.created_at)
      const now = new Date()
      const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60)
      if (diffHours < 24) shouldUseExisting = true
    }

    if (!shouldUseExisting) {
      const newData = await createNewToken()
      if (newData) tokenData = newData
    }

    if (tokenData) {
      setToken(tokenData.token)
      setQrUrl(`${window.location.origin}/checkin?token=${tokenData.token}`)
    }
    setLoading(false)
  }

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const handleForceRefresh = async () => {
    if (!confirm('QRコードを更新しますか？\n（古いQRコードは使用できなくなります）')) return
    setLoading(true)
    const newData = await createNewToken()
    if (newData) {
      setToken(newData.token)
      setQrUrl(`${window.location.origin}/checkin?token=${newData.token}`)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 text-gray-600">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col font-sans text-gray-900">
      
      {/* ヘッダー: paddingを調整しスマホで圧迫感が出ないように */}
      <header className="w-full bg-white shadow-sm border-b border-gray-200 print:hidden sticky top-0 z-10">
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
          <span className="text-[10px] sm:text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-100 whitespace-nowrap">
            管理者
          </span>
        </div>
      </header>

      {/* メイン: スマホ用にパディングを px-4 に縮小 */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 print:p-0 print:bg-white">
        
        <div className="hidden print:block text-center mb-8 pt-8">
           <img src="/logo.png" alt="Logo" className="h-16 mx-auto mb-4" />
           <h1 className="text-3xl font-bold">イベントチェックイン</h1>
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 print:shadow-none print:border-none">
          
          <div className="bg-blue-600 p-5 text-center print:hidden">
            <h2 className="text-xs text-blue-100 font-medium mb-1">Check-in QR Code</h2>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight break-words">
              {eventName}
            </h3>
          </div>

          <div className="p-6 flex flex-col items-center bg-white">
            <p className="text-gray-600 mb-6 text-center text-sm print:text-lg print:text-black">
              参加者の方はこちらを<br/>読み取ってください
            </p>

            {qrUrl && (
              <div className="bg-white p-3 rounded-xl shadow-inner border border-gray-200 print:shadow-none print:border-4 print:border-black w-full max-w-[280px]">
                <QRCode
                  value={qrUrl}
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>
            )}
            
            <div className="mt-4 text-[10px] text-gray-400 break-all print:hidden text-center px-4">
              Token: {token.substring(0, 8)}...
            </div>
          </div>

          <div className="bg-gray-50 p-5 border-t border-gray-100 flex flex-col gap-3 print:hidden">
            <button 
              onClick={() => window.print()} 
              className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <span>🖨</span> 印刷する
            </button>

            <button 
              onClick={handleForceRefresh}
              className="w-full bg-white border border-red-200 text-red-500 py-3 rounded-lg font-bold hover:bg-red-50 transition-colors text-sm active:scale-[0.98]"
            >
              🔄 QR強制更新
            </button>

            <a href="/mypage" className="text-center mt-1 text-blue-600 text-sm hover:underline py-2 block">
              マイページへ戻る
            </a>
          </div>
        </div>

        <footer className="mt-6 text-gray-400 text-[10px] text-center print:fixed print:bottom-4 print:w-full">
          &copy; Shizuoka Connect.
        </footer>
      </main>
    </div>
  )
}