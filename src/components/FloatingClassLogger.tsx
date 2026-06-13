'use client'

// Web-native floating class logger — no extension required.
// Uses the Document Picture-in-Picture API (the same tech Google Meet's mini
// window uses) so the widget floats on top across tab switches. Falls back to an
// in-page draggable panel on browsers without Document PiP (Firefox/Safari).
//
// The teacher picks an enrolled student from a dropdown and taps Start / End.
// Start  -> POST /api/classes   (creates class_logs in_progress)
// End    -> PUT  /api/classes   (completes; DB trigger deducts credits)

import { useCallback, useEffect, useRef, useState } from 'react'

interface StudentOption {
  id: string // enrollment id
  student_name: string
  subject: string
  google_meet_url: string | null
  status?: string
}

interface FloatingClassLoggerProps {
  teacherId: string
}

const WIDGET_HTML = (students: StudentOption[]) => `
  <div id="fcl-root" style="font-family:system-ui,-apple-system,sans-serif;color:#fff;height:100%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;flex-direction:column;padding:14px;gap:10px;box-sizing:border-box;">
    <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px;">🎓 ClassLogger</div>
    <div id="fcl-timer" style="font-variant-numeric:tabular-nums;font-size:26px;font-weight:700;letter-spacing:1px;text-align:center;background:rgba(255,255,255,0.18);border-radius:12px;padding:6px;">00:00</div>
    <select id="fcl-select" style="width:100%;padding:9px 10px;border:none;border-radius:10px;font-size:13px;color:#1e293b;outline:none;">
      <option value="">Select a student…</option>
      ${students.map(s => `<option value="${s.id}">${escapeHtml(s.student_name)}${s.subject ? ' — ' + escapeHtml(s.subject) : ''}</option>`).join('')}
    </select>
    <div style="display:flex;gap:8px;">
      <button id="fcl-start" style="flex:1;padding:12px;border:none;border-radius:12px;background:#10b981;color:#fff;font-size:14px;font-weight:700;cursor:pointer;">🟢 Start</button>
      <button id="fcl-end" disabled style="flex:1;padding:12px;border:none;border-radius:12px;background:#ef4444;color:#fff;font-size:14px;font-weight:700;cursor:pointer;opacity:0.5;">🔴 End</button>
    </div>
    <div id="fcl-status" style="font-size:12px;text-align:center;opacity:0.95;min-height:16px;">Pick a student to begin</div>
  </div>
`

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ))
}

export default function FloatingClassLogger({ teacherId }: FloatingClassLoggerProps) {
  const [supported, setSupported] = useState(true)

  // Mutable refs so the imperatively-attached DOM handlers always see fresh values
  const studentsRef = useRef<StudentOption[]>([])
  const classLogIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pipRef = useRef<Window | null>(null)
  const inPageHostRef = useRef<HTMLDivElement | null>(null)
  const docRef = useRef<Document | null>(null)

  // ----- helpers that operate on whichever document hosts the widget -----
  const $ = useCallback((id: string): HTMLElement | null => {
    return docRef.current?.getElementById(id) ?? null
  }, [])

  const setStatus = useCallback((msg: string) => {
    const el = $('fcl-status'); if (el) el.textContent = msg
  }, [$])

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const tick = useCallback(() => {
    const el = $('fcl-timer')
    if (!el || startTimeRef.current == null) return
    const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    el.textContent = `${m}:${s}`
  }, [$])

  const setRunningUI = useCallback((running: boolean) => {
    const start = $('fcl-start') as HTMLButtonElement | null
    const end = $('fcl-end') as HTMLButtonElement | null
    const sel = $('fcl-select') as HTMLSelectElement | null
    if (start) { start.disabled = running; start.style.opacity = running ? '0.5' : '1'; start.textContent = running ? '✅ Started' : '🟢 Start' }
    if (end) { end.disabled = !running; end.style.opacity = running ? '1' : '0.5' }
    if (sel) sel.disabled = running
  }, [$])

  // ----- actions -----
  const handleStart = useCallback(async () => {
    const sel = $('fcl-select') as HTMLSelectElement | null
    const enrollmentId = sel?.value
    if (!enrollmentId) { setStatus('Please select a student first'); return }

    const start = $('fcl-start') as HTMLButtonElement | null
    if (start) { start.disabled = true; start.textContent = '⏳ Starting…' }
    setStatus('Starting class…')

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teacher_id: teacherId,
          enrollment_id: enrollmentId,
          manual_override: true,
          start_time: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        classLogIdRef.current = data.class_log_id
        startTimeRef.current = Date.now()
        setRunningUI(true)
        stopTimer(); tick(); timerRef.current = setInterval(tick, 1000)
        setStatus('Class in progress')
      } else if (res.status === 409 && data.class_log_id) {
        // Already running — resume it
        classLogIdRef.current = data.class_log_id
        startTimeRef.current = Date.now()
        setRunningUI(true)
        stopTimer(); tick(); timerRef.current = setInterval(tick, 1000)
        setStatus('Resumed in-progress class')
      } else {
        if (start) { start.disabled = false; start.textContent = '🟢 Start' }
        setStatus(data.error || 'Failed to start')
      }
    } catch (e) {
      if (start) { start.disabled = false; start.textContent = '🟢 Start' }
      setStatus('Network error starting class')
    }
  }, [$, teacherId, setStatus, setRunningUI, stopTimer, tick])

  const handleEnd = useCallback(async () => {
    const classLogId = classLogIdRef.current
    if (!classLogId) { setStatus('No active class'); return }
    const end = $('fcl-end') as HTMLButtonElement | null
    if (end) { end.disabled = true; end.textContent = '⏳ Ending…' }
    setStatus('Ending class…')

    try {
      const res = await fetch('/api/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          class_log_id: classLogId,
          teacher_id: teacherId,
          end_time: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      stopTimer()
      if (res.ok && data.success) {
        if (end) end.textContent = '✅ Ended'
        const dur = data.duration || (data.class_log?.duration_minutes != null ? `${data.class_log.duration_minutes}m` : '')
        setStatus(`Class ended${dur ? ` · ${dur}` : ''}`)
      } else {
        setStatus(data.error || 'Failed to end')
      }
      // Reset to idle after a brief moment
      setTimeout(() => {
        classLogIdRef.current = null
        startTimeRef.current = null
        const t = $('fcl-timer'); if (t) t.textContent = '00:00'
        if (end) end.textContent = '🔴 End'
        setRunningUI(false)
        if (res.ok && data.success) setStatus('Pick a student to begin')
      }, 1200)
    } catch (e) {
      if (end) { end.disabled = false; end.textContent = '🔴 End' }
      setStatus('Network error ending class')
    }
  }, [$, teacherId, setStatus, setRunningUI, stopTimer])

  // Attach native listeners to the widget DOM (works in PiP or in-page document)
  const wireWidget = useCallback((doc: Document) => {
    docRef.current = doc
    const start = doc.getElementById('fcl-start')
    const end = doc.getElementById('fcl-end')
    if (start) start.addEventListener('click', handleStart)
    if (end) end.addEventListener('click', handleEnd)
    // Restore running state if a class is already in progress (e.g. reopened)
    if (classLogIdRef.current && startTimeRef.current) {
      setRunningUI(true)
      stopTimer(); tick(); timerRef.current = setInterval(tick, 1000)
      setStatus('Class in progress')
    }
  }, [handleStart, handleEnd, setRunningUI, stopTimer, tick, setStatus])

  const loadStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/teacher/students', { credentials: 'include' })
      const data = await res.json()
      const list: StudentOption[] = (data.students || [])
        .filter((s: StudentOption) => !s.status || s.status === 'active')
      studentsRef.current = list
      // (Re)populate select if widget already open
      const sel = $('fcl-select') as HTMLSelectElement | null
      if (sel) {
        sel.innerHTML = `<option value="">Select a student…</option>` +
          list.map(s => `<option value="${s.id}">${escapeHtml(s.student_name)}${s.subject ? ' — ' + escapeHtml(s.subject) : ''}</option>`).join('')
      }
    } catch {
      setStatus('Could not load students')
    }
  }, [$, setStatus])

  // ----- open / close -----
  const openInPage = useCallback(() => {
    if (inPageHostRef.current) return
    const host = document.createElement('div')
    host.id = 'fcl-inpage'
    host.style.cssText = 'position:fixed;bottom:20px;right:20px;width:240px;height:230px;z-index:2147483600;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.35);'
    host.innerHTML = WIDGET_HTML(studentsRef.current)
    document.body.appendChild(host)
    inPageHostRef.current = host
    wireWidget(document)
  }, [wireWidget])

  const openPiP = useCallback(async () => {
    const dpip = (window as unknown as { documentPictureInPicture?: { requestWindow: (o: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture
    if (!dpip) { setSupported(false); openInPage(); return }
    if (pipRef.current && !pipRef.current.closed) { pipRef.current.focus(); return }
    try {
      const pip = await dpip.requestWindow({ width: 250, height: 250 })
      pipRef.current = pip
      pip.document.body.style.margin = '0'
      pip.document.body.innerHTML = WIDGET_HTML(studentsRef.current)
      wireWidget(pip.document)
      pip.addEventListener('pagehide', () => {
        stopTimer()
        pipRef.current = null
        docRef.current = null
      })
    } catch {
      openInPage()
    }
  }, [openInPage, wireWidget, stopTimer])

  const launch = useCallback(async () => {
    await loadStudents()
    await openPiP()
  }, [loadStudents, openPiP])

  // Detect support on mount (for button label only)
  useEffect(() => {
    setSupported('documentPictureInPicture' in window)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer()
      if (pipRef.current && !pipRef.current.closed) pipRef.current.close()
      if (inPageHostRef.current) inPageHostRef.current.remove()
    }
  }, [stopTimer])

  return (
    <button
      onClick={launch}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow hover:from-indigo-700 hover:to-purple-700 transition-colors"
      title={supported ? 'Open the floating class logger' : 'Open the class logger panel'}
    >
      🎓 Log a class
      <span className="text-xs opacity-80">{supported ? '(floating)' : '(panel)'}</span>
    </button>
  )
}
