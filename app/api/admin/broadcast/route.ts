import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushNotification } from '../../../utils/push'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { title, body, url } = await request.json()
    console.log("--- Broadcast Request ---", title)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. 全ユーザーのIDを取得 (重複を排除)
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('user_id')
    
    if (error) throw error
    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No subscribers' })
    }

    // Setを使ってユーザーIDの重複を取り除く
    const uniqueUserIds = [...new Set(subs.map(s => s.user_id))]
    console.log(`Broadcasting to ${uniqueUserIds.length} users...`)

    // 2. ループして全員に送信
    let successCount = 0
    
    // 並列処理で高速化
    // 戻り値を number として扱うために型アサーション等は不要ですが、
    // 次の reduce で明示的に型を指定します。
    const promises = uniqueUserIds.map(userId => 
      sendPushNotification(userId, title, body, url || '/mypage')
        .then(res => res.success ? 1 : 0)
    )

    const results = await Promise.all(promises)
    
    // ★修正箇所: アキュムレータ(a)を明示的に number 型にする
    successCount = results.reduce((a: number, b) => a + b, 0)

    console.log(`Broadcast Complete. Success count: ${successCount}`)
    return NextResponse.json({ success: true, count: successCount })

  } catch (err: unknown) {
    console.error("Broadcast Error:", err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}