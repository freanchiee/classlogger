'use client'

// Admin-only list of interest / feedback submissions. The API gates by email.

import { useEffect, useState } from 'react'

interface Submission {
  id: string
  name: string | null
  email: string
  phone: string | null
  subjects: string | null
  message: string | null
  source: string | null
  created_at: string
}

export default function InterestAdminPage() {
  const [rows, setRows] = useState<Submission[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading')

  useEffect(() => {
    fetch('/api/interest', { credentials: 'include' })
      .then(async r => {
        if (r.status === 403) { setState('forbidden'); return }
        const d = await r.json()
        if (d.success) { setRows(d.submissions || []); setState('ok') } else setState('error')
      })
      .catch(() => setState('error'))
  }, [])

  if (state === 'forbidden') return <Center>Not authorized.</Center>
  if (state === 'loading') return <Center>Loading…</Center>
  if (state === 'error') return <Center>Could not load submissions.</Center>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">📨 Interest Submissions</h1>
        <p className="text-sm text-muted-foreground">{rows.length} total</p>
      </div>
      <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3">Date</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Subjects</th>
              <th className="p-3">Message</th>
              <th className="p-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-400">No submissions yet.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-b last:border-0 align-top">
                <td className="p-3 whitespace-nowrap text-gray-500">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3">{r.name || '—'}</td>
                <td className="p-3"><a className="text-indigo-600 hover:underline" href={`mailto:${r.email}`}>{r.email}</a></td>
                <td className="p-3">{r.phone || '—'}</td>
                <td className="p-3">{r.subjects || '—'}</td>
                <td className="p-3 max-w-xs">{r.message || '—'}</td>
                <td className="p-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{r.source || 'interest'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">{children}</div>
}
