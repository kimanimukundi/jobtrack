'use client'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useAuth } from '@/components/layout/AuthProvider'
import type { Job, JobType, SavedJob } from '@/types'
import { formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import Navbar from '@/components/layout/Navbar'

const TYPES: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'job', label: 'Jobs' },
  { value: 'internship', label: 'Internships' },
  { value: 'attachment', label: 'Attachments' },
  { value: 'tender', label: 'Tenders' },
]

export default function JobsPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [jobs, setJobs] = useState<Job[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const loadJobs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), type: typeFilter })
    if (search) params.set('search', search)
    const res = await fetch(`/api/jobs?${params}`)
    const data = await res.json()
    setJobs(data.jobs || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page, typeFilter, search])

  useEffect(() => { loadJobs() }, [loadJobs])

  useEffect(() => {
    if (!user) return
    supabase
      .from('saved_jobs')
      .select('job_id')
      .eq('user_id', user.id)
      .then(({ data }) => setSavedIds(new Set(data?.map(s => s.job_id) || [])))
  }, [user])

  const toggleSave = async (jobId: string) => {
    if (!user) { window.location.href = '/auth/login'; return }
    if (savedIds.has(jobId)) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId)
      setSavedIds(s => { const n = new Set(s); n.delete(jobId); return n })
    } else {
      await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: jobId })
      setSavedIds(s => new Set(s).add(jobId))
    }
  }

  const deadlineLabel = (deadline: string | null) => {
    if (!deadline) return null
    const d = new Date(deadline)
    if (isPast(d)) return { text: 'Expired', cls: 'text-red-500' }
    const days = differenceInDays(d, new Date())
    if (days <= 3) return { text: `${days}d left`, cls: 'text-red-500 font-medium' }
    if (days <= 7) return { text: `${days}d left`, cls: 'text-amber-600 font-medium' }
    return { text: deadline, cls: 'text-gray-400' }
  }

  const typeClass: Record<string, string> = {
    job: 'tag-job', internship: 'tag-internship',
    attachment: 'tag-attachment', tender: 'tag-tender',
  }

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Browse opportunities</h1>
            <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} listings tracked</p>
          </div>
          <a href="/sites" className="text-sm text-gray-500 hover:text-black border border-gray-200 px-3 py-2 rounded-lg">
            + Add source
          </a>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-4">
          {TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => { setTypeFilter(t.value); setPage(1) }}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                typeFilter === t.value
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {t.label}
            </button>
          ))}

          <div className="flex gap-2 ml-auto">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
              placeholder="Search jobs..."
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:border-gray-400"
            />
            <button
              onClick={() => { setSearch(searchInput); setPage(1) }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              Search
            </button>
          </div>
        </div>

        {/* Job list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No jobs found</p>
            <p className="text-sm mt-1">Try different filters or add more tracked sites</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => {
              const dl = deadlineLabel(job.deadline)
              const isSaved = savedIds.has(job.id)
              return (
                <div key={job.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-300 transition-colors">
                  <div className="flex justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <button
                          onClick={() => window.location.href = `/jobs/${job.id}`}
                          className="font-medium text-base leading-snug text-black hover:text-blue-600 transition-colors text-left"
                        >
                          {job.title}
                        </button>
                      </div>
                      <p className="text-gray-500 text-sm mt-0.5">{job.company} · {job.location}</p>

                      {job.description && (
                        <p className="text-gray-500 text-sm mt-2 line-clamp-2">{job.description}</p>
                      )}

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeClass[job.type] || 'tag-job'}`}>
                          {job.type.charAt(0).toUpperCase() + job.type.slice(1)}
                        </span>
                        {job.source_name && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                            {job.source_name}
                          </span>
                        )}
                        {job.salary && (
                          <span className="text-xs text-gray-400">{job.salary}</span>
                        )}
                        {dl && (
                          <span className={`text-xs ${dl.cls} ml-auto`}>
                            Deadline: {dl.text}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleSave(job.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          isSaved
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {isSaved ? 'Saved' : 'Save'}
                      </button>
                      <button
                        onClick={() => window.location.href = `/jobs/${job.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                      >
                        View ↗
                      </button>
                      <span className="text-xs text-gray-300">
                        {formatDistanceToNow(new Date(job.discovered_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-500">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 20)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </>
  )
}
