'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/layout/AuthProvider'
import { createBrowserClient } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'
import type { SavedJob } from '@/types'

const STATUSES = ['saved', 'applied', 'shortlisted', 'rejected'] as const

export default function SavedJobsPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (!user) return
    supabase
      .from('saved_jobs')
      .select('*, job:jobs(*)')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
      .then(({ data }) => { setSavedJobs(data as any || []); setLoading(false) })
  }, [user])

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('saved_jobs').update({ status }).eq('id', id)
    setSavedJobs(s => s.map(j => j.id === id ? { ...j, status: status as any } : j))
  }

  const unsave = async (id: string) => {
    await supabase.from('saved_jobs').delete().eq('id', id)
    setSavedJobs(s => s.filter(j => j.id !== id))
  }

  const filtered = filter === 'all' ? savedJobs : savedJobs.filter(j => j.status === filter)

  const statusColors: Record<string, string> = {
    saved: 'bg-gray-50 text-gray-600',
    applied: 'bg-blue-50 text-blue-700',
    shortlisted: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-600',
  }

  const typeColors: Record<string, string> = {
    job: 'bg-purple-50 text-purple-700',
    internship: 'bg-blue-50 text-blue-700',
    attachment: 'bg-green-50 text-green-700',
    tender: 'bg-amber-50 text-amber-700',
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Saved jobs</h1>
            <p className="text-gray-500 text-sm mt-1">{savedJobs.length} saved</p>
          </div>
          <Link href="/jobs" className="text-sm border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
            Browse more →
          </Link>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap mb-5">
          {['all', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                filter === s ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== 'all' && (
                <span className="ml-1 text-xs opacity-60">
                  ({savedJobs.filter(j => j.status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>No {filter !== 'all' ? filter : 'saved'} jobs</p>
            <Link href="/jobs" className="text-sm underline mt-2 block">Browse opportunities →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(sj => {
              const job = sj.job as any
              return (
                <div key={sj.id} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium">{job?.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{job?.company} · {job?.location}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[job?.type] || ''}`}>
                          {job?.type}
                        </span>
                        {job?.deadline && (
                          <span className="text-xs text-gray-400">Deadline: {job.deadline}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <select
                        value={sj.status}
                        onChange={e => updateStatus(sj.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-lg border-0 font-medium focus:outline-none cursor-pointer ${statusColors[sj.status]}`}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                      <div className="flex gap-1">
                        {job?.apply_url && (
                          <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">
                            Apply ↗
                          </a>
                        )}
                        <button onClick={() => unsave(sj.id)}
                          className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
