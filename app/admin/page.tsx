'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { QRCodeSVG } from 'qrcode.react'

type EventData = {
  id: number
  name: string
}

export default function AdminPage() {
  const [event, setEvent] = useState<EventData | null>(null)
  const [qrUrl, setQrUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  // 1. イベント情報の取得
  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from('event-app')
        .select('*')
        .single()

      if (error) {
        console.error('Error:', error)
        alert('イベントが見つかりません。')
      } else {
        setEvent(data)
      }
      setLoading(false)
    }
    fetchEvent()
  }, [])

  // トークン生成関数（有効期限：24時間）
  const generateNewToken = useCallback(async (eventId: number) => {
    setRegenerating(true)
    try {
      const token = Math.random().toString(36).substring(2, 15)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 1) // 1日（24時間）後に設定

      const { error } = await supabase
        .from('event-token')
        .insert({
          event_id: eventId,
          token: token,
          expires_at: expiresAt.toISOString(),
        })

      if (error) throw error

      const url = `${window.location.origin}/checkin?token=${token}`
      setQrUrl(url)
      console.log('New token generated:', token)
    } catch (error) {
      console.error('Token Generation Error:', error)
      alert('トークンの生成に失敗しました')
    } finally {
      setRegenerating(false)
    }
  }, [])

  // 2. 初期トークン確認と自動更新ロジック
  useEffect(() => {
    if (!event) return

    // 既存の有効なトークンがあるかチェックする関数
    const checkAndSetToken = async () => {
      const { data, error } = await supabase
        .from('event-token')
        .select('*')
        .eq('event_id', event.id)
        .gt('expires_at', new Date().toISOString()) // 現在時刻より未来のもの
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data && !error) {
        // 有効なトークンがあればそれを使う
        const url = `${window.location.origin}/checkin?token=${data.token}`
        setQrUrl(url)
      } else {
        // なければ新規作成
        await generateNewToken(event.id)
      }
    }

    checkAndSetToken()

    // 1分ごとに有効期限をチェックし、切れていたら自動更新する（実質1日ごとの自動更新）
    const intervalId = setInterval(async () => {
      // 現在表示中のQRが期限切れになっていないか確認するロジックをここに書くことも可能ですが、
      // 簡易的に「checkAndSetToken」を定期実行して、なければ作る形にします。
      checkAndSetToken()
    }, 60000) // 1分ごとにチェック

    return () => clearInterval(intervalId)
  }, [event, generateNewToken])

  // 手動更新ハンドラ
  const handleManualRegenerate = () => {
    if (!event) return
    if (confirm('QRコードを新しく発行しますか？\n（古いQRコードは使用できなくなります）')) {
      generateNewToken(event.id)
    }
  }

  // --- ローディング表示 ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        <div className="animate-pulse">読み込み中...</div>
      </div>
    )
  }

  // --- エラー表示 ---
  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">データがありません</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* ヘッダー: 白背景に変更、ロゴ配置 */}
      <header className="w-full bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* ロゴ画像: publicフォルダに logo.png がある前提 */}
            <img 
              src="/logo.png" 
              alt="しずおかコネクト Logo" 
              className="h-10 w-auto object-contain"
            />
            <h1 className="text-lg font-bold text-blue-600 tracking-wide hidden sm:block">
              しずおかコネクト
            </h1>
          </div>
          <span className="text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
            管理者用コンソール
          </span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          
          {/* イベント名エリア */}
          <div className="bg-blue-600 p-6 text-center">
            <h2 className="text-sm text-blue-100 font-medium mb-1">Check-in Event</h2>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {event.name}
            </h3>
          </div>

          {/* QRコードエリア */}
          <div className="p-8 flex flex-col items-center bg-white">
            <p className="text-gray-600 mb-6 text-center text-sm">
              参加者の方はこちらのQRコードを<br/>スマートフォンで読み取ってください
            </p>

            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-200 relative">
              {qrUrl ? (
                <QRCodeSVG value={qrUrl} size={240} />
              ) : (
                <div className="w-[240px] h-[240px] bg-gray-100 animate-pulse rounded flex items-center justify-center text-gray-400 text-xs">
                  QR生成中...
                </div>
              )}
              {regenerating && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 w-full">
               <div className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 px-4 py-2 rounded-full border border-green-100">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                このコードは24時間有効です
              </div>

              {/* 手動更新ボタン */}
              <button
                onClick={handleManualRegenerate}
                disabled={regenerating}
                className="mt-2 text-sm text-gray-500 underline hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                QRコードを更新する
              </button>
            </div>
          </div>
        </div>

        <footer className="mt-8 text-gray-400 text-xs text-center">
          &copy; Shizuoka Connect. All rights reserved.
        </footer>
      </main>
    </div>
  )
}