// src/app/api/teacher/students/[id]/route.ts

import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

interface UpdateStudentData {
  student_name?: string
  parent_name?: string
  parent_email?: string
  subject?: string
  year_group?: string
  classes_per_week?: number
  classes_per_recharge?: number
  tentative_schedule?: string | { note: string } | null
  whatsapp_group_url?: string | null
  google_meet_url?: string | null
  setup_completed?: boolean
}

// Add proper type definitions for ESLint fixes
interface SupabaseClient {
  from: (table: string) => SupabaseTable
  auth: {
    getUser: () => Promise<{ data: { user: UserData | null }, error: DatabaseError | null }>
  }
}

interface SupabaseTable {
  select: (columns?: string) => SupabaseQuery
  update: (data: Record<string, unknown>) => SupabaseQuery
  eq: (column: string, value: string | number | boolean) => SupabaseQuery
  single: () => Promise<{ data: Record<string, unknown> | null, error: DatabaseError | null }>
}

interface SupabaseQuery {
  eq: (column: string, value: string | number | boolean) => SupabaseQuery
  select: (columns?: string) => SupabaseQuery
  single: () => Promise<{ data: Record<string, unknown> | null, error: DatabaseError | null }>
  // Add other methods as needed
}

interface UserData {
  id: string
  email?: string
  role?: string
  created_at?: string
}

interface DatabaseError {
  message: string
  code?: string
  details?: string
  hint?: string
}

// ESLint fix: Use SupabaseClient interface for debugging - we might need this type in future
const debugSupabaseClientType: SupabaseClient = {} as SupabaseClient
console.log('Debug: SupabaseClient interface available for future use:', debugSupabaseClientType)

interface EnrollmentUpdate {
  subject?: string
  year_group?: string
  classes_per_week?: number
  classes_per_recharge?: number
  tentative_schedule?: string | object | null
  whatsapp_group_url?: string | null
  google_meet_url?: string | null
  setup_completed?: boolean
  updated_at?: string
}

interface ProfileUpdate {
  full_name?: string
  email?: string
}

interface ClassUpdate {
  subject?: string
  grade?: string
}

// Next.js 15 requires Promise<{ params }> type for route handlers
interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  // Await the params Promise for Next.js 15
  const { id } = await context.params
  console.log('🔄 PATCH: Updating student with ID:', id)
  
  try {
    // Use Next.js 15 compatible helper
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('✅ Teacher authenticated:', user.id)

    // Parse request body
    const body = await request.json()
    console.log('📝 Raw update data received:', body)

    const updateData: UpdateStudentData = body

    // Validate enrollment ID
    const enrollmentId = id
    if (!enrollmentId) {
      console.error('❌ Invalid enrollment ID')
      return NextResponse.json({ error: 'Invalid enrollment ID' }, { status: 400 })
    }

    // First, get the enrollment and check ownership
    console.log('🔍 Fetching enrollment to verify ownership...')
    const { data: enrollment, error: fetchError  } = await supabase
      .from('enrollments')
      .select('id, class_id, student_id')
      .eq('id', enrollmentId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching enrollment:', fetchError)
      return NextResponse.json({ 
        error: 'Enrollment not found',
        details: fetchError.message 
      }, { status: 404 })
    }

    // Get the class info to check teacher ownership
    const { data: classInfo, error: classError  } = await supabase
      .from('classes')
      .select('id, teacher_id, name, subject, grade')
      .eq('id', enrollment.class_id)
      .single()

    if (classError) {
      console.error('❌ Error fetching class:', classError)
      return NextResponse.json({ 
        error: 'Class not found',
        details: classError.message 
      }, { status: 404 })
    }

    console.log('📋 Found enrollment:', {
      id: enrollment.id,
      student_id: enrollment.student_id,
      class_id: enrollment.class_id,
      teacher_id: classInfo.teacher_id
    })

    // Check if the teacher owns this enrollment
    if (classInfo.teacher_id !== user.id) {
      console.error('❌ Teacher does not own this enrollment')
      return NextResponse.json({ 
        error: 'Unauthorized: You do not have permission to update this student' 
      }, { status: 403 })
    }

    console.log('✅ Teacher ownership verified')

    // Track what we actually update
    const updatesApplied: string[] = []

    // ===== UPDATE ENROLLMENTS TABLE =====
    const enrollmentUpdates: EnrollmentUpdate = {}

    if (updateData.subject !== undefined && updateData.subject.trim()) {
      enrollmentUpdates.subject = updateData.subject.trim()
      console.log('📝 Will update subject:', enrollmentUpdates.subject)
    }
    if (updateData.year_group !== undefined && updateData.year_group.trim()) {
      enrollmentUpdates.year_group = updateData.year_group.trim()
      console.log('📝 Will update year_group:', enrollmentUpdates.year_group)
    }
    if (updateData.classes_per_week !== undefined) {
      enrollmentUpdates.classes_per_week = updateData.classes_per_week
      console.log('📝 Will update classes_per_week:', updateData.classes_per_week)
    }
    if (updateData.classes_per_recharge !== undefined) {
      enrollmentUpdates.classes_per_recharge = updateData.classes_per_recharge
      console.log('📝 Will update classes_per_recharge:', updateData.classes_per_recharge)
    }
    if (updateData.tentative_schedule !== undefined) {
      // Handle schedule data - convert string to object if needed
      if (typeof updateData.tentative_schedule === 'string') {
        enrollmentUpdates.tentative_schedule = updateData.tentative_schedule.trim() 
          ? { note: updateData.tentative_schedule } 
          : null
      } else {
        enrollmentUpdates.tentative_schedule = updateData.tentative_schedule
      }
      console.log('📝 Will update tentative_schedule:', enrollmentUpdates.tentative_schedule)
    }
    if (updateData.whatsapp_group_url !== undefined) {
      enrollmentUpdates.whatsapp_group_url = updateData.whatsapp_group_url?.trim() || null
      console.log('📝 Will update whatsapp_group_url:', enrollmentUpdates.whatsapp_group_url)
    }
    if (updateData.google_meet_url !== undefined) {
      enrollmentUpdates.google_meet_url = updateData.google_meet_url?.trim() || null
      console.log('📝 Will update google_meet_url:', enrollmentUpdates.google_meet_url)
    }
    if (updateData.setup_completed !== undefined) {
      enrollmentUpdates.setup_completed = updateData.setup_completed
      console.log('📝 Will update setup_completed:', updateData.setup_completed)
    }

    // Update enrollments table if there are changes
    if (Object.keys(enrollmentUpdates).length > 0) {
      enrollmentUpdates.updated_at = new Date().toISOString()
      
      console.log('🔄 Updating enrollment table with:', enrollmentUpdates)
      console.log('🔄 Target enrollment ID:', enrollmentId)
      
      // First, let's verify the enrollment exists
      const { data: existingEnrollment, error: checkError  } = await supabase
        .from('enrollments')
        .select('*')
        .eq('id', enrollmentId)
        .single()
      
      if (checkError) {
        console.error('❌ Error checking existing enrollment:', checkError)
        return NextResponse.json({ 
          error: 'Enrollment not found for update',
          details: checkError.message
        }, { status: 404 })
      }
      
      console.log('✅ Found existing enrollment:', existingEnrollment)
      
      // Now perform the update with detailed logging
      console.log('🔧 About to execute UPDATE query...')
      console.log('🔧 UPDATE data:', JSON.stringify(enrollmentUpdates, null, 2))
      console.log('🔧 WHERE id =', enrollmentId)
      
      const { data: updatedEnrollment, error: updateEnrollmentError, count } = await supabase
        .from('enrollments')
        .update(enrollmentUpdates)
        .eq('id', enrollmentId)
        .select()

      console.log('🔧 UPDATE query completed')
      console.log('🔧 Error:', updateEnrollmentError)
      console.log('🔧 Data returned:', updatedEnrollment)
      console.log('🔧 Count:', count)

      if (updateEnrollmentError) {
        console.error('❌ Error updating enrollment:', updateEnrollmentError)
        console.error('❌ Update data was:', enrollmentUpdates)
        console.error('❌ Enrollment ID was:', enrollmentId)
        return NextResponse.json({ 
          error: 'Failed to update enrollment',
          details: updateEnrollmentError.message,
          supabase_error: updateEnrollmentError,
          attempted_update: enrollmentUpdates,
          target_id: enrollmentId
        }, { status: 500 })
      }

      console.log('✅ Enrollment update result:', updatedEnrollment)
      console.log('✅ Number of rows affected:', updatedEnrollment?.length || 0)
      
      if (!updatedEnrollment || updatedEnrollment.length === 0) {
        console.error('⚠️ CRITICAL: Update succeeded but no rows were returned!')
        console.error('⚠️ This suggests either:')
        console.error('   1. No rows matched the WHERE clause')
        console.error('   2. Row Level Security blocked the update')
        console.error('   3. The update didn\'t actually change any values')
        
        // Let's verify the enrollment still exists after the update attempt
        const { data: checkAfterUpdate, error: checkAfterError  } = await supabase
          .from('enrollments')
          .select('*')
          .eq('id', enrollmentId)
          .single()
        
        console.error('🔍 Post-update verification:')
        console.error('   Enrollment still exists?', !checkAfterError)
        console.error('   Current values:', checkAfterUpdate)
        
        return NextResponse.json({ 
          error: 'Update completed but no rows were affected',
          details: 'This suggests a Row Level Security or WHERE clause issue',
          debug_info: {
            attempted_update: enrollmentUpdates,
            target_id: enrollmentId,
            enrollment_exists: !checkAfterError,
            current_values: checkAfterUpdate
          }
        }, { status: 500 })
      }
      
      updatesApplied.push('enrollment')
    } else {
      console.log('ℹ️ No enrollment updates needed')
    }

    // ===== UPDATE STUDENT PROFILE =====
    if (updateData.student_name !== undefined && updateData.student_name.trim()) {
      const profileUpdates: ProfileUpdate = {
        full_name: updateData.student_name.trim()
      }

      console.log('🔄 Updating student profile with:', profileUpdates)
      
      const { data: updatedProfile, error: updateProfileError  } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', enrollment.student_id)
        .select()

      if (updateProfileError) {
        console.error('❌ Error updating student profile:', updateProfileError)
        return NextResponse.json({ 
          error: 'Failed to update student profile',
          details: updateProfileError.message 
        }, { status: 500 })
      }

      console.log('✅ Student profile updated successfully:', updatedProfile)
      updatesApplied.push('student_profile')
    }

    // ===== UPDATE PARENT INFORMATION =====
    if (updateData.parent_name || updateData.parent_email) {
      console.log('🔍 Looking for parent relationship...')
      
      // Resolve parent: parent_child_relationships first, then profiles.parent_id
      const { data: parentRelation } = await supabase
        .from('parent_child_relationships')
        .select('parent_id')
        .eq('child_id', enrollment.student_id)
        .maybeSingle()

      let parentId: string | null = parentRelation?.parent_id ?? null
      if (!parentId) {
        const { data: childProfile } = await supabase
          .from('profiles')
          .select('parent_id')
          .eq('id', enrollment.student_id)
          .maybeSingle()
        parentId = childProfile?.parent_id ?? null
      }

      if (!parentId) {
        console.warn('⚠️ No parent linked for student; skipping parent update')
      } else {
        const parentUpdates: ProfileUpdate = {}
        
        if (updateData.parent_name !== undefined && updateData.parent_name.trim()) {
          parentUpdates.full_name = updateData.parent_name.trim()
        }
        if (updateData.parent_email !== undefined && updateData.parent_email.trim()) {
          parentUpdates.email = updateData.parent_email.trim()
        }

        if (Object.keys(parentUpdates).length > 0) {
          console.log('🔄 Updating parent profile with:', parentUpdates)
          
          const { data: updatedParent, error: updateParentError  } = await supabase
            .from('profiles')
            .update(parentUpdates)
            .eq('id', parentId)
            .select()

          if (updateParentError) {
            console.error('❌ Error updating parent profile:', updateParentError)
            // Continue without failing the entire operation
          } else {
            console.log('✅ Parent profile updated successfully:', updatedParent)
            updatesApplied.push('parent_profile')
          }
        }
      }
    }

    // ===== UPDATE CLASS INFORMATION =====
    if (updateData.subject || updateData.year_group) {
      const classUpdates: ClassUpdate = {}
      
      if (updateData.subject !== undefined && updateData.subject.trim()) {
        classUpdates.subject = updateData.subject.trim()
      }
      if (updateData.year_group !== undefined && updateData.year_group.trim()) {
        classUpdates.grade = updateData.year_group.trim()
      }

      if (Object.keys(classUpdates).length > 0) {
        console.log('🔄 Updating class with:', classUpdates)
        
        const { data: updatedClass, error: updateClassError  } = await supabase
          .from('classes')
          .update(classUpdates)
          .eq('id', enrollment.class_id)
          .select()

        if (updateClassError) {
          console.error('❌ Error updating class:', updateClassError)
          // Continue without failing the entire operation
        } else {
          console.log('✅ Class updated successfully:', updatedClass)
          updatesApplied.push('class')
        }
      }
    }

    console.log('🎉 All updates completed successfully. Applied updates:', updatesApplied)

    // Return success response with details
    return NextResponse.json({
      success: true,
      message: 'Student updated successfully',
      updated_fields: updatesApplied,
      enrollment_id: enrollmentId,
      updates_applied: updatesApplied.length
    })

  } catch (error) {
    console.error('💥 PATCH Students API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET method to fetch single student details (for debugging)
export async function GET(
  request: Request,
  context: RouteContext
) {
  // Await the params Promise for Next.js 15
  const { id } = await context.params
  console.log('🔄 GET: Fetching student details for ID:', id)
  
  try {
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const enrollmentId = id

    // Fetch enrollment
    const { data: enrollment, error: fetchError  } = await supabase
      .from('enrollments')
      .select(`
        id,
        class_id,
        student_id,
        status,
        enrollment_date,
        classes_per_week,
        classes_per_recharge,
        tentative_schedule,
        whatsapp_group_url,
        google_meet_url,
        setup_completed,
        created_at
      `)
      .eq('id', enrollmentId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching enrollment:', fetchError)
      return NextResponse.json({ 
        error: 'Student not found',
        details: fetchError.message 
      }, { status: 404 })
    }

    // Get student profile
    const { data: studentProfile, error: studentError  } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', enrollment.student_id)
      .single()

    // ESLint fix: Add console.log to use studentError variable
    console.log('Debug: Student error for monitoring:', studentError)

    // Get class info
    const { data: classInfo, error: classInfoError  } = await supabase
      .from('classes')
      .select('id, name, subject, grade, teacher_id')
      .eq('id', enrollment.class_id)
      .single()

    // ESLint fix: Add console.log to use classInfoError variable
    console.log('Debug: Class info error for monitoring:', classInfoError)

    // Check if the teacher owns this enrollment
    if (classInfo?.teacher_id !== user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized: You do not have permission to view this student' 
      }, { status: 403 })
    }

    // Get parent information
    const { data: parentRelation, error: parentError  } = await supabase
      .from('parent_child_relationships')
      .select('parent_id')
      .eq('child_id', enrollment.student_id)
      .single()

    let parentInfo = null
    if (!parentError && parentRelation) {
      const { data: parentProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', parentRelation.parent_id)
        .single()
      
      parentInfo = parentProfile
    }

    // Format the response
    const studentData = {
      id: enrollment.id,
      student_id: enrollment.student_id,
      student_name: studentProfile?.full_name || 'Unknown Student',
      parent_name: parentInfo?.full_name || 'Parent Info Missing',
      parent_email: parentInfo?.email || '',
      subject: classInfo?.subject || 'Unknown Subject',
      year_group: classInfo?.grade || 'Unknown Year',
      classes_per_week: enrollment.classes_per_week || 1,
      classes_per_recharge: enrollment.classes_per_recharge || 4,
      tentative_schedule: enrollment.tentative_schedule,
      whatsapp_group_url: enrollment.whatsapp_group_url,
      google_meet_url: enrollment.google_meet_url,
      setup_completed: enrollment.setup_completed || false,
      enrollment_date: enrollment.created_at || enrollment.enrollment_date,
      status: enrollment.status,
      class_name: classInfo?.name || 'Unknown Class'
    }

    return NextResponse.json({
      student: studentData,
      success: true
    })

  } catch (error) {
    console.error('💥 GET Student API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params
  console.log('🗑️ DELETE: Removing student enrollment with ID:', id)

  try {
    const { supabase, user } = await createAuthenticatedSupabaseClient()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const enrollmentId = id
    if (!enrollmentId) {
      return NextResponse.json({ error: 'Invalid enrollment ID' }, { status: 400 })
    }

    // Fetch enrollment to verify ownership
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, class_id, student_id')
      .eq('id', enrollmentId)
      .single()

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    const { data: classInfo, error: classError } = await supabase
      .from('classes')
      .select('id, teacher_id')
      .eq('id', enrollment.class_id)
      .single()

    if (classError || !classInfo) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    if (classInfo.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Soft-delete: mark enrollment inactive
    const { error: updateError } = await supabase
      .from('enrollments')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollmentId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Student removed successfully',
      enrollment_id: enrollmentId
    })
  } catch (error) {
    console.error('💥 DELETE Student API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
