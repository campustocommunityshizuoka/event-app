import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  // ※実際の公開URLに合わせて変更してください
  const baseUrl = 'https://event-app.shizuoka-connect.com/'

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0, // トップページは最優先
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}