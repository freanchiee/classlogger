// app/dashboard/teacher/students/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import StudentDetailsModal from '@/components/StudentDetailsModal'

interface Student {
  id: string
  student_id: string
  student_name: string
  parent_name: string
  parent_email: string
  subject: string
  year_group: string
  classes_per_week: number
  classes_per_recharge: number
  tentative_schedule: string | { note: string } | null
  whatsapp_group_url: string | null
  google_meet_url: string | null
  setup_completed: boolean
  enrollment_date: string
  status: string
  class_name: string
}

interface Invitation {
  id: string
  student_name: string
  parent_name: string
  parent_email: string
  subject: string
  year_group: string
  status: string
  created_at: string
  invitation_token: string
}

interface Stats {
  totalStudents: number
  completeSetup: number
  incompleteSetup: number
  pendingInvitations: number
}

// Detect data issues a teacher should rectify for an enrolled student.
function getStudentIssues(s: Student): string[] {
  const issues: string[] = []
  const sched = typeof s.tentative_schedule === 'object'
    ? s.tentative_schedule?.note
    : s.tentative_schedule
  if (!s.google_meet_url) issues.push('Google Meet URL')
  if (!s.whatsapp_group_url) issues.push('WhatsApp group')
  if (!sched || !String(sched).trim()) issues.push('Schedule')
  if (!s.subject || ['general', 'unknown', 'unknown subject'].includes(s.subject.toLowerCase())) issues.push('Subject')
  if (!s.year_group || ['not specified', 'unknown', 'unknown grade'].includes(s.year_group.toLowerCase())) issues.push('Year group')
  if (!s.parent_email) issues.push('Parent email')
  return issues
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    completeSetup: 0,
    incompleteSetup: 0,
    pendingInvitations: 0
  })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    student_name: '',
    student_email: '',
    parent_name: '',
    parent_email: '',
    subject: '',
    year_group: '',
    classes_per_week: 1,
    classes_per_recharge: 4,
    tentative_schedule: '',
    whatsapp_group_url: '',
    google_meet_url: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [invitationUrl, setInvitationUrl] = useState('')
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null)

  // Modal state for student details
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      
      // Add credentials and proper headers for authentication
      const response = await fetch('/api/teacher/students', {
        method: 'GET',
        credentials: 'include', // This ensures cookies are sent
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      console.log('🔍 Response status:', response.status)
      console.log('🔍 Response ok:', response.ok)
      
      if (!response.ok) {
        console.error('❌ API response not ok:', response.status, response.statusText)
        
        if (response.status === 401) {
          console.error('❌ Unauthorized - redirecting to login')
          // Redirect to login if unauthorized
          window.location.href = '/'
          return
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('✅ Students data received:', data)
      
      if (data) {
        setStudents(data.students || [])
        setInvitations(data.invitations || [])
        setStats(data.stats || {
          totalStudents: 0,
          completeSetup: 0,
          incompleteSetup: 0,
          pendingInvitations: 0
        })
      }
    } catch (error) {
      console.error('💥 Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setInvitationUrl(data.invitation_url)
        setShowSuccess(true)
        setShowModal(false)
        // Reset form
        setFormData({
          student_name: '',
          student_email: '',
          parent_name: '',
          parent_email: '',
          subject: '',
          year_group: '',
          classes_per_week: 1,
          classes_per_recharge: 4,
          tentative_schedule: '',
          whatsapp_group_url: '',
          google_meet_url: ''
        })
        // Refresh data
        fetchStudents()
      } else {
        alert('Failed to create invitation: ' + data.error)
      }
    } catch (error) {
      alert('Error creating invitation: ' + error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Link copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const resendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/teacher/students/${invitationId}/resend`, {
        method: 'POST',
      })
      
      if (response.ok) {
        alert('Invitation resent successfully!')
        fetchStudents()
      } else {
        alert('Failed to resend invitation')
      }
    } catch (error) {
      console.error('Error resending invitation:', error)
      alert('Error resending invitation')
    }
  }

  // Handler for opening student details modal
  const handleViewDetails = (student: Student) => {
    console.log('👀 Opening details for student:', student.student_name)
    setSelectedStudent(student)
    setShowStudentModal(true)
  }

  // Handler for closing student details modal
  const handleCloseModal = () => {
    setShowStudentModal(false)
    setSelectedStudent(null)
  }

  // Handler for updating student data
  const handleUpdateStudent = (updatedStudent: Student) => {
    console.log('🔄 Updating student in list:', updatedStudent.student_name)
    
    // Update the student in the local state
    setStudents(prevStudents => 
      prevStudents.map(student => 
        student.id === updatedStudent.id ? updatedStudent : student
      )
    )
    
    // Refresh stats by refetching data
    fetchStudents()
  }

  const handleDeleteStudent = async (student: Student) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${student.student_name}? This will deactivate their enrollment.`
    )
    if (!confirmed) return

    try {
      setDeletingStudentId(student.id)
      const response = await fetch(`/api/teacher/students/${student.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to remove student')
      }

      setStudents(prevStudents => prevStudents.filter(s => s.id !== student.id))
      fetchStudents()
    } catch (error) {
      alert(`Error removing student: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setDeletingStudentId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-emerald-600 mr-2">🎓</span>
          <div>
            <h3 className="font-medium text-emerald-800">Student Management</h3>
            <p className="text-sm text-emerald-700">
              Track enrollments, invite new students, and keep everything organized.
            </p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            👥 My Students
          </h1>
          <p className="mt-1 text-gray-600">Manage your students and track their setup progress</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <Link
            href="/dashboard/teacher"
            className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium"
          >
            ➕ Add Student
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-lg shadow text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 font-medium text-sm">Total Students</p>
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
            </div>
            <div className="text-2xl opacity-80">👤</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-lg shadow text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 font-medium text-sm">Complete Setup</p>
              <p className="text-2xl font-bold">{stats.completeSetup}</p>
            </div>
            <div className="text-2xl opacity-80">✅</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-lg shadow text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 font-medium text-sm">Needs Setup</p>
              <p className="text-2xl font-bold">{stats.incompleteSetup}</p>
            </div>
            <div className="text-2xl opacity-80">⚠️</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-lg shadow text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 font-medium text-sm">Pending Invites</p>
              <p className="text-2xl font-bold">{stats.pendingInvitations}</p>
            </div>
            <div className="text-2xl opacity-80">📧</div>
          </div>
        </div>
      </div>

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-lg shadow border mb-6">
          <div className="p-4 border-b border-gray-200 bg-amber-50">
            <h2 className="text-lg font-semibold text-amber-800 flex items-center gap-2">
              📧 Pending Invitations
            </h2>
            <p className="text-sm text-amber-700 mt-1">Students who haven&apos;t completed their enrollment yet</p>
          </div>
          <div className="p-4">
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-semibold text-gray-900">{invitation.student_name}</p>
                            <p className="text-sm text-gray-600">{invitation.parent_name} • {invitation.parent_email}</p>
                          </div>
                          <div className="bg-amber-100 px-3 py-1 rounded-full">
                            <p className="text-sm font-medium text-amber-800">{invitation.subject} • {invitation.year_group}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          Sent {new Date(invitation.created_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => resendInvitation(invitation.id)}
                          className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
                        >
                          📤 Resend
                        </button>
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/onboarding/${invitation.invitation_token}`)}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                        >
                          📋 Copy Link
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

      {/* Students List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 border-b border-gray-200 bg-emerald-50">
          <h2 className="text-lg font-semibold text-emerald-800 flex items-center gap-2">
            👥 Enrolled Students
          </h2>
          <p className="text-sm text-emerald-700 mt-1">Students who have completed their enrollment</p>
        </div>

        <div className="p-4">
          {students.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No enrolled students yet</h3>
              <p className="text-gray-600 mb-6">Start by sending invitation links to parents</p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors inline-flex items-center gap-2 font-medium"
              >
                ➕ Send First Invitation
              </button>
            </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-emerald-100">
                        <th className="text-left py-4 px-3 font-bold text-gray-900 text-lg">Student</th>
                        <th className="text-left py-4 px-3 font-bold text-gray-900 text-lg">Parent</th>
                        <th className="text-left py-4 px-3 font-bold text-gray-900 text-lg">Subject</th>
                        <th className="text-left py-4 px-3 font-bold text-gray-900 text-lg">Year</th>
                        <th className="text-left py-4 px-3 font-bold text-gray-900 text-lg">Status</th>
                        <th className="text-left py-4 px-3 font-bold text-gray-900 text-lg">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => { const issues = getStudentIssues(student); return (
                        <tr key={student.id} className={`border-b border-gray-100 transition-all duration-200 ${
                          issues.length > 0
                            ? 'bg-red-50/60 hover:bg-red-50'
                            : `hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`
                        }`}>
                          <td className="py-5 px-3">
                            <div>
                              <p className="font-semibold text-gray-900 text-lg">{student.student_name}</p>
                              <p className="text-sm text-gray-600">{student.class_name}</p>
                            </div>
                          </td>
                          <td className="py-5 px-3">
                            <div>
                              <p className="text-gray-900 font-medium">{student.parent_name}</p>
                              <p className="text-sm text-gray-600">{student.parent_email}</p>
                            </div>
                          </td>
                          <td className="py-5 px-3">
                            <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                              {student.subject}
                            </span>
                          </td>
                          <td className="py-5 px-3">
                            <span className="bg-gradient-to-r from-teal-100 to-emerald-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium">
                              {student.year_group}
                            </span>
                          </td>
                          <td className="py-5 px-3">
                            {issues.length === 0 ? (
                              <span className="inline-flex px-3 py-2 text-sm font-semibold rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-800">
                                ✅ Complete
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex px-3 py-2 text-sm font-semibold rounded-full bg-gradient-to-r from-orange-100 to-red-100 text-red-800">
                                  ⚠️ {issues.length} to fix
                                </span>
                                <div className="flex flex-wrap gap-1 max-w-[220px]">
                                  {issues.map((issue) => (
                                    <span key={issue} className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                      {issue}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-5 px-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewDetails(student)}
                                className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium transform hover:scale-105 text-white ${
                                  issues.length > 0
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                                }`}
                              >
                                {issues.length > 0 ? '✏️ Fix' : '✏️ Edit'}
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student)}
                                disabled={deletingStudentId === student.id}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  deletingStudentId === student.id
                                    ? 'bg-red-200 text-red-800 cursor-not-allowed'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                              >
                                {deletingStudentId === student.id ? 'Removing...' : 'Remove'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-3xl">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/50 transition-all"
              >
                ×
              </button>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Add New Student</h2>
              <p className="text-gray-600">Create an invitation link for a new student enrollment</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Student & Parent Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  👤 Student & Parent Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Student Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.student_name}
                      onChange={(e) => setFormData({...formData, student_name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                      placeholder="Enter student name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Student Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.student_email}
                      onChange={(e) => setFormData({...formData, student_email: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                      placeholder="student@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Parent Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.parent_name}
                      onChange={(e) => setFormData({...formData, parent_name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                      placeholder="Enter parent name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Parent Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.parent_email}
                      onChange={(e) => setFormData({...formData, parent_email: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                      placeholder="parent@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  📚 Academic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subject *
                    </label>
                    <select
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white"
                    >
                      <option value="">Select Subject</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                      <option value="English">English</option>
                      <option value="History">History</option>
                      <option value="Geography">Geography</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Economics">Economics</option>
                      <option value="Psychology">Psychology</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Year Group *
                    </label>
                    <select
                      required
                      value={formData.year_group}
                      onChange={(e) => setFormData({...formData, year_group: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white"
                    >
                      <option value="">Select Year Group</option>
                      <option value="Year 7">Year 7</option>
                      <option value="Year 8">Year 8</option>
                      <option value="Year 9">Year 9</option>
                      <option value="Year 10">Year 10</option>
                      <option value="Year 11">Year 11</option>
                      <option value="Year 12">Year 12</option>
                      <option value="Year 13">Year 13</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Class Schedule */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  📅 Class Schedule & Frequency
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Classes per Week
                    </label>
                    <select
                      value={formData.classes_per_week}
                      onChange={(e) => setFormData({...formData, classes_per_week: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white"
                    >
                      <option value={1}>1 class per week</option>
                      <option value={2}>2 classes per week</option>
                      <option value={3}>3 classes per week</option>
                      <option value={4}>4 classes per week</option>
                      <option value={5}>5 classes per week</option>
                      <option value={6}>6 classes per week</option>
                      <option value={7}>7 classes per week</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Classes per Recharge
                    </label>
                    <select
                      value={formData.classes_per_recharge}
                      onChange={(e) => setFormData({...formData, classes_per_recharge: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white"
                    >
                      <option value={4}>4 classes</option>
                      <option value={8}>8 classes</option>
                      <option value={12}>12 classes</option>
                      <option value={16}>16 classes</option>
                      <option value={20}>20 classes</option>
                      <option value={24}>24 classes</option>
                      <option value={30}>30 classes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tentative Schedule
                    </label>
                    <input
                      type="text"
                      value={formData.tentative_schedule}
                      onChange={(e) => setFormData({...formData, tentative_schedule: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                      placeholder="e.g., Mon/Wed 4PM"
                    />
                  </div>
                </div>
              </div>

              {/* Communication Links */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  💬 Communication Links (Optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      WhatsApp Group URL
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={formData.whatsapp_group_url}
                        onChange={(e) => setFormData({...formData, whatsapp_group_url: e.target.value})}
                        className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                        placeholder="https://chat.whatsapp.com/..."
                      />
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-500 text-lg">
                        💬
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Students will join this group for updates</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Google Meet URL
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={formData.google_meet_url}
                        onChange={(e) => setFormData({...formData, google_meet_url: e.target.value})}
                        className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                        placeholder="https://meet.google.com/..."
                      />
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 text-lg">
                        🎥
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Online class meeting room</p>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 px-6 rounded-2xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg transform hover:scale-105"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Creating Invitation...
                    </span>
                  ) : (
                    '📧 Create Student Invitation'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full">
            <div className="p-8">
              <button
                onClick={() => setShowSuccess(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all"
              >
                ×
              </button>
              
              <div className="text-center">
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Invitation Created!</h2>
                <p className="text-gray-600 mb-8 text-lg">Share this link with the parent to complete enrollment</p>
                
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-2xl mb-8 border border-emerald-200">
                  <p className="text-sm font-semibold text-emerald-800 mb-3">Invitation Link</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={invitationUrl}
                      readOnly
                      className="flex-1 px-4 py-3 bg-white border border-emerald-200 rounded-xl text-sm font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(invitationUrl)}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-semibold transform hover:scale-105"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6 mb-8">
                  <p className="text-sm text-amber-800 flex items-center gap-2">
                    <span className="text-xl">⏰</span>
                    <span>This link expires in 7 days. The parent will use it to confirm enrollment and provide additional details.</span>
                    </p>
                </div>

                <button
                  onClick={() => setShowSuccess(false)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 px-6 rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-semibold shadow-lg transform hover:scale-105"
                >
                  Perfect! 🎯
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      <StudentDetailsModal
        isOpen={showStudentModal}
        onClose={handleCloseModal}
        student={selectedStudent}
        onUpdate={handleUpdateStudent}
      />
    </div>
  )
}
