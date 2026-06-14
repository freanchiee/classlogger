// src/app/api/teacher/students/route.ts - Fixed with proper database types

import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Database, TentativeScheduleData } from '@/types/database'

// Use proper database types from schema
// type ClassRow = Database['public']['Tables']['classes']['Row']
type StudentInvitationRow = Database['public']['Tables']['student_invitations']['Row']

// Extended types for joined queries - match actual Supabase query results
interface EnrollmentQueryResult {
  id: string
  class_id: string
  student_id: string
  status: string
  enrollment_date: string | null
  classes_per_week: number | null
  classes_per_recharge: number | null
  subject?: string | null
  year_group?: string | null
  tentative_schedule: TentativeScheduleData | null
  whatsapp_group_url: string | null
  google_meet_url: string | null
  setup_completed: boolean | null
  created_at: string
  profiles: {
    id: string
    full_name: string | null
    email: string
  } | null
}

interface ParentRelationQueryResult {
  child_id: string
  profiles: {
    id: string
    full_name: string | null
    email: string
  } | null
}

interface EnrollmentWithMeetUrlResult {
  id: string
  student_id: string
  google_meet_url: string | null
  profiles: {
    full_name: string | null
    email: string
  } | null
}

// Define proper types for our data structures
interface StudentData {
  id: string
  student_id: string
  student_name: string
  parent_name: string
  parent_email: string
  subject: string
  year_group: string
  classes_per_week: number
  classes_per_recharge: number
  tentative_schedule: TentativeScheduleData | null
  whatsapp_group_url: string | null
  google_meet_url: string | null
  setup_completed: boolean
  enrollment_date: string
  status: string
  class_name: string
}

interface InvitationData {
  id: string
  teacher_id: string
  invitation_token: string
  student_name: string
  parent_name: string
  parent_email: string
  subject: string
  year_group: string
  classes_per_week: number
  classes_per_recharge: number
  tentative_schedule: TentativeScheduleData | null
  whatsapp_group_url: string | null
  google_meet_url: string | null
  status: string
  expires_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

// Types are properly defined and available for use

export async function GET() {
  try {
    console.log('🔧 API Route: Starting GET request')
    console.log('🔧 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('🔧 Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    console.log('🔧 Supabase client created successfully')
    console.log('🔧 User:', user ? user.id : 'No user')
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch data
    const studentsData = await fetchTeacherStudents(supabase, user.id)
    const invitationsData = await fetchPendingInvitations(supabase, user.id)
    
    console.log('📦 About to send response with students:', studentsData.length)
    console.log('📦 First student in response:', studentsData[0] ? JSON.stringify(studentsData[0]) : 'No students')
    
    // Calculate stats
    const stats = calculateStudentStats(studentsData, invitationsData)
    
    const responseData = {
      students: studentsData,
      invitations: invitationsData,
      stats: stats,
      success: true
    }
    
    console.log('📤 Final response object keys:', Object.keys(responseData))
    console.log('📤 Response students array length:', responseData.students.length)
    
    return NextResponse.json(responseData)

  } catch (error) {
    console.error('💥 Students API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function fetchTeacherStudents(supabase: ReturnType<typeof createClient<Database>>, teacherId: string): Promise<StudentData[]> {
  try {
    console.log('🔍 Fetching students for teacher:', teacherId)
    
    // Query enrollments directly by teacher_id (since enrollments table has teacher_id column)
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        class_id,
        student_id,
        teacher_id,
        subject,
        year_group,
        status,
        enrollment_date,
        classes_per_week,
        classes_per_recharge,
        tentative_schedule,
        whatsapp_group_url,
        google_meet_url,
        setup_completed,
        created_at,
        profiles!enrollments_student_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('status', 'active')

    console.log('📊 Enrollments query result:', { 
      count: enrollments?.length || 0, 
      error: enrollmentsError,
      teacherId 
    })

    if (enrollmentsError) {
      console.error('❌ Enrollments error:', enrollmentsError)
      return []
    }

    if (!enrollments || enrollments.length === 0) {
      return []
    }

    // Get parent information for each student
    const studentIds = (enrollments as unknown as EnrollmentQueryResult[]).map((e) => e.student_id).filter(Boolean)
    const parentMap = new Map<string, { id: string; full_name: string | null; email: string }>()

    if (studentIds.length > 0) {
      const { data: parentRelations, error: parentError } = await supabase
        .from('parent_child_relationships')
        .select(`
          child_id,
          profiles!parent_child_relationships_parent_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .in('child_id', studentIds)

      if (parentError) {
        console.error('❌ Parent relations error:', parentError)
      } else if (parentRelations) {
        // Create a map of student to parent
        (parentRelations as unknown as ParentRelationQueryResult[]).forEach((relation) => {
          const parentProfile = relation.profiles
          if (parentProfile) {
            parentMap.set(relation.child_id, parentProfile)
          }
        })
      }
    }

    // Transform data to match our interface with improved error handling and data validation
    const students: StudentData[] = (enrollments as unknown as EnrollmentQueryResult[]).map((enrollment) => {
      // Validate student profile data
      const student = enrollment.profiles
      if (!student) {
        console.error('❌ Missing student profile data for enrollment:', enrollment.id)
      }
      
      // Validate parent information with better fallbacks
      const parentInfo = parentMap.get(enrollment.student_id) || { 
        id: '',
        full_name: 'Parent Info Missing', 
        email: ''
      }
      
      // Use subject and year_group directly from enrollment (they're stored there)
      const subject = (enrollment as EnrollmentQueryResult).subject || 'General'
      const yearGroup = (enrollment as EnrollmentQueryResult).year_group || 'Not Specified'

      return {
        id: enrollment.id,
        student_id: enrollment.student_id,
        student_name: student?.full_name || 'Unknown Student',
        parent_name: parentInfo.full_name || 'Parent Info Missing',
        parent_email: parentInfo.email || '',
        subject: subject,
        year_group: yearGroup,
        classes_per_week: enrollment.classes_per_week || 1,
        classes_per_recharge: enrollment.classes_per_recharge || 4,
        tentative_schedule: enrollment.tentative_schedule || null,
        whatsapp_group_url: enrollment.whatsapp_group_url || null,
        google_meet_url: enrollment.google_meet_url || null,
        setup_completed: enrollment.setup_completed === true,
        enrollment_date: enrollment.created_at || enrollment.enrollment_date || '',
        status: enrollment.status || 'active',
        class_name: `${subject} - ${yearGroup}`
      }
    })

    return students

  } catch (error) {
    console.error('💥 Error fetching students:', error)
    return []
  }
}

async function fetchPendingInvitations(supabase: ReturnType<typeof createClient<Database>>, teacherId: string): Promise<InvitationData[]> {
  try {
    const { data: invitations, error: invitationsError } = await supabase
      .from('student_invitations')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('status', 'pending')
      .limit(10)

    if (invitationsError) {
      console.error('❌ Invitations error:', invitationsError)
      return []
    }
    
    if (!invitations || invitations.length === 0) {
      return []
    }
    
    // Transform data with proper validation and fallbacks
    return (invitations as StudentInvitationRow[]).map(inv => ({
      id: inv.id,
      teacher_id: inv.teacher_id || '',
      invitation_token: inv.invitation_token,
      student_name: inv.student_name || 'Unnamed Student',
      parent_name: inv.parent_name || 'Unnamed Parent',
      parent_email: inv.parent_email || '',
      subject: inv.subject || 'General',
      year_group: inv.year_group || 'Not Specified',
      classes_per_week: inv.classes_per_week || 1,
      classes_per_recharge: inv.classes_per_recharge || 4,
      tentative_schedule: inv.tentative_schedule || null,
      whatsapp_group_url: inv.whatsapp_group_url || null,
      google_meet_url: inv.google_meet_url || null,
      status: inv.status || 'pending',
      expires_at: inv.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: inv.completed_at || null,
      created_at: inv.created_at || new Date().toISOString(),
      updated_at: inv.updated_at || new Date().toISOString()
    })) || []

  } catch (error) {
    console.error('💥 Error fetching invitations:', error)
    return []
  }
}

function calculateStudentStats(students: StudentData[], invitations: InvitationData[]) {
  const totalStudents = students.length
  
  // More strict setup completion check
  const completeSetup = students.filter(student => {
    // Must have BOTH URLs AND setup_completed flag
    return student.setup_completed === true && 
           student.whatsapp_group_url && 
           student.google_meet_url &&
           student.whatsapp_group_url.trim() !== '' &&
           student.google_meet_url.trim() !== ''
  }).length
  
  // Students who don't meet the complete setup criteria
  const incompleteSetup = totalStudents - completeSetup
  
  const pendingInvitations = invitations.length

  return {
    totalStudents,
    completeSetup,
    incompleteSetup,
    pendingInvitations
  }
}

// 🔧 ENHANCED: Duplicate validation helper functions
async function validateGoogleMeetUrl(supabase: ReturnType<typeof createClient<Database>>, teacherId: string, googleMeetUrl: string, excludeInvitationId?: string) {
  if (!googleMeetUrl || !googleMeetUrl.trim()) {
    return { isValid: true } // URL is optional, so empty is valid
  }

  const cleanUrl = googleMeetUrl.trim()

  // Check existing enrollments with proper teacher_id validation
  const { data: existingEnrollments, error: enrollmentError } = await supabase
    .from('enrollments')
    .select(`
      id,
      student_id,
      class_id,
      google_meet_url,
      profiles!enrollments_student_id_fkey (
        full_name,
        email
      ),
      classes!inner(
        id,
        teacher_id
      )
    `)
    .eq('classes.teacher_id', teacherId) // Ensure we only check enrollments for this teacher
    .eq('google_meet_url', cleanUrl)
    .eq('status', 'active')

  if (enrollmentError) {
    console.error('❌ Error checking existing enrollments:', enrollmentError)
    throw new Error('Database error while checking Meet URL')
  }

  if (existingEnrollments && existingEnrollments.length > 0) {
    const conflictingStudent = (existingEnrollments[0] as unknown as EnrollmentWithMeetUrlResult).profiles
    return {
      isValid: false,
      error: `This Google Meet URL is already assigned to ${conflictingStudent?.full_name || 'another student'} (${conflictingStudent?.email || 'unknown email'}). Each student must have a unique Meet URL.`,
      conflictType: 'duplicate_meet_url_enrollment',
      existingStudent: {
        name: conflictingStudent?.full_name,
        email: conflictingStudent?.email
      }
    }
  }

  // Check pending invitations (exclude current invitation if updating)
  let invitationQuery = supabase
    .from('student_invitations')
    .select('id, student_name, parent_email, google_meet_url')
    .eq('teacher_id', teacherId)
    .eq('google_meet_url', cleanUrl)
    .eq('status', 'pending')

  if (excludeInvitationId) {
    invitationQuery = invitationQuery.neq('id', excludeInvitationId)
  }

  const { data: existingInvitations, error: invitationError } = await invitationQuery

  if (invitationError) {
    console.error('❌ Error checking existing invitations:', invitationError)
    throw new Error('Database error while checking pending invitations')
  }

  if (existingInvitations && existingInvitations.length > 0) {
    const conflictingInvitation = existingInvitations[0] as StudentInvitationRow
    return {
      isValid: false,
      error: `This Google Meet URL is already assigned to pending invitation for ${conflictingInvitation.student_name} (${conflictingInvitation.parent_email}). Each student must have a unique Meet URL.`,
      conflictType: 'duplicate_meet_url_invitation',
      existingInvitation: {
        student_name: conflictingInvitation.student_name,
        parent_email: conflictingInvitation.parent_email
      }
    }
  }

  return { isValid: true }
}

async function validateStudentEmail(supabase: ReturnType<typeof createClient<Database>>, teacherId: string, studentEmail: string) {

  if (!studentEmail || !studentEmail.trim()) {
    return { isValid: true } // Student email is optional in invitations
  }

  const cleanEmail = studentEmail.toLowerCase().trim()

  // Check if student already has an active enrollment with this teacher
  const { data: existingEnrollments, error: enrollmentError } = await supabase
    .from('enrollments')
    .select(`
      id,
      student_id,
      google_meet_url,
      profiles!enrollments_student_id_fkey (
        id,
        full_name,
        email
      ),
      classes!inner(
        id,
        teacher_id
      )
    `)
    .eq('classes.teacher_id', teacherId)
    .eq('status', 'active')

  if (enrollmentError) {
    console.error('❌ Error checking student enrollments:', enrollmentError)
    throw new Error('Database error while checking student enrollment')
  }

  // Filter by student email
  const studentEnrollment = (existingEnrollments as unknown as Array<{
    id: string
    student_id: string
    google_meet_url: string | null
    profiles: {
      id: string
      full_name: string | null
      email: string
    } | null
  }>)?.find(e => 
    e.profiles?.email?.toLowerCase() === cleanEmail
  )

  if (studentEnrollment) {
    return {
      isValid: false,
      error: `${studentEnrollment.profiles?.full_name} is already enrolled with you. Their current Google Meet URL is: ${studentEnrollment.google_meet_url || 'Not set'}`,
      conflictType: 'duplicate_student_enrollment',
      existingEnrollment: {
        id: studentEnrollment.id,
        student_name: studentEnrollment.profiles?.full_name,
        meet_url: studentEnrollment.google_meet_url
      }
    }
  }

  return { isValid: true }
}

// POST endpoint for creating new student invitations - ENHANCED with duplicate prevention
export async function POST(request: NextRequest) {
  try {
    // Use Next.js 15 compatible helper
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    const body = await request.json()
    const {
      student_name,
      student_email,
      parent_name,
      parent_email,
      subject,
      year_group,
      classes_per_week = 1,
      classes_per_recharge = 4,
      tentative_schedule,
      whatsapp_group_url,
      google_meet_url
    } = body

    // Validate required fields with more detailed error messages
    const missingFields = [];
    if (!student_name) missingFields.push('student_name');
    if (!parent_name) missingFields.push('parent_name');
    if (!parent_email) missingFields.push('parent_email');
    if (!subject) missingFields.push('subject');
    if (!year_group) missingFields.push('year_group');
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        required: ['student_name', 'parent_name', 'parent_email', 'subject', 'year_group'],
        missing: missingFields
      }, { status: 400 })
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (parent_email && !emailRegex.test(parent_email)) {
      return NextResponse.json({
        error: 'Invalid parent email format',
        field: 'parent_email'
      }, { status: 400 })
    }
    
    if (student_email && !emailRegex.test(student_email)) {
      return NextResponse.json({
        error: 'Invalid student email format',
        field: 'student_email'
      }, { status: 400 })
    }

    // 🔧 ENHANCED: Validate Google Meet URL for duplicates
    if (google_meet_url) {
      try {
        const meetUrlValidation = await validateGoogleMeetUrl(supabase, user.id, google_meet_url)
        if (!meetUrlValidation.isValid) {
          return NextResponse.json({
            success: false,
            error: meetUrlValidation.error,
            conflict_type: meetUrlValidation.conflictType,
            existing_student: meetUrlValidation.existingStudent,
            existing_invitation: meetUrlValidation.existingInvitation
          }, { status: 409 })
        }
      } catch (error) {
        console.error('❌ Meet URL validation error:', error)
        return NextResponse.json({
          error: 'Failed to validate Google Meet URL',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // 🔧 ENHANCED: Validate student email for duplicates
    if (student_email) {
      try {
        const studentEmailValidation = await validateStudentEmail(supabase, user.id, student_email)
        if (!studentEmailValidation.isValid) {
          return NextResponse.json({
            success: false,
            error: studentEmailValidation.error,
            conflict_type: studentEmailValidation.conflictType,
            existing_enrollment: studentEmailValidation.existingEnrollment
          }, { status: 409 })
        }
      } catch (error) {
        console.error('❌ Student email validation error:', error)
        return NextResponse.json({
          error: 'Failed to validate student email',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // Generate a simple invitation token
    const invitation_token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    // Parse tentative_schedule if it's a string
    let scheduleData: TentativeScheduleData | null = null
    if (tentative_schedule && typeof tentative_schedule === 'string') {
      scheduleData = { note: tentative_schedule }
    } else if (tentative_schedule) {
      scheduleData = tentative_schedule as TentativeScheduleData
    }

    // Prepare the insert data with proper types
    const insertData: Database['public']['Tables']['student_invitations']['Insert'] = {
      teacher_id: user.id,
      invitation_token,
      student_name: student_name.trim(),
      parent_name: parent_name.trim(),
      parent_email: parent_email.toLowerCase().trim(),
      subject: subject.trim(),
      year_group: year_group.trim(),
      classes_per_week,
      classes_per_recharge,
      tentative_schedule: scheduleData,
      whatsapp_group_url: whatsapp_group_url ? whatsapp_group_url.trim() : null,
      google_meet_url: google_meet_url ? google_meet_url.trim() : null,
      status: 'pending',
      // Invitation links do not expire (far-future date keeps the column valid)
      expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
    }

    // 🔧 ENHANCED: Add student_email if provided
    if (student_email) {
      insertData.student_email = student_email.toLowerCase().trim()
    }

    // Create student invitation with all fields and duplicate protection
    const { data: invitation, error: invitationError } = await supabase
      .from('student_invitations')
      .insert(insertData)
      .select()
      .single()

    if (invitationError) {
      console.error('❌ Invitation creation error:', invitationError)
      
      // Check if it's a constraint violation that we missed
      if (invitationError.message.includes('unique') || 
          invitationError.message.includes('duplicate') ||
          invitationError.message.includes('already exists')) {
        return NextResponse.json({
          success: false,
          error: 'A similar invitation already exists. Please check for duplicates.',
          conflict_type: 'constraint_violation',
          details: invitationError.message
        }, { status: 409 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to create invitation',
        details: invitationError.message
      }, { status: 500 })
    }

    // Generate invitation URL. Prefer the actual request origin so the link
    // always matches the deployment (production or local); fall back to env.
    const baseUrl =
      request.nextUrl?.origin ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://classlogger.com'
    const invitationUrl = `${baseUrl}/onboarding/${invitation_token}`

    return NextResponse.json({
      success: true,
      invitation,
      invitation_url: invitationUrl,
      message: 'Student invitation created successfully with duplicate prevention'
    })

  } catch (error) {
    console.error('💥 POST Students API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
