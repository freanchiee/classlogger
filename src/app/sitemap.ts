import type { MetadataRoute } from 'next'

const SITE = process.env.NEXT_PUBLIC_BASE_URL || 'https://classlogger.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/interest`, changeFrequency: 'monthly', priority: 0.8 },
  ]
}
