// app/api/fetch-news/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server' // createServerClient, cookies は削除してOKです
import Parser from 'rss-parser'
import * as cheerio from 'cheerio'

// 管理者権限でのDB操作用 (Service Role Keyがあればそれを使う)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const parser = new Parser()

// ... (FEED_URLS 定義はそのまま) ...
const FEED_URLS = [
  {
    url: 'https://shizuoka-connect.com/feed', 
    fallbackUrl: 'https://shizuoka-connect.com/', 
    source_name: 'しずおかコネクト公式',
    default_image: 'https://shizuoka-connect.com/wp-content/uploads/2024/05/cropped-shizuoka-connect-logo-1.png'
  },
]

const ADMIN_EMAILS = [
  'admin@test.com',
  'campustocommunityshizuoka@gmail.com'
]

export async function POST(request: Request) {
  // 1. Cron/Cloudflareからのアクセス確認 (Cron Secret)
  const authHeader = request.headers.get('authorization')
  const isCronAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET}`

  // 2. ブラウザ(管理者)からのアクセス確認
  let isUserAuthorized = false
  let userEmail = '未ログイン'

  if (!isCronAuthorized) {
    // ★変更: Cookieではなく、ヘッダーから直接トークンを受け取る
    const token = request.headers.get('x-supabase-auth')
    
    if (token) {
      // トークンを使ってユーザー情報をSupabaseに問い合わせる
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      
      if (!error && user && user.email) {
        userEmail = user.email
        if (ADMIN_EMAILS.includes(user.email)) {
          isUserAuthorized = true
        }
      }
    }
  }

  // 認証チェック
  if (!isCronAuthorized && !isUserAuthorized) {
    const debugMessage = isCronAuthorized 
      ? 'Cron:OK' 
      : `ログイン判定: ${userEmail} / リスト: [${ADMIN_EMAILS.join(', ')}]`

    return NextResponse.json({ 
      success: false, 
      message: `同期エラー: 権限がありません。\n(${debugMessage})` 
    }, { status: 401 })
  }

  // --- 以下、クロール処理（そのまま） ---
  const logs: string[] = []
  let addedCount = 0
  let totalFound = 0

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logs.push('⚠️ 警告: SUPABASE_SERVICE_ROLE_KEY設定なし')
    }

    const { data: sources } = await supabaseAdmin
      .from('news_sources')
      .select('*')
      .eq('is_active', true) 
      .returns<{id: number, name: string, rss_url: string, fallback_url: string | null, default_image_url: string | null}[]>()

    const targetSources = (sources && sources.length > 0) 
      ? sources.map(s => ({ url: s.rss_url, fallbackUrl: s.fallback_url || undefined, source_name: s.name, default_image: s.default_image_url || FEED_URLS[0].default_image }))
      : FEED_URLS

    for (const feedConfig of targetSources) {
      // ... (中身のクロールロジックは変更なし。前回と同じコードを使用してください) ...
      // 長くなるため省略しますが、前回のコードのまま貼り付けてください
      
      // ↓↓↓ ここからコピペ用（念のため中身も記載します） ↓↓↓
      let items: any[] = []
      logs.push(`🔍 ${feedConfig.source_name}`)

      try {
        const feed = await parser.parseURL(feedConfig.url)
        if (feed.items?.length > 0) {
          items = feed.items.map(item => ({
            title: item.title,
            link: item.link,
            content: item.contentSnippet || item.content,
            pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            image: null
          }))
          logs.push(`  ✅ RSS: ${items.length}件`)
        }
      } catch (e) { /* 無視 */ }

      if (items.length === 0 && feedConfig.fallbackUrl) {
        try {
          const res = await fetch(feedConfig.fallbackUrl)
          const html = await res.text()
          const $ = cheerio.load(html)
          $('a').each((_, el) => {
            const link = $(el).attr('href')
            const text = $(el).text().trim()
            const dateMatch = text.match(/202\d[-./]\d{1,2}[-./]\d{1,2}/)
            if (link && text.length > 5 && dateMatch) {
              const absoluteLink = link.startsWith('http') ? link : new URL(link, feedConfig.fallbackUrl!).toString()
              items.push({
                title: text.replace(dateMatch[0], '').trim(),
                link: absoluteLink,
                content: text,
                pubDate: new Date(dateMatch[0].replace(/\./g, '-')).toISOString(),
                image: null
              })
            }
          })
          items = Array.from(new Map(items.map(item => [item.link, item])).values())
          if (items.length > 0) logs.push(`  ✅ HTML: ${items.length}件`)
        } catch (err) { /* 無視 */ }
      }
      totalFound += items.length
      for (const item of items) {
        if (!item.link || !item.title) continue
        const { data: existing } = await supabaseAdmin.from('news_feeds').select('id').eq('link_url', item.link).single()
        if (!existing) {
          const imageUrl = item.image || feedConfig.default_image
          await supabaseAdmin.from('news_feeds').insert({
            title: item.title,
            link_url: item.link,
            content: item.content?.substring(0, 200) || '',
            source_name: feedConfig.source_name,
            published_at: item.pubDate,
            image_url: imageUrl
          })
          addedCount++
        }
      }
      // ↑↑↑ ここまでコピペ用 ↑↑↑
    }

    return NextResponse.json({ 
      success: true, 
      message: `成功: ${addedCount}件追加 (全${totalFound}件)`,
      details: logs
    })

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message, details: logs }, { status: 500 })
  }
}