// app/jobs/[id]/page.tsx
'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// --- 型定義 ---
type Job = {
  id: number
  title: string
  description: string
  reward_amount: string
  reward_type: string
  required_rank: string
  owner_id: string
}

type Profile = {
  id: string
  current_rank: string
  email: string
}

type Application = {
  id: number
  status: string
}

// ランクの強さ定義（マイページと同じ）
const RANK_LEVELS: Record<string, number> = {
  'ビギナー': 0,
  'ブロンズ': 1,
  'シルバー': 2,
  'ゴールド': 3,
  'プラチナ': 4,
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15以降のparamsアンラップ処理
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<Job | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [existingApp, setExistingApp] = useState<Application | null>(null)
  
  // フォーム用
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const init = async () => {
      // 1. ログイン確認
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // 2. 仕事データ取得
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single()
      
      if (jobError || !jobData) {
        alert('仕事が見つかりませんでした')
        router.push('/mypage')
        return
      }
      setJob(jobData)

      // 3. 自分のプロフィール取得（ランク確認用）
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, current_rank, email')
        .eq('id', session.user.id)
        .single()
      setProfile(profileData)

      // 4. すでに応募済みか確認
      const { data: appData } = await supabase
        .from('job_applications')
        .select('id, status')
        .eq('job_id', id)
        .eq('user_id', session.user.id)
        .single()
      
      if (appData) {
        setExistingApp(appData)
      }

      setLoading(false)
    }
    init()
  }, [id, router])

  // 応募処理
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !job) return
    if (!confirm('この内容で応募しますか？\n応募するとクライアントに通知が届きます。')) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('job_applications')
        .insert({
          job_id: job.id,
          user_id: profile.id,
          message: message,
          status: 'pending'
        })

      if (error) throw error

      alert('応募が完了しました！\nクライアントからの連絡をお待ちください。')
      router.push('/mypage') // マイページへ戻る
      
    } catch (err: unknown) {
      console.error(err)
      const errMsg = err instanceof Error ? err.message : '予期せぬエラーが発生しました'
      alert('エラーが発生しました: ' + errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">読み込み中...</div>

  if (!job || !profile) return null

  // ランク判定ロジック
  const myRankLevel = RANK_LEVELS[profile.current_rank] || 0
  const requiredRankLevel = RANK_LEVELS[job.required_rank] || 0
  const isRankSufficient = myRankLevel >= requiredRankLevel

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-10">
      
      {/* ヘッダー */}
      <header className="bg-white sticky top-0 z-10 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
        <Link href="/mypage" className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
          ←
        </Link>
        <h1 className="font-bold text-lg">クエスト詳細</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        
        {/* 仕事詳細カード */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-blue-600 p-6 text-white">
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded border border-white/20">
                ランク: {job.required_rank}以上
              </span>
              <span className="text-xs font-bold bg-yellow-400 text-yellow-900 px-2 py-1 rounded">
                報酬: {job.reward_amount}
              </span>
            </div>
            <h2 className="text-2xl font-bold leading-tight">{job.title}</h2>
          </div>
          
          <div className="p-6">
            <h3 className="font-bold text-gray-700 mb-2 border-b pb-2">依頼詳細</h3>
            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap min-h-[100px]">
              {job.description}
            </div>

            <div className="mt-6 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
              <p className="font-bold text-gray-700 mb-1">⚠️ 応募条件</p>
              <ul className="list-disc list-inside text-gray-500 space-y-1">
                <li className={isRankSufficient ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                  {isRankSufficient ? "✅" : "❌"} {job.required_rank}ランク以上 (現在: {profile.current_rank})
                </li>
                <li>責任を持って最後までやり遂げられる方</li>
                <li>チャットでの連絡がスムーズな方</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 応募フォームエリア */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {existingApp ? (
            // すでに応募済みの場合
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                ✓
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">応募済みです</h3>
              <p className="text-gray-500 text-sm mb-4">
                現在のステータス: <span className="font-bold bg-gray-100 px-2 py-1 rounded">{existingApp.status.toUpperCase()}</span>
              </p>
              <Link href="/mypage" className="block w-full bg-gray-100 text-gray-600 text-center py-3 rounded-lg font-bold hover:bg-gray-200">
                マイページへ戻る
              </Link>
            </div>
          ) : isRankSufficient ? (
            // 応募可能な場合
            <form onSubmit={handleApply}>
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>📝</span> エントリーフォーム
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  クライアントへのメッセージ
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="自己紹介や、この仕事に対する意気込みを入力してください..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                ></textarea>
                <p className="text-xs text-gray-400 mt-2">
                  ※あなたのプロフィール情報（ランク、参加履歴など）も一緒に送信されます。
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? '送信中...' : 'このクエストに応募する'}
              </button>
            </form>
          ) : (
            // ランク不足の場合
            <div className="text-center py-6">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">ランクが足りません</h3>
              <p className="text-gray-500 text-sm mb-6">
                このクエストを受注するには<br/>
                <span className="font-bold text-red-500">{job.required_rank}ランク</span>以上が必要です。
              </p>
              <Link href="/mypage" className="block w-full bg-blue-50 text-blue-600 text-center py-3 rounded-lg font-bold border border-blue-100">
                イベントに参加してランクを上げる
              </Link>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}