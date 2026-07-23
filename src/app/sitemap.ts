import type { MetadataRoute } from 'next'
import { blogPosts } from '@/lib/blog-posts'

const SITE = process.env.NEXT_PUBLIC_BASE_URL || 'https://classlogger.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/interest`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/become-a-tutor`, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${SITE}/find-a-tutor`, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${SITE}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    ...blogPosts.map(p => ({
      url: `${SITE}/blog/${p.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
