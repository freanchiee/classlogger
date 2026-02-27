import { NextRequest, NextResponse  } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { signJWT } from '@/lib/jwt'
import { setAuthCookie } from '@/lib/cookies'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creating JWT cookie for OAuth user...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Get data from request
    const { userId, email, name, role, accessToken } = await request.json()

    // Validate required fields
    if (!userId || !email || !role || !accessToken) {
      console.error('❌ Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: userId, email, role, accessToken' },
        { status: 400 }
      )
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase public env vars')
      return NextResponse.json(
        { error: 'Missing Supabase environment variables' },
        { status: 500 }
      )
    }

    if (!['teacher', 'student', 'parent'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Validate user identity using the OAuth access token from the callback session.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      console.error('❌ Invalid Supabase access token:', authError)
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Never mint JWTs for another account.
    if (userId !== user.id) {
      console.error('❌ User ID mismatch')
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 401 }
      )
    }

    if (email !== user.email) {
      console.error('❌ User email mismatch')
      return NextResponse.json(
        { error: 'User email mismatch' },
        { status: 401 }
      )
    }

    console.log('✅ Creating JWT for user:', email, role)

    // Create JWT payload
    const jwtPayload = {
      userId,
      email,
      role: role as 'teacher' | 'student' | 'parent',
      name: name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    }

    // Sign JWT
    const token = signJWT(jwtPayload)

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'JWT cookie created successfully'
    })

    // Set JWT cookie
    setAuthCookie(response, token, jwtPayload)

    console.log('✅ JWT cookie set successfully')
    return response

  } catch (error) {
    console.error('❌ JWT creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create JWT cookie' },
      { status: 500 }
    )
  }
}
