// app/api/fetch-news/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

// Cloudflare Pages (Edge Runtime) で動作させる設定
export const runtime = 'edge'

// 管理者権限でのDB操作用
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

// --- 型定義 ---

interface RssItem {
  title: string
  link: string
  contentSnippet: string
  content: string
  pubDate: string
  image: string | null
}

interface FeedConfig {
  url: string
  fallbackUrl?: string
  source_name: string
  default_image: string
}

interface NewsSourceDB {
  id: number
  name: string
  rss_url: string
  fallback_url: string | null
  default_image_url: string | null
}

// 簡易RSSパーサー (ライブラリ依存なし・型安全)
async function parseRss(url: string): Promise<{ items: RssItem[] }> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    const text = await res.text()
    
    // 単純なXML解析 (cheerioを利用)
    const $ = cheerio.load(text, { xmlMode: true })
    const items: RssItem[] = []

    $('item').each((_, el) => {
      // cheerioのElementをラップ
      const $el = $(el)
      const title = $el.find('title').text()
      const link = $el.find('link').text()
      const pubDate = $el.find('pubDate').text()
      const content = $el.find('content\\:encoded').text() || $el.find('description').text()
      
      if (title && link) {
        items.push({
          title,
          link,
          contentSnippet: content.replace(/<[^>]+>/g, '').substring(0, 100) + '...', // HTMLタグ除去
          content,
          pubDate,
          image: null // 必要ならここで抽出ロジックを追加
        })
      }
    })

    return { items }
  } catch (_e) { // ★修正: _e に変更
    console.error('RSS Parse Error:', _e)
    return { items: [] }
  }
}

export async function POST(request: Request) {
  // 1. Cron/Cloudflareからのアクセス確認
  const authHeader = request.headers.get('authorization')
  const isCronAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET}`

  // 2. ブラウザ(管理者)からのアクセス確認
  let isUserAuthorized = false
  let userEmail = '未ログイン'

  if (!isCronAuthorized) {
    const token = request.headers.get('x-supabase-auth')
    if (token) {
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

  const logs: string[] = []
  let addedCount = 0
  let totalFound = 0

  try {
    // デバッグ用: 環境変数の存在チェック（値は出さない）
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logs.push('⚠️ 警告: SUPABASE_SERVICE_ROLE_KEY が読み込めていません (ANON_KEYを使用中)')
    } else {
      logs.push('ℹ️ 情報: SUPABASE_SERVICE_ROLE_KEY は存在します')
    }

    // DBから監視対象リストを取得
    const { data: sources } = await supabaseAdmin
      .from('news_sources')
      .select('*')
      .eq('is_active', true) 
      .returns<NewsSourceDB[]>()

    const targetSources: FeedConfig[] = (sources && sources.length > 0) 
      ? sources.map(s => ({ 
          url: s.rss_url, 
          fallbackUrl: s.fallback_url || undefined, 
          source_name: s.name, 
          default_image: s.default_image_url || FEED_URLS[0].default_image 
        }))
      : FEED_URLS

    for (const feedConfig of targetSources) {
      let items: RssItem[] = []
      logs.push(`🔍 ${feedConfig.source_name}`)

      try {
        // 自作関数でパース
        const feed = await parseRss(feedConfig.url)
        if (feed.items && feed.items.length > 0) {
          items = feed.items
          logs.push(`  ✅ RSS: ${items.length}件`)
        }
      } catch (_e) { // ★修正: _e に変更
        logs.push(`  ℹ️ RSS失敗`) 
      }

      // RSSで取れなかった場合のフォールバック (HTML解析)
      if (items.length === 0 && feedConfig.fallbackUrl) {
        try {
          const res = await fetch(feedConfig.fallbackUrl)
          const html = await res.text()
          const $ = cheerio.load(html)
          
          const fallbackItems: RssItem[] = []

          $('a').each((_, el) => {
            const $el = $(el)
            const linkAttr = $el.attr('href')
            const text = $el.text().trim()
            const dateMatch = text.match(/202\d[-./]\d{1,2}[-./]\d{1,2}/)
            
            if (linkAttr && text.length > 5 && dateMatch && feedConfig.fallbackUrl) {
              const absoluteLink = linkAttr.startsWith('http') ? linkAttr : new URL(linkAttr, feedConfig.fallbackUrl).toString()
              fallbackItems.push({
                title: text.replace(dateMatch[0], '').trim(),
                link: absoluteLink,
                content: text,
                contentSnippet: text,
                pubDate: new Date(dateMatch[0].replace(/\./g, '-')).toISOString(),
                image: null
              })
            }
          })
          
          // 重複排除 (Mapを使用)
          const uniqueItems = new Map<string, RssItem>()
          fallbackItems.forEach(item => uniqueItems.set(item.link, item))
          items = Array.from(uniqueItems.values())
          
          if (items.length > 0) logs.push(`  ✅ HTML: ${items.length}件`)
        } catch (_err) { // ★修正: _err に変更
          /* 無視 */ 
        }
      }

      totalFound += items.length

      for (const item of items) {
        if (!item.link || !item.title) continue
        
        const { data: existing } = await supabaseAdmin
          .from('news_feeds')
          .select('id')
          .eq('link_url', item.link)
          .single()

        if (!existing) {
          const imageUrl = item.image || feedConfig.default_image
          
          // ★修正: エラーハンドリングを追加
          const { error: insertError } = await supabaseAdmin.from('news_feeds').insert({
            title: item.title,
            link_url: item.link,
            content: item.content?.substring(0, 200) || '',
            source_name: feedConfig.source_name,
            published_at: item.pubDate,
            image_url: imageUrl
          })

          if (insertError) {
            logs.push(`❌ 保存失敗: ${item.title} - ${insertError.message}`)
            console.error('Insert Error:', insertError)
          } else {
            addedCount++
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `処理完了: ${addedCount}件追加 (全${totalFound}件検出 / エラーは詳細ログを確認)`,
      details: logs
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message: errorMessage, details: logs }, { status: 500 })
  }
}