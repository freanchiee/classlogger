import type { MetadataRoute } from 'next'

const SITE = process.env.NEXT_PUBLIC_BASE_URL || 'https://classlogger.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api', '/dashboard'] }],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
