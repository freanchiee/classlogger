// src/app/api/extension/save-resource/route.ts
// Saves a resource (uploaded image/file or a link) to a class record's attachments.

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { addCorsHeaders, createOptionsResponse } from '@/lib/cors'
import { verifyJWT } from '@/lib/jwt'

const RESOURCE_BUCKET = 'class-resources'

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Authenticate via extension Bearer token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      const r = NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
      return addCorsHeaders(r, request)
    }
    const decoded = verifyJWT(authHeader.substring(7))
    if (!decoded || decoded.type !== 'extension') {
      const r = NextResponse.json({ success: false, error: 'Invalid authentication token' }, { status: 401 })
      return addCorsHeaders(r, request)
    }

    const body = await request.json()
    const { class_log_id, type, file_data, url, name } = body

    if (!class_log_id || !type) {
      const r = NextResponse.json({ success: false, error: 'Missing class_log_id or type' }, { status: 400 })
      return addCorsHeaders(r, request)
    }

    // Verify the class exists and belongs to this teacher
    const { data: classLog, error: fetchError } = await supabase
      .from('class_logs')
      .select('id, teacher_id, attachments')
      .eq('id', class_log_id)
      .eq('teacher_id', decoded.userId)
      .single()

    if (fetchError || !classLog) {
      const r = NextResponse.json({ success: false, error: 'Class not found or access denied' }, { status: 404 })
      return addCorsHeaders(r, request)
    }

    const existingAttachments = classLog.attachments || {}

    let resourceEntry: Record<string, unknown>

    if (type === 'link') {
      if (!url) {
        const r = NextResponse.json({ success: false, error: 'Missing url for link resource' }, { status: 400 })
        return addCorsHeaders(r, request)
      }
      resourceEntry = {
        kind: 'link',
        url,
        title: name || url,
        timestamp: new Date().toISOString(),
      }
      const links = Array.isArray(existingAttachments.links) ? existingAttachments.links : []
      links.push(resourceEntry)
      existingAttachments.links = links
    } else {
      // image / file upload
      if (!file_data) {
        const r = NextResponse.json({ success: false, error: 'Missing file_data for upload' }, { status: 400 })
        return addCorsHeaders(r, request)
      }
      const base64 = file_data.includes(',') ? file_data.split(',')[1] : file_data
      const buffer = Buffer.from(base64, 'base64')

      // Best-effort: ensure bucket exists
      try {
        await supabase.storage.createBucket(RESOURCE_BUCKET, { public: true, fileSizeLimit: 26214400 })
      } catch { /* already exists */ }

      const ext = (name && name.includes('.')) ? name.split('.').pop() : 'png'
      const safeName = (name || `resource.${ext}`).replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${class_log_id}/${Date.now()}-${safeName}`
      const contentType = ext === 'pdf' ? 'application/pdf'
        : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'webp' ? 'image/webp'
        : ext === 'gif' ? 'image/gif'
        : 'image/png'

      const { error: uploadError } = await supabase.storage
        .from(RESOURCE_BUCKET)
        .upload(filePath, buffer, { contentType, upsert: true })

      if (uploadError) {
        const r = NextResponse.json({ success: false, error: 'Upload failed: ' + uploadError.message }, { status: 500 })
        return addCorsHeaders(r, request)
      }

      const { data: pub } = supabase.storage.from(RESOURCE_BUCKET).getPublicUrl(filePath)
      resourceEntry = {
        kind: 'file',
        url: pub?.publicUrl,
        path: filePath,
        name: name || safeName,
        size: buffer.length,
        timestamp: new Date().toISOString(),
      }
      const resources = Array.isArray(existingAttachments.resources) ? existingAttachments.resources : []
      resources.push(resourceEntry)
      existingAttachments.resources = resources
    }

    const { error: updateError } = await supabase
      .from('class_logs')
      .update({ attachments: existingAttachments, updated_at: new Date().toISOString() })
      .eq('id', class_log_id)

    if (updateError) {
      const r = NextResponse.json({ success: false, error: 'Failed to save: ' + updateError.message }, { status: 500 })
      return addCorsHeaders(r, request)
    }

    const r = NextResponse.json({ success: true, resource: resourceEntry })
    return addCorsHeaders(r, request)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const r = NextResponse.json({ success: false, error: msg }, { status: 500 })
    return addCorsHeaders(r, request)
  }
}
