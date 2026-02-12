// app/checkin/page.tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import { Scanner } from '@yudiel/react-qr-scanner'
import { checkAndAwardBadges } from '../lib/badgeLogic'

// ボーナスXP設定
const REPORT_BONUS_XP = 50

// --- 型定義 ---

// スキャナーのコールバック用型
interface IScanResult {
  rawValue: string
  format?: string
  rawBytes?: Uint8Array
}

// DBからの戻り値の型
interface EventSecretRow {
  event_id: number
}

interface ParticipationRow {
  id: number
}

interface ProfileRow {
  total_xp: number
}

// ステータス管理
type Status = 'scan_mode' | 'processing' | 'success' | 'submitting_report' | 'complete' | 'error'

function CheckInContent() {
  const searchParams = useSearchParams()
  const urlToken = searchParams ? searchParams.get('token') : null
  const router = useRouter()
  
  const [status, setStatus] = useState<Status>('scan_mode')
  const [message, setMessage] = useState('')
  
  // データ保持用
  const [participationId, setParticipationId] = useState<number | null>(null)
  const [reportContent, setReportContent] = useState('')
  const [rating, setRating] = useState(5)
  const [newBadges, setNewBadges] = useState<string[]>([])

  useEffect(() => {
    if (urlToken) {
        void handleCheckIn(urlToken)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken])

  const handleCheckIn = async (qrContent: string) => {
    if (status !== 'scan_mode') return
    setStatus('processing')
    setNewBadges([]) // リセット
    
    try {
      // 1. ログインチェック
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('チェックインにはログインが必要です')
        router.push('/login')
        return
      }

      // 2. QRコード（シークレット）の検証
      const { data: secretData, error: secretError } = await supabase
        .from('event_secrets')
        .select('event_id')
        .eq('secret_code', qrContent)
        .returns<EventSecretRow[]>()
        .single()

      if (secretError || !secretData) throw new Error('無効なQRコードです')

      // 3. 重複チェック
      const { data: existing } = await supabase
        .from('participations')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', secretData.event_id)
        .single()

      if (existing) {
        throw new Error('すでにチェックイン済みです')
      }

      // 4. 参加登録
      const { data: participation, error: insertError } = await supabase
        .from('participations')
        .insert({
          user_id: user.id,
          event_id: secretData.event_id,
          checked_in_at: new Date().toISOString(),
        })
        .select()
        .returns<ParticipationRow[]>()
        .single()

      if (insertError) throw insertError

      // ★ バッジ獲得ロジックの呼び出し
      const awarded = await checkAndAwardBadges(user.id, secretData.event_id)
      if (awarded.length > 0) {
        setNewBadges(awarded)
      }

      // 成功！レポート入力画面へ
      setParticipationId(participation.id)
      setStatus('success')

    } catch (err: unknown) {
      console.error(err)
      setStatus('error')
      if (err instanceof Error) {
        setMessage(err.message)
      } else {
        setMessage('エラーが発生しました')
      }
    }
  }

  const handleScan = (result: IScanResult[]) => {
    if (result && result.length > 0 && result[0].rawValue) {
      void handleCheckIn(result[0].rawValue)
    }
  }

  // レポート送信処理
  const handleSubmitReport = async () => {
    if (!participationId) return
    setStatus('submitting_report')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('ユーザーが見つかりません')

      // 1. レポート保存
      const { error: reportError } = await supabase
        .from('event_reports')
        .insert({
          participation_id: participationId,
          user_id: user.id,
          content: reportContent,
          rating: rating,
          xp_bonus: REPORT_BONUS_XP
        })
      
      if (reportError) throw reportError

      // 2. ユーザーのXPを加算
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', user.id)
        .returns<ProfileRow[]>()
        .single()
      
      const currentXp = profile?.total_xp || 0
      
      await supabase
        .from('profiles')
        .update({ total_xp: currentXp + REPORT_BONUS_XP })
        .eq('id', user.id)

      setStatus('complete')

    } catch (err: unknown) {
      console.error(err)
      if (err instanceof Error) {
        alert('レポート送信に失敗しました: ' + err.message)
      } else {
        alert('レポート送信に失敗しました')
      }
      setStatus('success') // 入力画面に戻す
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col font-sans text-gray-900">
      
      <header className="w-full bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain sm:h-10" />
            <h1 className="text-base font-bold text-blue-600 tracking-wide hidden sm:block">しずおかコネクト</h1>
          </div>
          <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-100">QRチェックイン</span>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transition-all duration-500">
          
          {/* ヘッダーエリア */}
          <div className={`p-5 text-center transition-colors duration-300 ${
            status === 'success' || status === 'submitting_report' ? 'bg-blue-600' : 
            status === 'complete' ? 'bg-green-500' :
            status === 'error' ? 'bg-red-500' : 
            'bg-gray-800'
          }`}>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {status === 'scan_mode' && 'QR Check-in'}
              {status === 'processing' && 'Processing...'}
              {(status === 'success' || status === 'submitting_report') && 'Check-in Successful!'}
              {status === 'complete' && 'Quest Complete!'}
              {status === 'error' && 'Error'}
            </h2>
            <p className="text-white/90 text-xs mt-1">
              {status === 'scan_mode' && '会場のQRコードを読み取ってください'}
              {status === 'processing' && '情報を照会しています...'}
              {(status === 'success' || status === 'submitting_report') && 'チェックイン完了！レポートを書いてXPゲット！'}
              {status === 'complete' && `お疲れ様でした！+${REPORT_BONUS_XP} XPを獲得しました`}
              {status === 'error' && 'エラーが発生しました'}
            </p>
          </div>

          <div className="p-5">
            {/* === 1. スキャン画面 === */}
            {status === 'scan_mode' && (
              <div className="flex flex-col items-center">
                <div className="w-full aspect-square bg-gray-900 rounded-xl overflow-hidden shadow-inner relative border-4 border-gray-100">
                  <Scanner 
                    onScan={handleScan}
                    constraints={{ facingMode: 'environment' }}
                    styles={{ container: { width: '100%', height: '100%' }, video: { width: '100%', height: '100%', objectFit: 'cover' }}}
                  />
                  <div className="absolute inset-0 border-[30px] border-black/30 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white/50 rounded-lg animate-pulse"></div>
                  </div>
                </div>
                <button onClick={() => router.push('/mypage')} className="mt-4 text-gray-500 text-sm underline py-2">キャンセルして戻る</button>
              </div>
            )}

            {/* === 2. チェックイン完了＆レポート入力画面 === */}
            {(status === 'success' || status === 'submitting_report') && (
              <div className="animate-fade-in-up">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2 text-blue-600 mx-auto text-3xl">🎉</div>
                  <h3 className="font-bold text-gray-800">チェックインしました</h3>
                  
                  {/* ★ バッジ獲得アニメーション表示エリア ★ */}
                  {newBadges.length > 0 && (
                    <div className="mt-4 mb-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 p-4 rounded-xl shadow-sm animate-bounce-in">
                       <p className="text-xs font-bold text-orange-600 mb-2">✨ 新しい称号を獲得！ ✨</p>
                       <div className="flex flex-wrap justify-center gap-2">
                         {newBadges.map(badge => (
                           <span key={badge} className="bg-white text-gray-800 px-3 py-1 rounded-full text-xs font-bold border border-orange-100 shadow-sm flex items-center gap-1">
                             🏅 {badge}
                           </span>
                         ))}
                       </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">参加履歴が記録されました</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                  <h4 className="font-bold text-yellow-800 text-sm flex items-center gap-2 mb-2">
                    <span>📝</span> ミニレポート提出でボーナス！
                  </h4>
                  <p className="text-xs text-yellow-700 mb-3">
                    今日のイベントの感想や学んだことを記録に残しましょう。
                    投稿すると<span className="font-bold text-red-500"> +{REPORT_BONUS_XP} XP </span>獲得できます！
                  </p>

                  {/* 評価 (星) */}
                  <div className="flex justify-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-2xl transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  {/* テキスト入力 */}
                  <textarea
                    className="w-full p-3 border border-yellow-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none bg-white"
                    rows={3}
                    placeholder="例: とても勉強になりました！次はスタッフとして参加したいです。"
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                  ></textarea>
                </div>

                <button 
                  onClick={handleSubmitReport}
                  disabled={status === 'submitting_report' || !reportContent.trim()}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 transition-all mb-3"
                >
                  {status === 'submitting_report' ? '送信中...' : `レポートを送って +${REPORT_BONUS_XP} XP`}
                </button>

                <button 
                  onClick={() => router.push('/mypage')}
                  className="w-full text-gray-400 text-xs py-2 hover:text-gray-600"
                >
                  今は書かずにトップへ戻る
                </button>
              </div>
            )}

            {/* === 3. 完全完了画面 === */}
            {status === 'complete' && (
              <div className="py-6 text-center animate-fade-in-up">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-500 mx-auto text-4xl shadow-lg">
                  🎁
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">XPを獲得しました！</h3>
                <p className="text-sm text-gray-600 mb-8">
                  ランクアップに一歩近づきました。<br/>
                  次のイベントも楽しみましょう！
                </p>
                <button onClick={() => router.push('/mypage')} className="w-full bg-gray-800 text-white py-3 rounded-lg font-bold shadow-md hover:bg-gray-900">
                  マイページへ戻る
                </button>
              </div>
            )}

            {/* === 4. エラー画面 === */}
            {status === 'error' && (
              <div className="py-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-500 mx-auto">✕</div>
                <p className="text-gray-600 mb-6 font-medium bg-red-50 px-4 py-2 rounded text-xs break-all">{message}</p>
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <CheckInContent />
    </Suspense>
  )
}