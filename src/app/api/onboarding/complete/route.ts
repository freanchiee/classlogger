// src/app/api/onboarding/complete/route.ts
import { NextRequest, NextResponse  } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use admin client for user creation - moved inside function

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase admin client inside function to avoid build-time env var issues
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    console.log('=== ONBOARDING API START ===');
    
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
      return NextResponse.json({ 
        success: false, 
        error: 'Server configuration error: Missing Supabase URL' 
      }, { status: 500 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ 
        success: false, 
        error: 'Server configuration error: Missing service role key' 
      }, { status: 500 });
    }

    const body = await request.json();
    console.log('Request body:', body);

    // Updated to match your frontend data structure
    const { 
      invitation_token
    } = body;

    // Validate required fields
    if (!invitation_token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing invitation token' 
      }, { status: 400 });
    }

    console.log('Looking up invitation with token:', invitation_token);

    // Get invitation details using the token (not the ID)
    const { data: invitation, error: invitationError  } = await supabaseAdmin
      .from('student_invitations')
      .select('*')
      .eq('invitation_token', invitation_token)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      console.error('Invitation lookup error:', invitationError);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or expired invitation' 
      }, { status: 400 });
    }

    console.log('Found invitation:', invitation);

    // Invitation links do not expire — no expiry check.

    // Generate automatic credentials (you can modify this logic)
    const parentEmail = invitation.parent_email;
    const studentEmail = invitation.student_email || `${invitation.student_name.toLowerCase().replace(/\s+/g, '.')}@student.local`;
    const parentPassword = generateTempPassword();
    const studentPassword = generateTempPassword();

    console.log('Creating parent user account...');

    // Check if parent user already exists
    const { data: existingParent } = await supabaseAdmin.auth.admin.listUsers();
    const parentExists = existingParent.users.find(user => user.email === parentEmail);

    let parentAuthData;
    if (parentExists) {
      console.log('Parent user already exists, using existing account:', parentExists.id);
      parentAuthData = { user: parentExists };
    } else {
      // Create parent user account
      const { data: newParentAuthData, error: parentAuthError  } = await supabaseAdmin.auth.admin.createUser({
        email: parentEmail,
        password: parentPassword,
        email_confirm: true,
        user_metadata: {
          full_name: invitation.parent_name,
          role: 'parent'
        }
      });

      if (parentAuthError) {
        console.error('Parent user creation error:', parentAuthError);
        return NextResponse.json({ 
          success: false, 
          error: `Failed to create parent account: ${parentAuthError.message}` 
        }, { status: 400 });
      }
      parentAuthData = newParentAuthData;
    }

    console.log('Parent user created:', parentAuthData.user.id);

    console.log('Creating student user account...');

    // Check if student user already exists
    const studentExists = existingParent.users.find(user => user.email === studentEmail);

    let studentAuthData;
    if (studentExists) {
      console.log('Student user already exists, using existing account:', studentExists.id);
      studentAuthData = { user: studentExists };
    } else {
      // Create student user account
      const { data: newStudentAuthData, error: studentAuthError  } = await supabaseAdmin.auth.admin.createUser({
        email: studentEmail,
        password: studentPassword,
        email_confirm: true,
        user_metadata: {
          full_name: invitation.student_name,
          role: 'student'
        }
      });

      if (studentAuthError) {
        console.error('Student user creation error:', studentAuthError);
        // Only clean up if we created the parent in this session
        if (!parentExists) {
          await supabaseAdmin.auth.admin.deleteUser(parentAuthData.user.id);
        }
        return NextResponse.json({ 
          success: false, 
          error: `Failed to create student account: ${studentAuthError.message}` 
        }, { status: 400 });
      }
      studentAuthData = newStudentAuthData;
    }

    console.log('Student user created:', studentAuthData.user.id);

    console.log('Creating profiles...');

    // Check if parent profile already exists
    const { data: existingParentProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', parentAuthData.user.id)
      .single();

    if (!existingParentProfile) {
      // Create parent profile
      const { error: parentProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: parentAuthData.user.id,
          email: parentEmail,
          full_name: invitation.parent_name,
          role: 'parent',
          status: 'active'
        });

      if (parentProfileError) {
        console.error('Parent profile creation error:', parentProfileError);
        // Clean up users if profile creation fails (only if we created them)
        if (!parentExists) {
          await supabaseAdmin.auth.admin.deleteUser(parentAuthData.user.id);
        }
        if (!studentExists) {
          await supabaseAdmin.auth.admin.deleteUser(studentAuthData.user.id);
        }
        return NextResponse.json({ 
          success: false, 
          error: `Failed to create parent profile: ${parentProfileError.message}` 
        }, { status: 500 });
      }
    } else {
      console.log('Parent profile already exists');
    }

    // Check if student profile already exists
    const { data: existingStudentProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', studentAuthData.user.id)
      .single();

    if (!existingStudentProfile) {
      // Create student profile
      const { error: studentProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: studentAuthData.user.id,
          email: studentEmail,
          full_name: invitation.student_name,
          role: 'student',
          parent_id: parentAuthData.user.id,
          grade: invitation.year_group,
          status: 'active'
        });

      if (studentProfileError) {
        console.error('Student profile creation error:', studentProfileError);
        // Clean up everything if student profile creation fails (only if we created them)
        if (!parentExists) {
          await supabaseAdmin.auth.admin.deleteUser(parentAuthData.user.id);
        }
        if (!studentExists) {
          await supabaseAdmin.auth.admin.deleteUser(studentAuthData.user.id);
        }
        return NextResponse.json({ 
          success: false, 
          error: `Failed to create student profile: ${studentProfileError.message}` 
        }, { status: 500 });
      }
    } else {
      console.log('Student profile already exists');
    }

    console.log('Creating parent-child relationship...');

    // Create parent-child relationship
    const { error: relationshipError } = await supabaseAdmin
      .from('parent_child_relationships')
      .insert({
        parent_id: parentAuthData.user.id,
        child_id: studentAuthData.user.id
      });

    if (relationshipError) {
      console.error('Relationship creation error:', relationshipError);
      // Don't fail the whole process for this, just log it
    }

    console.log('Finding teacher class...');

    // Find or create a class for this subject
    const { data: existingClass } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('teacher_id', invitation.teacher_id)
      .eq('subject', invitation.subject)
      .eq('grade', invitation.year_group)
      .eq('status', 'active')
      .single();

    let classId;
    if (existingClass) {
      classId = existingClass.id;
      console.log('Using existing class:', classId);
    } else {
      console.log('Creating new class...');
      const { data: newClass, error: classError  } = await supabaseAdmin
        .from('classes')
        .insert({
          teacher_id: invitation.teacher_id,
          name: `${invitation.subject} - ${invitation.year_group}`,
          subject: invitation.subject,
          grade: invitation.year_group,
          status: 'active'
        })
        .select()
        .single();

      if (classError) {
        console.error('Class creation error:', classError);
        return NextResponse.json({ 
          success: false, 
          error: `Failed to create class: ${classError.message}` 
        }, { status: 500 });
      }
      classId = newClass.id;
      console.log('Created new class:', classId);
    }

    console.log('Creating enrollment...');

    // Create enrollment
    const { error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .insert({
        student_id: studentAuthData.user.id,
        teacher_id: invitation.teacher_id,
        class_id: classId,
        status: 'active',
        enrollment_date: new Date().toISOString(),
        classes_per_week: invitation.classes_per_week,
        classes_per_recharge: invitation.classes_per_recharge,
        tentative_schedule: invitation.tentative_schedule,
        whatsapp_group_url: invitation.whatsapp_group_url,
        google_meet_url: invitation.google_meet_url,
        setup_completed: true
      });

    if (enrollmentError) {
      console.error('Enrollment creation error:', enrollmentError);
      return NextResponse.json({ 
        success: false, 
        error: `Failed to create enrollment: ${enrollmentError.message}` 
      }, { status: 500 });
    }

    console.log('Updating invitation status...');

    // Mark invitation as completed
    const { error: updateInvitationError } = await supabaseAdmin
      .from('student_invitations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateInvitationError) {
      console.error('Invitation update error:', updateInvitationError);
      // Don't fail the process for this
    }

    console.log('=== ONBOARDING SUCCESS ===');

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      credentials: {
        parent: {
          email: parentEmail,
          password: parentPassword,
          name: invitation.parent_name
        },
        student: {
          email: studentEmail,
          password: studentPassword,
          name: invitation.student_name
        }
      },
      data: {
        parentId: parentAuthData.user.id,
        studentId: studentAuthData.user.id,
        classId
      }
    });

  } catch (error) {
    console.error('=== ONBOARDING API ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

// Helper function to generate temporary passwords
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Add GET method for testing
export async function GET() {
  return NextResponse.json({
    message: 'Onboarding API route is accessible via GET',
    timestamp: new Date().toISOString()
  });
}

