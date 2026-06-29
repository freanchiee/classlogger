'use client'

import React, { createContext, useContext, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { NotificationCenter } from '@/components/NotificationCenter'

interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  role: 'teacher' | 'parent' | 'student'
}

interface DashboardLayoutProps {
  children: React.ReactNode
  user: User
}

// Create user context
const UserContext = createContext<User | null>(null)

// Hook to use user context
export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a DashboardLayout')
  }
  return context
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    // Use the working Supabase client
    await supabase.auth.signOut()
    router.push('/')
  }

  // Reactive active-route check (usePathname updates on client navigation)
  const dashboardHome = `/dashboard/${user.role}`
  const isActive = (href: string) => {
    const current = pathname || ''
    // Dashboard home must match exactly (otherwise it matches every sub-page)
    if (href === dashboardHome) {
      return current === href || current === `${href}/`
    }
    // Sub-pages: exact match or a nested route under this href
    return current === href || current.startsWith(`${href}/`)
  }

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      { 
        icon: '🏠', 
        label: 'Dashboard', 
        href: `/dashboard/${user.role}`
      }
    ]

    switch (user.role) {
      case 'teacher':
        return [
          ...baseItems,
          { icon: '📚', label: 'My Classes', href: '/dashboard/teacher/classes' },
          { icon: '👥', label: 'Students', href: '/dashboard/teacher/students' },
          { icon: '📅', label: 'Class Log', href: '/dashboard/teacher/logs' },
          { icon: '🗓️', label: 'Booking Management', href: '/dashboard/teacher/booking' },
          { icon: '💰', label: 'Payments', href: '/dashboard/teacher/payments' }
        ]
      
      case 'parent':
        return [
          ...baseItems,
          // Most parent pages don't exist yet, keeping only the main dashboard
          // { icon: '👶', label: 'My Children', href: '/dashboard/parent/children' },
          // { icon: '📖', label: 'Class Logs', href: '/dashboard/parent/logs' },
          // { icon: '💳', label: 'Payments', href: '/dashboard/parent/payments' },
          // { icon: '📅', label: 'Schedule', href: '/dashboard/parent/schedule' },
          // { icon: '💬', label: 'Messages', href: '/dashboard/parent/messages' },
          // { icon: '📈', label: 'Progress', href: '/dashboard/parent/progress' }
        ]
      
      case 'student':
        return [
          ...baseItems,
          // Most student pages don't exist yet, keeping only the main dashboard
          // { icon: '📚', label: 'My Classes', href: '/dashboard/student/classes' },
          // { icon: '📝', label: 'Assignments', href: '/dashboard/student/assignments' },
          // { icon: '📊', label: 'Progress', href: '/dashboard/student/progress' },
          // { icon: '📅', label: 'Schedule', href: '/dashboard/student/schedule' },
          // { icon: '💬', label: 'Messages', href: '/dashboard/student/messages' }
        ]
      
      default:
        return baseItems
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'teacher': return 'bg-emerald-100 text-emerald-800'
      case 'parent': return 'bg-blue-100 text-blue-800'
      case 'student': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleEmoji = (role: string) => {
    switch (role) {
      case 'teacher': return '🧑‍🏫'
      case 'parent': return '👨‍👩‍👧‍👦'
      case 'student': return '🎓'
      default: return '👤'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/40">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <div className="w-full h-0.5 bg-gray-600"></div>
              <div className="w-full h-0.5 bg-gray-600"></div>
              <div className="w-full h-0.5 bg-gray-600"></div>
            </div>
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-emerald-600">ClassLogger</span>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 ${
          isCollapsed ? 'w-16' : 'w-64'
        } bg-white/70 backdrop-blur-xl border-r border-white/60 transition-all duration-200 ease-in-out`}>
          
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CL</span>
                </div>
                {!isCollapsed && (
                  <span className="text-xl font-bold text-gray-900">ClassLogger</span>
                )}
              </div>
              {/* Desktop collapse button */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:block p-1 rounded-md hover:bg-gray-100 transition-colors"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  {isCollapsed ? (
                    <span className="text-gray-600">→</span>
                  ) : (
                    <span className="text-gray-600">←</span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-b border-gray-200">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url} alt={user.name} />
                <AvatarFallback className="bg-emerald-100 text-emerald-600">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {getRoleEmoji(user.role)} {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                    <NotificationCenter userId={user.id} userRole={user.role} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {getNavigationItems().map((item, index) => {
              const itemIsActive = isActive(item.href)
              return (
                <button
                  key={`${item.href}-${index}`}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'
                  } py-2 rounded-lg text-left transition-colors ${
                    itemIsActive
                      ? 'bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-700 border border-indigo-200/70 shadow-sm'
                      : 'text-gray-700 hover:bg-white/60'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
              title={isCollapsed ? 'Sign Out' : undefined}
            >
              <span className={isCollapsed ? '' : 'mr-2'}>🚪</span>
              {!isCollapsed && 'Sign Out'}
            </Button>
          </div>
        </div>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-25"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:pl-0">
          <main className="p-4 lg:p-6">
            <UserContext.Provider value={user}>
              {children}
            </UserContext.Provider>
          </main>
        </div>
      </div>
    </div>
  )
}