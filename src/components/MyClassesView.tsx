// src/components/MyClassesView.tsx
// Enhanced with modern UI effects, vibrant design, and sleek compact header

'use client'

import React, { useState, useEffect } from 'react'
import { 
  Calendar, 
  Users, 
  BookOpen, 
  Clock, 
  TrendingUp, 
  Zap, 
  AlertCircle, 
  RefreshCw,
  Plus,
  Upload,
  Sparkles,
  Play,
  Brain,
  Target,
  Award,
  Rocket
} from 'lucide-react'

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

// Custom components
import ClassCard from './ClassCard'
import FloatingClassLogger from './FloatingClassLogger'
import InterestForm from './InterestForm'

// Hooks and utilities
import { useClassLogs } from '@/hooks/useClassLogs'
import type { MyClassesViewProps, StatsCardProps } from '@/types/database-enhanced'

// Enhanced stats card with modern design
const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  isAnimated = false
}) => {
  const gradients = [
    'from-blue-500 via-blue-600 to-indigo-700',
    'from-emerald-500 via-green-600 to-teal-700',
    'from-purple-500 via-violet-600 to-purple-700',
    'from-orange-500 via-red-500 to-pink-600',
    'from-cyan-500 via-teal-600 to-blue-700',
    'from-red-500 via-pink-600 to-rose-700'
  ]

  // Deterministic gradient per card title — stable across re-renders
  // (Math.random made tiles flicker to different colors on every render).
  const hash = (title || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const gradient = gradients[hash % gradients.length]
  
  return (
    <div className={`group relative overflow-hidden rounded-2xl shadow-[0_8px_30px_rgba(2,6,23,0.12)] ${isAnimated ? 'animate-pulse' : ''}`}>
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90 transition-all duration-500 group-hover:opacity-100 group-hover:scale-105`} />
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-white/20 rounded-full animate-bounce delay-100" />
        <div className="absolute top-1/2 -left-2 w-4 h-4 bg-white/15 rounded-full animate-ping delay-300" />
        <div className="absolute bottom-4 right-1/3 w-3 h-3 bg-white/25 rounded-full animate-pulse delay-500" />
      </div>
      
      {/* Card content */}
      <Card className="relative bg-transparent border-0 shadow-2xl">
        <CardContent className="p-6 text-white relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
              <p className="text-3xl font-bold text-white mb-1 transition-transform group-hover:scale-110">{value}</p>
              <p className="text-white/70 text-xs">{subtitle}</p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
              <Icon className="h-8 w-8 text-white relative z-10 transition-transform group-hover:rotate-12" />
            </div>
          </div>
          
          {/* Progress bar effect */}
          <div className="mt-4 h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white/40 rounded-full animate-pulse" style={{ width: '70%' }} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const MyClassesView: React.FC<MyClassesViewProps> = ({ teacherId }) => {
  // Local state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState<'all' | 'live' | 'completed' | 'in_progress'>('all')
  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  const [isManualLogDialogOpen, setIsManualLogDialogOpen] = useState(false)

  // Manual log form state
  const [manualLogForm, setManualLogForm] = useState({
    enrollment_id: '',
    student_name: '',
    subject: '',
    date: selectedDate,
    start_time: '',
    end_time: '',
    content: '',
    homework_assigned: ''
  })
  const [manualFiles, setManualFiles] = useState<File[]>([])
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [showInterest, setShowInterest] = useState(false)
  const [enrolledStudents, setEnrolledStudents] = useState<{ id: string; student_name: string; subject: string; status?: string }[]>([])

  // Enrolled students for the manual-log dropdown
  useEffect(() => {
    fetch('/api/teacher/students', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setEnrolledStudents((d.students || []).filter((s: { status?: string }) => !s.status || s.status === 'active')))
      .catch(() => setEnrolledStudents([]))
  }, [])

  // Use the custom hook
  const {
    classLogs,
    stats,
    liveClasses,
    isLoading,
    isRefreshing,
    error,
    refreshData,
    updateClassContent,
    uploadFiles,
    deleteFile,
    getFilesForClass
  } = useClassLogs({ 
    teacherId, 
    selectedDate,
    autoRefresh: true 
  })

  // Show the interest/feedback form once, after the teacher has logged classes
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('cl_interest_seen')) return
    if (classLogs.length > 0 || stats.thisMonth > 0) {
      localStorage.setItem('cl_interest_seen', '1')
      setShowInterest(true)
    }
  }, [classLogs.length, stats.thisMonth])

  // Filter class logs
  const filteredClassLogs = classLogs.filter(log => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'live') return log.isLive
    return log.status === filterStatus
  })

  // Create a real class log for the selected student (same flow as the widget:
  // POST /api/classes to open, PUT to complete), then attach any uploaded files.
  const handleManualLogSubmit = async () => {
    if (!editingLogId && !manualLogForm.enrollment_id) return
    setManualSubmitting(true)
    try {
      const day = manualLogForm.date || selectedDate
      const iso = (t: string) => (t ? new Date(`${day}T${t}:00`).toISOString() : new Date().toISOString())
      const startISO = iso(manualLogForm.start_time)
      const endISO = iso(manualLogForm.end_time)

      // Edit mode: patch the existing log's date/time/content
      if (editingLogId) {
        await fetch('/api/classes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            class_log_id: editingLogId,
            teacher_id: teacherId,
            date: day,
            start_time: startISO,
            end_time: endISO,
            content: manualLogForm.content || undefined,
            homework_assigned: manualLogForm.homework_assigned || undefined,
          }),
        })
        setEditingLogId(null)
        setManualLogForm({ enrollment_id: '', student_name: '', subject: '', date: selectedDate, start_time: '', end_time: '', content: '', homework_assigned: '' })
        setManualFiles([])
        setIsManualLogDialogOpen(false)
        await refreshData()
        return
      }

      const startRes = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teacher_id: teacherId,
          enrollment_id: manualLogForm.enrollment_id,
          manual_override: true,
          start_time: startISO,
        }),
      })
      const startData = await startRes.json()
      const classLogId = startData.class_log_id
      if (!classLogId) throw new Error(startData.error || 'Failed to create class')

      await fetch('/api/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          class_log_id: classLogId,
          teacher_id: teacherId,
          end_time: endISO,
          content: manualLogForm.content || undefined,
          homework_assigned: manualLogForm.homework_assigned || undefined,
        }),
      })

      // Attach uploaded files (images -> screenshots, others -> resources)
      if (manualFiles.length) {
        const tokenRes = await fetch('/api/extension/issue-temp-token', { method: 'POST', credentials: 'include' })
        const token = (await tokenRes.json())?.token
        const auth: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        for (const file of manualFiles) {
          const dataUrl: string = await new Promise((resolve, reject) => {
            const rd = new FileReader(); rd.onload = () => resolve(rd.result as string); rd.onerror = reject; rd.readAsDataURL(file)
          })
          const isImg = file.type.startsWith('image/')
          await fetch(isImg ? '/api/extension/screenshot' : '/api/extension/save-resource', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...auth },
            body: JSON.stringify(isImg
              ? { class_log_id: classLogId, screenshot_data: dataUrl, screenshot_type: 'manual' }
              : { class_log_id: classLogId, type: 'file', file_data: dataUrl, name: file.name }),
          })
        }
      }

      setManualLogForm({ enrollment_id: '', student_name: '', subject: '', date: selectedDate, start_time: '', end_time: '', content: '', homework_assigned: '' })
      setManualFiles([])
      setIsManualLogDialogOpen(false)
      await refreshData()
    } catch (err) {
      console.error('Error creating manual log:', err)
    } finally {
      setManualSubmitting(false)
    }
  }

  // Open the modal in edit mode when a card requests it
  useEffect(() => {
    const onEdit = (e: Event) => {
      const c = (e as CustomEvent).detail
      const hhmm = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(11, 16) : '')
      setEditingLogId(c.id)
      setManualLogForm({
        enrollment_id: c.enrollment_id || '',
        student_name: c.student_name || '',
        subject: c.subject || '',
        date: (c.date || c.start_time || '').slice(0, 10),
        start_time: hhmm(c.start_time),
        end_time: hhmm(c.end_time),
        content: c.content || '',
        homework_assigned: c.homework_assigned || '',
      })
      setIsManualLogDialogOpen(true)
    }
    window.addEventListener('edit-class-log', onEdit)
    return () => window.removeEventListener('edit-class-log', onEdit)
  }, [])

  const updateManualLogForm = (field: keyof typeof manualLogForm, value: string) => {
    setManualLogForm(prev => ({ ...prev, [field]: value }))
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="space-y-6 p-6">
          {/* Animated loading header */}
          <div className="text-center py-12">
            <div className="relative inline-block">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin animate-reverse" />
            </div>
            <h2 className="mt-4 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Loading Your Amazing Classes...
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-100 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md border-red-300 bg-red-50 shadow-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-semibold">Oops! Something went wrong</p>
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={refreshData} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 space-y-5 p-6">
        {/* Post-use interest / feedback prompt (shown once) */}
        <Dialog open={showInterest} onOpenChange={setShowInterest}>
          <DialogContent className="max-w-md border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Enjoying ClassLogger? 🎓</DialogTitle>
              <DialogDescription>Tell us about your tutoring — we&apos;d love to help you get more out of it.</DialogDescription>
            </DialogHeader>
            <InterestForm source="post-use" onDone={() => setShowInterest(false)} />
          </DialogContent>
        </Dialog>

        {/* Compact left-aligned header (matches Dashboard for uniformity) */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <BookOpen className="h-5 w-5 text-white" />
              {stats.liveClasses > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
                  <span className="text-white text-[10px] font-bold">{stats.liveClasses}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              My Classes
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              Auto-detected, live tracking
            </p>
          </div>
        </div>

        {/* Enhanced Live Classes Alert */}
        {liveClasses.length > 0 && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl blur-sm opacity-30 animate-pulse" />
            <Alert className="relative border-red-300 bg-gradient-to-r from-red-50 to-pink-50 shadow-2xl rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <AlertCircle className="h-6 w-6 text-red-600 animate-bounce" />
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25" />
                </div>
                <AlertDescription className="text-red-800 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg">🔥 LIVE CLASSES IN PROGRESS!</p>
                      <p className="text-sm">You have {liveClasses.length} active session{liveClasses.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex space-x-2">
                      {liveClasses.map((liveClass) => (
                        <Badge key={liveClass.id} variant="destructive" className="animate-pulse shadow-lg">
                          {liveClass.student_name || 'Live Class'} • {formatDuration(liveClass.duration_minutes)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          </div>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatsCard
            title="Today"
            value={stats.today}
            subtitle="Classes completed"
            icon={Calendar}
          />
          <StatsCard
            title="This Week"
            value={stats.thisWeek}
            subtitle="Weekly progress"
            icon={Users}
          />
          <StatsCard
            title="This Month"
            value={stats.thisMonth}
            subtitle="Monthly total"
            icon={BookOpen}
          />
          <StatsCard
            title="Total Hours"
            value={`${stats.totalHours}h`}
            subtitle="Time invested"
            icon={Clock}
          />
          <StatsCard
            title="Auto-Detected"
            value={stats.autoDetected}
            subtitle="Smart tracking"
            icon={Brain}
          />
          <StatsCard
            title="Live Classes"
            value={stats.liveClasses}
            subtitle={stats.liveClasses > 0 ? 'Currently active' : 'None active'}
            icon={Play}
            isAnimated={stats.liveClasses > 0}
          />
        </div>

        {/* Enhanced Controls */}
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Target className="h-6 w-6" />
                  Classes for {new Date(selectedDate).toLocaleDateString()}
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </CardTitle>
                <CardDescription className="text-blue-100">
                  AI-powered insights and real-time tracking
                </CardDescription>
              </div>
              <div className="flex items-center space-x-4">
                <FloatingClassLogger teacherId={teacherId} />
                <Select value={filterStatus} onValueChange={(value: typeof filterStatus) => setFilterStatus(value)}>
                  <SelectTrigger className="w-32 bg-white/20 border-white/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="live">🔴 Live</SelectItem>
                    <SelectItem value="completed">✅ Completed</SelectItem>
                    <SelectItem value="in_progress">⏳ In Progress</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40 bg-white/20 border-white/30 text-white placeholder-white/70"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Enhanced Class Logs */}
        <div className="space-y-6">
          {filteredClassLogs.length === 0 ? (
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-blue-50">
              <CardContent className="p-16 text-center">
                <div className="relative inline-block mb-6">
                  <BookOpen className="h-24 w-24 text-blue-300 mx-auto" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-4">No classes found</h3>
                <p className="text-gray-500 mb-8 text-lg">
                  {filterStatus === 'all' 
                    ? 'Ready to start your teaching journey?' 
                    : `No ${filterStatus} classes found`}
                </p>
                
                {selectedDate === new Date().toISOString().split('T')[0] && (
                  <div className="relative max-w-md mx-auto">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-2xl blur-lg opacity-30" />
                    <div className="relative bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-8 border border-emerald-200">
                      <div className="flex items-center justify-center mb-4">
                        <Rocket className="w-8 h-8 text-emerald-600 mr-2 animate-bounce" />
                        <span className="font-bold text-emerald-800 text-lg">Pro Tip</span>
                      </div>
                      <p className="text-emerald-700">
                        Start a Google Meet session to see our AI auto-detection in action! 🤖✨
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredClassLogs.map((classLog, index) => {
              const files = getFilesForClass(classLog.id)
              const isExpanded = expandedClass === classLog.id

              return (
                <div key={classLog.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-fade-in-up">
                  <ClassCard
                    classLog={classLog}
                    files={files}
                    isExpanded={isExpanded}
                    isUploading={false}
                    onToggleExpand={() => setExpandedClass(isExpanded ? null : classLog.id)}
                    onEditContent={(content) => updateClassContent(classLog.id, content)}
                    onFileUpload={(fileList) => uploadFiles(classLog.id, fileList)}
                    onDeleteFile={(fileId) => {
                      const file = files.find(f => f.id === fileId)
                      if (file) {
                        deleteFile(fileId, file.file_path)
                      }
                    }}
                  />
                </div>
              )
            })
          )}
        </div>

        {/* Enhanced Quick Actions */}
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-purple-50">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
            <CardTitle className="text-xl flex items-center gap-3">
              <Award className="h-6 w-6" />
              Quick Actions
              <Zap className="h-5 w-5 animate-pulse" />
            </CardTitle>
            <CardDescription className="text-purple-100">
              Supercharge your teaching workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Dialog open={isManualLogDialogOpen} onOpenChange={setIsManualLogDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-24 flex-col space-y-3 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group">
                    <div className="relative">
                      <Plus className="h-8 w-8 text-blue-500 group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-25 group-hover:opacity-50" />
                    </div>
                    <span className="font-semibold">Add Manual Log</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md border-0 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <Plus className="h-5 w-5 text-blue-500" />
                      {editingLogId ? 'Edit Class Log' : 'Add Manual Class Log'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingLogId ? 'Update the date, time or details of this class' : "Record a class session that wasn't auto-detected"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="student-select">Student</Label>
                      {editingLogId ? (
                        <Input value={manualLogForm.student_name} disabled className="border-2 bg-gray-50" />
                      ) : (
                        <select
                          id="student-select"
                          value={manualLogForm.enrollment_id}
                          onChange={(e) => {
                            const s = enrolledStudents.find(x => x.id === e.target.value)
                            setManualLogForm(prev => ({
                              ...prev,
                              enrollment_id: e.target.value,
                              student_name: s?.student_name || '',
                              subject: s?.subject || '',
                            }))
                          }}
                          className="w-full border-2 rounded-md px-3 py-2 focus:border-blue-500 outline-none bg-white"
                        >
                          <option value="">Select an enrolled student…</option>
                          {enrolledStudents.map(s => (
                            <option key={s.id} value={s.id}>{s.student_name}{s.subject ? ` — ${s.subject}` : ''}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="log-date">Date</Label>
                      <Input
                        id="log-date"
                        type="date"
                        value={manualLogForm.date}
                        onChange={(e) => updateManualLogForm('date', e.target.value)}
                        className="border-2 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="start-time">Start Time</Label>
                        <Input 
                          id="start-time" 
                          type="time"
                          value={manualLogForm.start_time}
                          onChange={(e) => updateManualLogForm('start_time', e.target.value)}
                          className="border-2 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="end-time">End Time</Label>
                        <Input 
                          id="end-time" 
                          type="time"
                          value={manualLogForm.end_time}
                          onChange={(e) => updateManualLogForm('end_time', e.target.value)}
                          className="border-2 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="description">Class Description</Label>
                      <Textarea 
                        id="description" 
                        placeholder="What did you cover in this class?"
                        rows={3}
                        value={manualLogForm.content}
                        onChange={(e) => updateManualLogForm('content', e.target.value)}
                        className="border-2 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="homework">Homework Assigned</Label>
                      <Input
                        id="homework"
                        placeholder="Optional homework assignment"
                        value={manualLogForm.homework_assigned}
                        onChange={(e) => updateManualLogForm('homework_assigned', e.target.value)}
                        className="border-2 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="manual-files">Screenshots / files (optional)</Label>
                      <Input
                        id="manual-files"
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={(e) => setManualFiles(Array.from(e.target.files || []))}
                        className="border-2 focus:border-blue-500"
                      />
                      {manualFiles.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">{manualFiles.length} file(s) selected</p>
                      )}
                    </div>
                    <div className="flex space-x-2 pt-4">
                      <Button
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                        onClick={handleManualLogSubmit}
                        disabled={(!editingLogId && !manualLogForm.enrollment_id) || manualSubmitting}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {manualSubmitting ? 'Saving…' : editingLogId ? 'Save Changes' : 'Add Class Log'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setIsManualLogDialogOpen(false); setEditingLogId(null) }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" className="h-24 flex-col space-y-3 border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 transition-all duration-300 group">
                <div className="relative">
                  <TrendingUp className="h-8 w-8 text-green-500 group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-25 group-hover:opacity-50" />
                </div>
                <span className="font-semibold">View Analytics</span>
              </Button>

              <Button variant="outline" className="h-24 flex-col space-y-3 border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 group">
                <div className="relative">
                  <Upload className="h-8 w-8 text-purple-500 group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-25 group-hover:opacity-50" />
                </div>
                <span className="font-semibold">Bulk Upload</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-gradient {
          background-size: 400% 400%;
          animation: gradient 3s ease infinite;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default MyClassesView