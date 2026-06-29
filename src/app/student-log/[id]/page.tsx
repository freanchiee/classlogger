// Public, student-wise monthly class log for parents.
// Key = enrollment id (UUID is the share secret). ponytail: add a real token if
// you ever need to revoke a shared link.

import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function fmtDuration(mins: number | null): string {
  if (!mins || mins <= 0) return '—'
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// month is "YYYY-MM"; returns [start, endExclusive] as date strings
function monthRange(month: string): [string, string, Date] {
  const [y, m] = month.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m, 1))
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10), start]
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export default async function StudentLogPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const month = /^\d{4}-\d{2}$/.test(sp.month || '') ? sp.month! : new Date().toISOString().slice(0, 7)
  const [start, end, startDate] = monthRange(month)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, subject, student_id, teacher_id')
    .eq('id', id)
    .maybeSingle()

  if (!enrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Log not found</h1>
          <p className="text-gray-500 mt-2">This link is invalid.</p>
        </div>
      </div>
    )
  }

  const [{ data: student }, { data: teacher }, { data: rows }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', enrollment.student_id).maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', enrollment.teacher_id).maybeSingle(),
    supabase.from('class_logs')
      .select('id, date, start_time, duration_minutes, status, share_token, payment_status, credits_deducted')
      .eq('enrollment_id', id)
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: true }),
  ])

  const classes = (rows || [])
  const completed = classes.filter(c => c.status === 'completed')
  const totalMins = completed.reduce((a, c) => a + (c.duration_minutes || 0), 0)
  const totalCredits = completed.reduce((a, c) => a + (Number(c.credits_deducted) || 0), 0)
  const monthLabel = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="text-sm opacity-80">🎓 ClassLogger</div>
          <h1 className="text-2xl font-bold mt-1">{student?.full_name || 'Student'} — Class Log</h1>
          <p className="opacity-90 text-sm mt-1">
            {enrollment.subject || 'Classes'} · with {teacher?.full_name || 'your teacher'}
          </p>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <a href={`?month=${shiftMonth(month, -1)}`} className="text-indigo-600 text-sm font-semibold hover:underline">← Prev</a>
          <span className="font-bold text-gray-800">{monthLabel}</span>
          <a href={`?month=${shiftMonth(month, 1)}`} className="text-indigo-600 text-sm font-semibold hover:underline">Next →</a>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-3 p-6">
          <Stat label="Classes" value={String(completed.length)} />
          <Stat label="Hours" value={fmtDuration(totalMins)} />
          <Stat label="Credit hours" value={totalCredits ? totalCredits.toFixed(2) : '0'} />
        </div>

        {/* Table */}
        <div className="px-6 pb-6">
          {classes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No classes recorded this month.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {classes.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-gray-900">
                      {new Date(c.start_time || c.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {fmtDuration(c.duration_minutes)} · {c.status === 'completed' ? 'Completed' : c.status}
                      {c.payment_status ? ` · ${c.payment_status}` : ''}
                    </div>
                  </div>
                  {c.share_token && (
                    <a href={`/class-summary/${c.share_token}`} className="text-indigo-600 text-sm font-semibold hover:underline">
                      View →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 text-center text-xs text-gray-400">
          Shared securely via ClassLogger
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
