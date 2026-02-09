'use client'

import { useEffect, useState, Suspense } from 'react' // Suspenseを追加
import { supabase } from '@/app/lib/supabaseClient'
import { eventSupabase } from '@/app/lib/eventDbClient'
import { useRouter, useSearchParams } from 'next/navigation'
import QRCode from 'react-qr-code'

const ADMIN_EMAILS = [
  'admin@test.com',
  'campustocommunityshizuoka@gmail.com'
]

// ★対象のPoster ID
const TARGET_POSTER_ID = '5ef710d4-3583-4ff9-a010-ddec40616767'

type ExternalEvent = {
  id: number
  title: string
  event_date: string
}

function AdminQRContent() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [events, setEvents] = useState<ExternalEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [qrValue, setQrValue] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEventId = searchParams ? searchParams.get('id') : null

  // 1. 管理者チェックとイベント一覧の取得
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user && user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true)
        
        // ★フィルタリングを追加: 指定されたposter_idのイベントのみ取得
        const { data, error } = await eventSupabase
          .from('events') 
          .select('id, title, event_date') 
          .eq('poster_id', TARGET_POSTER_ID) // 追加
          .order('event_date', { ascending: false })

        if (error) {
          console.error('外部イベント取得エラー:', error)
          alert('イベント情報の取得に失敗しました')
        } else {
          setEvents(data || [])
          
          // URLパラメータでIDが指定されていた場合、初期選択を行う
          if (initialEventId) {
            const targetId = Number(initialEventId)
            // 取得したイベントリストの中に存在するか確認
            if (data?.some(e => e.id === targetId)) {
               selectEvent(targetId)
            }
          }
        }
      } else {
        router.push('/')
      }
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, initialEventId]) // initialEventIdの変更も監視

  // イベントを選択してQRコードを取得する共通処理
  const selectEvent = async (eventId: number) => {
    setSelectedEventId(eventId)
    setQrValue('')

    const { data } = await supabase
      .from('event_secrets')
      .select('secret_code')
      .eq('event_id', eventId)
      .single()

    if (data) {
      setQrValue(data.secret_code)
    }
  }

  // プルダウン操作時のハンドラ
  const handleEventSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eventId = Number(e.target.value)
    if (eventId) {
      selectEvent(eventId)
    } else {
      setSelectedEventId(null)
      setQrValue('')
    }
  }

  const generateNewQr = async () => {
    if (!selectedEventId) return
    setIsUpdating(true)

    try {
      const newSecret = `evt-${selectedEventId}-${Math.random().toString(36).substring(2, 10)}`

      await supabase.from('event_secrets').delete().eq('event_id', selectedEventId)

      const { error } = await supabase.from('event_secrets').insert({
        event_id: selectedEventId,
        secret_code: newSecret
      })

      if (error) throw error

      setQrValue(newSecret)
    } catch (error) {
      console.error('QR生成エラー:', error)
      alert('QRコードの保存に失敗しました')
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) return <div className="p-10 text-center">確認中...</div>
  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800 mb-6">イベントQR発行</h1>
        
        <div className="mb-6 text-left">
          <label className="block text-sm font-bold text-gray-700 mb-2">イベントを選択</label>
          <select 
            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500"
            onChange={handleEventSelect}
            value={selectedEventId || ''}
          >
            <option value="">-- イベントを選択 --</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.event_date} : {ev.title}
              </option>
            ))}
          </select>
        </div>

        {selectedEventId && (
          <div className="animate-fade-in-up">
            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-blue-200 inline-block mb-4">
              {qrValue ? (
                <QRCode
                  value={qrValue}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              ) : (
                <div className="h-[200px] w-[200px] flex items-center justify-center text-gray-400 text-sm">
                  QR未発行
                </div>
              )}
            </div>

            <button 
              onClick={generateNewQr}
              disabled={isUpdating}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 mb-4"
            >
              {isUpdating ? '処理中...' : (qrValue ? 'QRコードを再発行' : 'QRコードを発行')}
            </button>
          </div>
        )}

        <button 
          onClick={() => router.push('/mypage')}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          マイページへ戻る
        </button>
      </div>
    </div>
  )
}

export default function AdminQRPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminQRContent />
    </Suspense>
  )
}