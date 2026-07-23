import type { Metadata } from 'next'
import TuitionRequirementForm from '@/components/TuitionRequirementForm'

const SITE = process.env.NEXT_PUBLIC_BASE_URL || 'https://classlogger.com'

export const metadata: Metadata = {
  title: 'Find an IBDP or MYP Tutor',
  description:
    'Tell us what IBDP or MYP tutoring your child needs — subject, grade level, and schedule. We\'ll match you with a qualified tutor tracked transparently through ClassLogger.',
  keywords: ['find IBDP tutor', 'find MYP tutor', 'IB tutor online', 'IBDP tutoring', 'MYP tutoring', 'online IB tuition'],
  alternates: { canonical: `${SITE}/find-a-tutor` },
  openGraph: {
    title: 'Find an IBDP or MYP Tutor — ClassLogger',
    description: 'Tell us what tutoring you need and we\'ll match you with a qualified IBDP/MYP tutor.',
    url: `${SITE}/find-a-tutor`,
    siteName: 'ClassLogger',
    type: 'website',
  },
}

export default function FindATutorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/40 flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="text-2xl font-bold text-gray-900">Find an IBDP / MYP Tutor</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Tell us what your child needs and we&apos;ll match you with a qualified tutor. Every class is tracked
            transparently — you&apos;ll always know what was covered.
          </p>
        </div>
        <TuitionRequirementForm />
      </div>
    </div>
  )
}
