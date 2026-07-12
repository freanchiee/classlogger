'use client'

// Shared interest / feedback form. Used both on the public /interest page and
// as the post-use prompt after a teacher logs a class.

import { useState } from 'react'

export default function InterestForm({ source = 'interest', onDone }: { source?: string; onDone?: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subjects: '', message: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.email) return
    setState('sending')
    const res = await fetch('/api/interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, source }),
    }).catch(() => null)
    setState(res && res.ok ? 'done' : 'error')
    if (res && res.ok) setTimeout(() => onDone?.(), 1200)
  }

  if (state === 'done') {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-3">🎉</div>
        <h3 className="text-xl font-bold text-gray-900">Thank you!</h3>
        <p className="text-gray-500 mt-1">We&apos;ll be in touch soon.</p>
      </div>
    )
  }

  const input = 'w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 outline-none'
  return (
    <div className="space-y-3">
      <input className={input} placeholder="Your name" value={form.name} onChange={set('name')} />
      <input className={input} type="email" placeholder="Email *" value={form.email} onChange={set('email')} />
      <input className={input} placeholder="Phone / WhatsApp" value={form.phone} onChange={set('phone')} />
      <input className={input} placeholder="Subjects you teach" value={form.subjects} onChange={set('subjects')} />
      <textarea className={input} rows={3} placeholder="Anything you'd like us to know?" value={form.message} onChange={set('message')} />
      {state === 'error' && <p className="text-sm text-red-600">Something went wrong. Please try again.</p>}
      <button
        onClick={submit}
        disabled={!form.email || state === 'sending'}
        className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold disabled:opacity-50"
      >
        {state === 'sending' ? 'Sending…' : 'Submit'}
      </button>
    </div>
  )
}
