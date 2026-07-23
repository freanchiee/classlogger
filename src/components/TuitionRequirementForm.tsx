'use client'

import { useState } from 'react'

export default function TuitionRequirementForm() {
  const [form, setForm] = useState({
    parent_name: '', email: '', phone: '', student_name: '',
    program: '', subjects: '', grade_level: '', preferred_schedule: '', message: '',
  })
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.email) return
    setState('sending')
    const res = await fetch('/api/tuition-requirements', {
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
        <h3 className="text-xl font-bold text-gray-900">Request submitted!</h3>
        <p className="text-gray-500 mt-1">We&apos;ll reach out to match you with a suitable tutor.</p>
      </div>
    )
  }

  const input = 'w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 outline-none'
  return (
    <div className="space-y-3">
      <input className={input} placeholder="Your name" value={form.parent_name} onChange={set('parent_name')} />
      <input className={input} type="email" placeholder="Email *" value={form.email} onChange={set('email')} />
      <input className={input} placeholder="Phone / WhatsApp" value={form.phone} onChange={set('phone')} />
      <input className={input} placeholder="Student's name" value={form.student_name} onChange={set('student_name')} />
      <select className={input} value={form.program} onChange={set('program') as unknown as React.ChangeEventHandler<HTMLSelectElement>}>
        <option value="">Select program</option>
        <option value="IBDP">IBDP</option>
        <option value="MYP">MYP</option>
        <option value="Other">Other</option>
      </select>
      <input className={input} placeholder="Subject(s) needed (e.g. Physics HL, Maths AA)" value={form.subjects} onChange={set('subjects')} />
      <input className={input} placeholder="Grade / year level (e.g. MYP 4, DP1)" value={form.grade_level} onChange={set('grade_level')} />
      <input className={input} placeholder="Preferred schedule" value={form.preferred_schedule} onChange={set('preferred_schedule')} />
      <textarea className={input} rows={3} placeholder="Anything else we should know?" value={form.message} onChange={set('message')} />
      {state === 'error' && <p className="text-sm text-red-600">Something went wrong. Please try again.</p>}
      <button
        onClick={submit}
        disabled={!form.email || state === 'sending'}
        className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold disabled:opacity-50"
      >
        {state === 'sending' ? 'Submitting…' : 'Find a tutor'}
      </button>
    </div>
  )
}
