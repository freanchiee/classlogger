'use client'

// Admin-only list of tuition requirement submissions (open/unvetted intake).

import { useEffect, useState } from 'react'

interface Requirement {
  id: string
  parent_name: string | null
  email: string
  phone: string | null
  student_name: string | null
  program: string | null
  subjects: string | null
  grade_level: string | null
  preferred_schedule: string | null
  message: string | null
  status: 'new' | 'contacted' | 'closed'
  created_at: string
}

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  closed: 'bg-gray-100 text-gray-600',
}

export default function TuitionRequirementsAdminPage() {
  const [rows, setRows] = useState<Requirement[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = () => {
    fetch('/api/tuition-requirements', { credentials: 'include' })
      .then(async r => {
        if (r.status === 403) { setState('forbidden'); return }
        const d = await r.json()
        if (d.success) { setRows(d.requirements || []); setState('ok') } else setState('error')
      })
      .catch(() => setState('error'))
  }

  useEffect(load, [])

  const setStatus = async (id: string, status: Requirement['status']) => {
    setUpdating(id)
    await fetch('/api/tuition-requirements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, status }),
    }).catch(() => null)
    setUpdating(null)
    load()
  }

  if (state === 'forbidden') return <Center>Not authorized.</Center>
  if (state === 'loading') return <Center>Loading…</Center>
  if (state === 'error') return <Center>Could not load requirements.</Center>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🎯 Tuition Requirements</h1>
        <p className="text-sm text-muted-foreground">{rows.length} total — {rows.filter(r => r.status === 'new').length} new</p>
      </div>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-gray-400 bg-white/70 rounded-2xl border border-white/60">No requirements yet.</div>
        ) : rows.map(r => (
          <div key={r.id} className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-900">{r.parent_name || 'Unnamed'} {r.student_name ? `— for ${r.student_name}` : ''}</div>
                <a className="text-indigo-600 text-sm hover:underline" href={`mailto:${r.email}`}>{r.email}</a>
                {r.phone && <span className="text-sm text-gray-500 ml-2">· {r.phone}</span>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
              {r.program && <div><span className="text-gray-400">Program:</span> {r.program}</div>}
              {r.grade_level && <div><span className="text-gray-400">Grade:</span> {r.grade_level}</div>}
              {r.subjects && <div className="col-span-2"><span className="text-gray-400">Subjects:</span> {r.subjects}</div>}
              {r.preferred_schedule && <div className="col-span-2"><span className="text-gray-400">Schedule:</span> {r.preferred_schedule}</div>}
              {r.message && <div className="col-span-2"><span className="text-gray-400">Message:</span> {r.message}</div>}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setStatus(r.id, 'contacted')}
                disabled={updating === r.id || r.status === 'contacted'}
                className="px-3 py-1.5 text-sm rounded-lg bg-amber-600 text-white disabled:opacity-40"
              >
                Mark contacted
              </button>
              <button
                onClick={() => setStatus(r.id, 'closed')}
                disabled={updating === r.id || r.status === 'closed'}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-600 text-white disabled:opacity-40"
              >
                Close
              </button>
              {r.status !== 'new' && (
                <button
                  onClick={() => setStatus(r.id, 'new')}
                  disabled={updating === r.id}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">{children}</div>
}
