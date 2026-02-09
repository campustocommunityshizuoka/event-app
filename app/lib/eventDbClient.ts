import { createClient } from '@supabase/supabase-js'

// ★修正: 変数名を .env.local と完全に一致させました
const eventDbUrl = process.env.NEXT_PUBLIC_EVENT_DB_URL!
const eventDbKey = process.env.NEXT_PUBLIC_EVENT_DB_ANON_KEY!

// 変数が読み込めていない場合のチェック
if (!eventDbUrl || !eventDbKey) {
  console.error('Error: NEXT_PUBLIC_EVENT_DB_URL or NEXT_PUBLIC_EVENT_DB_ANON_KEY is missing.')
}

export const eventSupabase = createClient(eventDbUrl, eventDbKey)