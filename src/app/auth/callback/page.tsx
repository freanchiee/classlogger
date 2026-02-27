'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Processing authentication...')
  const [error, setError] = useState<string | null>(null)

  // Rest of the component logic stays the same...

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Starting auth callback processing...')
        setStatus('Processing OAuth callback...')
        
        // Get role from URL params for redirect
        const role = searchParams.get('role')
        console.log('👤 Role from URL:', role)
        
        // Check if we have URL fragments (access_token, etc.)
        const urlHash = window.location.hash
        console.log('🔗 URL hash:', urlHash ? 'Present' : 'Not present')
        
        // First, try to get the current session
        console.log('📋 Checking current session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError)
          throw sessionError
        }

        if (session) {
          console.log('✅ Session found immediately:', session.user.email)
          await processAuthenticatedUser(session, role)
          return
        }

        // If no session yet, wait for auth state change
        console.log('⏳ No session found, waiting for auth state change...')
        setStatus('Waiting for authentication to complete...')
        
        // Set up auth state listener with timeout
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('🔔 Auth state change:', event, session?.user?.email || 'No session')
          
          if (event === 'SIGNED_IN' && session) {
            console.log('✅ Sign in detected, processing user...')
            clearTimeout(timeoutId)
            subscription.unsubscribe()
            await processAuthenticatedUser(session, role)
          } else if (event === 'TOKEN_REFRESHED' && session) {
            console.log('🔄 Token refreshed, processing user...')
            clearTimeout(timeoutId)
            subscription.unsubscribe()
            await processAuthenticatedUser(session, role)
          }
        })
        
        // Set timeout to prevent infinite waiting
        const timeoutId = setTimeout(() => {
          console.log('⏰ Auth callback timeout reached')
          subscription.unsubscribe()
          setError('Authentication timeout. Please try signing in again.')
          setStatus('Authentication timeout')
        }, 30000) // 30 second timeout

      } catch (error) {
        console.error('❌ Auth callback error:', error)
        setError(error instanceof Error ? error.message : 'Authentication failed')
        setStatus('Authentication failed')
      }
    }

    const processAuthenticatedUser = async (
      session: { access_token?: string; user: { id: string; email?: string | null } },
      role: string | null
    ) => {
      try {
        console.log('👤 Processing authenticated user:', session.user.email)
        setStatus('Getting user profile...')
        
        // Get user profile
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        let profile = existingProfile

        if (profileError) {
          console.error('❌ Profile error:', profileError)
          
          // If profile doesn't exist, create it
          if (profileError.code === 'PGRST116') {
            console.log('📝 Creating new profile...')
            setStatus('Creating user profile...')
            
            // Get user metadata from session
            const userMetadata = (session.user as { user_metadata?: Record<string, unknown> }).user_metadata || {}
            console.log('👤 User metadata:', userMetadata)
            
            const profileData = {
              id: session.user.id,
              email: session.user.email,
              full_name: userMetadata.full_name || userMetadata.name || session.user.email?.split('@')[0] || 'User',
              role: role || 'student'
            }
            
            console.log('📝 Creating profile with data:', profileData)
            
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert(profileData)
              .select()
              .single()
            
            if (createError) {
              console.error('❌ Profile creation error:', createError)
              console.error('❌ Profile creation details:', createError.details)
              console.error('❌ Profile creation hint:', createError.hint)
              
              // Try to proceed anyway - the JWT API is now more flexible
              console.log('⚠️ Profile creation failed, but proceeding with authentication...')
              profile = {
                id: session.user.id,
                email: session.user.email,
                full_name: profileData.full_name,
                role: profileData.role
              }
            } else {
              console.log('✅ Profile created successfully:', newProfile)
              profile = newProfile
            }
          } else {
            console.error('❌ Unexpected profile error:', profileError)
            // Try to proceed anyway with basic user data
            profile = {
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.email?.split('@')[0] || 'User',
              role: role || 'student'
            }
            console.log('⚠️ Using fallback profile data:', profile)
          }
        }

        if (!profile) {
          throw new Error('Profile not found and could not be created')
        }

        console.log('✅ Profile found/created:', profile.email, profile.role)
        setStatus('Creating authentication cookies...')
        
        // Validate required user data
        if (!session.user?.id || !session.user?.email || !session.access_token) {
          throw new Error('Invalid user session data')
        }

        // Create JWT cookies by calling the API
        const response = await fetch('/api/auth/create-jwt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: session.user.id,
            email: session.user.email,
            name: profile.full_name,
            role: profile.role,
            accessToken: session.access_token
          })
        })

        if (!response.ok) {
          const rawError = await response.text()
          let errorMessage = rawError

          try {
            const parsed = JSON.parse(rawError) as { error?: string; message?: string }
            errorMessage = parsed.error || parsed.message || rawError
          } catch {
            // Keep raw text when response is not JSON
          }

          const fallbackMessage = errorMessage?.trim() || `Request failed with status ${response.status}`
          console.error('❌ JWT creation failed:', fallbackMessage)
          throw new Error(`Failed to create cookies: ${fallbackMessage}`)
        }

        console.log('✅ JWT cookies created successfully')
        setStatus('Authentication successful! Redirecting...')
        
        // Redirect based on profile role (not URL role)
        const redirectPath = profile.role === 'teacher' ? '/dashboard' : 
                           profile.role === 'parent' ? '/dashboard/parent' : 
                           '/student-dashboard'
        
        console.log('🔄 Redirecting to:', redirectPath)
        
        setTimeout(() => {
          router.push(redirectPath)
        }, 1000)

      } catch (error) {
        console.error('❌ Auth processing error:', error)
        setError(error instanceof Error ? error.message : 'Authentication processing failed')
        setStatus('Authentication failed')
      }
    }

    handleAuthCallback()
  }, [searchParams, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Authentication Error</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/auth/signin')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Authenticating</h3>
          <p className="mt-1 text-sm text-gray-500">{status}</p>
        </div>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading authentication...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
