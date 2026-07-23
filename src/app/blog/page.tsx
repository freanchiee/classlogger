import type { Metadata } from 'next'
import Link from 'next/link'
import { blogPosts } from '@/lib/blog-posts'

const SITE = process.env.NEXT_PUBLIC_BASE_URL || 'https://classlogger.com'

export const metadata: Metadata = {
  title: 'Blog — IBDP & MYP Tutoring Guides',
  description: 'Guides on finding and tracking IBDP and MYP online tuition, for parents and tutors.',
  alternates: { canonical: `${SITE}/blog` },
  openGraph: {
    title: 'ClassLogger Blog — IBDP & MYP Tutoring Guides',
    description: 'Guides on finding and tracking IBDP and MYP online tuition.',
    url: `${SITE}/blog`,
    siteName: 'ClassLogger',
    type: 'website',
  },
}

export default function BlogIndexPage() {
  const posts = [...blogPosts].sort((a, b) => (a.date < b.date ? 1 : -1))
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/40 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
          <p className="text-gray-500 mt-1">Guides on IBDP & MYP tutoring — for parents and tutors.</p>
        </div>
        <div className="space-y-4">
          {posts.map(p => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="block bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="text-xs text-gray-400">{new Date(p.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {p.readTime}</div>
              <h2 className="text-xl font-bold text-gray-900 mt-1">{p.title}</h2>
              <p className="text-gray-500 mt-2 text-sm">{p.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
