// Public, token-gated class summary for parents.
// No login required — the unguessable share_token is the access control.

import { createClient } from '@supabase/supabase-js'
import PrintButton from './PrintButton'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ScreenshotEntry { url?: string; timestamp?: string; type?: string }
interface ResourceEntry { url?: string; name?: string; kind?: string }
interface LinkEntry { url?: string; title?: string }

interface Attachments {
  screenshots?: ScreenshotEntry[]
  resources?: ResourceEntry[]
  links?: LinkEntry[]
}

function fmtDuration(mins: number | null): string {
  if (!mins || mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium', timeStyle: 'short',
    })
  } catch { return iso }
}

export default async function ClassSummaryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: cls } = await supabase
    .from('class_logs')
    .select('id, content, topics_covered, homework_assigned, duration_minutes, start_time, end_time, status, attachments, teacher_id, enrollment_id, student_name, date')
    .eq('share_token', token)
    .single()

  if (!cls) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Summary not found</h1>
          <p className="text-gray-500 mt-2">This class summary link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  // Enrich: teacher name + subject (subject lives on the enrollment)
  let teacherName = 'Your teacher'
  let subject = ''
  if (cls.teacher_id) {
    const { data: t } = await supabase.from('profiles').select('full_name').eq('id', cls.teacher_id).single()
    if (t?.full_name) teacherName = t.full_name
  }
  if (cls.enrollment_id) {
    const { data: e } = await supabase.from('enrollments').select('subject').eq('id', cls.enrollment_id).single()
    if (e?.subject) subject = e.subject
  }

  const att = (cls.attachments || {}) as Attachments
  const screenshots = (att.screenshots || []).filter(s => s.url)
  const resources = (att.resources || []).filter(r => r.url)
  const links = (att.links || []).filter(l => l.url)
  const topics = (cls.topics_covered || []) as string[]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 print:bg-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80">🎓 ClassLogger</div>
              <h1 className="text-2xl font-bold mt-1">Class Summary</h1>
            </div>
            <PrintButton />
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Detail label="Student" value={cls.student_name || '—'} />
            <Detail label="Subject" value={subject || '—'} />
            <Detail label="Teacher" value={teacherName} />
            <Detail label="Duration" value={fmtDuration(cls.duration_minutes)} />
            <Detail label="Date" value={fmtDate(cls.start_time || cls.date)} />
            <Detail label="Status" value={cls.status === 'completed' ? 'Completed' : (cls.status || '—')} />
          </div>

          {topics.length > 0 && (
            <Section title="📚 Topics covered">
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {topics.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </Section>
          )}

          {cls.homework_assigned && (
            <Section title="📝 Homework">
              <p className="text-gray-700 whitespace-pre-wrap">{cls.homework_assigned}</p>
            </Section>
          )}

          {cls.content && (
            <Section title="🗒️ Notes">
              <p className="text-gray-700 whitespace-pre-wrap">{cls.content}</p>
            </Section>
          )}

          {screenshots.length > 0 && (
            <Section title={`📸 Screenshots (${screenshots.length})`}>
              <div className="grid grid-cols-2 gap-3">
                {screenshots.map((s, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={i} href={s.url} target="_blank" rel="noreferrer">
                    <img src={s.url} alt={`Screenshot ${i + 1}`} className="w-full rounded-lg border border-gray-200" />
                  </a>
                ))}
              </div>
            </Section>
          )}

          {resources.length > 0 && (
            <Section title={`📎 Resources (${resources.length})`}>
              <ul className="space-y-2">
                {resources.map((r, i) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline break-all">
                      {r.name || r.url}
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {links.length > 0 && (
            <Section title={`🔗 Links (${links.length})`}>
              <ul className="space-y-2">
                {links.map((l, i) => (
                  <li key={i}>
                    <a href={l.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline break-all">
                      {l.title || l.url}
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 text-center text-xs text-gray-400">
          Shared securely via ClassLogger
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 print:border print:border-gray-200">
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className="text-sm text-gray-900 font-semibold mt-0.5">{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-gray-800 mb-2">{title}</h2>
      {children}
    </div>
  )
}
