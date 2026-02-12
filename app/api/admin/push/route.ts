import { NextResponse } from 'next/server'
import { sendPushNotification } from '../../../utils/push' // 作成した部品を読み込み

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { userId, title, body } = await request.json()
    console.log("--- Manual Push Request ---")
    console.log(`Target: ${userId}, Title: ${title}`)

    if (!userId || !title) {
      return NextResponse.json({ success: false, message: 'Missing userId or title' }, { status: 400 })
    }

    // 部品を使って送信
    const result = await sendPushNotification(userId, title, body || 'お知らせがあります')

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("Manual Push API Error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}