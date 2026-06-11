// middleware.ts - Edge-compatible JWT verification (no jsonwebtoken)
import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookieFromRequest } from './lib/cookies'

interface JWTPayload {
  userId: string
  email: string
  role: string
  name: string
  exp?: number
}

// Edge-compatible JWT verification using Web Crypto API
async function verifyJWTEdge(token: string): Promise<JWTPayload | null> {
  try {
    const secret = process.env.JWT_SECRET || 'your-super-secret-key-change-this'
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [header, payload, signature] = parts
    const data = `${header}.${payload}`

    // Import key using Web Crypto API (available in Edge runtime)
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Decode base64url signature
    const base64 = signature.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const sigBytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0))

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data))
    if (!isValid) return null

    // Decode payload
    const payloadBase64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const payloadPadded = payloadBase64.padEnd(payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4), '=')
    const decoded = JSON.parse(atob(payloadPadded)) as JWTPayload

    // Check expiration
    if (decoded.exp && decoded.exp < Date.now() / 1000) return null

    return decoded
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public routes that don't need authentication
  const publicRoutes = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/auth/callback',
    '/auth/extension-callback',
    '/api/auth/create-jwt',
    '/api/auth/me',
    '/api/auth/signin',
    '/api/auth/signup',
    '/api/extension/verify',
  ]

  // Extension routes that need special handling
  const extensionRoutes = [
    '/api/extension',
    '/api/teacher/extension',
  ]

  const isPublicRoute = publicRoutes.some((route) => {
    if (route === '/') return pathname === '/'
    return pathname === route || pathname.startsWith(`${route}/`)
  })

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Get JWT from cookie
  const token = getAuthCookieFromRequest(request)

  if (!token) {
    if (extensionRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Verify JWT using Edge-compatible crypto
  const payload = await verifyJWTEdge(token)
  if (!payload) {
    if (extensionRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Add user info to headers for use in API routes
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId)
  requestHeaders.set('x-user-email', payload.email)
  requestHeaders.set('x-user-role', payload.role)
  requestHeaders.set('x-user-name', payload.name)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
