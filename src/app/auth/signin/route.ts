// app/api/auth/signin/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { signJWT } from '@/lib/jwt'
import { setAuthCookie } from '@/lib/cookies'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const supabase = createRouteHandlerClient({ cookies })

    // Authenticate with Supabase
    const { data: authData, error: authError  } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Get user profile to determine role
    const { data: profile, error: profileError  } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Create JWT payload
    const jwtPayload = {
      userId: authData.user.id,
      email: authData.user.email!,
      role: profile.role as 'teacher' | 'student' | 'parent',
      name: profile.name,
    }

    // Sign JWT
    const token = signJWT(jwtPayload)

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile.name,
        role: profile.role,
      },
    })

    // Set JWT cookie
    setAuthCookie(response, token, jwtPayload)

    return response
  } catch (error) {
    console.error('Sign in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
