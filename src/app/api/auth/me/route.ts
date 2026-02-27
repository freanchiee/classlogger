// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getAuthenticatedUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('🔄 Auth me API called')

    const user = await getAuthenticatedUser()

    if (!user) {
      return NextResponse.json({ 
        authenticated: false,
        user: null 
      }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Avoid hard failing when service-role env vars are not configured.
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️ Missing Supabase service env vars in /api/auth/me; returning auth status without profile lookup')
      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          profile: null
        }
      })
    }

    const supabase = await createServerSupabaseClient()
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ 
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          profile: null
        }
      })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        profile: profile
      }
    })
  } catch (error) {
    console.error('❌ Auth me error:', error)
    return NextResponse.json({ 
      authenticated: false,
      user: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
