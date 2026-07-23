'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard/admin/interest', label: '📨 Interest' },
  { href: '/dashboard/admin/tutor-applications', label: '🍎 Tutor Applications' },
  { href: '/dashboard/admin/tuition-requirements', label: '🎯 Tuition Requirements' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {TABS.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              pathname === t.href ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  )
}
