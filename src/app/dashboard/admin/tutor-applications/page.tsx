'use client'

// Admin-only list of tutor applications. Personally vetted — approve/reject here.

import { useEffect, useState } from 'react'

interface Application {
  id: string
  name: string
  email: string
  phone: string | null
  programs: string | null
  subjects: string | null
  experience_years: number | null
  qualifications: string | null
  bio: string | null
  rate: string | null
  link: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function TutorApplicationsAdminPage() {
  const [rows, setRows] = useState<Application[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = () => {
    fetch('/api/tutor-applications', { credentials: 'include' })
      .then(async r => {
        if (r.status === 403) { setState('forbidden'); return }
        const d = await r.json()
        if (d.success) { setRows(d.applications || []); setState('ok') } else setState('error')
      })
      .catch(() => setState('error'))
  }

  useEffect(load, [])

  const setStatus = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    setUpdating(id)
    await fetch('/api/tutor-applications', {
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
  if (state === 'error') return <Center>Could not load applications.</Center>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🍎 Tutor Applications</h1>
        <p className="text-sm text-muted-foreground">{rows.length} total — {rows.filter(r => r.status === 'pending').length} pending review</p>
      </div>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-gray-400 bg-white/70 rounded-2xl border border-white/60">No applications yet.</div>
        ) : rows.map(r => (
          <div key={r.id} className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-900">{r.name}</div>
                <a className="text-indigo-600 text-sm hover:underline" href={`mailto:${r.email}`}>{r.email}</a>
                {r.phone && <span className="text-sm text-gray-500 ml-2">· {r.phone}</span>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
              {r.programs && <div><span className="text-gray-400">Programs:</span> {r.programs}</div>}
              {r.subjects && <div><span className="text-gray-400">Subjects:</span> {r.subjects}</div>}
              {r.experience_years != null && <div><span className="text-gray-400">Experience:</span> {r.experience_years} yrs</div>}
              {r.rate && <div><span className="text-gray-400">Rate:</span> {r.rate}</div>}
              {r.qualifications && <div className="col-span-2"><span className="text-gray-400">Qualifications:</span> {r.qualifications}</div>}
              {r.bio && <div className="col-span-2"><span className="text-gray-400">Bio:</span> {r.bio}</div>}
              {r.link && <div className="col-span-2"><a className="text-indigo-600 hover:underline" href={r.link} target="_blank" rel="noreferrer">{r.link}</a></div>}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setStatus(r.id, 'approved')}
                disabled={updating === r.id || r.status === 'approved'}
                className="px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white disabled:opacity-40"
              >
                Approve
              </button>
              <button
                onClick={() => setStatus(r.id, 'rejected')}
                disabled={updating === r.id || r.status === 'rejected'}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white disabled:opacity-40"
              >
                Reject
              </button>
              {r.status !== 'pending' && (
                <button
                  onClick={() => setStatus(r.id, 'pending')}
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
