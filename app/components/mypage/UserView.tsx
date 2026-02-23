'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { eventSupabase } from '@/app/lib/eventDbClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NotificationManager from '../NotificationManager'
import OnboardingModal from '../OnboardingModal' // ★追加: オンボーディングモーダル

const EXTERNAL_SITE_URL = 'https://hamamtsu-events.shizuoka-connect.com'
const SHIZUOKA_CONNECT_POSTER_ID = '5ef710d4-3583-4ff9-a010-ddec40616767'

// ... (中略)
type Profile = {
  id: string
  email: string
  total_xp: number
  current_rank: string
  bio: string | null
  username: string | null
  avatar_url: string | null
}

type Badge = {
  id: number
  name: string
  icon_url: string
  description: string
}

type UserBadgeResponse = {
  badge: Badge | null
}

type Job = {
  id: number
  title: string
  reward_amount: string | null
  required_rank: string | null
  deadline: string | null
  is_active: boolean
}

type Scout = {
  id: number
  message: string
  status: string 
  job: {
    id: number
    title: string
    reward_amount: string
  }
}

type NewsFeed = {
  id: number
  title: string
  link_url: string | null
  content: string | null
  source_name: string | null
  published_at: string
  image_url: string | null
}

type MyApplication = {
  id: number
  status: 'pending' | 'approved' | 'rejected'
  message: string
  job: {
    id: number
    title: string
    reward_amount: string
    required_rank: string
  }
}

type JobApplicationDBResponse = {
  id: number
  status: string
  message: string | null
  job: {
    id: number
    title: string
    reward_amount: string | null
    required_rank: string | null
  } | null
}

type HistoryItem = {
  eventName: string
  date: string
  xp: number
}

type ParticipationResponse = {
  event_id: number
  checked_in_at: string
}

type EventResponse = {
  id: number
  title: string
}

type ExternalEvent = {
  id: number
  title: string
  event_date: string
  poster_id: string
  address: string | null
  description: string | null
  image_url: string | null
}

type Rank = {
  name: string
  minXp: number
  color: string
  textColor: string
  border: string
}

type ChatMessage = {
  id: number
  content: string
  sender_id: string
  created_at: string
}

const XP_PER_EVENT = 100

const RANKS: Rank[] = [
  { name: 'ビギナー', minXp: 0, color: 'bg-green-500', textColor: 'text-green-600', border: 'border-green-200' },
  { name: 'ブロンズ', minXp: 300, color: 'bg-orange-400', textColor: 'text-orange-600', border: 'border-orange-200' },
  { name: 'シルバー', minXp: 1000, color: 'bg-slate-400', textColor: 'text-slate-600', border: 'border-slate-300' },
  { name: 'ゴールド', minXp: 3000, color: 'bg-yellow-400', textColor: 'text-yellow-600', border: 'border-yellow-300' },
  { name: 'プラチナ', minXp: 10000, color: 'bg-purple-600', textColor: 'text-purple-600', border: 'border-purple-300' },
]

// --- アイコン ---
const Icons = {
  Home: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Map: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" x2="8" y1="2" y2="18"/><line x1="16" x2="16" y1="6" y2="22"/></svg>,
  Quest: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>,
  Camera: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
  History: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>,
  Info: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>,
  Logout: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
  Briefcase: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  Close: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  ExternalLink: () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>,
  Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,
  MessageNav: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  Settings: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  News: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 22H5a3 3 0 0 1-3-3V3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12h4v4a3 3 0 0 1-3 3zM18 2h-8v12h8z"/></svg>,
  Bell: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>,
  XMark: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
}

export default function UserView({ userId, userEmail }: { userId: string, userEmail: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'home' | 'events' | 'quests' | 'messages' | 'info' | 'history'>('home')
  
// ▼▼▼ 追加: ユーザーネーム強制登録用のState ▼▼▼
  const [needsUsername, setNeedsUsername] = useState(false)
  const [inputUsername, setInputUsername] = useState('')
  const [isSavingUsername, setIsSavingUsername] = useState(false)
  // ▲▲▲ 追加ここまで ▲▲▲

  const [profile, setProfile] = useState<Profile | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [myApplications, setMyApplications] = useState<MyApplication[]>([])
  const [scouts, setScouts] = useState<Scout[]>([]) 
  const [news, setNews] = useState<NewsFeed[]>([])
  
  const [selectedNews, setSelectedNews] = useState<NewsFeed | null>(null)
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)
  
  const [activeChatApp, setActiveChatApp] = useState<MyApplication | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [upcomingEvents, setUpcomingEvents] = useState<ExternalEvent[]>([])
  const [hasMoreEvents, setHasMoreEvents] = useState(false)

  const [nextRank, setNextRank] = useState<Rank>(RANKS[1])
  const [progressPercent, setProgressPercent] = useState(0)

  const [hiddenAppIds, setHiddenAppIds] = useState<number[]>([])

  // ▼▼▼ カレンダー用に追加するState ▼▼▼
  const [currentDate, setCurrentDate] = useState(new Date()) // 表示中の年月
  const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toISOString().split('T')[0]) // 選択中の日付 (YYYY-MM-DD)
  // ▲▲▲ 追加ここまで ▲▲▲

  const [requestText, setRequestText] = useState('')
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

  useEffect(() => {
    const init = async () => {
      const storedHidden = localStorage.getItem('hidden_quest_results')
      if (storedHidden) {
        setHiddenAppIds(JSON.parse(storedHidden))
      }

      let { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single()
      
      const { data: participations } = await supabase.from('participations').select('event_id, checked_in_at').eq('user_id', userId).order('checked_in_at', { ascending: false })

      const participationCount = participations?.length || 0
      const currentTotalXp = profileData?.total_xp || 0
      const calculatedXp = Math.max(currentTotalXp, participationCount * XP_PER_EVENT)
      
      let currentRankObj = RANKS[0]
      let nextRankObj = RANKS[1]
      for (let i = 0; i < RANKS.length; i++) {
        if (calculatedXp >= RANKS[i].minXp) {
          currentRankObj = RANKS[i]
          nextRankObj = RANKS[i + 1] || { ...RANKS[i], name: 'MAX', minXp: calculatedXp }
        }
      }

      if (!profileData || profileData.total_xp < calculatedXp || profileData.current_rank !== currentRankObj.name) {
        const updates = { total_xp: calculatedXp, current_rank: currentRankObj.name, email: userEmail }
        await supabase.from('profiles').upsert({ id: userId, ...updates })
        profileData = { ...profileData, ...updates, id: userId }
      }

      // ▼▼▼ 追加: ユーザーネーム強制チェック ▼▼▼
      // username が null または 空文字の場合、強制登録モードにする
      if (!profileData.username || profileData.username.trim() === '') {
        setNeedsUsername(true)
      }
      // ▲▲▲ 追加ここまで ▲▲▲

      setProfile(profileData)
      setNextRank(nextRankObj)
      const range = nextRankObj.minXp - currentRankObj.minXp
      const currentProgress = calculatedXp - currentRankObj.minXp
      const percent = range > 0 ? Math.min(100, Math.max(0, (currentProgress / range) * 100)) : 100
      setProgressPercent(percent)

      const { data: userBadges } = await supabase.from('user_badges').select('badge:badges(*)').eq('user_id', userId).returns<UserBadgeResponse[]>()
      setBadges((userBadges || []).map(ub => ub.badge).filter((b): b is Badge => b !== null))

      const { data: appData } = await supabase.from('job_applications').select(`id, status, message, job:jobs ( id, title, reward_amount, required_rank )`).eq('user_id', userId).order('created_at', { ascending: false }).returns<JobApplicationDBResponse[]>()
      const formattedApps: MyApplication[] = (appData || []).map((app) => ({
        id: app.id,
        status: (app.status as 'pending' | 'approved' | 'rejected') || 'pending',
        message: app.message || '',
        job: { id: app.job?.id || 0, title: app.job?.title || '不明なクエスト', reward_amount: app.job?.reward_amount || '不明', required_rank: app.job?.required_rank || 'ビギナー' }
      }))
      setMyApplications(formattedApps)
      const appliedJobIds = formattedApps.map(app => app.job.id)

      const { data: scoutData } = await supabase
        .from('scouts')
        .select('id, message, status, job:jobs (id, title, reward_amount)')
        .eq('user_id', userId)
        .eq('status', 'offered') 
        .order('created_at', { ascending: false })
        .returns<Scout[]>()
      setScouts(scoutData || [])

      const now = new Date()
      const { data: jobData } = await supabase.from('jobs').select('*').eq('is_active', true).limit(50).returns<Job[]>()
      const validJobs = (jobData || []).filter(job => { if (!job.deadline) return true; return new Date(job.deadline) > now })
      setJobs(validJobs.filter(job => !appliedJobIds.includes(job.id)))

      if (participations) {
        const typedParticipations = participations as ParticipationResponse[]
        const eventIds = Array.from(new Set(typedParticipations.map(p => p.event_id)))
        const { data: events } = await eventSupabase.from('events').select('id, title').in('id', eventIds).returns<EventResponse[]>()
        setHistory(typedParticipations.map(p => {
          const ev = events?.find(e => e.id === p.event_id)
          return { eventName: ev ? ev.title : `Event #${p.event_id}`, date: new Date(p.checked_in_at).toLocaleDateString('ja-JP'), xp: XP_PER_EVENT }
        }))
      }

      const { data: newsData } = await supabase.from('news_feeds').select('*').order('published_at', { ascending: false }).limit(20).returns<NewsFeed[]>()
      setNews(newsData || [])

      const todayStr = new Date().toISOString().split('T')[0]
// 修正箇所: fetchEvents 内のクエリ
      const { data: eventsData } = await eventSupabase
        .from('events')
        .select('*')
        // ★修正: パートナー主催 OR しずおかコネクト主催 のいずれか
        .or(`is_partner_hosted.eq.true,poster_id.eq.${SHIZUOKA_CONNECT_POSTER_ID}`)
        .gte('event_date', todayStr)
        .order('event_date', { ascending: true })
        .limit(21)
        .returns<ExternalEvent[]>()
      const events = eventsData || []
      if (events.length > 20) {
        setHasMoreEvents(true)
        setUpcomingEvents(events.slice(0, 20))
      } else {
        setHasMoreEvents(false)
        setUpcomingEvents(events)
      }



      setLoading(false)
    }
    init()
  }, [userId, userEmail])

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

    const handlePrevMonth = () => {
     setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
     setSelectedDateStr('') // 月移動時は選択解除（または1日にする等）
    }
    const handleNextMonth = () => {
     setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
     setSelectedDateStr('')
    }


  // 送信処理の関数
const handleRequestSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!requestText.trim()) return
  setIsSubmittingRequest(true)

  try {
    const { error } = await supabase.from('user_requests').insert({
      user_id: userId,
      content: requestText.trim(),
    })

    if (error) throw error

    alert('リクエストを送信しました！貴重なご意見ありがとうございます。')
    setRequestText('') // 送信成功したら入力欄を空にする
  } catch (err) {
    console.error(err)
    alert('送信に失敗しました。時間をおいて再度お試しください。')
  } finally {
    setIsSubmittingRequest(false)
  }
}

  // カレンダーレンダリング関数
  const renderCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() // 0-indexed
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)

    const days = []
    // 空白セル (先月分)
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-14 bg-transparent"></div>)
    }

    // 日付セル
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      // その日にイベントがあるかチェック
      const dayEvents = upcomingEvents.filter(e => e.event_date === dateStr)
      const hasEvent = dayEvents.length > 0
      const isSelected = selectedDateStr === dateStr
      const isToday = dateStr === new Date().toISOString().split('T')[0]

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDateStr(dateStr)}
          className={`... (クラス名は変更なし) ...`}
        >
          <span className={`text-xs ${isSelected ? 'font-bold' : ''}`}>{day}</span>
          {hasEvent && (
            <div className="mt-1 flex gap-0.5 justify-center flex-wrap px-1">
              {dayEvents.slice(0, 3).map((ev, i) => {
                // ★修正: 主催者によって色を変える
                const isOfficial = ev.poster_id === SHIZUOKA_CONNECT_POSTER_ID
                return (
                  <div 
                    key={i} 
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected 
                        ? 'bg-white' 
                        : isOfficial 
                          ? 'bg-orange-400' // 公式: オレンジ (目立つ)
                          : 'bg-green-400'  // 提携: 緑 (親しみやすい)
                    }`}
                  ></div>
                )
              })}
              {dayEvents.length > 3 && <span className="text-[8px] leading-none text-gray-400">+</span>}
            </div>
          )}
        </button>
      )
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 select-none">
        {/* カレンダーヘッダー */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
             &lt;
          </button>
          <h3 className="font-bold text-lg text-gray-800">
            {year}年 {month + 1}月
          </h3>
          <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
             &gt;
          </button>
        </div>
        
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
          {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
            <div key={d} className={`text-xs font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    )
  }

  // ▼▼▼ 追加: ユーザーネーム保存処理 ▼▼▼
  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = inputUsername.trim()
    if (!trimmedName) return

    setIsSavingUsername(true)
    try {
      // DB更新
      const { error } = await supabase
        .from('profiles')
        .update({ username: trimmedName })
        .eq('id', userId)

      if (error) throw error

      // 成功したらローカルのstateも更新してモーダルを閉じる
      if (profile) {
        setProfile({ ...profile, username: trimmedName })
      }
      setNeedsUsername(false)
      alert('ユーザーネームを登録しました！\nようこそ、' + trimmedName + 'さん！')
    } catch (err) {
      console.error(err)
      alert('登録に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setIsSavingUsername(false)
    }
  }
  // ▲▲▲ 追加ここまで ▲▲▲

  const openChat = async (app: MyApplication) => {
    setActiveChatApp(app)
    setChatMessages([])
    const { data } = await supabase.from('application_messages').select('*').eq('application_id', app.id).order('created_at', { ascending: true }).returns<ChatMessage[]>()
    setChatMessages(data || [])
    setTimeout(scrollToBottom, 100)
  }
  const closeChat = () => setActiveChatApp(null)
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !activeChatApp) return
    setIsSending(true)
    try {
      const { error } = await supabase.from('application_messages').insert({ application_id: activeChatApp.id, sender_id: userId, content: chatInput.trim() })
      if (error) throw error
      const newMsg: ChatMessage = { id: Date.now(), content: chatInput.trim(), sender_id: userId, created_at: new Date().toISOString() }
      setChatMessages(prev => [...prev, newMsg])
      setChatInput('')
      setTimeout(scrollToBottom, 100)
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = err 
      alert('送信に失敗しました') 
    } finally { setIsSending(false) }
  }

  const handleAcceptScout = async (scout: Scout) => {
    if(!confirm(`「${scout.job.title}」のオファーを受けますか？`)) return
    try {
      await supabase.from('scouts').update({ status: 'accepted' }).eq('id', scout.id)
      await supabase.from('job_applications').insert({ job_id: scout.job.id, user_id: userId, message: 'スカウト経由の応募 (自動承認)', status: 'approved' })
      alert('オファーを受けました！'); window.location.reload()
    } catch (e) { 
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = e
      alert('エラーが発生しました') 
    }
  }

  const handleDeclineScout = async (scoutId: number) => {
    if(!confirm('本当に辞退しますか？')) return
    await supabase.from('scouts').update({ status: 'declined' }).eq('id', scoutId)
    setScouts(prev => prev.filter(s => s.id !== scoutId))
  }

  const handleHideApp = (appId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const newHidden = [...hiddenAppIds, appId]
    setHiddenAppIds(newHidden)
    localStorage.setItem('hidden_quest_results', JSON.stringify(newHidden))
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
  const getCurrentRankObj = () => { if (!profile) return RANKS[0]; return RANKS.find(r => r.name === profile.current_rank) || RANKS[0] }
  const currentRankObj = getCurrentRankObj()

  const approvedApps = myApplications.filter(a => a.status === 'approved' || a.status === 'rejected')
  const pendingApps = myApplications.filter(a => a.status === 'pending')

  const NewsCarousel = ({ newsItems }: { newsItems: NewsFeed[] }) => {
    const [pageIndex, setPageIndex] = useState(0)
    const ITEMS_PER_PAGE = 3
    
    useEffect(() => {
      if (newsItems.length <= ITEMS_PER_PAGE) return
      const interval = setInterval(() => {
        setPageIndex(prev => {
           const next = prev + 1
           return (next * ITEMS_PER_PAGE < newsItems.length) ? next : 0
        })
      }, 5000)
      return () => clearInterval(interval)
    }, [newsItems])

    if (newsItems.length === 0) return <div className="p-4 text-center text-xs text-gray-400 border border-dashed rounded-xl">お知らせはありません</div>

    const visibleNews = newsItems.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE)

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex justify-between items-center">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1">📣 お知らせ</span>
          {newsItems.length > ITEMS_PER_PAGE && (
             <div className="flex gap-1">
               {Array.from({ length: Math.ceil(newsItems.length / ITEMS_PER_PAGE) }).map((_, i) => (
                 <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === pageIndex ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
               ))}
             </div>
          )}
        </div>
        <div className="divide-y divide-gray-100">
          {visibleNews.map(news => (
            <div 
              key={news.id} 
              onClick={() => { if (news.content) { setSelectedNews(news) } else if (news.link_url) { window.open(news.link_url, '_blank') } }}
              className="p-3 active:bg-gray-50 flex items-center gap-3 cursor-pointer animate-fade-in"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                   <span className="text-[10px] text-gray-400 shrink-0">{new Date(news.published_at).toLocaleDateString()}</span>
                   <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded shrink-0">{news.source_name}</span>
                </div>
                <p className="text-sm text-gray-800 font-bold truncate">{news.title}</p>
              </div>
              <span className="text-gray-300 text-xs">›</span>
            </div>
          ))}
          {visibleNews.length < ITEMS_PER_PAGE && Array.from({ length: ITEMS_PER_PAGE - visibleNews.length }).map((_, i) => (
             <div key={`empty-${i}`} className="p-3 opacity-0 pointer-events-none"><p className="text-sm">&nbsp;</p></div>
          ))}
        </div>
      </div>
    )
  }


  const QuestDashboard = ({ isHome = false }: { isHome?: boolean }) => {
    const visibleApprovedApps = isHome 
      ? approvedApps.filter(app => !hiddenAppIds.includes(app.id))
      : approvedApps

    if (scouts.length === 0 && myApplications.length === 0) return null
    if (isHome && scouts.length === 0 && pendingApps.length === 0 && visibleApprovedApps.length === 0) return null

    return (
      <div className="mb-6 space-y-3">
        {scouts.map(scout => (
          <div key={scout.id} className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 p-4 rounded-xl shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 bg-orange-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">オファー</div>
             <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-1">
               <span className="text-lg">💌</span>
               {scout.job.title}
             </h3>
             <p className="text-xs text-gray-600 mb-3 line-clamp-2">&quot;{scout.message}&quot;</p>
             <div className="flex gap-2">
                <button onClick={() => handleDeclineScout(scout.id)} className="flex-1 bg-white border border-gray-200 text-gray-500 text-xs font-bold py-2 rounded-lg">辞退</button>
                <button onClick={() => handleAcceptScout(scout)} className="flex-[2] bg-orange-500 text-white text-xs font-bold py-2 rounded-lg shadow-sm">受ける (+{scout.job.reward_amount})</button>
             </div>
          </div>
        ))}

        {pendingApps.length > 0 && (
           <div className="bg-white border border-blue-100 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">審査中のクエスト</div>
              <div className="divide-y divide-gray-50">
                {pendingApps.map(app => (
                  <div key={app.id} onClick={() => openChat(app)} className="p-3 flex items-center justify-between cursor-pointer active:bg-gray-50">
                     <div className="truncate">
                        <div className="text-sm font-bold text-gray-800 truncate">{app.job.title}</div>
                        <div className="text-xs text-gray-400">{app.message}</div>
                     </div>
                     <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full shrink-0">審査中</span>
                  </div>
                ))}
              </div>
           </div>
        )}

        {visibleApprovedApps.length > 0 && (
           <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-500">終了・結果確定</div>
              <div className="divide-y divide-gray-50">
                {visibleApprovedApps.map(app => (
                  <div key={app.id} onClick={() => openChat(app)} className="p-3 flex items-center justify-between cursor-pointer active:bg-gray-50 relative group">
                     <div className="truncate pr-6">
                        <div className="text-sm font-bold text-gray-600 truncate">{app.job.title}</div>
                        <div className="text-xs text-gray-400">チャットを確認</div>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${app.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                          {app.status === 'approved' ? '採用 🎉' : '不採用'}
                       </span>
                       
                       {isHome && (
                         <button 
                           onClick={(e) => handleHideApp(app.id, e)}
                           className="p-1.5 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                           title="ホーム画面から非表示にする"
                         >
                           <Icons.XMark />
                         </button>
                       )}
                     </div>
                  </div>
                ))}
              </div>
           </div>
        )}
      </div>
    )
  }

// EventGridコンポーネントを修正

  const EventGrid = ({ events, showMore }: { events: ExternalEvent[], showMore: boolean }) => (
    <>
      <div className="grid grid-cols-2 gap-3">
        {events.map((ev) => {
          // ★追加: 判定ロジック
          const isOfficial = ev.poster_id === SHIZUOKA_CONNECT_POSTER_ID
          
          return (
            <a key={ev.id} href={`${EXTERNAL_SITE_URL}/events/${ev.id}`} target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100 hover:border-blue-300 transition-all flex flex-col h-full active:scale-95">
              <div className="aspect-[4/3] w-full bg-gray-100 relative">
                {ev.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ev.image_url} alt={ev.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300 bg-gray-50"><span className="text-[10px] font-bold">No Image</span></div>
                )}
                
                {/* ★追加: 左上の日付バッジ (既存) */}
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-gray-700 shadow-sm">
                  {new Date(ev.event_date).toLocaleDateString()}
                </div>

                {/* ★追加: 右上の種別バッジ */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm ${
                  isOfficial ? 'bg-orange-500' : 'bg-green-500'
                }`}>
                  {isOfficial ? '公式 (XP対象)' : '提携イベント'}
                </div>
              </div>
              
              <div className="p-3 flex flex-col flex-grow">
                <h3 className="line-clamp-2 text-xs font-bold text-gray-800 leading-snug mb-1 group-hover:text-blue-600 transition-colors">
                  {ev.title}
                </h3>
                
                {/* ★追加: 下部に補足テキスト */}
                <div className="mt-auto">
                   <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
                      <Icons.ExternalLink /><span>詳細を見る</span>
                   </div>
                   {!isOfficial && (
                     <p className="text-[10px] text-green-600 bg-green-50 inline-block px-1 rounded">
                       ※チェックイン対象外
                     </p>
                   )}
                </div>
              </div>
            </a>
          )
        })}
      </div>
      {showMore && (
        <a href={EXTERNAL_SITE_URL} target="_blank" rel="noopener noreferrer" className="mt-4 block w-full py-3 text-center bg-gray-50 text-blue-600 text-sm font-bold rounded-xl border border-gray-200 hover:bg-blue-50 transition-colors">イベントをもっと見る →</a>
      )}
    </>
  )


  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-pulse w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div></div>

// ▼▼▼ 追加: ユーザーネーム未設定時の強制ブロッキング画面 ▼▼▼
  if (needsUsername) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans text-gray-900">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden p-8 animate-fade-in-up border border-gray-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              👋
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">ようこそ！</h2>
            <p className="text-sm text-gray-500">
              アプリを利用する前に、<br />
              あなたのニックネームを教えてください。
            </p>
          </div>

          <form onSubmit={handleSaveUsername} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                表示名 (ニックネーム) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例: しずおか 太郎"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 text-base"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
              />
              <p className="text-[10px] text-gray-400 mt-1 ml-1">
                ※あとでプロフィール画面から変更できます
              </p>
            </div>

            <button
              type="submit"
              disabled={!inputUsername.trim() || isSavingUsername}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
            >
              {isSavingUsername ? '登録中...' : '登録してはじめる'}
            </button>
          </form>
        </div>
      </div>
    )
  }
  // ▲▲▲ 追加ここまで ▲▲▲

  return (
    <div className="min-h-[100dvh] bg-gray-50 font-sans text-gray-900 pb-24">
      {selectedNews && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedNews(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                 <div><span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded mb-2 inline-block">{selectedNews.source_name}</span><h2 className="text-xl font-bold text-gray-800 leading-snug">{selectedNews.title}</h2></div>
                 <button onClick={() => setSelectedNews(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-full"><Icons.Close /></button>
              </div>
              <div className="text-xs text-gray-400 mb-6 border-b border-gray-100 pb-2">{new Date(selectedNews.published_at).toLocaleDateString()} に公開</div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-6 max-h-[60vh] overflow-y-auto">{selectedNews.content}</div>
              {selectedNews.link_url && (<a href={selectedNews.link_url} target="_blank" rel="noopener noreferrer" className="block w-full bg-blue-600 text-white text-center font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md">関連リンクを開く</a>)}
            </div>
          </div>
        </div>
      )}

      {selectedBadge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedBadge(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up text-center p-6" onClick={e => e.stopPropagation()}>
             <div className="text-6xl mb-4">{selectedBadge.icon_url}</div>
             <h3 className="text-xl font-bold text-gray-800 mb-2">{selectedBadge.name}</h3>
             <p className="text-sm text-gray-600 mb-6">{selectedBadge.description}</p>
             <button onClick={() => setSelectedBadge(null)} className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200">閉じる</button>
          </div>
        </div>
      )}

      {activeChatApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-gray-100 w-full h-full sm:h-[80vh] sm:max-w-lg sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
              <div className="bg-white px-4 py-3 flex justify-between items-center shadow-sm z-10">
                 <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${activeChatApp.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {activeChatApp.status === 'approved' ? '採用済み' : '審査中'}
                    </span>
                    <h3 className="font-bold text-gray-800 text-sm leading-tight mt-1">{activeChatApp.job.title}</h3>
                 </div>
                 <button onClick={closeChat} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><Icons.Close /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 <div className="text-center text-xs text-gray-400 my-4">- メッセージ履歴 -</div>
                 <div className="flex justify-end">
                    <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow-sm">
                       <p className="whitespace-pre-wrap">{activeChatApp.message}</p>
                       <div className="text-[10px] text-blue-200 text-right mt-1">応募時のメッセージ</div>
                    </div>
                 </div>
                 {chatMessages.map(msg => {
                    const isMe = msg.sender_id === userId
                    return (
                       <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {!isMe && <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1">Admin</div>}
                          <div className={`p-3 rounded-2xl max-w-[80%] text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                             <p className="whitespace-pre-wrap">{msg.content}</p>
                             <div className={`text-[10px] text-right mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </div>
                          </div>
                       </div>
                    )
                 })}
                 <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="bg-white p-3 border-t border-gray-200 flex gap-2">
                 <input type="text" className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="メッセージを入力..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
                 <button type="submit" disabled={isSending || !chatInput.trim()} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors w-10 h-10 flex items-center justify-center"><Icons.Send /></button>
              </form>
           </div>
        </div>
      )}

      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-20 px-5 py-3 flex justify-between items-center border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
           {/* eslint-disable-next-line @next/next/no-img-element */}
           <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
           <span className="text-sm font-bold text-blue-600">しずおかコネクト</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/mypage/profile" className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Icons.Settings /></Link>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Icons.Logout /></button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {activeTab === 'home' && profile && (
          <div className="animate-fade-in-up">
            
            <div className={`relative overflow-hidden rounded-2xl shadow-xl ${currentRankObj.color} p-6 text-white mb-6`}>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>
              
              <div className="relative z-10 flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center overflow-hidden shadow-inner text-3xl">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{profile.username ? profile.username[0].toUpperCase() : profile.email[0].toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <p className="text-xs opacity-90 font-bold mb-0.5">GUILD MEMBER</p>
                  <h2 className="text-xl font-black tracking-wide truncate max-w-[200px]">{profile.username || profile.email.split('@')[0]}</h2>
                  <div className="inline-block bg-black/20 px-3 py-1 rounded-full text-xs font-bold mt-1 border border-white/10">
                    Rank: {profile.current_rank}
                  </div>
                </div>
              </div>

              {profile.bio && (
                <div className="relative z-10 bg-black/10 p-3 rounded-lg text-xs mb-3 backdrop-blur-sm border border-white/10">
                  {profile.bio}
                </div>
              )}

              <div className="relative z-10 mb-4">
                <div className="flex justify-between text-xs font-bold mb-1 opacity-90"><span>EXP: {profile.total_xp}</span><span>Next: {nextRank.minXp}</span></div>
                <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm"><div className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div></div>
                <p className="text-[10px] text-right mt-1 opacity-70">あと {nextRank.minXp - profile.total_xp} XPでランクアップ！</p>
              </div>

              <div className="relative z-10 border-t border-white/20 pt-3">
                 <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold opacity-80">🏆 獲得した称号</span>
                    <span className="bg-white/20 px-1.5 rounded text-[10px]">{badges.length}</span>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {badges.length > 0 ? badges.map(badge => (
                       <button 
                         key={badge.id} 
                         onClick={(e) => { e.stopPropagation(); setSelectedBadge(badge) }}
                         className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/30 transition-colors text-lg border border-white/10"
                       >
                         {badge.icon_url}
                       </button>
                    )) : (
                       <span className="text-xs opacity-60 italic">まだ称号を持っていません</span>
                    )}
                 </div>
              </div>
            </div>

            <NewsCarousel newsItems={news} />
            <NotificationManager />
            <QuestDashboard isHome={true} />
            <OnboardingModal />

            <section>
               <div className="flex items-center justify-between mb-3 px-1"><h3 className="font-bold text-gray-700 flex items-center gap-2"><span>📅</span> 開催予定のイベント</h3><button onClick={() => setActiveTab('events')} className="text-xs text-blue-600 font-bold hover:underline">すべて見る</button></div>
               {upcomingEvents.length === 0 ? (<div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200 text-xs">現在予定されているイベントはありません</div>) : (<EventGrid events={upcomingEvents} showMore={hasMoreEvents} />)}
            </section>
          </div>
        )}

{/* ▼▼▼ activeTab === 'events' の部分を差し替え ▼▼▼ */}
        {activeTab === 'events' && (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-bold text-gray-800 mb-4 px-1">イベントカレンダー</h2>
            <p className="text-xs text-gray-500 mb-4 px-1">
              日付をタップして開催されるイベントを確認しよう！
            </p>
            
            {/* カレンダー表示 */}
            {renderCalendar()}

            {/* 選択された日付のイベントリスト */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-lg">📅</span>
                <h3 className="font-bold text-gray-700">
                  {selectedDateStr ? `${new Date(selectedDateStr).getMonth() + 1}月${new Date(selectedDateStr).getDate()}日のイベント` : '日付を選択してください'}
                </h3>
              </div>

              {selectedDateStr ? (
                (() => {
                  const targetEvents = upcomingEvents.filter(e => e.event_date === selectedDateStr)
                  if (targetEvents.length === 0) {
                    return (
                      <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 text-sm">
                        予定されているイベントはありません
                      </div>
                    )
                  }
                  return <EventGrid events={targetEvents} showMore={false} />
                })()
              ) : (
                <div className="p-6 text-center text-gray-400 text-xs">
                  カレンダーの日付をタップすると詳細が表示されます
                </div>
              )}
              
              {/* 全イベント表示へのリンク (カレンダーで見逃す可能性への配慮) */}
              <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-400 mb-2">直近のイベント一覧はこちら</p>
                <button 
                  onClick={() => setSelectedDateStr('')} // 選択解除で見せる等のロジックにするか、そのままEventGridを表示
                  className="hidden text-xs text-blue-600 font-bold underline"
                >
                  リスト形式で見る
                </button>
                {/* 常に下に「近日開催の全イベント」を出しても良いが、今回はカレンダーメインにするため省略 */}
              </div>
              {/* ▼▼▼ ここからリクエストボックスを追加 ▼▼▼ */}
              <div className="mt-8 bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span>💡</span> 運営へのリクエスト
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  「こんなイベントをやってほしい！」「こんな機能が欲しい！」など、あなたのご意見をお聞かせください。
                </p>
                <form onSubmit={handleRequestSubmit}>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3 bg-gray-50 resize-none"
                    rows={3}
                    placeholder="ここにリクエストを入力してください..."
                    value={requestText}
                    onChange={(e) => setRequestText(e.target.value)}
                    disabled={isSubmittingRequest}
                  ></textarea>
                  <button
                    type="submit"
                    disabled={!requestText.trim() || isSubmittingRequest}
                    className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    {isSubmittingRequest ? '送信中...' : 'リクエストを送信する'}
                  </button>
                </form>
              </div>
              {/* ▲▲▲ ここまで ▲▲▲ */}
            </div>
          </div>
        )}
        {/* ▲▲▲ 差し替えここまで ▲▲▲ */}


        {activeTab === 'quests' && (
          <div className="animate-fade-in-up space-y-8">
             <QuestDashboard isHome={false} /> 
             <section>
              <h2 className="text-lg font-bold text-gray-800 mb-3 px-1 flex items-center gap-2"><span>⚔️</span> クエストボード (新規募集)</h2>
              {jobs.length === 0 ? (
                <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 text-sm">現在募集中のクエストはありません</div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => { 
                    const currentRankObj = getCurrentRankObj(); 
                    const reqRankObj = RANKS.find(r => r.name === job.required_rank) || RANKS[0]; 
                    const isLocked = currentRankObj.minXp < reqRankObj.minXp; 
                    return (
                      <div key={job.id} className={`relative overflow-hidden bg-white p-5 rounded-xl shadow-sm border-2 transition-all ${isLocked ? 'border-gray-100 opacity-70 grayscale' : 'border-blue-50 hover:border-blue-300'}`}>
                        {isLocked && (<div className="absolute inset-0 bg-gray-50/50 backdrop-blur-[1px] flex items-center justify-center z-10"><div className="bg-black/70 text-white px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2"><span>🔒</span> {job.required_rank}ランクで解放</div></div>)}
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2"><span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">募集中</span>{job.deadline && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100">〆 {new Date(job.deadline).toLocaleDateString()}</span>}</div>
                          <span className="font-black text-lg text-yellow-600">{job.reward_amount}</span>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg mb-2">{job.title}</h3>
                        <button onClick={() => !isLocked && router.push(`/jobs/${job.id}`)} disabled={isLocked} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400">{isLocked ? '受注不可' : '詳細を見て応募する'}</button>
                      </div>
                    )
                  })}
                </div>
              )}
             </section>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-bold text-gray-800 mb-4 px-1">メッセージ</h2>
            <div className="space-y-3">
              {[...approvedApps, ...pendingApps].length === 0 ? (
                <div className="p-10 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-4xl mb-2">📨</p><p className="text-sm">進行中のメッセージはありません</p>
                </div>
              ) : (
                [...approvedApps, ...pendingApps].sort((a, b) => b.id - a.id).map(app => (
                  <div key={app.id} onClick={() => openChat(app)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-95 transition-all cursor-pointer flex items-center gap-4 hover:border-blue-300">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${app.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>{app.status === 'approved' ? '🎉' : '⏳'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold text-gray-800 text-sm truncate">{app.job.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${app.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>{app.status === 'approved' ? '採用' : '審査中'}</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">タップしてメッセージを開く...</p>
                    </div>
                    <div className="text-gray-300"><Icons.MessageNav /></div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-bold text-gray-800 mb-4 px-1">お知らせ・情報</h2>
            <div className="space-y-4">
              {news.length === 0 ? (<div className="p-8 text-center text-gray-400 bg-white rounded-xl text-sm">現在お知らせはありません</div>) : (news.map(item => (<div key={item.id} onClick={() => { if (item.content) { setSelectedNews(item) } else if (item.link_url) { window.open(item.link_url, '_blank') } }} className="block bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 transition-colors cursor-pointer group"><div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.source_name || 'お知らせ'}</span><span className="text-xs text-gray-400">{new Date(item.published_at).toLocaleDateString()}</span></div><h3 className="font-bold text-gray-800 text-sm leading-snug mb-2 group-hover:text-blue-600 transition-colors">{item.title}</h3><div className="flex justify-between items-center">{item.content ? (<span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">詳細を見る</span>) : (<span className="text-[10px] text-gray-400">外部リンク</span>)}<span className="text-xs text-gray-300 group-hover:translate-x-1 transition-transform">→</span></div></div>)))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-bold text-gray-800 mb-4 px-1">冒険の記録</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
              {history.length === 0 ? (<div className="p-10 text-center text-gray-400 text-sm">履歴がありません</div>) : (history.map((item, i) => (<div key={i} className="p-4 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex flex-col items-center justify-center border border-green-100 flex-shrink-0"><span className="text-[10px] font-bold">GET</span><span className="text-xs font-bold">+{item.xp}</span></div><div><p className="font-bold text-sm text-gray-800 line-clamp-1">{item.eventName}</p><p className="text-xs text-gray-400">{item.date} 完了</p></div></div>)))}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-gray-100 bg-white/90 backdrop-blur-md pb-safe pt-2">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
          <button onClick={() => setActiveTab('home')} className={`flex flex-1 flex-col items-center gap-1 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><Icons.Home /><span className="text-[10px] font-bold">ホーム</span></button>
          <button onClick={() => setActiveTab('events')} className={`flex flex-1 flex-col items-center gap-1 ${activeTab === 'events' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><Icons.Map /><span className="text-[10px] font-bold">イベント</span></button>
          <Link href="/checkin" className="group relative -top-5 mx-2"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg rotate-45 group-hover:rotate-0 transition-all duration-300"><div className="-rotate-45 group-hover:rotate-0 transition-all duration-300"><Icons.Camera /></div></div></Link>
          <button onClick={() => setActiveTab('quests')} className={`flex flex-1 flex-col items-center gap-1 ${activeTab === 'quests' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'} relative`}><Icons.Briefcase /><span className="text-[10px] font-bold">クエスト</span>{scouts.length > 0 && <span className="absolute top-0 right-4 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}</button>
          <button onClick={() => setActiveTab('messages')} className={`flex flex-1 flex-col items-center gap-1 ${activeTab === 'messages' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><Icons.MessageNav /><span className="text-[10px] font-bold">チャット</span></button>
        </div>
      </nav>
    </div>
  )
}