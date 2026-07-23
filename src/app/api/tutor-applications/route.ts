import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookieFromRequest } from '@/lib/cookies'
import { verifyJWT } from '@/lib/jwt'

export const runtime = 'nodejs'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'freanchie@gmail.com'

function supa() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Public: submit a tutor application
export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, programs, subjects, experience_years, qualifications, bio, rate, link } = await request.json()
    if (!name || !email) return NextResponse.json({ success: false, error: 'Name and email are required' }, { status: 400 })

    const { error } = await supa().from('tutor_applications').insert({
      name, email, phone, programs, subjects,
      experience_years: experience_years ? Number(experience_years) : null,
      qualifications, bio, rate, link,
    })
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

// Admin only: list applications
export async function GET(request: NextRequest) {
  const token = getAuthCookieFromRequest(request)
  const user = token ? verifyJWT(token) : null
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
  }
  const { data, error } = await supa().from('tutor_applications').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, applications: data })
}

// Admin only: approve / reject
export async function PATCH(request: NextRequest) {
  const token = getAuthCookieFromRequest(request)
  const user = token ? verifyJWT(token) : null
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
  }
  const { id, status } = await request.json()
  if (!id || !['pending', 'approved', 'rejected'].includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid id or status' }, { status: 400 })
  }
  const { error } = await supa().from('tutor_applications').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
