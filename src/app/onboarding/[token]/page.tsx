// src/app/onboarding/[token]/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { use } from 'react'
import type { Database } from '@/types/database'

interface InvitationData {
  id: string
  teacher_id: string
  student_name: string
  student_email: string
  parent_name: string
  parent_email: string
  subject: string
  year_group: string
  classes_per_week: number
  classes_per_recharge: number
  tentative_schedule: unknown | null
  whatsapp_group_url: string | null
  google_meet_url: string | null
  status: string
  expires_at: string
}

interface OnboardingPageProps {
  params: Promise<{
    token: string
  }>
}

export default function OnboardingPage({ params }: OnboardingPageProps) {
  const resolvedParams = use(params)
  const token = resolvedParams.token

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const loadInvitation = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('=== LOADING INVITATION ===')
      console.log('Token:', token)

      // Load by token only — invitation links do NOT expire, and a link can be
      // re-opened even after it's been used (so teachers can verify it works).
      const { data: invitationData, error: invitationError  } = await supabase
        .from('student_invitations')
        .select('*')
        .eq('invitation_token', token)
        .maybeSingle()

      if (invitationError) {
        console.error('Invitation error:', invitationError)
        setError('Could not load this invitation. Please try again.')
        return
      }

      if (!invitationData) {
        setError('Invitation not found')
        return
      }

      console.log('Invitation loaded successfully:', invitationData)
      setInvitation(invitationData)
    } catch (err) {
      console.error('Error loading invitation:', err)
      setError('Failed to load invitation details')
    } finally {
      setLoading(false)
    }
  }, [token, supabase])

  useEffect(() => {
    loadInvitation()
  }, [loadInvitation])

  const completeOnboarding = async () => {
    if (!invitation) return

    try {
      setIsCompleting(true)
      
      console.log('=== FRONTEND DEBUG START ===')
      console.log('🔄 Starting onboarding process for:', invitation.student_name)
      console.log('Invitation data:', invitation)
      console.log('Token:', token)
      console.log('API endpoint:', '/api/onboarding/complete')

      const requestData = {
        invitation_id: invitation.id,
        invitation_token: token
      }
      console.log('Request data being sent:', requestData)

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      console.log('Response url:', response.url)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      const responseText = await response.text()
      console.log('Raw response length:', responseText.length)
      console.log('Raw response (first 500 chars):', responseText.substring(0, 500))

      if (!response.ok) {
        console.error('Response not OK:', response.status)
        console.error('Error response body:', responseText)
        
        if (response.status === 404) {
          throw new Error('API endpoint not found. Check if /api/onboarding/complete/route.ts exists')
        }
        
        throw new Error(`Server returned ${response.status}: ${responseText.substring(0, 200)}`)
      }

      let data
      try {
        data = JSON.parse(responseText)
        console.log('Successfully parsed JSON:', data)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Response was not valid JSON. Full response:', responseText)
        throw new Error('Server returned invalid JSON response')
      }

      if (!data.success) {
        console.error('Onboarding failed:', data.error)
        throw new Error(data.error || 'Failed to complete onboarding')
      }

      console.log('✅ Onboarding completed successfully')
      console.log('Response data:', data)

      if (data.credentials) {
        sessionStorage.setItem('onboarding_credentials', JSON.stringify(data.credentials))
      }

      router.push('/onboarding/success')

    } catch (err) {
      console.error('=== FRONTEND ERROR ===')
      console.error('💥 Error completing onboarding:', err)
      console.error('Error message:', err instanceof Error ? err.message : 'Unknown error')
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding. Please try again.')
    } finally {
      setIsCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-400 via-emerald-500 to-teal-600 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-6"></div>
          <p className="text-white text-xl font-semibold">Loading your boarding pass...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 via-orange-500 to-pink-600 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-8 text-lg">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-400 via-emerald-500 to-teal-600 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px border-l-2 border-dashed border-gray-300 z-10"></div>
          
          <div className="grid lg:grid-cols-2">
            <div className="p-8 lg:p-12 bg-gradient-to-br from-emerald-50 to-teal-50 relative">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                  BOARDING PASS
                </h1>
                <p className="text-gray-600 text-lg">Student Enrollment Invitation</p>
              </div>

              <div className="mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Passenger</h3>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{invitation.student_name}</p>
                  <p className="text-gray-600">Year {invitation.year_group}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white rounded-xl p-4 shadow-md border border-teal-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Subject</p>
                  <p className="text-lg font-bold text-gray-900">{invitation.subject}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-md border border-teal-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Weekly</p>
                  <p className="text-lg font-bold text-gray-900">{invitation.classes_per_week}x/week</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-2xl p-6 border border-amber-200">
                <h4 className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-3">Guardian Contact</h4>
                <p className="text-lg font-semibold text-amber-900 mb-1">{invitation.parent_name}</p>
                <p className="text-amber-700">{invitation.parent_email}</p>
              </div>
            </div>

            <div className="p-8 lg:p-12 bg-gradient-to-br from-teal-50 to-emerald-50 relative">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                  CLASS DETAILS
                </h2>
                <p className="text-gray-600">Keep this information handy</p>
              </div>

              <div className="space-y-6 mb-8">
                <div className="bg-white rounded-xl p-5 shadow-md border border-emerald-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recharge Package</p>
                  <p className="text-xl font-bold text-gray-900">{invitation.classes_per_recharge} Classes</p>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-md border border-emerald-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Valid Until</p>
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(invitation.expires_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {(invitation.whatsapp_group_url || invitation.google_meet_url) && (
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-6 border border-blue-200 mb-8">
                  <h4 className="text-sm font-semibold text-blue-800 uppercase tracking-wide mb-4">Quick Access</h4>
                  <div className="space-y-3">
                    {invitation.whatsapp_group_url && (
                      <a
                        href={invitation.whatsapp_group_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center bg-green-500 text-white px-4 py-3 rounded-xl hover:bg-green-600 transition-colors font-semibold"
                      >
                        <span className="text-xl mr-3">💬</span>
                        Join WhatsApp Group
                      </a>
                    )}
                    {invitation.google_meet_url && (
                      <a
                        href={invitation.google_meet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center bg-blue-500 text-white px-4 py-3 rounded-xl hover:bg-blue-600 transition-colors font-semibold"
                      >
                        <span className="text-xl mr-3">🎥</span>
                        Join Google Meet
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Ready to Board?</h3>
              <p className="text-emerald-100">Complete your enrollment to start your learning journey</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <button
                onClick={completeOnboarding}
                disabled={isCompleting}
                className="flex-1 bg-white text-emerald-600 py-4 px-8 rounded-2xl font-bold text-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {isCompleting ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent mr-2"></div>
                    Processing...
                  </span>
                ) : (
                  '🎫 Accept & Board'
                )}
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-8 py-4 border-2 border-white text-white rounded-2xl font-semibold hover:bg-white hover:text-emerald-600 transition-all duration-200 transform hover:scale-105"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="absolute left-1/2 transform -translate-x-1/2 top-0 bottom-0 flex flex-col justify-evenly">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-4 h-4 bg-white rounded-full border-2 border-gray-300"></div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg">
            <span className="text-2xl mr-3">⏰</span>
            <span className="text-gray-800 font-semibold">
              Expires {new Date(invitation.expires_at).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && invitation && (
          <div className="mt-6 mx-auto max-w-2xl bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs">
            <h4 className="text-yellow-400 font-bold mb-2">🐛 DEBUG INFO:</h4>
            <div className="space-y-1">
              <p><span className="text-yellow-400">Token:</span> {token}</p>
              <p><span className="text-yellow-400">Invitation ID:</span> {invitation.id}</p>
              <p><span className="text-yellow-400">Teacher ID:</span> {invitation.teacher_id}</p>
              <p><span className="text-yellow-400">Student:</span> {invitation.student_name}</p>
              <p><span className="text-yellow-400">Subject:</span> {invitation.subject}</p>
              <p><span className="text-yellow-400">Year Group:</span> {invitation.year_group}</p>
              <p><span className="text-yellow-400">Status:</span> {invitation.status}</p>
              <p><span className="text-yellow-400">Expires:</span> {invitation.expires_at}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}