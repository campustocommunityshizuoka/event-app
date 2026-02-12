// app/api/save-subscription/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { subscription } = await request.json()
    
    // サーバー側で認証ユーザーを取得
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    
    // ヘッダーからトークンを取得してユーザー特定
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error } = await supabase.auth.getUser(token)
        
        if (user && !error) {
             // DBに保存
            const { error: insertError } = await supabase
                .from('push_subscriptions')
                .insert({
                    user_id: user.id,
                    subscription: subscription
                })
            
            // 重複エラーなどは無視して成功とみなす（よくあるので）
            if (insertError && !insertError.message.includes('unique constraint')) {
                throw insertError
            }
            return NextResponse.json({ success: true })
        }
    }
    
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}