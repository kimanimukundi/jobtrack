'use client'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const [unread, setUnread] = useState(0)
  const supabase = createBrowserClient()

  useEffect(() => {
    if (!user) return
    supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(({ count }) => setUnread(count || 0))

    // Realtime subscription for notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => setUnread(n => n + 1))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-semibold text-lg tracking-tight">
            JobTrack <span className="text-gray-400 font-normal text-sm">Kenya</span>
          </Link>
          {user && (
            <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
              <Link href="/dashboard" className="hover:text-black transition-colors">Dashboard</Link>
              <Link href="/jobs" className="hover:text-black transition-colors">Browse Jobs</Link>
              <Link href="/sites" className="hover:text-black transition-colors">Tracked Sites</Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/notifications" className="relative p-2 text-gray-500 hover:text-black">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-black">
                {user.email?.split('@')[0]}
              </Link>
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-black transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-sm text-gray-600 hover:text-black">Sign in</Link>
              <Link
                href="/auth/signup"
                className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
