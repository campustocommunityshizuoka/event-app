import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushNotification } from '../../../utils/push'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { ApplicationId, senderId, content, isFromAdmin } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // DB保存
    const { error: insertError } = await supabase
      .from('application_messages')
      .insert({ application_id: ApplicationId, sender_id: senderId, content: content })

    if (insertError) throw insertError

    // 相手を特定して通知
    if (isFromAdmin) {
      // 応募情報を取得してユーザーIDを特定
      const { data: appData } = await supabase
        .from('job_applications')
        .select('user_id, job:jobs(title)')
        .eq('id', ApplicationId)
        .single()
      
      if (appData) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const jobTitle = appData.job?.title || 'クエスト'
        await sendPushNotification(
          appData.user_id,
          `新着メッセージ: ${jobTitle}`,
          `運営から: ${content.substring(0, 30)}...`
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}