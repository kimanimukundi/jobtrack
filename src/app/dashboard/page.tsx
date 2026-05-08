'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/layout/AuthProvider'
import { createBrowserClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import type { Job, SavedJob, Notification, TrackedSite } from '@/types'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createBrowserClient()
  const [recentJobs, setRecentJobs] = useState<Job[]>([])
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [trackedSites, setTrackedSites] = useState<TrackedSite[]>([])
  const [stats, setStats] = useState({ total: 0, new_today: 0, sites: 0, saved: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return }
    loadDashboard()
  }, [user])

  const loadDashboard = async () => {
    setLoading(true)
    const today = new Date(); today.setHours(0,0,0,0)

    const [jobsRes, savedRes, notifsRes, sitesRes, totalRes, todayRes] = await Promise.all([
      supabase.from('jobs').select('*').order('discovered_at', { ascending: false }).limit(5),
      supabase.from('saved_jobs').select('*, job:jobs(*)').eq('user_id', user!.id).order('saved_at', { ascending: false }).limit(5),
      supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('tracked_sites').select('*').eq('user_id', user!.id).limit(5),
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).gte('discovered_at', today.toISOString()),
    ])

    setRecentJobs(jobsRes.data || [])
    setSavedJobs(savedRes.data as any || [])
    setNotifications(notifsRes.data || [])
    setTrackedSites(sitesRes.data || [])
    setStats({
      total: totalRes.count || 0,
      new_today: todayRes.count || 0,
      sites: sitesRes.data?.length || 0,
      saved: savedRes.data?.length || 0,
    })
    setLoading(false)
  }

  const markNotifRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
  }

  const typeColors: Record<string, string> = {
    job: 'bg-purple-50 text-purple-700', internship: 'bg-blue-50 text-blue-700',
    attachment: 'bg-green-50 text-green-700', tender: 'bg-amber-50 text-amber-700',
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_,i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}</h1>
          <p className="text-gray-500 text-sm mt-1">Here's what's happening with your job search</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total jobs tracked', value: stats.total.toLocaleString(), color: 'text-black' },
            { label: 'New today', value: stats.new_today, color: 'text-green-600' },
            { label: 'Tracked sites', value: stats.sites, color: 'text-blue-600' },
            { label: 'Saved jobs', value: stats.saved, color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-medium ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent jobs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Latest opportunities</h2>
              <Link href="/jobs" className="text-xs text-gray-400 hover:text-black">View all →</Link>
            </div>
            <div className="space-y-2">
              {recentJobs.map(job => (
                <div key={job.id} className="bg-white border border-gray-100 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium leading-snug">{job.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{job.company}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${typeColors[job.type]}`}>
                      {job.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-2">
                    {formatDistanceToNow(new Date(job.discovered_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
              {recentJobs.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No jobs yet — add a tracked site to get started</p>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Notifications</h2>
              <Link href="/notifications" className="text-xs text-gray-400 hover:text-black">View all →</Link>
            </div>
            <div className="space-y-2">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markNotifRead(n.id)}
                  className={`border rounded-xl p-3 cursor-pointer transition-colors ${
                    n.is_read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'
                  }`}
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.message && <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>}
                  <p className="text-xs text-gray-300 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No notifications yet</p>
              )}
            </div>
          </div>

          {/* Tracked sites summary */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Tracked sites</h2>
              <Link href="/sites" className="text-xs text-gray-400 hover:text-black">Manage →</Link>
            </div>
            {trackedSites.length === 0 ? (
              <Link href="/sites" className="block border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-gray-400 transition-colors">
                <p className="text-sm text-gray-400">+ Add your first tracked site</p>
                <p className="text-xs text-gray-300 mt-1">Careers pages, RSS feeds, social media</p>
              </Link>
            ) : (
              <div className="space-y-2">
                {trackedSites.map(site => (
                  <div key={site.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{site.name}</p>
                      <p className="text-xs text-gray-400">{site.last_found_count} jobs · every {site.check_interval_hours}h</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                ))}
                <Link href="/sites" className="block text-xs text-center text-gray-400 hover:text-black py-1">
                  + Add more sites
                </Link>
              </div>
            )}
          </div>

          {/* Saved jobs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Saved jobs</h2>
              <Link href="/dashboard/saved" className="text-xs text-gray-400 hover:text-black">View all →</Link>
            </div>
            <div className="space-y-2">
              {savedJobs.map(sj => (
                <div key={sj.id} className="bg-white border border-gray-100 rounded-xl p-3">
                  <p className="text-sm font-medium">{(sj.job as any)?.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400">{(sj.job as any)?.company}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      sj.status === 'applied' ? 'bg-blue-50 text-blue-700' :
                      sj.status === 'shortlisted' ? 'bg-green-50 text-green-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>{sj.status}</span>
                  </div>
                </div>
              ))}
              {savedJobs.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No saved jobs yet</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
