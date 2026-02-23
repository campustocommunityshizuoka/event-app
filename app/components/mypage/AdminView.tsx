'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { eventSupabase } from '@/app/lib/eventDbClient'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

const SHIZUOKA_CONNECT_POSTER_ID = '5ef710d4-3583-4ff9-a010-ddec40616767'

// --- 定数 & 型定義 ---
const ADMIN_EMAILS = [
  'admin@test.com',
  'campustocommunityshizuoka@gmail.com'
]

type ExternalEvent = {
  id: number
  title: string
  event_date: string
  poster_id?: string
}

type NewsSource = {
  id: number
  name: string
  rss_url: string
  fallback_url: string | null
  is_active: boolean
}

type Job = {
  id: number
  title: string
  description: string
  reward_amount: string
  required_rank: string
  required_badges: number[] | null
  deadline: string | null
  created_at: string
}

type Badge = {
  id: number
  name: string
  icon_url: string
}

type UserProfile = {
  id: string
  email: string
  username: string | null
  current_rank: string
  total_xp: number
  user_badges: {
    badge: Badge | null
  }[]
}

type Applicant = {
  id: number
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  message: string
  created_at: string
  user: {
    email: string
    current_rank: string
    total_xp: number
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

type NewsFormState = {
  title: string
  link_url: string
  content: string
  source_name: string
  image_url: string
}

type ScoutFormState = {
  targetUserIds: string[]
  targetUserNames: string[]
  jobId: string
  message: string
}

type ChatMessage = {
  id: number
  content: string
  sender_id: string
  created_at: string
}

// ★ レポート用の型定義
type EventReport = {
  id: number
  content: string
  rating: number
  xp_bonus: number
  created_at: string
  user: {
    email: string
    username: string | null
    avatar_url: string | null
  }
  participation: {
    event_id: number
  }
}

// ★ リクエスト用の型定義
type UserRequest = {
  id: number
  content: string
  created_at: string
  user: {
    email: string
    username: string | null
  }
}

// ▼▼▼ Supabaseからの戻り値用の厳密な型定義 ▼▼▼
type UserRequestResponse = {
  id: number
  content: string
  created_at: string
  user: {
    email: string | null
    username: string | null
  } | null
}

type EventReportResponse = {
  id: number
  content: string
  rating: number
  xp_bonus: number
  created_at: string
  user: {
    email: string | null
    username: string | null
    avatar_url: string | null
  } | null
  participation: {
    event_id: number
  } | null
}

type JobApplicationResponse = {
  id: number
  user_id: string
  status: string
  message: string
  created_at: string
  user: {
    email: string | null
    current_rank: string | null
    total_xp: number | null
  } | null
}


export default function AdminView({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  
  type ViewState = 'job_list' | 'job_detail' | 'create_job' | 'qr' | 'news_list' | 'edit_news' | 'user_search' | 'reports' | 'requests'
  const [activeView, setActiveView] = useState<ViewState>('job_list')
  const [userRequests, setUserRequests] = useState<UserRequest[]>([])
  const [allBadges, setAllBadges] = useState<Badge[]>([])

  const [events, setEvents] = useState<ExternalEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [qrValue, setQrValue] = useState('')
  const [isQrProcessing, setIsQrProcessing] = useState(false)

  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])

  const [newJob, setNewJob] = useState({
    title: '', description: '', reward_val: '', required_rank: 'ビギナー', deadline: ''
  })
  const [newJobBadges, setNewJobBadges] = useState<number[]>([]) 
  const [isJobSubmitting, setIsJobSubmitting] = useState(false)

  const [newsList, setNewsList] = useState<NewsFeed[]>([])
  const [editingNewsId, setEditingNewsId] = useState<number | null>(null)
  const [newsForm, setNewsForm] = useState<NewsFormState>({
    title: '', link_url: '', content: '', source_name: '公式お知らせ', image_url: ''
  })
  const [isNewsSubmitting, setIsNewsSubmitting] = useState(false)
  const [isSyncingNews, setIsSyncingNews] = useState(false)

  const [sources, setSources] = useState<NewsSource[]>([])
  const [newSource, setNewSource] = useState({ name: '', rss_url: '', fallback_url: '' })

  const [users, setUsers] = useState<UserProfile[]>([])
  const [filterRank, setFilterRank] = useState<string>('all')
  const [filterBadge, setFilterBadge] = useState<number | 'all'>('all')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  const [scoutForm, setScoutForm] = useState<ScoutFormState>({
    targetUserIds: [], targetUserNames: [], jobId: '', message: ''
  })
  const [isScoutSending, setIsScoutSending] = useState(false)

  const [activeChatApplicant, setActiveChatApplicant] = useState<Applicant | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatSending, setIsChatSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [reports, setReports] = useState<EventReport[]>([])
  const [reportFilterEventId, setReportFilterEventId] = useState<number | 'all'>('all')

  useEffect(() => {
    if (!ADMIN_EMAILS.includes(userEmail)) {
      alert('権限がありません')
      router.push('/')
      return
    }
    const init = async () => {
      const { data: eventData } = await eventSupabase
        .from('events')
        .select('id, title, event_date')
        .eq('poster_id', SHIZUOKA_CONNECT_POSTER_ID)
        .order('event_date', { ascending: false })
        .returns<ExternalEvent[]>()
      setEvents(eventData || [])

      const { data: badgeData } = await supabase.from('badges').select('*').returns<Badge[]>()
      setAllBadges(badgeData || [])
      
      void fetchJobs()
      void fetchNews()
      void fetchSources()
      void fetchRequests()
      void fetchUsers()
      void fetchReports()
      setLoading(false)
    }
    void init()
  }, [userEmail, router])

  const fetchJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).returns<Job[]>()
    setJobs(data || [])
  }

  const fetchNews = async () => {
    const { data } = await supabase.from('news_feeds').select('*').order('published_at', { ascending: false }).returns<NewsFeed[]>()
    setNewsList(data || [])
  }

  const fetchSources = async () => {
    const { data } = await supabase.from('news_sources').select('*').order('id').returns<NewsSource[]>()
    setSources(data || [])
  }

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        id, email, username, current_rank, total_xp,
        user_badges (
          badge:badges ( id, name, icon_url )
        )
      `)
      .order('total_xp', { ascending: false })
      .returns<UserProfile[]>()

    setUsers(data || [])
  }

  // リクエスト削除関数
  const handleDeleteRequest = async (id: number) => {
    if (!confirm('このリクエストを削除してもよろしいですか？')) return

    try {
      const { error } = await supabase.from('user_requests').delete().eq('id', id)
      
      if (error) throw error

      // 削除が成功したら、画面上のリストからも該当の項目を取り除く
      setUserRequests(prev => prev.filter(req => req.id !== id))
      alert('リクエストを削除いたしました。')
      
    } catch (e: unknown) {
      if (e instanceof Error) {
        alert('削除に失敗いたしました: ' + e.message)
      } else {
        alert('予期せぬエラーが発生いたしました。')
      }
    }
  }

  // リクエスト取得関数
  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('user_requests')
      .select(`
        id,
        content,
        created_at,
        user:profiles(email, username)
      `)
      .order('created_at', { ascending: false })
      .returns<UserRequestResponse[]>()

    if (!error && data) {
      const formattedRequests: UserRequest[] = data.map(r => ({
        id: r.id,
        content: r.content,
        created_at: r.created_at,
        user: {
          email: r.user?.email || 'Unknown',
          username: r.user?.username || null
        }
      }))
      setUserRequests(formattedRequests)
    }
  }

  // レポート取得関数
  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('event_reports')
      .select(`
        id,
        content,
        rating,
        xp_bonus,
        created_at,
        user:profiles(email, username, avatar_url),
        participation:participations(event_id)
      `)
      .order('created_at', { ascending: false })
      .returns<EventReportResponse[]>()

    if (!error && data) {
      const formattedReports: EventReport[] = data.map(r => ({
        id: r.id,
        content: r.content,
        rating: r.rating,
        xp_bonus: r.xp_bonus,
        created_at: r.created_at,
        user: {
          email: r.user?.email || 'Unknown',
          username: r.user?.username || null,
          avatar_url: r.user?.avatar_url || null
        },
        participation: {
          event_id: r.participation?.event_id || 0
        }
      }))
      setReports(formattedReports)
    }
  }

  const handleJobClick = async (job: Job) => {
    setSelectedJobId(job.id)
    setSelectedJob(job)
    setActiveView('job_detail')
    
    const { data: appData } = await supabase
      .from('job_applications')
      .select(`id, user_id, status, message, created_at, user:profiles ( email, current_rank, total_xp )`)
      .eq('job_id', job.id)
      .order('created_at', { ascending: false })
      .returns<JobApplicationResponse[]>()

    const formattedApplicants: Applicant[] = (appData || []).map((app) => ({
      id: app.id,
      user_id: app.user_id,
      status: (app.status as 'pending' | 'approved' | 'rejected'),
      message: app.message,
      created_at: app.created_at,
      user: {
        email: app.user?.email || 'Unknown',
        current_rank: app.user?.current_rank || 'ビギナー',
        total_xp: app.user?.total_xp || 0
      }
    }))
    setApplicants(formattedApplicants)
  }

  const handleDeleteJob = async () => {
    if (!selectedJobId) return
    if (!confirm('本当にこのクエストを削除しますか？\n応募データも全て削除されます。')) return

    const { error } = await supabase.from('jobs').delete().eq('id', selectedJobId)
    if (error) alert('削除失敗: ' + error.message)
    else { alert('削除しました'); void fetchJobs(); setActiveView('job_list') }
  }

  const updateStatus = async (appId: number, newStatus: 'approved' | 'rejected') => {
    if (!confirm(`${newStatus === 'approved' ? '採用' : '不採用'}にしますか？`)) return
    const { error } = await supabase.from('job_applications').update({ status: newStatus }).eq('id', appId)
    if (!error) {
        setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a))
    }
    else alert('更新失敗')
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirm('公開しますか？')) return
    setIsJobSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const rewardFormatted = newJob.reward_val ? `${Number(newJob.reward_val).toLocaleString()}円` : '応相談'

      const { error } = await supabase.from('jobs').insert({
        title: newJob.title,
        description: newJob.description,
        reward_amount: rewardFormatted,
        required_rank: newJob.required_rank,
        required_badges: newJobBadges.length > 0 ? newJobBadges : null,
        deadline: newJob.deadline || null,
        owner_id: user?.id,
        is_active: true
      })
      if (error) throw error
      
      try {
        await fetch('/api/admin/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '新着クエスト！',
            body: `新しい募集「${newJob.title}」が公開されました。報酬: ${rewardFormatted}`,
            url: '/mypage?tab=quests' 
          })
        })
      } catch (notifyError) {
        console.error('Notification failed', notifyError)
      }

      alert('作成しました！通知も送信しました。')
      
      setNewJob({ title: '', description: '', reward_val: '', required_rank: 'ビギナー', deadline: '' })
      setNewJobBadges([])
      
      void fetchJobs()
      setActiveView('job_list')
    } catch (e) {
      if (e instanceof Error) alert('作成エラー: ' + e.message)
    } finally {
      setIsJobSubmitting(false)
    }
  }

  const toggleJobBadge = (badgeId: number) => {
    setNewJobBadges(prev => 
      prev.includes(badgeId) ? prev.filter(id => id !== badgeId) : [...prev, badgeId]
    )
  }

  const handleEventSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eid = Number(e.target.value)
    setSelectedEventId(eid || null)
    setQrValue('')
    if (eid) {
      const { data } = await supabase.from('event_secrets').select('secret_code').eq('event_id', eid).single()
      if (data) setQrValue(data.secret_code)
    }
  }

  const generateNewQr = async () => {
    if (!selectedEventId || !confirm('新しいQRを発行しますか？')) return
    setIsQrProcessing(true)
    try {
      const secret = `evt-${selectedEventId}-${Math.random().toString(36).substring(2, 10)}`
      await supabase.from('event_secrets').delete().eq('event_id', selectedEventId)
      await supabase.from('event_secrets').insert({ event_id: selectedEventId, secret_code: secret })
      setQrValue(secret)
    } catch { alert('エラー') } finally { setIsQrProcessing(false) }
  }

  const handlePrintQr = () => {
    window.print()
  }

  const handleSyncNews = async () => {
    setIsSyncingNews(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/fetch-news', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Supabase-Auth': token || '' 
        }
      })
      
      const data = await res.json()
      if (data.success) {
        alert(data.message)
        void fetchNews()
      } else {
        alert('同期エラー: ' + (data.message || '詳細不明'))
      }
    } catch (e) {
      const _ = e
      alert('通信エラーが発生しました')
    } finally {
      setIsSyncingNews(false)
    }
  }

  const handleAddSource = async () => {
    if (!newSource.name || !newSource.rss_url) return alert('名称とRSS URLは必須です')
    const { error } = await supabase.from('news_sources').insert({ name: newSource.name, rss_url: newSource.rss_url, fallback_url: newSource.fallback_url || null })
    if (error) alert('エラー: ' + error.message)
    else { setNewSource({ name: '', rss_url: '', fallback_url: '' }); fetchSources() }
  }

  const handleDeleteSource = async (id: number) => {
    if (!confirm('監視を解除しますか？')) return
    const { error } = await supabase.from('news_sources').delete().eq('id', id)
    if(error) alert('エラー: ' + error.message); else fetchSources()
  }

  const openCreateNews = () => { setEditingNewsId(null); setNewsForm({ title: '', link_url: '', content: '', source_name: '公式お知らせ', image_url: '' }); setActiveView('edit_news') }
  const openEditNews = (news: NewsFeed) => { setEditingNewsId(news.id); setNewsForm({ title: news.title, link_url: news.link_url || '', content: news.content || '', source_name: news.source_name || '', image_url: news.image_url || '' }); setActiveView('edit_news') }
  
  const handleDeleteNews = async (id: number) => {
    if (!confirm('本当に削除しますか？')) return
    const { error } = await supabase.from('news_feeds').delete().eq('id', id)
    if (error) alert('削除失敗: ' + error.message); else void fetchNews()
  }

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsNewsSubmitting(true)
    const saveData = { title: newsForm.title, link_url: newsForm.link_url || null, content: newsForm.content || null, source_name: newsForm.source_name || 'お知らせ', image_url: newsForm.image_url || null, published_at: undefined as string | undefined }
    
    try {
      if (editingNewsId) {
        // ... (編集処理)
      } else {
        saveData.published_at = new Date().toISOString()
        const { error } = await supabase.from('news_feeds').insert(saveData)
        if (error) throw error;
        
        const res = await fetch('/api/admin/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '📢 新着のお知らせ',
            body: newsForm.title,
            url: '/mypage?tab=info'
          })
        })
        console.log("★ 通知API応答ステータス:", res.status)

        alert('作成しました')
      }
      void fetchNews(); setActiveView('news_list')
    } catch (e: unknown) {
      if (e instanceof Error) alert('エラー: ' + e.message) 
    } finally { setIsNewsSubmitting(false) }
  }

  const toggleUserSelection = (userId: string) => {
    const newSet = new Set(selectedUserIds)
    if (newSet.has(userId)) newSet.delete(userId)
    else newSet.add(userId)
    setSelectedUserIds(newSet)
  }

  const selectAllFilteredUsers = () => {
    const newSet = new Set(selectedUserIds)
    filteredUsers.forEach(u => newSet.add(u.id))
    setSelectedUserIds(newSet)
  }

  const clearSelection = () => setSelectedUserIds(new Set())

  const filteredUsers = users.filter(user => {
    const rankMatch = filterRank === 'all' || user.current_rank === filterRank
    const badgeMatch = filterBadge === 'all' || user.user_badges.some(ub => ub.badge?.id === filterBadge)
    return rankMatch && badgeMatch
  })

  const openScoutModal = (targets: UserProfile[]) => {
    if (jobs.length === 0) {
      alert('スカウトを送るには、先に「求人作成」でクエストを作成してください。')
      return
    }
    
    setScoutForm({
      targetUserIds: targets.map(u => u.id),
      targetUserNames: targets.map(u => u.username || u.email),
      jobId: jobs[0].id.toString(),
      message: 'あなたのプロフィールを拝見し、ぜひこのプロジェクトに参加していただきたいと思いました。'
    })
  }

  const handleSendScout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (scoutForm.targetUserIds.length === 0) return
    const count = scoutForm.targetUserIds.length
    if (!confirm(`${count}名にスカウトを一斉送信しますか？`)) return

    setIsScoutSending(true)
    try {
      const insertData = scoutForm.targetUserIds.map(uid => ({
        user_id: uid,
        job_id: Number(scoutForm.jobId),
        message: scoutForm.message,
        status: 'offered',
        is_read: false
      }))

      const { error } = await supabase.from('scouts').insert(insertData)
      if (error) throw error
      
      const jobTitle = jobs.find(j => j.id.toString() === scoutForm.jobId)?.title || 'クエスト'

      await Promise.all(scoutForm.targetUserIds.map(userId => 
        fetch('/api/admin/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            title: 'スカウトが届きました！',
            body: `特別オファー:「${jobTitle}」への参加依頼が届いています。`,
            url: '/mypage?tab=quests'
          })
        }).catch(e => console.error(`Scout push failed for ${userId}`, e))
      ))
      
      alert(`${count}件のスカウトを送信しました！(通知済み)`)
      setScoutForm({ targetUserIds: [], targetUserNames: [], jobId: '', message: '' })
      setSelectedUserIds(new Set()) 
    } catch (e) {
      if (e instanceof Error) alert('送信エラー: ' + e.message)
    } finally {
      setIsScoutSending(false)
    }
  }

  const handleSendPush = async (userId: string, userName: string) => {
    const title = prompt(`${userName} さんへの通知タイトルを入力してください`, 'しずおかコネクト');
    if (title === null) return;

    const body = prompt(`${userName} さんへの通知本文を入力してください`, '新着のお知らせがあります');
    if (body === null) return;

    try {
      const res = await fetch('/api/admin/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title, body })
      })
    
      const data = await res.json()
      if (data.success) {
        alert(`${data.count} 件の端末に送信しました！`)
      } else {
        alert('送信失敗: ' + data.message)
      }
    } catch (e) {
      console.error(e)
      alert('通信エラーが発生しました')
    }
  }

  const openChat = async (app: Applicant) => {
    setActiveChatApplicant(app)
    setChatMessages([])
    const { data } = await supabase.from('application_messages').select('*').eq('application_id', app.id).order('created_at', { ascending: true }).returns<ChatMessage[]>()
    setChatMessages(data || [])
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleAdminSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !activeChatApplicant) return
    setIsChatSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Auth error')
      
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ApplicationId: activeChatApplicant.id,
          senderId: user.id,
          content: chatInput.trim(),
          isFromAdmin: true 
        })
      })

      if (!res.ok) throw new Error('送信に失敗しました')

      const newMsg = { id: Date.now(), content: chatInput.trim(), sender_id: user.id, created_at: new Date().toISOString() }
      setChatMessages(prev => [...prev, newMsg]); setChatInput('')
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch(e) { 
      const _ = e
      alert('送信エラー') 
    } finally { setIsChatSending(false) }
  }
  
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 flex flex-col">
      <div className="print:hidden">
        <header className="bg-slate-800 text-white shadow-md sticky top-0 z-30 px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2"><span className="text-xl">🛡️</span><h1 className="text-lg font-bold">管理者コンソール</h1></div>
          <button onClick={handleLogout} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded">ログアウト</button>
        </header>

        <div className="flex flex-col md:flex-row flex-1 max-w-6xl mx-auto w-full p-4 gap-6 items-start">
          <nav className="w-full md:w-64 bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto md:overflow-visible flex md:flex-col shrink-0 sticky top-20 z-20">
            <button onClick={() => setActiveView('job_list')} className={`text-left px-6 py-4 font-bold text-sm flex gap-3 whitespace-nowrap ${['job_list', 'job_detail'].includes(activeView) ? 'bg-blue-50 text-blue-600 md:border-l-4 md:border-b-0 border-b-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><span>📋</span> 求人管理</button>
            <button onClick={() => setActiveView('create_job')} className={`text-left px-6 py-4 font-bold text-sm flex gap-3 whitespace-nowrap ${activeView === 'create_job' ? 'bg-blue-50 text-blue-600 md:border-l-4 md:border-b-0 border-b-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><span>✏️</span> 求人作成</button>
            <button onClick={() => setActiveView('user_search')} className={`text-left px-6 py-4 font-bold text-sm flex gap-3 whitespace-nowrap ${activeView === 'user_search' ? 'bg-blue-50 text-blue-600 md:border-l-4 md:border-b-0 border-b-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><span>🔍</span> ユーザー・スカウト</button>
            <button onClick={() => setActiveView('news_list')} className={`text-left px-6 py-4 font-bold text-sm flex gap-3 whitespace-nowrap ${['news_list', 'edit_news'].includes(activeView) ? 'bg-blue-50 text-blue-600 md:border-l-4 md:border-b-0 border-b-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><span>📢</span> お知らせ管理</button>
            <button onClick={() => setActiveView('qr')} className={`text-left px-6 py-4 font-bold text-sm flex gap-3 whitespace-nowrap ${activeView === 'qr' ? 'bg-blue-50 text-blue-600 md:border-l-4 md:border-b-0 border-b-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><span>🎟️</span> QR発行</button>
            <button 
              onClick={() => setActiveView('requests')} 
              className={`text-left px-6 py-4 font-bold text-sm flex gap-3 whitespace-nowrap ${activeView === 'requests' ? 'bg-blue-50 text-blue-600 md:border-l-4 md:border-b-0 border-b-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <span>💡</span> リクエスト管理
            </button>
            <button onClick={() => setActiveView('reports')} className={`text-left px-6 py-4 font-bold text-sm flex gap-3 whitespace-nowrap ${activeView === 'reports' ? 'bg-blue-50 text-blue-600 md:border-l-4 md:border-b-0 border-b-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><span>📝</span> レポート管理</button>
          </nav>

          <main className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px] p-4 sm:p-6 relative w-full overflow-hidden">
            
            {activeView === 'requests' && (
              <div className="animate-fade-in-up">
                <h2 className="text-xl font-bold text-gray-800 mb-6">ユーザーからのリクエスト</h2>
                
                <div className="space-y-4">
                  {userRequests.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-sm bg-white">
                      現在リクエストは届いていません
                    </div>
                  ) : (
                    userRequests.map(req => (
                      <div key={req.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                              {(req.user.username || req.user.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{req.user.username || '名無しさん'}</p>
                              <p className="text-[10px] text-gray-400">{req.user.email}</p>
                            </div>
                          </div>

                          {/* ▼▼▼ ここから変更：日時と削除ボタンを横並びにする ▼▼▼ */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100 font-mono">
                              {new Date(req.created_at).toLocaleString('ja-JP')}
                            </span>
                            <button 
                              onClick={() => handleDeleteRequest(req.id)}
                              className="text-xs text-red-500 bg-white border border-red-200 px-3 py-1 rounded hover:bg-red-50 font-bold transition-colors shadow-sm"
                            >
                              削除
                            </button>
                          </div>
                          {/* ▲▲▲ ここまで変更 ▲▲▲ */}

                          <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100 font-mono">
                            {new Date(req.created_at).toLocaleString('ja-JP')}
                          </span>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100">
                          {req.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeView === 'job_list' && (
               <div className="animate-fade-in-up">
                <h2 className="text-xl font-bold text-gray-800 mb-6">求人リスト</h2>
                <div className="space-y-3">
                  {jobs.map(job => {
                    const isExpired = job.deadline && new Date(job.deadline) < new Date()
                    return (
                      <div key={job.id} onClick={() => handleJobClick(job)} className={`border p-4 rounded-xl cursor-pointer hover:shadow-md transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-2 ${isExpired ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {isExpired ? <span className="bg-gray-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">期限切れ</span> : <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">募集中</span>}
                            <span className="text-xs text-gray-500 font-mono">{new Date(job.created_at).toLocaleDateString()} 作成</span>
                          </div>
                          <h3 className={`font-bold ${isExpired ? 'text-gray-500' : 'text-gray-800'}`}>{job.title}</h3>
                          <p className="text-xs text-gray-500 mt-1">報酬: {job.reward_amount} / 条件: {job.required_rank}</p>
                        </div>
                        <span className="text-gray-400 text-sm text-right sm:text-left">詳細へ &rarr;</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeView === 'job_detail' && selectedJob && (
               <div className="animate-fade-in-up">
                <button onClick={() => setActiveView('job_list')} className="mb-4 text-sm text-blue-600 hover:underline font-bold flex items-center gap-1">← 一覧に戻る</button>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 relative">
                  <div className="absolute top-4 right-4"><button onClick={handleDeleteJob} className="text-xs bg-white text-red-600 border border-red-200 px-3 py-2 rounded hover:bg-red-50 font-bold shadow-sm">🗑️ 削除</button></div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2 pr-16">{selectedJob.title}</h2>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4 font-mono">
                    <span className="bg-white px-2 py-1 rounded border">💰 {selectedJob.reward_amount}</span>
                    <span className="bg-white px-2 py-1 rounded border">🎓 {selectedJob.required_rank}以上</span>
                    {selectedJob.required_badges && selectedJob.required_badges.length > 0 && (
                      <span className="bg-white px-2 py-1 rounded border">🛡️ 必須バッジあり</span>
                    )}
                    {selectedJob.deadline && <span className="text-red-600 font-bold bg-white px-2 py-1 rounded border border-red-100">⏳ 期限: {new Date(selectedJob.deadline).toLocaleDateString()}</span>}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-4 rounded border border-gray-200">{selectedJob.description}</p>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span>👥</span> 応募者一覧 <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{applicants.length}名</span></h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500 border-collapse min-w-[600px]">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b"><tr><th className="px-4 py-3">ステータス</th><th className="px-4 py-3">応募者情報</th><th className="px-4 py-3 w-1/3">メッセージ</th><th className="px-4 py-3 text-right">アクション</th></tr></thead>
                    <tbody>
                      {applicants.map(app => (
                        <tr key={app.id} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-4 py-4"><span className={`px-2 py-1 rounded text-xs font-bold text-white ${app.status === 'approved' ? 'bg-green-500' : app.status === 'rejected' ? 'bg-red-400' : 'bg-yellow-400'}`}>{app.status.toUpperCase()}</span></td>
                          <td className="px-4 py-4"><div className="font-bold text-gray-900">{app.user.email}</div><div className="text-xs">Rank: {app.user.current_rank} / XP: {app.user.total_xp}</div></td>
                          <td className="px-4 py-4 text-gray-600 italic">&quot;{app.message}&quot;</td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex gap-2 justify-end items-center">
                              <button onClick={() => openChat(app)} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded font-bold hover:bg-slate-200 flex items-center gap-1">💬 チャット</button>
                              {app.status === 'pending' && (
                                <>
                                  <button onClick={() => updateStatus(app.id, 'rejected')} className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded font-bold">不採用</button>
                                  <button onClick={() => updateStatus(app.id, 'approved')} className="px-3 py-1.5 bg-blue-600 text-white rounded font-bold shadow-sm">採用</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {applicants.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">応募者はまだいません</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeView === 'create_job' && (
               <div className="animate-fade-in-up">
                <h2 className="text-xl font-bold text-gray-800 mb-6">新規クエスト作成</h2>
                <form onSubmit={handleCreateJob} className="space-y-5 max-w-lg">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">タイトル</label>
                    <input type="text" required className="w-full p-3 border border-gray-300 rounded-lg" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">報酬額 (円)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          required 
                          placeholder="例: 5000" 
                          className="w-full p-3 border border-gray-300 rounded-lg pr-8" 
                          value={newJob.reward_val} 
                          onChange={e => setNewJob({...newJob, reward_val: e.target.value})} 
                        />
                        <span className="absolute right-3 top-3 text-gray-500 font-bold">円</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">必須ランク</label>
                      <select className="w-full p-3 border border-gray-300 rounded-lg" value={newJob.required_rank} onChange={e => setNewJob({...newJob, required_rank: e.target.value})}>
                        <option value="ビギナー">ビギナー以上</option>
                        <option value="ブロンズ">ブロンズ以上</option>
                        <option value="シルバー">シルバー以上</option>
                        <option value="ゴールド">ゴールド以上</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">必須称号 (任意・複数選択可)</label>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
                      {allBadges.map(badge => (
                        <label key={badge.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-blue-600 rounded" 
                            checked={newJobBadges.includes(badge.id)} 
                            onChange={() => toggleJobBadge(badge.id)} 
                          />
                          <span className="text-xl">{badge.icon_url}</span>
                          <span className="text-xs text-gray-700">{badge.name}</span>
                        </label>
                      ))}
                      {allBadges.length === 0 && <span className="text-xs text-gray-400">登録された称号がありません</span>}
                    </div>
                  </div>

                  <div><label className="block text-sm font-bold text-gray-700 mb-2">募集期限 (任意)</label><input type="date" className="w-full p-3 border border-gray-300 rounded-lg" value={newJob.deadline} onChange={e => setNewJob({...newJob, deadline: e.target.value})} /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">詳細内容</label><textarea required rows={5} className="w-full p-3 border border-gray-300 rounded-lg" value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})}></textarea></div>
                  <button type="submit" disabled={isJobSubmitting} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50">{isJobSubmitting ? '作成中...' : '公開する'}</button>
                </form>
              </div>
            )}

            {activeView === 'news_list' && (
              <div className="animate-fade-in-up">
                <div className="mb-8 border-b border-gray-100 pb-8">
                  <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">📡 監視対象の管理</h3>
                  <div className="grid gap-3 mb-4">
                    {sources.map(src => (
                      <div key={src.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                        <div className="overflow-hidden mr-2">
                          <div className="font-bold text-gray-800">{src.name}</div>
                          <div className="text-xs text-gray-400 font-mono truncate">{src.rss_url}</div>
                        </div>
                        <button onClick={() => handleDeleteSource(src.id)} className="text-red-500 text-xs border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 font-bold shrink-0">解除</button>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="text-xs font-bold text-gray-500 mb-3">新規追加</h4>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2 flex-col sm:flex-row">
                        <input className="flex-1 border border-gray-300 rounded-lg p-2 text-sm" placeholder="名称 (例: 公式ブログ)" value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} />
                        <input className="flex-[2] border border-gray-300 rounded-lg p-2 text-sm" placeholder="RSS URL" value={newSource.rss_url} onChange={e => setNewSource({...newSource, rss_url: e.target.value})} />
                      </div>
                      <div className="flex gap-2">
                        <input className="flex-[3] border border-gray-300 rounded-lg p-2 text-sm" placeholder="Fallback URL (任意)" value={newSource.fallback_url} onChange={e => setNewSource({...newSource, fallback_url: e.target.value})} />
                        <button onClick={handleAddSource} className="bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-900 shadow-sm shrink-0">追加</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">お知らせリスト</h2>
                  <div className="flex gap-2">
                     <button onClick={handleSyncNews} disabled={isSyncingNews} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-green-700 text-xs sm:text-sm flex items-center gap-1">{isSyncingNews ? '...' : '🔄 同期'}</button>
                     <button onClick={openCreateNews} className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-blue-700 text-xs sm:text-sm">+ 新規</button>
                  </div>
                </div>
                <div className="space-y-3">
                  {newsList.map(news => (
                    <div key={news.id} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                             <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded shrink-0">{news.source_name}</span>
                             <span className="text-xs text-gray-400 shrink-0">{new Date(news.published_at).toLocaleDateString()}</span>
                          </div>
                          <h3 className="font-bold text-gray-800 text-sm truncate">{news.title}</h3>
                       </div>
                       <div className="flex gap-2 ml-4 shrink-0">
                          <button onClick={() => openEditNews(news)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg text-xs font-bold border border-gray-200">編集</button>
                          <button onClick={() => handleDeleteNews(news.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold border border-red-100">削除</button>
                       </div>
                    </div>
                  ))}
                  {newsList.length === 0 && <div className="text-center p-8 text-gray-400 text-sm">お知らせはありません</div>}
                </div>
              </div>
            )}

            {activeView === 'edit_news' && (
              <div className="animate-fade-in-up">
                 <button onClick={() => setActiveView('news_list')} className="mb-4 text-sm text-blue-600 hover:underline font-bold">← リストに戻る</button>
                 <h2 className="text-xl font-bold text-gray-800 mb-6">{editingNewsId ? '編集' : '新規作成'}</h2>
                 <form onSubmit={handleSaveNews} className="space-y-4 max-w-md">
                   <div><label className="block text-sm font-bold text-gray-700 mb-2">タイトル</label><input type="text" required className="w-full p-3 border border-gray-300 rounded-lg" value={newsForm.title} onChange={e => setNewsForm({...newsForm, title: e.target.value})} /></div>
                   <div><label className="block text-sm font-bold text-gray-700 mb-2">発信元</label><input type="text" className="w-full p-3 border border-gray-300 rounded-lg" value={newsForm.source_name} onChange={e => setNewsForm({...newsForm, source_name: e.target.value})} /></div>
                   <div><label className="block text-sm font-bold text-gray-700 mb-2">URL</label><input type="url" className="w-full p-3 border border-gray-300 rounded-lg" value={newsForm.link_url} onChange={e => setNewsForm({...newsForm, link_url: e.target.value})} /></div>
                   <div><label className="block text-sm font-bold text-gray-700 mb-2">本文</label><textarea rows={6} className="w-full p-3 border border-gray-300 rounded-lg" value={newsForm.content} onChange={e => setNewsForm({...newsForm, content: e.target.value})} /></div>
                   <button type="submit" disabled={isNewsSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 mt-4 shadow-md">{isNewsSubmitting ? '保存中...' : '保存'}</button>
                 </form>
              </div>
            )}

            {activeView === 'user_search' && (
              <div className="animate-fade-in-up">
                <h2 className="text-xl font-bold text-gray-800 mb-6">ユーザー検索・一斉スカウト</h2>
                
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">ランクで絞り込み</label>
                      <select className="p-2 border border-gray-300 rounded text-sm w-full sm:w-32" value={filterRank} onChange={e => setFilterRank(e.target.value)}>
                        <option value="all">全て</option>
                        <option value="ビギナー">ビギナー</option>
                        <option value="ブロンズ">ブロンズ</option>
                        <option value="シルバー">シルバー</option>
                        <option value="ゴールド">ゴールド</option>
                        <option value="プラチナ">プラチナ</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">保有バッジで絞り込み</label>
                      <select className="p-2 border border-gray-300 rounded text-sm w-full sm:w-40" value={filterBadge} onChange={e => setFilterBadge(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                        <option value="all">全て</option>
                        {allBadges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto flex gap-2 justify-end">
                    {selectedUserIds.size > 0 && (
                      <>
                         <button onClick={clearSelection} className="text-gray-500 text-xs font-bold underline px-2">選択解除</button>
                         <button onClick={() => openScoutModal(filteredUsers.filter(u => selectedUserIds.has(u.id)))} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 text-sm animate-bounce-in">
                           {selectedUserIds.size}人にスカウトを送る
                         </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
                  <table className="w-full text-sm text-left min-w-[600px]">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input type="checkbox" onChange={(e) => e.target.checked ? selectAllFilteredUsers() : clearSelection()} checked={selectedUserIds.size > 0 && selectedUserIds.size === filteredUsers.length} />
                        </th>
                        <th className="px-6 py-3">ユーザー</th>
                        <th className="px-6 py-3">ランク / XP</th>
                        <th className="px-6 py-3">獲得バッジ</th>
                        <th className="px-6 py-3 text-right">アクション</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user.id} className={`border-b hover:bg-gray-50 ${selectedUserIds.has(user.id) ? 'bg-indigo-50' : 'bg-white'}`}>
                          <td className="px-4 py-4">
                            <input type="checkbox" checked={selectedUserIds.has(user.id)} onChange={() => toggleUserSelection(user.id)} />
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-800">
                             {user.username || 'No Name'}
                             <div className="text-[10px] font-normal text-gray-400">{user.email}</div>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${user.current_rank === 'プラチナ' ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                               {user.current_rank}
                             </span>
                             <div className="text-xs text-gray-500 mt-1">{user.total_xp} XP</div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex flex-wrap gap-1">
                                {user.user_badges && user.user_badges.length > 0 ? (
                                  user.user_badges.map((ub, i) => (
                                     ub.badge ? <span key={i} title={ub.badge.name} className="text-lg cursor-help">{ub.badge.icon_url}</span> : null
                                  ))
                                ) : <span className="text-xs text-gray-300">-</span>}
                             </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleSendPush(user.id, user.username || 'No Name')}
                                className="bg-orange-500 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-orange-600 shadow-sm whitespace-nowrap"
                              >
                                🔔 通知
                              </button>
                              <button 
                                onClick={() => openScoutModal([user])}
                                className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 shadow-sm whitespace-nowrap"
                              >
                                個別スカウト
                             </button>
                           </div>
                         </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">条件に合うユーザーがいません</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeView === 'qr' && (
              <div className="animate-fade-in-up">
                <h2 className="text-xl font-bold text-gray-800 mb-6">イベントQR発行</h2>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
                  <select className="w-full p-3 border border-gray-300 rounded-lg mb-4" onChange={handleEventSelect} value={selectedEventId || ''}>
                    <option value="">-- イベントを選択 --</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.event_date} : {ev.title}</option>)}
                  </select>
                  <button onClick={generateNewQr} disabled={!selectedEventId || isQrProcessing} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl disabled:bg-gray-400">QRコードを発行</button>
                </div>
                {qrValue && (
                  <div className="text-center">
                    <div className="bg-white p-6 inline-block border-4 border-dashed border-gray-200 rounded-xl mb-4">
                      <QRCodeSVG value={qrValue} size={300} />
                    </div>
                    <p className="text-xs text-gray-500 font-mono mb-4">{qrValue}</p>
                    <button onClick={handlePrintQr} className="bg-gray-800 text-white px-6 py-2 rounded-full font-bold hover:bg-gray-900 shadow-lg flex items-center gap-2 mx-auto">
                      <span>🖨️</span> QRコードを印刷する
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ★ レポート管理ビュー */}
            {activeView === 'reports' && (
              <div className="animate-fade-in-up">
                <h2 className="text-xl font-bold text-gray-800 mb-6">イベント参加レポート</h2>
                
                {/* フィルタリングUI */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                  <label className="block text-xs font-bold text-gray-500 mb-1">イベントで絞り込み</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                    value={reportFilterEventId}
                    onChange={(e) => setReportFilterEventId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  >
                    <option value="all">全てのイベント</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.event_date} : {ev.title}</option>
                    ))}
                  </select>
                </div>

                {/* イベントごとのレポート表示 */}
                <div className="space-y-8">
                  {events
                    .filter(ev => reportFilterEventId === 'all' || ev.id === reportFilterEventId)
                    .map(event => {
                      const eventReports = reports.filter(r => r.participation.event_id === event.id)
                      if (eventReports.length === 0) return null

                      return (
                        <div key={event.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 text-sm">
                              {event.title} 
                              <span className="text-xs font-normal text-gray-500 ml-2">({event.event_date})</span>
                            </h3>
                            <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-slate-600 border border-slate-200">
                              {eventReports.length} 件
                            </span>
                          </div>
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50">
                            {eventReports.map(report => (
                              <div key={report.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex flex-col h-full">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                    {report.user.avatar_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={report.user.avatar_url} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">
                                        {(report.user.username || report.user.email)[0].toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-gray-800 truncate">{report.user.username || 'No Name'}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{report.user.email}</div>
                                  </div>
                                  <div className="ml-auto text-yellow-400 text-sm">
                                    {'★'.repeat(report.rating)}<span className="text-gray-200">{'★'.repeat(5 - report.rating)}</span>
                                  </div>
                                </div>
                                <div className="flex-grow">
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{report.content}</p>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-end">
                                   <div className="text-[10px] text-gray-400">{new Date(report.created_at).toLocaleString()}</div>
                                   <div className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">+{report.xp_bonus} XP</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                   {reports.filter(r => reportFilterEventId === 'all' || r.participation.event_id === reportFilterEventId).length === 0 && (
                      <div className="text-center p-8 text-gray-400 border border-dashed rounded-xl">レポートはまだありません</div>
                   )}
                </div>
              </div>
            )}

            {/* ... (Existing Views: scoutForm modal, activeChatApplicant modal) ... */}
            {scoutForm.targetUserIds.length > 0 && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                 <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                    <div className="bg-indigo-600 p-4 text-white font-bold flex justify-between">
                       <span>スカウト送信</span>
                       <button onClick={() => setScoutForm({ targetUserIds: [], targetUserNames: [], jobId: '', message: '' })}>✕</button>
                    </div>
                    <form onSubmit={handleSendScout} className="p-6 space-y-4">
                       <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">送信先</label>
                          <div className="font-bold text-gray-800 text-sm max-h-20 overflow-y-auto border p-2 rounded bg-gray-50">
                            {scoutForm.targetUserNames.join(', ')}
                            <span className="text-gray-400 ml-1">({scoutForm.targetUserIds.length}名)</span>
                          </div>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">アサインしたい案件</label>
                          <select 
                             className="w-full p-2 border border-gray-300 rounded"
                             value={scoutForm.jobId}
                             onChange={e => setScoutForm({...scoutForm, jobId: e.target.value})}
                             required
                          >
                             {jobs.map(job => (
                                <option key={job.id} value={job.id}>{job.title}</option>
                             ))}
                          </select>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">メッセージ (全員共通)</label>
                          <textarea 
                             className="w-full p-2 border border-gray-300 rounded h-32"
                             value={scoutForm.message}
                             onChange={e => setScoutForm({...scoutForm, message: e.target.value})}
                             required
                          ></textarea>
                       </div>
                       <button 
                          type="submit" 
                          disabled={isScoutSending}
                          className="w-full bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700 disabled:opacity-50"
                       >
                          {isScoutSending ? '送信中...' : 'オファーを確定する'}
                       </button>
                    </form>
                 </div>
              </div>
            )}

            {activeChatApplicant && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                 <div className="bg-white w-full max-w-lg h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                    <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center">
                       <div><span className="text-xs font-bold text-slate-400">対話相手:</span> {activeChatApplicant.user.email}</div>
                       <button onClick={() => setActiveChatApplicant(null)}>✕</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                       {chatMessages.map(msg => {
                         const isAdmin = msg.sender_id !== activeChatApplicant.user_id
                         return (
                           <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                              <div className={`p-3 rounded-xl max-w-[80%] text-sm ${isAdmin ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 rounded-tl-none'}`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                <div className={`text-[10px] text-right mt-1 ${isAdmin ? 'text-blue-200' : 'text-gray-400'}`}>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                              </div>
                           </div>
                         )
                       })}
                       <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleAdminSendMessage} className="p-3 bg-white border-t flex gap-2">
                       <input className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="管理者として返信..." />
                       <button type="submit" disabled={isChatSending} className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold hover:bg-blue-700 disabled:opacity-50">送信</button>
                    </form>
                 </div>
              </div>
            )}

          </main>
        </div>
      </div>

      <div className="hidden print:flex print:flex-col print:items-center print:justify-center print:min-h-screen p-10 text-center">
        <h1 className="text-3xl font-bold mb-4">{events.find(e => e.id === selectedEventId)?.title}</h1>
        <p className="text-xl mb-8">チェックイン用QRコード</p>
        <div className="border-4 border-black p-4 inline-block mb-8">
           {qrValue && <QRCodeSVG value={qrValue} size={500} />}
        </div>
        <p className="text-sm text-gray-500">しずおかコネクト - イベントチェックイン</p>
      </div>
    </div>
  )
}