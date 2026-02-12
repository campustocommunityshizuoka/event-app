// app/mypage/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import imageCompression from 'browser-image-compression'

// 型定義
type Profile = {
  id: string
  email: string
  username: string | null
  avatar_url: string | null
  bio: string | null
}

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // フォーム状態
  const [profile, setProfile] = useState<Profile | null>(null)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  
  // 画像処理用
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null)
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setUsername(data.username || '')
        setBio(data.bio || '')
        setCurrentAvatarUrl(data.avatar_url)
      }
      setLoading(false)
    }
    init()
  }, [router])

  // 画像選択時の処理
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const file = e.target.files[0]
    setNewAvatarFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  // 保存処理
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    try {
      let avatarUrl = currentAvatarUrl

      // 画像がある場合、圧縮してアップロード
      if (newAvatarFile) {
        const options = {
          maxSizeMB: 0.5, // 0.5MB以下に圧縮
          maxWidthOrHeight: 800,
          useWebWorker: true
        }
        const compressedFile = await imageCompression(newAvatarFile, options)
        
        // ファイル名: user_id/timestamp.ext (フォルダ分けして管理)
        const fileExt = newAvatarFile.name.split('.').pop()
        const fileName = `${profile.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, compressedFile, { upsert: true })

        if (uploadError) throw uploadError

        // 公開URLを取得
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)
        
        avatarUrl = urlData.publicUrl
      }

      // DB更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username,
          bio: bio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      alert('プロフィールを更新しました！')
      router.push('/mypage') // マイページへ戻る

    } catch (error: any) {
      console.error(error)
      alert('更新に失敗しました: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-10">
      
      {/* ヘッダー */}
      <header className="bg-white sticky top-0 z-10 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
        <Link href="/mypage" className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
          ←
        </Link>
        <h1 className="font-bold text-lg">プロフィール編集</h1>
      </header>

      <main className="max-w-md mx-auto p-6">
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* アイコン画像設定 */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-28 h-28">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : currentAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400 font-bold bg-gray-100">
                    {profile?.email?.[0].toUpperCase()}
                  </div>
                )}
              </div>
              
              <label 
                htmlFor="avatar-upload" 
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-md cursor-pointer hover:bg-blue-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageSelect}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500">タップしてアイコンを変更</p>
          </div>

          {/* 入力フォーム */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                表示名 (ニックネーム)
              </label>
              <input
                type="text"
                placeholder="例: しずおか 太郎"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                自己紹介 (Bio)
              </label>
              <textarea
                rows={4}
                placeholder="好きなこと、目標、スキルなどを書いてみましょう！"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

          </div>

          {/* 保存ボタン */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '変更を保存する'}
          </button>

        </form>
      </main>
    </div>
  )
}