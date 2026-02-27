// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from './lib/jwt'
import { getAuthCookieFromRequest } from './lib/cookies'

export function middleware(request: NextRequest) {
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
    '/api/extension/verify', // For extension auth
  ]

  // Extension routes that need special handling
  const extensionRoutes = [
    '/api/extension',
    '/api/teacher/extension',
  ]

  const isPublicRoute = publicRoutes.some((route) => {
    if (route === '/') {
      return pathname === '/'
    }
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
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Verify JWT
  const payload = verifyJWT(token)
  if (!payload) {
    if (extensionRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Add user info to headers for use in API routes
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId)
  requestHeaders.set('x-user-email', payload.email)
  requestHeaders.set('x-user-role', payload.role)
  requestHeaders.set('x-user-name', payload.name)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
