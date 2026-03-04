import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://event-app.shizuoka-connect.com'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 検索エンジンに読み込ませたくない非公開パスを指定します
      disallow: ['/mypage/', '/admin/', '/checkin/', '/auth/'],
    },
    // ここで先ほどのサイトマップの場所をGoogleに教えます
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}