import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookieFromRequest } from '@/lib/cookies'
import { verifyJWT } from '@/lib/jwt'

export const runtime = 'nodejs'

// ponytail: single hardcoded admin; move to an env/role check if you add admins.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'freanchie@gmail.com'

export async function GET(request: NextRequest) {
  const token = getAuthCookieFromRequest(request)
  const user = token ? verifyJWT(token) : null
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase
    .from('interest_submissions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, submissions: data })
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, subjects, message, source } = await request.json()
    if (!email) return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error } = await supabase.from('interest_submissions').insert({
      name, email, phone, subjects, message, source: source || 'interest',
    })
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
