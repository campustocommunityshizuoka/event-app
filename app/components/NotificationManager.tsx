// app/components/NotificationManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { urlBase64ToUint8Array } from '../utils/webPush'
import { supabase } from '../lib/supabaseClient'

export default function NotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription()
    }
  }, [])

  const checkSubscription = async () => {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      setIsSubscribed(true)
    }
  }

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      
      if (!vapidKey) {
          alert('VAPIDキーが設定されていません')
          return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      })

      // API経由でDBに保存
      const { data: { session } } = await supabase.auth.getSession()
      
      await fetch('/api/save-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ subscription })
      })

      setIsSubscribed(true)
      alert('通知設定をオンにしました！')
    } catch (error) {
      console.error('Subscription error:', error)
      alert('通知の許可に失敗しました。ブラウザの設定を確認してください。')
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) return null

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mt-4">
      <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
        <span>🔔</span> プッシュ通知
      </h3>
      {isSubscribed ? (
        <p className="text-sm text-green-600 font-bold">
          設定済みです。お知らせをお待ちください。
        </p>
      ) : (
        <div>
          <p className="text-xs text-gray-500 mb-3">
            重要なクエストやイベント情報を見逃さないように通知を受け取りましょう。
          </p>
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '設定中...' : '通知を受け取る'}
          </button>
        </div>
      )}
    </div>
  )
}