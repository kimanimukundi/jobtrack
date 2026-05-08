'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/layout/AuthProvider'
import { createBrowserClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import Navbar from '@/components/layout/Navbar'
import type { Notification } from '@/types'

export default function NotificationsPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadNotifications()
  }, [user])

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setLoading(false)

    // Mark all as read
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user!.id)
      .eq('is_read', false)
  }

  const clearAll = async () => {
    await supabase.from('notifications').delete().eq('user_id', user!.id)
    setNotifications([])
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          {notifications.length > 0 && (
            <button onClick={clearAll} className="text-sm text-gray-400 hover:text-red-500">
              Clear all
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔔</p>
            <p>No notifications yet</p>
            <p className="text-sm mt-1">You'll be notified when tracked sites post new jobs</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className={`border rounded-xl p-4 ${n.is_read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{n.title}</p>
                    {n.message && <p className="text-gray-500 text-sm mt-0.5">{n.message}</p>}
                  </div>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                </div>
                <p className="text-xs text-gray-300 mt-2">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
