import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'edge'
// Supabase認証コールバック処理
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // ログイン後の移動先（指定がなければトップページへ）
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()

    // サーバー側でSupabaseを操作するためのクライアントを作成
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    
    // コードを使ってセッションを交換（ログイン確立）
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }else {
      // ▼▼▼ ここを変更：エラー内容をURLにくっつけて送る ▼▼▼
      console.error('Auth Error:', error) // ログにも出す
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error_description=${encodeURIComponent(error.message)}`)
    }
  }

  // エラーがあった場合はトップページなどに返す
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}