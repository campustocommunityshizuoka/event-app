import { createClient } from '@supabase/supabase-js'

// --- (前半の署名ロジック等は変更なし) ---
function getPkcs8Der(privateKeyBase64: string, publicKeyBase64: string): Uint8Array {
  const rawPrivate = Uint8Array.from(atob(privateKeyBase64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  const rawPublic = Uint8Array.from(atob(publicKeyBase64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

  const header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 
    0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x04, 
    0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20
  ])
  const footer = new Uint8Array([0xa1, 0x44, 0x03, 0x42, 0x00])

  const der = new Uint8Array(header.length + rawPrivate.length + footer.length + rawPublic.length)
  der.set(header)
  der.set(rawPrivate, header.length)
  der.set(footer, header.length + rawPrivate.length)
  der.set(rawPublic, header.length + rawPrivate.length + footer.length)
  return der
}

async function signVapidKey(endpoint: string) {
  const privateKey = process.env.VAPID_PRIVATE_KEY!
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
  const aud = new URL(endpoint).origin

  const header = { typ: 'JWT', alg: 'ES256' }
  const claims = {
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: 'mailto:admin@example.com' 
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stringify = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const unsignedToken = `${stringify(header)}.${stringify(claims)}`

  const pkcs8 = getPkcs8Der(privateKey, publicKey)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pkcs8 as any, 
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  )

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${unsignedToken}.${signatureBase64}`
}
// --- (ここまで変更なし) ---

/**
 * 共通通知送信関数
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function sendPushNotification(userId: string, title: string, body: string, url: string = '/mypage') {
  console.log(`[Push Utils] Sending to ${userId}: ${title}`)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. 通知ログをDBに保存
  const { error: logError } = await supabase.from('notification_logs').insert({
    user_id: userId,
    title,
    body
    // url: url (DBにカラムがない場合は削除)
  })
  
  if (logError) {
    console.error('[Push Utils] Log Error (Non-fatal):', logError)
  }

  // 2. ユーザーの購読情報(エンドポイント)を取得
  const { data: subs, error: subError } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)

  if (subError || !subs || subs.length === 0) {
    console.warn('[Push Utils] No subscription found for user:', userId)
    return { success: false, count: 0, message: 'No subscription' }
  }

  // 3. 各デバイスへ送信
  let successCount = 0
  for (const sub of subs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = sub.subscription as any
    try {
      const token = await signVapidKey(subscription.endpoint)
      const res = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `vapid t=${token}, k=${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}`,
          'TTL': '60',
        },
        body: null
      })

      if (res.ok) {
        successCount++
      } else {
        console.error(`[Push Utils] Failed: ${res.status}`)
      }
    } catch (e) {
      console.error('[Push Utils] Network Error:', e)
    }
  }
  
  console.log(`[Push Utils] Sent successfully to ${successCount} devices`)
  return { success: true, count: successCount }
}