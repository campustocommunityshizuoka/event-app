// app/mypage/page.tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import AdminView from '@/app/components/mypage/AdminView'
import UserView from '@/app/components/mypage/UserView'

// 管理者メールアドレス
const ADMIN_EMAILS = [
  'admin@test.com',
  'campustocommunityshizuoka@gmail.com'
]

// useSearchParamsを使うメインの処理を別コンポーネントに切り出し
function MyPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewParam = searchParams ? searchParams.get('view') : null

  const [loading, setLoading] = useState(true)
  const [sessionUser, setSessionUser] = useState<{ id: string, email: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session || !session.user) {
        router.push('/login')
        return
      }

      const email = session.user.email || ''
      const adminFlag = ADMIN_EMAILS.includes(email)

      setSessionUser({
        id: session.user.id,
        email: email
      })
      setIsAdmin(adminFlag)
      setLoading(false)
    }

    checkSession()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!sessionUser) return null

  // 管理者で、かつURLパラメータで明示的に user ビューが指定されていない場合は AdminView を表示
  if (isAdmin && viewParam !== 'user') {
    return <AdminView userEmail={sessionUser.email} />
  }

  // それ以外（一般ユーザー、または管理者がユーザービューを見たい場合）
  return <UserView userId={sessionUser.id} userEmail={sessionUser.email} />
}

// エクスポートするコンポーネントで Suspense バウンダリを設定
export default function MyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    }>
      <MyPageContent />
    </Suspense>
  )
}