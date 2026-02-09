'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { eventSupabase } from '@/app/lib/eventDbClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// --- 型定義 ---
type Participation = {
  event_id: number
  checked_in_at: string
}

type ExternalEvent = {
  id: number
  title: string
  event_date: string
  image_url: string | null
  area: string | null
}

type HistoryItem = {
  eventName: string
  date: string
  time: string
}

// --- 定数 ---
const ADMIN_EMAILS = [
  'admin@test.com', 
  'campustocommunityshizuoka@gmail.com'
]

// ランク定義
const RANKS = [
  { name: 'ビギナー', threshold: 0 },
  { name: 'ブロンズ', threshold: 1 },
  { name: 'シルバー', threshold: 5 },
  { name: 'ゴールド', threshold: 10 },
]

// --- アイコンコンポーネント ---
const Icons = {
  Home: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  History: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>,
  Camera: () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
  Logout: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
  Trophy: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
}

export default function MyPage() {
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'history'>('home')
  
  // データ
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [participationCount, setParticipationCount] = useState(0)
  const [currentRank, setCurrentRank] = useState(RANKS[0])
  const [fetchedEvents, setFetchedEvents] = useState<ExternalEvent[]>([])
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !session.user) {
        router.push('/login')
        return
      }
      setUserEmail(session.user.email || '')
      
      const adminFlag = session.user.email ? ADMIN_EMAILS.includes(session.user.email) : false
      setIsAdmin(adminFlag)

      // 1. 外部イベント一覧取得
      const today = new Date().toISOString().split('T')[0]
      const { data: eventData } = await eventSupabase
        .from('events')
        .select('id, title, event_date, image_url, area')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(10)
      
      setFetchedEvents(eventData || [])

      // 2. 参加履歴取得・ランク計算
      if (!adminFlag) {
        const { data: participations } = await supabase
          .from('participations')
          .select('event_id, checked_in_at')
          .eq('user_id', session.user.id)
          .order('checked_in_at', { ascending: false })

        if (participations) {
          const count = participations.length
          setParticipationCount(count)
          
          const rank = [...RANKS].reverse().find(r => count >= r.threshold) || RANKS[0]
          setCurrentRank(rank)

          const eventIds = Array.from(new Set(participations.map((p: Participation) => p.event_id)))
          
          // ★修正: 履歴用のデータ取得でも型定義に合わせて全カラムを取得
          const { data: historyEventDetails } = await eventSupabase
            .from('events') 
            .select('id, title, event_date, image_url, area')
            .in('id', eventIds)

          const formattedHistory: HistoryItem[] = participations.map((p: Participation) => {
            // ★修正: (e: ExternalEvent) という型注釈を削除し、(e)のみに変更
            // Supabaseから返ってくるデータ型をそのまま使うことでエラーを回避
            const event = historyEventDetails?.find((e) => e.id === p.event_id)
            const checkInDate = new Date(p.checked_in_at)
            return {
              eventName: event ? event.title : `イベント (ID:${p.event_id})`,
              date: checkInDate.toLocaleDateString('ja-JP'),
              time: checkInDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            }
          })
          setHistory(formattedHistory)
        }
      }
      setLoading(false)
    }

    init()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // プログレスバーの進捗率を計算
  const calculateProgressWidth = () => {
    if (participationCount < 1) return (participationCount / 1) * 33.3
    if (participationCount < 5) return 33.3 + ((participationCount - 1) / 4) * 33.3
    if (participationCount < 10) return 66.6 + ((participationCount - 5) / 5) * 33.3
    return 100
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  )

  // =========================================================
  // ★ 管理者用ビュー
  // =========================================================
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
        <header className="bg-white shadow-sm sticky top-0 z-10 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
            <span className="text-sm font-bold text-blue-600">管理者</span>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-gray-500 hover:text-red-500">ログアウト</button>
        </header>
        <main className="flex-grow w-full max-w-xl mx-auto p-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">イベントQR発行</h2>
            {fetchedEvents.length === 0 ? (
              <p className="text-center text-gray-400 text-sm">表示可能なイベントがありません</p>
            ) : (
              <div className="grid gap-3">
                {fetchedEvents.map((event) => (
                  <Link key={event.id} href={`/admin/qr?id=${event.id}`} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all group">
                    <div>
                      <p className="text-[10px] font-bold text-blue-500">{event.event_date}</p>
                      <h3 className="font-bold text-sm text-gray-800">{event.title}</h3>
                    </div>
                    <span className="text-gray-300 group-hover:text-blue-500">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  // =========================================================
  // ★ 一般参加者用ビュー
  // =========================================================
  return (
    <div className="min-h-[100dvh] bg-gray-50 font-sans text-gray-900 pb-24">
      
      {/* アプリヘッダー */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-20 px-5 py-3 flex justify-between items-center border-b border-gray-100">
        <h1 className="text-lg font-extrabold text-blue-600 tracking-tight">しずおかコネクト</h1>
        <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
          <Icons.Logout />
        </button>
      </header>

      <main className="max-w-md mx-auto p-4">
        
        {/* --- ホームタブ --- */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-4 animate-fade-in-up">
            
            {/* 1. ユーザー情報 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 font-medium">Welcome back,</p>
                <p className="text-sm font-bold text-gray-800 truncate max-w-[200px] leading-tight">
                  {userEmail.split('@')[0]}
                </p>
              </div>
              
              {/* ランクバッジ */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-yellow-600"><Icons.Trophy /></span>
                <span className="text-xs font-bold text-gray-600">{currentRank.name}</span>
              </div>
            </div>

            {/* 2. 参加状況 & カメラ */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex-grow">
                  <p className="text-xs font-bold text-gray-400 mb-1">Total Check-ins</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-blue-600 tracking-tight">{participationCount}</span>
                    <span className="text-sm font-bold text-gray-500">回</span>
                  </div>
                </div>

                <Link 
                  href="/checkin" 
                  className="flex-shrink-0 w-14 h-14 bg-blue-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-md hover:bg-blue-700 hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  <Icons.Camera />
                </Link>
              </div>

              {/* プログレスバー */}
              <div className="relative pt-2 pb-4 px-1">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 rounded-full z-0"></div>
                
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 rounded-full z-0 transition-all duration-1000 ease-out"
                  style={{ width: `${calculateProgressWidth()}%` }}
                ></div>

                {/* ランクノード */}
                <div className="relative z-10 flex justify-between w-full">
                  {RANKS.map((rank) => {
                    const isReached = participationCount >= rank.threshold
                    return (
                      <div key={rank.name} className="flex flex-col items-center group">
                        {/* 数字入りの丸 */}
                        <div className={`
                          w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-500
                          ${isReached 
                            ? 'bg-blue-600 border-blue-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-400'}
                        `}>
                          {rank.threshold}
                        </div>
                        
                        <span className={`
                          absolute top-7 text-[9px] font-bold whitespace-nowrap mt-1 transition-colors
                          ${isReached ? 'text-blue-600' : 'text-gray-300'}
                        `}>
                          {rank.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 3. イベント一覧 (その他のイベント) */}
            <section className="mt-4">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-gray-700">その他のイベント</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {fetchedEvents.map((event) => (
                  <a 
                    key={event.id}
                    href="https://hamamtsu-events.shizuoka-connect.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md border border-gray-100 flex flex-col"
                  >
                    <div className="relative w-full aspect-[4/3] bg-gray-100">
                      {event.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={event.image_url} 
                          alt={event.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <span className="text-[10px]">No Image</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex flex-col flex-grow">
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded self-start mb-1.5 border border-gray-100">
                          {new Date(event.event_date).toLocaleDateString()}
                      </span>
                      <h3 className="line-clamp-2 text-xs font-bold text-gray-800 leading-snug group-hover:text-blue-600 transition-colors">
                        {event.title}
                      </h3>
                    </div>
                  </a>
                ))}

                {fetchedEvents.length === 0 && (
                   <div className="col-span-2 rounded-xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-400">
                     現在予定されているイベントはありません
                   </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* --- 履歴タブ --- */}
        {activeTab === 'history' && (
          <div className="animate-fade-in-up">
            <h2 className="mb-4 px-1 text-lg font-bold text-gray-800">参加履歴</h2>
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              {history.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-gray-400">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                    <Icons.History />
                  </div>
                  <p className="text-xs">履歴がありません</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {history.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 transition-colors hover:bg-gray-50">
                      <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-gray-50 text-gray-600">
                        <span className="text-[10px] font-bold uppercase">{new Date(item.date).toLocaleString('en-US', { month: 'short' })}</span>
                        <span className="text-lg font-bold leading-none">{new Date(item.date).getDate()}</span>
                      </div>
                      <div className="flex-grow">
                        <p className="line-clamp-1 text-sm font-bold text-gray-800">{item.eventName}</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                           {item.time} チェックイン
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-gray-100 bg-white pb-safe pt-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex h-14 max-w-md items-center justify-around px-6">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Icons.Home />
            <span className="text-[10px] font-bold">ホーム</span>
          </button>
          
          <Link href="/checkin" className="group relative -top-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/40 transition-transform group-hover:scale-105 group-active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            </div>
          </Link>

          <button 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'history' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Icons.History />
            <span className="text-[10px] font-bold">履歴</span>
          </button>
        </div>
      </nav>
    </div>
  )
}