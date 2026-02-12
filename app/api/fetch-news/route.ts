// app/api/fetch-news/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Parser from 'rss-parser'
import * as cheerio from 'cheerio'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const parser = new Parser()

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
  const authHeader = request.headers.get('authorization')
  const isCronAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET}`

  let isUserAuthorized = false
  let userEmail = '未ログイン'

  if (!isCronAuthorized) {
    const token = request.headers.get('x-supabase-auth')
    
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      
      if (user && user.email) {
        userEmail = user.email
        if (ADMIN_EMAILS.includes(user.email)) {
          isUserAuthorized = true
        }
      }
    }
  }

  if (!isCronAuthorized && !isUserAuthorized) {
    const debugMessage = isCronAuthorized 
      ? 'Cron:OK' 
      : `ログイン判定: ${userEmail} / リスト: [${ADMIN_EMAILS.join(', ')}]`

    return NextResponse.json({ 
      success: false, 
      message: `同期エラー: 権限がありません。\n(${debugMessage})` 
    }, { status: 401 })
  }

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      } catch (e) { 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _ = e
        /* RSS失敗は無視 */ 
      }

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
        } catch (err) { 
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _ = err
          /* HTML解析失敗は無視 */ 
        }
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
    }

    return NextResponse.json({ 
      success: true, 
      message: `成功: ${addedCount}件追加 (全${totalFound}件)`,
      details: logs
    })

  } catch (error: unknown) {
    let message = 'Unknown error'
    if (error instanceof Error) message = error.message
    return NextResponse.json({ success: false, message: message, details: logs }, { status: 500 })
  }
}