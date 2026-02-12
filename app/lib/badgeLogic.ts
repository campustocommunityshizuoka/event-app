import { supabase } from '@/app/lib/supabaseClient'
import { eventSupabase } from '@/app/lib/eventDbClient'

// 外部イベント情報の型定義（想定）
type ExternalEvent = {
  id: number
  title: string
  // 本来は外部DBに category カラムがあるのが理想ですが、
  // 現状はタイトルから簡易判定するロジックを入れます
  description?: string 
}

// カテゴリ判定ロジック（外部DBにカラムが追加されるまでの暫定対応）
const detectCategory = (event: ExternalEvent): 'tech' | 'local' | 'general' => {
  const text = (event.title + (event.description || '')).toLowerCase()
  
  if (text.match(/プログラミング|開発|エンジニア|ai|tech|web|アプリ/)) {
    return 'tech'
  }
  if (text.match(/地域|交流|ボランティア|清掃|祭り|静岡|浜松/)) {
    return 'local'
  }
  return 'general'
}

export const checkAndAwardBadges = async (userId: string, currentEventId: number) => {
  const newBadges: string[] = []

  try {
    // 1. ユーザーの全参加履歴を取得
    const { data: participations } = await supabase
      .from('participations')
      .select('event_id')
      .eq('user_id', userId)
    
    if (!participations) return []

    const eventIds = participations.map(p => p.event_id)
    const totalCount = eventIds.length

    // 2. 参加した全イベントの詳細情報を外部DBから取得
    const { data: eventsData } = await eventSupabase
      .from('events')
      .select('id, title')
      .in('id', eventIds)
      .returns<ExternalEvent[]>()

    const events = eventsData || []

    // 3. カテゴリごとの参加回数を集計
    const counts = {
      tech: 0,
      local: 0,
      general: totalCount // 全体合計
    }

    events.forEach(ev => {
      const cat = detectCategory(ev)
      if (cat !== 'general') {
        counts[cat]++
      }
    })

    console.log('Badge Check Counts:', counts) // デバッグ用

    // 4. 未取得のバッジ一覧を取得
    const { data: ownedBadges } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId)
    
    const ownedBadgeIds = new Set(ownedBadges?.map(b => b.badge_id) || [])

    const { data: allBadges } = await supabase
      .from('badges')
      .select('*')
    
    if (!allBadges) return []

    // 5. 条件判定と付与
    for (const badge of allBadges) {
      if (ownedBadgeIds.has(badge.id)) continue // 既に持っている

      let isEligible = false
      const requiredCount = parseInt(badge.condition_type?.split('_')[1] || '0') // "count_3" -> 3

      // カテゴリ条件の判定
      if (badge.category === 'tech' && counts.tech >= requiredCount) isEligible = true
      if (badge.category === 'local' && counts.local >= requiredCount) isEligible = true
      if (badge.category === 'general' && counts.general >= requiredCount) isEligible = true

      if (isEligible) {
        // バッジ付与実行
        await supabase.from('user_badges').insert({
          user_id: userId,
          badge_id: badge.id
        })
        newBadges.push(badge.name)
      }
    }

  } catch (error) {
    console.error('Badge logic error:', error)
  }

  return newBadges // 新しく獲得したバッジ名を返す
}