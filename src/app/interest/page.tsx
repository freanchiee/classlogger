import type { Metadata } from 'next'
import InterestForm from '@/components/InterestForm'

const SITE = process.env.NEXT_PUBLIC_BASE_URL || 'https://classlogger.com'

export const metadata: Metadata = {
  title: 'Get Started — Free Class Tracking for Online Tutors',
  description: 'Tell us about your tutoring and start logging classes automatically. ClassLogger tracks Google Meet sessions, credits, and shares transparent class logs with parents.',
  alternates: { canonical: `${SITE}/interest` },
  openGraph: {
    title: 'Get Started with ClassLogger',
    description: 'Automatic class tracking, credit management, and parent-ready class logs for online tutors.',
    url: `${SITE}/interest`,
    siteName: 'ClassLogger',
    type: 'website',
  },
}

export default function InterestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/40 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎓</div>
          <h1 className="text-2xl font-bold text-gray-900">Start with ClassLogger</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Automatic Google Meet class tracking, credit management, and transparent logs for parents. Leave your details and we&apos;ll get you set up.
          </p>
        </div>
        <InterestForm source="interest" />
      </div>
    </div>
  )
}
