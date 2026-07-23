import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookieFromRequest } from '@/lib/cookies'
import { verifyJWT } from '@/lib/jwt'

export const runtime = 'nodejs'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'freanchie@gmail.com'

function supa() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Public: submit a tuition requirement — open, unvetted
export async function POST(request: NextRequest) {
  try {
    const { parent_name, email, phone, student_name, program, subjects, grade_level, preferred_schedule, message } = await request.json()
    if (!email) return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })

    const { error } = await supa().from('tuition_requirements').insert({
      parent_name, email, phone, student_name, program, subjects, grade_level, preferred_schedule, message,
    })
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

// Admin only: list requirements
export async function GET(request: NextRequest) {
  const token = getAuthCookieFromRequest(request)
  const user = token ? verifyJWT(token) : null
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
  }
  const { data, error } = await supa().from('tuition_requirements').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, requirements: data })
}

// Admin only: mark contacted / closed
export async function PATCH(request: NextRequest) {
  const token = getAuthCookieFromRequest(request)
  const user = token ? verifyJWT(token) : null
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
  }
  const { id, status } = await request.json()
  if (!id || !['new', 'contacted', 'closed'].includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid id or status' }, { status: 400 })
  }
  const { error } = await supa().from('tuition_requirements').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
