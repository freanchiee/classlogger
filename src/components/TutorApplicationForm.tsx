'use client'

import { useState } from 'react'

export default function TutorApplicationForm() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', programs: '', subjects: '',
    experience_years: '', qualifications: '', bio: '', rate: '', link: '',
  })
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.name || !form.email) return
    setState('sending')
    const res = await fetch('/api/tutor-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).catch(() => null)
    setState(res && res.ok ? 'done' : 'error')
  }

  if (state === 'done') {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-3">🎉</div>
        <h3 className="text-xl font-bold text-gray-900">Application received!</h3>
        <p className="text-gray-500 mt-1">We personally review every application and will reach out if it&apos;s a fit.</p>
      </div>
    )
  }

  const input = 'w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 outline-none'
  return (
    <div className="space-y-3">
      <input className={input} placeholder="Full name *" value={form.name} onChange={set('name')} />
      <input className={input} type="email" placeholder="Email *" value={form.email} onChange={set('email')} />
      <input className={input} placeholder="Phone / WhatsApp" value={form.phone} onChange={set('phone')} />
      <input className={input} placeholder="Programs (e.g. IBDP, MYP)" value={form.programs} onChange={set('programs')} />
      <input className={input} placeholder="Subjects you teach" value={form.subjects} onChange={set('subjects')} />
      <input className={input} type="number" placeholder="Years of teaching experience" value={form.experience_years} onChange={set('experience_years')} />
      <input className={input} placeholder="Qualifications (degrees, certifications)" value={form.qualifications} onChange={set('qualifications')} />
      <textarea className={input} rows={3} placeholder="Short bio — your teaching style, experience with IBDP/MYP students" value={form.bio} onChange={set('bio')} />
      <input className={input} placeholder="Expected rate (per hour)" value={form.rate} onChange={set('rate')} />
      <input className={input} placeholder="LinkedIn / portfolio / certificate link" value={form.link} onChange={set('link')} />
      {state === 'error' && <p className="text-sm text-red-600">Something went wrong. Please try again.</p>}
      <button
        onClick={submit}
        disabled={!form.name || !form.email || state === 'sending'}
        className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold disabled:opacity-50"
      >
        {state === 'sending' ? 'Submitting…' : 'Submit application'}
      </button>
    </div>
  )
}
