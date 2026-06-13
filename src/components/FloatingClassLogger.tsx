'use client'

// Web-native floating class logger — no extension required.
// Uses the Document Picture-in-Picture API (same tech as Google Meet's mini
// window) so the widget floats on top across tab switches. Falls back to an
// in-page panel on browsers without Document PiP.
//
// Capabilities (all without an extension):
//  - Pick an enrolled student, Start / End a class (POST/PUT /api/classes)
//  - Screenshot the screen (Screen Capture API: prompts once, then silent)
//  - Attach images / PDFs and drop links (POST /api/extension/save-resource)
//  - On end, one-tap "Share to WhatsApp" with a public summary link

import { useCallback, useEffect, useRef, useState } from 'react'

interface StudentOption {
  id: string
  student_name: string
  subject: string
  google_meet_url: string | null
  status?: string
}

interface FloatingClassLoggerProps {
  teacherId: string
}

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ))
}

const WIDGET_HTML = (students: StudentOption[]) => `
  <div style="font-family:system-ui,-apple-system,sans-serif;color:#fff;height:100%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;flex-direction:column;padding:14px;gap:9px;box-sizing:border-box;overflow-y:auto;">
    <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px;">🎓 ClassLogger</div>
    <div id="fcl-timer" style="font-variant-numeric:tabular-nums;font-size:24px;font-weight:700;letter-spacing:1px;text-align:center;background:rgba(255,255,255,0.18);border-radius:12px;padding:6px;">00:00</div>
    <select id="fcl-select" style="width:100%;padding:9px 10px;border:none;border-radius:10px;font-size:13px;color:#1e293b;outline:none;">
      <option value="">Select a student…</option>
      ${students.map(s => `<option value="${s.id}">${escapeHtml(s.student_name)}${s.subject ? ' — ' + escapeHtml(s.subject) : ''}</option>`).join('')}
    </select>
    <div style="display:flex;gap:8px;">
      <button id="fcl-start" style="flex:1;padding:11px;border:none;border-radius:12px;background:#10b981;color:#fff;font-size:14px;font-weight:700;cursor:pointer;">🟢 Start</button>
      <button id="fcl-end" disabled style="flex:1;padding:11px;border:none;border-radius:12px;background:#ef4444;color:#fff;font-size:14px;font-weight:700;cursor:pointer;opacity:0.5;">🔴 End</button>
    </div>

    <div id="fcl-tools" style="display:none;flex-direction:column;gap:7px;border-top:1px solid rgba(255,255,255,0.25);padding-top:9px;">
      <button id="fcl-shot" style="width:100%;padding:9px;border:none;border-radius:10px;background:rgba(255,255,255,0.22);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">📸 Screenshot</button>
      <button id="fcl-upload" style="width:100%;padding:9px;border:none;border-radius:10px;background:rgba(255,255,255,0.22);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">📎 Attach image / PDF</button>
      <input id="fcl-file" type="file" accept="image/*,application/pdf" multiple style="display:none;" />
      <div style="display:flex;gap:6px;">
        <input id="fcl-link" type="url" placeholder="🔗 Paste a link" style="flex:1;padding:8px;border:none;border-radius:8px;font-size:12px;color:#1e293b;outline:none;" />
        <button id="fcl-link-add" style="padding:8px 12px;border:none;border-radius:8px;background:rgba(255,255,255,0.22);color:#fff;font-size:12px;font-weight:700;cursor:pointer;">Add</button>
      </div>
    </div>

    <button id="fcl-share" style="display:none;width:100%;padding:10px;border:none;border-radius:12px;background:#25D366;color:#fff;font-size:14px;font-weight:700;cursor:pointer;">📲 Share to WhatsApp</button>
    <div id="fcl-status" style="font-size:12px;text-align:center;opacity:0.95;min-height:16px;">Pick a student to begin</div>
  </div>
`

export default function FloatingClassLogger({ teacherId }: FloatingClassLoggerProps) {
  const [supported, setSupported] = useState(true)

  const studentsRef = useRef<StudentOption[]>([])
  const classLogIdRef = useRef<string | null>(null)
  const shareTokenRef = useRef<string | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pipRef = useRef<Window | null>(null)
  const inPageHostRef = useRef<HTMLDivElement | null>(null)
  const docRef = useRef<Document | null>(null)
  const extTokenRef = useRef<string | null>(null)
  const displayStreamRef = useRef<MediaStream | null>(null)

  const $ = useCallback((id: string): HTMLElement | null => docRef.current?.getElementById(id) ?? null, [])
  const setStatus = useCallback((msg: string) => { const el = $('fcl-status'); if (el) el.textContent = msg }, [$])
  const stopTimer = useCallback(() => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }, [])

  const tick = useCallback(() => {
    const el = $('fcl-timer')
    if (!el || startTimeRef.current == null) return
    const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
    el.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
  }, [$])

  const setRunningUI = useCallback((running: boolean) => {
    const start = $('fcl-start') as HTMLButtonElement | null
    const end = $('fcl-end') as HTMLButtonElement | null
    const sel = $('fcl-select') as HTMLSelectElement | null
    const tools = $('fcl-tools')
    const share = $('fcl-share')
    if (start) { start.disabled = running; start.style.opacity = running ? '0.5' : '1'; start.textContent = running ? '✅ Started' : '🟢 Start' }
    if (end) { end.disabled = !running; end.style.opacity = running ? '1' : '0.5' }
    if (sel) sel.disabled = running
    if (tools) tools.style.display = running ? 'flex' : 'none'
    if (share) share.style.display = (shareTokenRef.current ? 'block' : 'none')
  }, [$])

  // --- auth helper: extension JWT from the logged-in website session ---
  const getExtToken = useCallback(async (): Promise<string | null> => {
    if (extTokenRef.current) return extTokenRef.current
    try {
      const res = await fetch('/api/extension/issue-temp-token', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (res.ok && data.success && data.token) { extTokenRef.current = data.token; return data.token }
    } catch { /* ignore */ }
    return null
  }, [])

  // --- screen capture: prompt once, then silent for the session ---
  const ensureStream = useCallback(async (): Promise<MediaStream | null> => {
    if (displayStreamRef.current && displayStreamRef.current.active) return displayStreamRef.current
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 1 } as MediaTrackConstraints, audio: false })
      displayStreamRef.current = stream
      stream.getVideoTracks()[0]?.addEventListener('ended', () => { displayStreamRef.current = null })
      return stream
    } catch {
      return null
    }
  }, [])

  const captureFrame = useCallback(async (stream: MediaStream): Promise<string | null> => {
    const video = document.createElement('video')
    video.srcObject = stream
    video.muted = true
    try {
      await video.play()
      if (video.readyState < 2) {
        await new Promise<void>(r => { video.onloadeddata = () => r() })
      }
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(video, 0, 0)
      return canvas.toDataURL('image/jpeg', 0.75)
    } catch {
      return null
    } finally {
      video.pause()
      video.srcObject = null
    }
  }, [])

  const handleScreenshot = useCallback(async () => {
    if (!classLogIdRef.current) { setStatus('Start a class first'); return }
    const btn = $('fcl-shot') as HTMLButtonElement | null
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Capturing…' }
    try {
      const stream = await ensureStream()
      if (!stream) { setStatus('Screen share was cancelled'); return }
      const dataUrl = await captureFrame(stream)
      if (!dataUrl) { setStatus('Could not capture screen'); return }
      const token = await getExtToken()
      const res = await fetch('/api/extension/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ class_log_id: classLogIdRef.current, screenshot_data: dataUrl, screenshot_type: 'manual' }),
      })
      const data = await res.json().catch(() => ({}))
      setStatus(res.ok && data.success ? '📸 Screenshot saved' : (data.error || 'Screenshot failed'))
    } catch {
      setStatus('Screenshot error')
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📸 Screenshot' }
    }
  }, [$, ensureStream, captureFrame, getExtToken, setStatus])

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !classLogIdRef.current) return
    const token = await getExtToken()
    for (const file of Array.from(files)) {
      setStatus(`Uploading ${file.name}…`)
      try {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        const res = await fetch('/api/extension/save-resource', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ class_log_id: classLogIdRef.current, type: 'file', file_data: dataUrl, name: file.name }),
        })
        const data = await res.json().catch(() => ({}))
        setStatus(res.ok && data.success ? `Attached ${file.name}` : (data.error || `Failed: ${file.name}`))
      } catch {
        setStatus(`Could not attach ${file.name}`)
      }
    }
  }, [getExtToken, setStatus])

  const handleAddLink = useCallback(async () => {
    if (!classLogIdRef.current) return
    const input = $('fcl-link') as HTMLInputElement | null
    let url = input?.value.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    const token = await getExtToken()
    setStatus('Saving link…')
    try {
      const res = await fetch('/api/extension/save-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ class_log_id: classLogIdRef.current, type: 'link', url, name: url }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) { if (input) input.value = ''; setStatus('Link added') }
      else setStatus(data.error || 'Failed to add link')
    } catch {
      setStatus('Could not add link')
    }
  }, [$, getExtToken, setStatus])

  const handleShare = useCallback(() => {
    if (!shareTokenRef.current) { setStatus('No summary available yet'); return }
    const url = `${window.location.origin}/class-summary/${shareTokenRef.current}`
    const sel = $('fcl-select') as HTMLSelectElement | null
    const studentLabel = sel?.selectedOptions?.[0]?.textContent || 'your child'
    const text = `Hi! Here's the class summary for ${studentLabel}:\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }, [$, setStatus])

  // --- start / end ---
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
        body: JSON.stringify({ teacher_id: teacherId, enrollment_id: enrollmentId, manual_override: true, start_time: new Date().toISOString() }),
      })
      const data = await res.json()
      if ((res.ok && data.success) || (res.status === 409 && data.class_log_id)) {
        classLogIdRef.current = data.class_log_id
        shareTokenRef.current = data.class_log?.share_token || shareTokenRef.current
        startTimeRef.current = Date.now()
        setRunningUI(true)
        stopTimer(); tick(); timerRef.current = setInterval(tick, 1000)
        setStatus(res.status === 409 ? 'Resumed in-progress class' : 'Class in progress')
      } else {
        if (start) { start.disabled = false; start.textContent = '🟢 Start' }
        setStatus(data.error || 'Failed to start')
      }
    } catch {
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
        body: JSON.stringify({ class_log_id: classLogId, teacher_id: teacherId, end_time: new Date().toISOString() }),
      })
      const data = await res.json()
      stopTimer()
      if (res.ok && data.success) {
        if (end) end.textContent = '✅ Ended'
        const dur = data.duration || (data.class_log?.duration_minutes != null ? `${data.class_log.duration_minutes}m` : '')
        setStatus(`Class ended${dur ? ` · ${dur}` : ''}. Share the summary →`)
        // stop the screen-share stream if any
        displayStreamRef.current?.getTracks().forEach(t => t.stop())
        displayStreamRef.current = null
        // reveal share button (token persists)
        const share = $('fcl-share'); if (share && shareTokenRef.current) share.style.display = 'block'
      } else {
        setStatus(data.error || 'Failed to end')
      }
      setTimeout(() => {
        classLogIdRef.current = null
        startTimeRef.current = null
        const t = $('fcl-timer'); if (t) t.textContent = '00:00'
        if (end) end.textContent = '🔴 End'
        // keep share visible; reset start/select/tools
        const start = $('fcl-start') as HTMLButtonElement | null
        const sel = $('fcl-select') as HTMLSelectElement | null
        const tools = $('fcl-tools')
        if (start) { start.disabled = false; start.style.opacity = '1'; start.textContent = '🟢 Start' }
        if (end) { end.disabled = true; end.style.opacity = '0.5' }
        if (sel) sel.disabled = false
        if (tools) tools.style.display = 'none'
      }, 1400)
    } catch {
      if (end) { end.disabled = false; end.textContent = '🔴 End' }
      setStatus('Network error ending class')
    }
  }, [$, teacherId, setStatus, stopTimer])

  const wireWidget = useCallback((doc: Document) => {
    docRef.current = doc
    doc.getElementById('fcl-start')?.addEventListener('click', handleStart)
    doc.getElementById('fcl-end')?.addEventListener('click', handleEnd)
    doc.getElementById('fcl-shot')?.addEventListener('click', handleScreenshot)
    doc.getElementById('fcl-share')?.addEventListener('click', handleShare)
    doc.getElementById('fcl-link-add')?.addEventListener('click', handleAddLink)
    const uploadBtn = doc.getElementById('fcl-upload')
    const fileInput = doc.getElementById('fcl-file') as HTMLInputElement | null
    uploadBtn?.addEventListener('click', () => fileInput?.click())
    fileInput?.addEventListener('change', e => handleFiles((e.target as HTMLInputElement).files))
    if (classLogIdRef.current && startTimeRef.current) {
      setRunningUI(true)
      stopTimer(); tick(); timerRef.current = setInterval(tick, 1000)
      setStatus('Class in progress')
    }
  }, [handleStart, handleEnd, handleScreenshot, handleShare, handleAddLink, handleFiles, setRunningUI, stopTimer, tick, setStatus])

  const loadStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/teacher/students', { credentials: 'include' })
      const data = await res.json()
      const list: StudentOption[] = (data.students || []).filter((s: StudentOption) => !s.status || s.status === 'active')
      studentsRef.current = list
      const sel = $('fcl-select') as HTMLSelectElement | null
      if (sel) {
        sel.innerHTML = `<option value="">Select a student…</option>` +
          list.map(s => `<option value="${s.id}">${escapeHtml(s.student_name)}${s.subject ? ' — ' + escapeHtml(s.subject) : ''}</option>`).join('')
      }
    } catch {
      setStatus('Could not load students')
    }
  }, [$, setStatus])

  const openInPage = useCallback(() => {
    if (inPageHostRef.current) return
    const host = document.createElement('div')
    host.id = 'fcl-inpage'
    host.style.cssText = 'position:fixed;bottom:20px;right:20px;width:260px;height:420px;z-index:2147483600;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.35);'
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
      const pip = await dpip.requestWindow({ width: 300, height: 460 })
      pipRef.current = pip
      pip.document.body.style.margin = '0'
      pip.document.body.innerHTML = WIDGET_HTML(studentsRef.current)
      wireWidget(pip.document)
      pip.addEventListener('pagehide', () => { stopTimer(); pipRef.current = null; docRef.current = null })
    } catch {
      openInPage()
    }
  }, [openInPage, wireWidget, stopTimer])

  const launch = useCallback(async () => { await loadStudents(); await openPiP() }, [loadStudents, openPiP])

  useEffect(() => { setSupported('documentPictureInPicture' in window) }, [])

  useEffect(() => {
    return () => {
      stopTimer()
      displayStreamRef.current?.getTracks().forEach(t => t.stop())
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
