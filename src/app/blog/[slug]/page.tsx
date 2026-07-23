import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { blogPosts, getPostBySlug } from '@/lib/blog-posts'

const SITE = process.env.NEXT_PUBLIC_BASE_URL || 'https://classlogger.com'

export function generateStaticParams() {
  return blogPosts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `${SITE}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${SITE}/blog/${post.slug}`,
      siteName: 'ClassLogger',
      type: 'article',
      publishedTime: post.date,
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'ClassLogger' },
    publisher: { '@type': 'Organization', name: 'ClassLogger' },
    mainEntityOfPage: `${SITE}/blog/${post.slug}`,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/40 py-12 px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-2xl mx-auto bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl shadow-sm p-8">
        <Link href="/blog" className="text-sm text-indigo-600 hover:underline">← Back to Blog</Link>
        <div className="text-xs text-gray-400 mt-4">
          {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {post.readTime}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">{post.title}</h1>
        <div className="prose prose-gray max-w-none mt-6 space-y-4">
          {post.content.map((block, i) => {
            if (block.type === 'h2') return <h2 key={i} className="text-xl font-bold text-gray-900 mt-6">{block.text}</h2>
            if (block.type === 'ul') return (
              <ul key={i} className="list-disc list-inside space-y-1 text-gray-700">
                {block.items.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            )
            return <p key={i} className="text-gray-700 leading-relaxed">{block.text}</p>
          })}
        </div>
        <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
          <Link href="/find-a-tutor" className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold">Find a Tutor</Link>
          <Link href="/become-a-tutor" className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold">Become a Tutor</Link>
        </div>
      </article>
    </div>
  )
}
