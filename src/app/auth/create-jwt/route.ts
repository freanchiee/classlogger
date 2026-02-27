import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { signJWT } from '@/lib/jwt'
import { setAuthCookie } from '@/lib/cookies'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creating JWT cookie for OAuth user...')
    
    // Verify user is authenticated with Supabase
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ User not authenticated:', authError)
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Get data from request
    const { userId, email, name, role } = await request.json()
    
    // Verify the user ID matches the authenticated user
    if (userId !== user.id) {
      console.error('❌ User ID mismatch')
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 401 }
      )
    }

    console.log('✅ Creating JWT for user:', email, role)

    // Create JWT payload
    const jwtPayload = {
      userId,
      email,
      role: role as 'teacher' | 'student' | 'parent',
      name,
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
      { error: 'Failed to create JWT cookie' },
      { status: 500 }
    )
  }
}
