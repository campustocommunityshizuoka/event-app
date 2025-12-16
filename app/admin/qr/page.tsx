'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'

const ADMIN_EMAILS = [
  'admin@test.com', 
  'campustocommunityshizuoka@gmail.com'
]

// 画像のデータに合わせて ID:1 のイベントを操作対象とします
const EVENT_ID = 1

export default function AdminQRPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [qrValue, setQrValue] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  // 今日の日付とランダムな文字列を組み合わせてコードを生成する関数
  const generateCode = () => {
    const today = new Date().toISOString().split('T')[0]
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    return `event-${EVENT_ID}-${today}-${randomSuffix}`
  }

  // ★重要: 生成されたQRコードをデータベース(event-app)に保存する関数
  const saveQrToDatabase = async (code: string) => {
    try {
      // テーブル名を 'event-app' に修正し、実際に更新処理を行う
      const { error } = await supabase
        .from('event-app')
        .update({ secret_code: code })
        .eq('id', EVENT_ID)

      if (error) throw error
      console.log('新しいQRコードをDBに保存しました:', code)
    } catch (error) {
      console.error('保存エラー:', error)
      alert('QRコードの保存に失敗しました。コンソールを確認してください。')
      throw error
    }
  }

  // ★追加: ページ読み込み時に、現在DBにある有効なQRコードを取得する関数
  const fetchCurrentQr = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('event-app') // テーブル名を 'event-app' に修正
        .select('secret_code')
        .eq('id', EVENT_ID)
        .single()

      if (error) throw error

      if (data && data.secret_code) {
        setQrValue(data.secret_code)
      } else {
        // まだ値がない場合は新規生成して保存
        const newCode = generateCode()
        await saveQrToDatabase(newCode)
        setQrValue(newCode)
      }
    } catch (error) {
      console.error('取得エラー:', error)
    }
  }, [])

  // QRコードの手動更新ハンドラー
  const handleRefreshQr = async () => {
    const confirmed = window.confirm('QRコードを更新しますか？\n以前のQRコードは無効になります。')
    if (!confirmed) return

    setIsUpdating(true)
    const newCode = generateCode()
    
    try {
      await saveQrToDatabase(newCode) // DB保存を待つ
      setQrValue(newCode)             // 画面更新
      alert('QRコードを更新しました')
    } catch (e) {
      // エラー処理はsaveQrToDatabase内で行済み
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      // ユーザーが存在し、かつメールアドレスが許可リストに含まれているか確認
      if (user && user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true)
        // 権限があれば現在のコードを取得
        await fetchCurrentQr()
      } else {
        router.push('/')
      }
      setLoading(false)
    }
    checkAdmin()
  }, [router, fetchCurrentQr])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="p-10 text-center">確認中...</div>

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">管理者用QRコード</h1>
        <p className="text-gray-500 text-sm mb-4">参加者はこのコードを読み取ります</p>
        
        <p className="text-xs text-gray-400 font-mono mb-4 break-all bg-gray-100 p-2 rounded">
          Current Code: {qrValue}
        </p>

        <div className="bg-white p-4 rounded-xl border-2 border-dashed border-blue-200 inline-block mb-6">
          {qrValue ? (
            <QRCode
              value={qrValue}
              size={200}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 256 256`}
            />
          ) : (
            <div className="h-[200px] w-[200px] flex items-center justify-center text-gray-300">
              Generating...
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleRefreshQr}
            disabled={isUpdating}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
          >
            {isUpdating ? '更新中...' : 'QRコードを更新する'}
          </button>
          <p className="text-xs text-gray-400 mb-4">
            ※更新すると以前のQRコードは無効になります
          </p>

          <div className="h-px bg-gray-200 my-2"></div>

          <button 
            onClick={() => router.push('/mypage')}
            className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            マイページへ戻る
          </button>
          
          <button 
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  )
}