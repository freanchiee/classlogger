'use client'

// Teacher "Class Log" subpage: per-student monthly account, each shareable to
// parents via a public link. Reuses the existing students API.

import { useEffect, useState } from 'react'

interface Student {
  id: string // enrollment id
  student_name: string
  subject: string
  status?: string
}

export default function ClassLogsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/teacher/students', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setStudents((d.students || []).filter((s: Student) => !s.status || s.status === 'active')))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false))
  }, [])

  const linkFor = (id: string) => `${window.location.origin}/student-log/${id}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">📅 Class Log</h1>
        <p className="text-sm text-muted-foreground">Monthly class account per student — share the link with parents.</p>
      </div>

      <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-sm divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No enrolled students yet.</div>
        ) : (
          students.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4 gap-3">
              <div>
                <div className="font-semibold text-gray-900">{s.student_name}</div>
                <div className="text-xs text-gray-500">{s.subject || 'Classes'}</div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/student-log/${s.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
                >
                  View log
                </a>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(linkFor(s.id))
                    setCopied(s.id)
                    setTimeout(() => setCopied(c => (c === s.id ? null : c)), 1500)
                  }}
                  className="text-sm font-semibold px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  {copied === s.id ? '✓ Copied' : '🔗 Copy parent link'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
