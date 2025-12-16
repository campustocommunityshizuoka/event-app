'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Session } from '@supabase/supabase-js'

// ★管理者として許可するメールアドレス
const ADMIN_EMAILS = [
  'admin@test.com', 
  'campustocommunityshizuoka@gmail.com'
]

// データ型の定義
type Participation = {
  id: number
  event_id: number
  checked_in_at: string
}

type EventData = {
  id: number
  name: string
}

type HistoryItem = {
  eventName: string
  date: string
  time: string
}

export default function MyPage() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [participationCount, setParticipationCount] = useState(0) // ★追加: 参加回数用のステート
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      // 1. ユーザーセッション確認
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !session.user) {
        router.push('/login')
        return
      }
      setSession(session)
      setUserEmail(session.user.email || '')

      // 2. 参加履歴の取得
      const { data: participations, error: pError } = await supabase
        .from('participations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('checked_in_at', { ascending: false })

      if (pError) {
        console.error('Error fetching participations:', pError)
      } else if (participations && participations.length > 0) {
        
        // ★追加: 参加回数をセット
        setParticipationCount(participations.length)

        // 3. イベント情報の取得
        const eventIds = Array.from(new Set(participations.map((p: Participation) => p.event_id)))
        
        // ★修正: テーブル名を 'event-app' に変更（前回の修正に合わせました）
        const { data: events } = await supabase
          .from('event-app') 
          .select('id, name')
          .in('id', eventIds)

        // 4. データ結合
        const formattedHistory: HistoryItem[] = participations.map((p: Participation) => {
          const event = events?.find((e: EventData) => e.id === p.event_id)
          const dateObj = new Date(p.checked_in_at)
          return {
            eventName: event ? event.name : 'Unknown Event',
            date: dateObj.toLocaleDateString('ja-JP'),
            time: dateObj.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          }
        })
        setHistory(formattedHistory)
      } else {
        // 参加履歴がない場合
        setParticipationCount(0)
      }
      setLoading(false)
    }

    init()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // 管理者かどうか判定する関数
  const isAdmin = (email?: string) => {
    if (!email) return false
    return ADMIN_EMAILS.includes(email)
  }

  // --- ローディング表示 ---
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-gray-400 text-xs">読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col font-sans text-gray-900">
      
      {/* ヘッダー */}
      <header className="w-full bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain sm:h-10" />
            <h1 className="text-base font-bold text-blue-600 tracking-wide hidden sm:block">
              しずおかコネクト
            </h1>
          </div>
          <button 
            onClick={handleLogout}
            className="text-[10px] font-medium text-gray-500 hover:text-red-500 border border-gray-200 px-3 py-1.5 rounded-full transition-colors active:bg-gray-100"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-grow w-full max-w-md mx-auto p-4 flex flex-col gap-4">
        
        {/* ユーザー情報と参加回数表示エリア */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-xl">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="flex-grow overflow-hidden">
              <p className="text-xs text-gray-400">Account</p>
              <p className="text-sm font-bold text-gray-800 truncate">{userEmail}</p>
              <Link href="/update-password" className="text-[10px] text-blue-500 hover:underline">
                 パスワード変更
               </Link>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full mb-4"></div>

          {/* ★★★ 参加回数の強調表示 ★★★ */}
          <div className="flex items-center justify-between bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Total Check-ins</p>
              <p className="text-gray-600 text-[10px]">これまでのイベント参加数</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-blue-600 font-mono tracking-tighter">
                {participationCount}
              </span>
              <span className="text-sm font-bold text-blue-400">回</span>
            </div>
          </div>
        </div>

        {/* 管理者メニュー（条件付き表示） */}
        {isAdmin(userEmail) && (
          <div className="animate-fade-in-up">
            <Link 
              href="/admin/qr"
              className="block w-full bg-slate-800 text-white p-4 rounded-xl shadow-lg hover:bg-slate-700 transition-all active:scale-[0.98] flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔐</span>
                <div className="text-left">
                  <p className="text-[10px] text-slate-300 font-bold">管理者メニュー</p>
                  <p className="text-sm font-bold">QRコード管理画面へ</p>
                </div>
              </div>
              <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        )}

        {/* チェックインボタン */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg p-6 text-center text-white relative overflow-hidden">
          {/* 背景の装飾 */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl"></div>

          <h2 className="text-lg font-bold mb-1 relative z-10">イベントに参加する</h2>
          <p className="text-blue-100 text-xs mb-6 relative z-10">会場のQRコードを読み取ってチェックイン</p>
          
          <Link 
            href="/checkin"
            className="block w-full bg-white text-blue-600 py-3.5 rounded-xl font-bold shadow-md hover:bg-blue-50 transition-colors active:scale-[0.98] relative z-10 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 14.5v.01M12 18.5v.01M12 10.5v.01M16 14.5v.01M16 18.5v.01M8 14.5v.01M8 18.5v.01M8 10.5v.01M12 6.5v.01M16 6.5v.01M8 6.5v.01" />
            </svg>
            カメラを起動する
          </Link>
        </div>

        {/* 参加履歴リスト */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-grow flex flex-col">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50">
            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              最近の参加履歴
            </h3>
          </div>
          
          <div className="divide-y divide-gray-50">
            {history.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                まだ参加履歴がありません
              </div>
            ) : (
              history.map((item, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{item.eventName}</p>
                    <p className="text-xs text-gray-400 mt-1">{item.date}</p>
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {item.time}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      <footer className="p-6 text-gray-300 text-[10px] text-center">
        &copy; Shizuoka Connect.
      </footer>
    </div>
  )
}