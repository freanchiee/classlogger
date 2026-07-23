import type { Metadata } from 'next'
import TutorApplicationForm from '@/components/TutorApplicationForm'

const SITE = process.env.NEXT_PUBLIC_BASE_URL || 'https://classlogger.com'

export const metadata: Metadata = {
  title: 'Become an Online IBDP & MYP Tutor',
  description:
    'Apply to teach IBDP and MYP students online with ClassLogger. Every application is personally reviewed. Get automatic class tracking, credit management, and transparent parent reports once approved.',
  keywords: ['become an IB tutor', 'IBDP tutor jobs', 'MYP tutor jobs', 'online IB tutoring', 'teach IBDP online', 'teach MYP online'],
  alternates: { canonical: `${SITE}/become-a-tutor` },
  openGraph: {
    title: 'Become an Online IBDP & MYP Tutor — ClassLogger',
    description: 'Apply to teach IBDP and MYP students online. Personally vetted, no open marketplace noise.',
    url: `${SITE}/become-a-tutor`,
    siteName: 'ClassLogger',
    type: 'website',
  },
}

export default function BecomeATutorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/40 flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🍎</div>
          <h1 className="text-2xl font-bold text-gray-900">Become an IBDP / MYP Tutor</h1>
          <p className="text-gray-500 mt-1 text-sm">
            We personally review every application — no open, unvetted marketplace. Approved tutors get ClassLogger&apos;s
            automatic class tracking, credit management, and parent-ready class logs.
          </p>
        </div>
        <TutorApplicationForm />
      </div>
    </div>
  )
}
