// src/app/api/classes/route.ts
// Manual class logging API with enhanced validation + Chrome Extension Support

import { TentativeSchedule } from '@/types/api'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse  } from 'next/server'

interface StartClassRequest {
  teacher_id: string
  student_email: string
  google_meet_url?: string
  meetUrl?: string // Extension format
  enrollment_id?: string
  manual_override?: boolean
  start_time?: string // Extension format
}

interface EndClassRequest {
  class_log_id: string
  teacher_id?: string
  content?: string
  topics_covered?: string[]
  homework_assigned?: string
  end_time?: string // Extension format
}

interface Enrollment {
  id: string
  student_id: string
  class_id: string
  status: string
  google_meet_url: string | null
  tentative_schedule: TentativeSchedule | null
  // Joined data from profiles table
  profiles: {
    full_name: string | null
    email: string
  } | null
  // Joined data from classes table  
  classes: {
    subject: string
    name: string
    teacher_id: string
  } | null
}
// Helper to extract teacher ID from extension auth header
function extractTeacherIdFromAuth(authHeader: string | null, fallbackTeacherId?: string): string | null {
  if (authHeader && authHeader.includes('extension_')) {
    const token = authHeader.replace('Bearer ', '')
    return token.split('_')[1]
  }
  return fallbackTeacherId || null
}

// POST /api/classes - Start a new class
export async function POST(request: NextRequest) {
    // Initialize Supabase client inside function to avoid build-time env var issues
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Initialize Supabase client inside function to avoid build-time env var issues

  try {
    // Initialize Supabase client inside function to avoid build-time env var issues

    const body: StartClassRequest = await request.json()
    const { teacher_id, student_email, google_meet_url, meetUrl, enrollment_id, manual_override = false, start_time } = body

    // Support extension format
    const authHeader = request.headers.get('authorization')
    const extractedTeacherId = extractTeacherIdFromAuth(authHeader, teacher_id)
    let finalTeacherId = teacher_id
if (extractedTeacherId) {
  finalTeacherId = extractedTeacherId
}

    // Support both google_meet_url and meetUrl (extension format)
    const meetUrlToUse = google_meet_url || meetUrl

    console.log('📚 Class start requested:', { teacher_id, student_email, manual_override, isExtension: !!authHeader?.includes('extension_') })

    // 1. Validate required fields.
    // Web (no-extension) logging: the teacher selects a student, so enrollment_id
    // alone is enough — student_email and Meet URL are derived from the enrollment.
    // Extension/legacy logging: needs student_email + Meet URL.
    if (!teacher_id || (!enrollment_id && (!student_email || !meetUrlToUse))) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: teacher_id, and either enrollment_id or (student_email + google_meet_url/meetUrl)'
      }, { status: 400 })
    }

    // 2. Get enrollment details
    let enrollment: Enrollment | null = null
    if (enrollment_id) {
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select(`
          id,
          student_id,
          class_id,
          status,
          google_meet_url,
          tentative_schedule,
          profiles:student_id (
            full_name,
            email
          ),
          classes:class_id (
            subject,
            name,
            teacher_id
          )
        `)
        
        .eq('id', enrollment_id)
        .eq('status', 'active')
        .single()

      enrollment = enrollmentData as Enrollment | null
    } else {
      // Find enrollment by teacher and student email OR by meet URL (for extension)
      const query = supabase
        .from('enrollments')
        .select(`
          id,
          student_id,
          class_id,
          status,
          google_meet_url,
          tentative_schedule,
          profiles:student_id (
            full_name,
            email
          ),
          classes:class_id (
            subject,
            name,
            teacher_id
          )
        `)
        .eq('status', 'active')

      // For extension, try to find by Meet URL first, then by student email
      if (authHeader?.includes('extension_')) {
        const { data: enrollmentByUrl } = await query
          .eq('google_meet_url', meetUrlToUse)
          .single()
        
          if (enrollmentByUrl) {
            enrollment = enrollmentByUrl as unknown as Enrollment
          }
      }

      // If not found by URL, try by student email
      if (!enrollment) {
        const { data: enrollmentData } = await query
        .eq('profiles.email', student_email)
        .single()

          enrollment = enrollmentData as unknown as Enrollment | null

      }
    }

    if (!enrollment) {
      return NextResponse.json({ 
        success: false,
        error: 'No active enrollment found for this teacher-student combination or Meet URL' 
      }, { status: 404 })
    }

    // 3. Validate teacher permissions
    if (enrollment.classes?.teacher_id !== finalTeacherId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: You can only start classes for your own students'
      }, { status: 403 })
    }

    // Derive the student email from the enrollment when the caller didn't pass one
    // (web dropdown flow only sends enrollment_id).
    const effectiveStudentEmail = student_email || enrollment.profiles?.email || ''

    // 4. Check if class is already active
    const today = new Date().toISOString().split('T')[0]
    const { data: activeLog } = await supabase
      .from('class_logs')
      .select('*')
      .eq('student_email', effectiveStudentEmail)
      .eq('teacher_id', finalTeacherId)
      .eq('status', 'in_progress')
      .eq('date', today)
      .single()

    if (activeLog) {
      return NextResponse.json({ 
        success: false,
        error: 'Class already in progress for this student today',
        class_log_id: activeLog.id
      }, { status: 409 })
    }

    // 5. Enhanced validation (can be bypassed with manual_override or for extension)
    const isExtensionRequest = authHeader?.includes('extension_')
    if (!manual_override && !isExtensionRequest) {
      const validationResult = await validateClassStart(enrollment, meetUrlToUse || enrollment.google_meet_url || '')
      if (!validationResult.valid) {
        return NextResponse.json({ 
          success: false,
          error: validationResult.reason,
          can_override: true,
          suggestion: 'Use manual_override: true to bypass validation'
        }, { status: 400 })
      }
    }

    // 6. Start the class
   // REPLACE the classData object:
const classData = {
  teacher_id: finalTeacherId,
  student_name: enrollment.profiles?.full_name || 'Unknown Student',
  student_email: effectiveStudentEmail,
  google_meet_link: meetUrlToUse || enrollment.google_meet_url || null,
  subject: enrollment.classes?.subject || 'Unknown Subject',
  enrollment_id: enrollment.id
}
    const classLog = await startClassLog(supabase, classData, false, start_time) // false = manually started

    return NextResponse.json({
      success: true,
      class_log_id: classLog.id,
      message: 'Class started successfully',
      class_log: classLog
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error starting class:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to start class', 
      message: errorMessage 
    }, { status: 500 })
  }
}

// PUT /api/classes - End a class
export async function PUT(request: NextRequest) {
    // Initialize Supabase client inside function to avoid build-time env var issues
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Initialize Supabase client inside function to avoid build-time env var issues

  try {
    // Initialize Supabase client inside function to avoid build-time env var issues

    const body: EndClassRequest = await request.json()
    const { class_log_id, teacher_id, content, topics_covered, homework_assigned, end_time } = body

    // Support extension format
    const authHeader = request.headers.get('authorization')
    const extractedTeacherId = extractTeacherIdFromAuth(authHeader, teacher_id)
    let finalTeacherId = teacher_id
    if (extractedTeacherId) {
      finalTeacherId = extractedTeacherId
    }

    console.log('🔚 Class end requested:', { class_log_id, teacher_id: finalTeacherId, isExtension: !!authHeader?.includes('extension_') })

    // 1. Validate required fields
    if (!class_log_id) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing required field: class_log_id' 
      }, { status: 400 })
    }

    // 2. Get the class log
    let query = supabase
      .from('class_logs')
      .select('*')
      .eq('id', class_log_id)

    // If teacher_id is provided, validate ownership
    if (finalTeacherId) {
      query = query.eq('teacher_id', finalTeacherId)
    }
    const { data: classLog, error: fetchError  } = await query.single()

    if (fetchError || !classLog) {
      return NextResponse.json({ 
        success: false,
        error: 'Class log not found or unauthorized' 
      }, { status: 404 })
    }

    // 3. Check if class is still active
    if (classLog.status !== 'in_progress') {
      return NextResponse.json({ 
        success: false,
        error: `Class is already ${classLog.status}` 
      }, { status: 400 })
    }

    // 4. End the class
    const now = end_time ? new Date(end_time) : new Date()
    const startTime = new Date(classLog.start_time || now.toISOString())
    const durationMinutes = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60))

    const updatedContent = content || `${classLog.content} - Duration: ${Math.floor(durationMinutes/60)}h ${durationMinutes%60}m`

    const { data: updatedLog, error: updateError  } = await supabase
      .from('class_logs')
      .update({
        end_time: now.toISOString(),
        duration_minutes: durationMinutes,
        status: 'completed',
        content: updatedContent,
        topics_covered: topics_covered || classLog.topics_covered,
        homework_assigned: homework_assigned || classLog.homework_assigned,
        updated_at: now.toISOString()
      })
      .eq('id', class_log_id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update class log: ${updateError.message}`)
    }

    // Wait a moment for the trigger to process credit deduction
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Get updated class data with payment information
    const { data: finalClassData, error: finalFetchError  } = await supabase
      .from('class_logs')
      .select('*')
      .eq('id', class_log_id)
      .single()

    let creditDeductionInfo = null
    let creditMessage = ''
    if (!finalFetchError && finalClassData) {
      creditDeductionInfo = {
        credits_deducted: finalClassData.credits_deducted || 0,
        payment_status: finalClassData.payment_status || 'unpaid',
        is_paid: finalClassData.is_paid || false
      }

      // Prepare user-friendly credit deduction message
      if (creditDeductionInfo.payment_status === 'paid') {
        creditMessage = `✅ ${creditDeductionInfo.credits_deducted} credit hours deducted`
      } else if (creditDeductionInfo.payment_status === 'partial') {
        creditMessage = `⚠️ ${creditDeductionInfo.credits_deducted} credit hours deducted (partial payment)`
      } else {
        creditMessage = '❌ No credits available - marked as unpaid'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Class ended successfully',
      duration_minutes: durationMinutes,
      class_log: finalClassData || updatedLog,
      credit_deduction: creditDeductionInfo,
      credit_message: creditMessage
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error ending class:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to end class', 
      message: errorMessage 
    }, { status: 500 })
  }
}

// GET /api/classes - Get active classes for a teacher
export async function GET(request: NextRequest) {
    // Initialize Supabase client inside function to avoid build-time env var issues
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Initialize Supabase client inside function to avoid build-time env var issues

  try {
    // Initialize Supabase client inside function to avoid build-time env var issues

    const { searchParams } = new URL(request.url)
    const teacher_id = searchParams.get('teacher_id')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!teacher_id) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing required parameter: teacher_id' 
      }, { status: 400 })
    }

    const { data: classLogs, error } = await supabase
      .from('class_logs')
      .select('*')
      .eq('teacher_id', teacher_id)
      .eq('date', date)
      .order('start_time', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch class logs: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      date,
      class_logs: classLogs || []
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error fetching classes:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch classes', 
      message: errorMessage 
    }, { status: 500 })
  }
}

// Helper Functions

async function validateClassStart(enrollment: Enrollment, meetUrl: string): Promise<{valid: boolean, reason?: string}> {
  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes() // minutes since midnight
  const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.

  // 1. Check if Google Meet URL matches enrollment
  if (enrollment.google_meet_url && enrollment.google_meet_url !== meetUrl) {
    return {
      valid: false,
      reason: 'Google Meet URL does not match the enrolled class URL'
    }
  }

  // 2. Check reasonable time bounds (6 AM to 11 PM)
  if (currentTime < 360 || currentTime > 1380) { // 6 AM to 11 PM
    return {
      valid: false,
      reason: 'Classes can only be scheduled between 6:00 AM and 11:00 PM'
    }
  }

  // 3. Check tentative schedule if available
  if (enrollment.tentative_schedule) {
    const schedule = enrollment.tentative_schedule
    const validationResult = validateSchedule(schedule, currentDay, currentTime)
    if (!validationResult.valid) {
      return validationResult
    }
  }

  // 4. Check if Google Meet is accessible
  const isMeetAccessible = await isMeetingAccessible(meetUrl)
  if (!isMeetAccessible) {
    return {
      valid: false,
      reason: 'Google Meet URL is not accessible or meeting room is not available'
    }
  }

  return { valid: true }
}

function validateSchedule(schedule: TentativeSchedule | null, currentDay: number, currentTime: number): {valid: boolean, reason?: string} {
  if (!schedule) return { valid: true }
  
  // Handle the days array structure from your schema
  if (schedule.days && Array.isArray(schedule.days)) {
    for (const slot of schedule.days) {
      if (slot.day && slot.time) {
        const slotTime = parseTime(slot.time)
        if (slotTime && Math.abs(currentTime - slotTime) <= 30) {
          return { valid: true }
        }
      }
    }
    return {
      valid: false,
      reason: 'Current time does not match any scheduled class slots'
    }
  }
  
  return { valid: true }
}
function parseTime(timeStr: string): number | null {
  if (!timeStr) return null
  
  // Handle HH:MM format
  const match = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (match) {
    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    return hours * 60 + minutes
  }
  
  return null
}

async function isMeetingAccessible(meetUrl: string): Promise<boolean> {
  try {
    const response = await fetch(meetUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ClassLogger/1.0)'
      },
      signal: AbortSignal.timeout(5000)
    })

    return response.status === 200
  } catch (error) {
    console.warn(`⚠️ Could not check meeting accessibility: ${error}`)
    return true // Default to allowing if we can't check
  }
}

interface ClassData {
  teacher_id: string
  student_name: string
  student_email: string
  google_meet_link: string | null
  subject: string
  enrollment_id?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function startClassLog(supabase: any, classData: ClassData, isAutoDetected: boolean = true, customStartTime?: string) {
  const now = customStartTime ? new Date(customStartTime) : new Date()
  const today = now.toISOString().split('T')[0]

  console.log('📝 Creating new class log...', {
    student: classData.student_name,
    subject: classData.subject,
    auto: isAutoDetected,
    time: now.toLocaleTimeString()
  })

  const contentPrefix = isAutoDetected ? 'Auto-detected' : 'Manually started'
  const content = `${contentPrefix} class with ${classData.student_name} - ${classData.subject}`

  const { data, error } = await supabase
    .from('class_logs')
    .insert([{
      teacher_id: classData.teacher_id,
      date: today,
      content,
      topics_covered: [],
      homework_assigned: null,
      attendance_count: 1,
      total_students: 1,
      status: 'in_progress',
      attachments: null,
      start_time: now.toISOString(),
      end_time: null,
      duration_minutes: null,
      google_meet_link: classData.google_meet_link,
      detected_automatically: isAutoDetected,
      student_name: classData.student_name,
      student_email: classData.student_email,
      enrollment_id: classData.enrollment_id
    }])
    .select()
    .single()

  if (error) {
    console.error('❌ Failed to create class log:', error)
    throw new Error(`Failed to start class log: ${error.message}`)
  }

  console.log('✅ Class log created successfully:', data?.id)
  return data
}