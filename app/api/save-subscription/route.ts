// app/api/save-subscription/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { subscription } = await request.json()
    
    // --- デバッグログ ---
    console.log("--- Debug Save Subscription ---")
    
    // 1. クライアント作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    
    // 2. ユーザー認証
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
        console.error("Error: No Authorization header")
        return NextResponse.json({ success: false, message: 'No Auth Header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
        console.error("Auth Error:", authError?.message)
        return NextResponse.json({ success: false, message: 'User Auth Failed' }, { status: 401 })
    }
    
    console.log("User Identified:", user.id)

    // 3. DB保存
    const { error: insertError } = await supabase
        .from('push_subscriptions')
        .insert({
            user_id: user.id,
            subscription: subscription
        })
    
    if (insertError) {
        // すでに登録済み(重複)の場合はエラーにしない
        if (insertError.message.includes('unique constraint') || insertError.code === '23505') {
            console.log("Info: Already subscribed (Duplicate skipped)")
            return NextResponse.json({ success: true, status: 'already_exists' })
        }
        
        console.error("Insert Error (Details):", insertError)
        return NextResponse.json({ success: false, message: insertError.message }, { status: 500 })
    }

    console.log("Success: Subscription saved to DB")
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error("Server Error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}