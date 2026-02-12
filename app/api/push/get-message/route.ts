import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    // 1. デバッグログ：APIが呼ばれたことを確認
    console.log("--- Get Message API Called ---")
    
    if (!endpoint) {
      console.error("Error: No endpoint provided in query params")
      return NextResponse.json({ title: 'エラー', body: '宛先が不明です' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // 管理者権限で検索
    )

    // 2. エンドポイントから user_id を特定
    // JSONB型の中身を検索するため filter を使用します
    const { data: sub, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .filter('subscription->>endpoint', 'eq', endpoint)
      .single()

    console.log("Querying for endpoint:", endpoint.substring(0, 40) + "...")

    if (subError || !sub) {
      console.warn("User not found for this endpoint:", subError?.message)
      return NextResponse.json({ 
        title: 'しずおかコネクト', 
        body: '新着のお知らせがあります' 
      })
    }

    console.log("User Identified:", sub.user_id)

    // 3. そのユーザーの最新の通知ログを取得
    const { data: log, error: logError } = await supabase
      .from('notification_logs')
      .select('title, body')
      .eq('user_id', sub.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (logError || !log) {
      console.log("No specific log found for user, showing default.")
      return NextResponse.json({ 
        title: 'しずおかコネクト', 
        body: '新しい通知があります。アプリを確認してください。' 
      })
    }

    // 成功：DBに保存された内容を返す
    console.log("Success: Returning dynamic content:", log.title)
    return NextResponse.json({
      title: log.title,
      body: log.body
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error("Server Error in get-message:", message)
    return NextResponse.json({ title: '通知', body: 'お知らせがあります' }, { status: 500 })
  }
}