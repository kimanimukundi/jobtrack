'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { useAuth } from '@/components/layout/AuthProvider'
import { formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import type { Job, SavedJob } from '@/types'

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const jobId = params.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [duplicates, setDuplicates] = useState<Job[]>([])
  const [isSaved, setIsSaved] = useState(false)
  const [savedStatus, setSavedStatus] = useState<'saved' | 'applied' | 'shortlisted' | 'rejected'>('saved')
  const [loading, setLoading] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    loadJob()
  }, [jobId])

  useEffect(() => {
    if (!user || !job) return
    supabase
      .from('saved_jobs')
      .select('status')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .single()
      .then(({ data }) => {
        if (data) {
          setIsSaved(true)
          setSavedStatus(data.status as any)
        }
      })
  }, [user, job])

  const loadJob = async () => {
    // Fetch main job
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (!jobData) {
      setLoading(false)
      return
    }

    setJob(jobData)

    // Fetch duplicates
    const { data: dupData } = await supabase
      .from('job_duplicates')
      .select('duplicate_job_id, jobs!duplicate_job_id(*)')
      .eq('primary_job_id', jobId)

    if (dupData) {
      setDuplicates(dupData.map(d => d.jobs).filter(Boolean))
    }

    setLoading(false)
  }

  const toggleSave = async () => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    if (isSaved) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId)
      setIsSaved(false)
    } else {
      await supabase.from('saved_jobs').insert({
        user_id: user.id,
        job_id: jobId,
        status: 'saved',
      })
      setIsSaved(true)
    }
  }

  const updateStatus = async (status: string) => {
    if (!user) return
    await supabase
      .from('saved_jobs')
      .update({ status })
      .eq('user_id', user.id)
      .eq('job_id', jobId)
    setSavedStatus(status as any)
  }

  const shareLink = () => {
    const url = `${typeof window !== 'undefined' ? window.location.href : ''}`
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  const shareToWhatsApp = () => {
    if (!job) return
    const text = `Check out this job: ${job.title} at ${job.company}\n\n${window.location.href}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareToTwitter = () => {
    if (!job) return
    const text = `Found this job: ${job.title} at ${job.company} on @JobTrackKE\n${window.location.href}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </main>
      </>
    )
  }

  if (!job) {
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-400">Job not found</p>
          <Link href="/jobs" className="text-blue-600 hover:underline mt-4 block">
            Back to jobs →
          </Link>
        </main>
      </>
    )
  }

  const deadline = job.deadline ? new Date(job.deadline) : null
  const isExpired = deadline && isPast(deadline)
  const daysLeft = deadline ? differenceInDays(deadline, new Date()) : null
  const isNew = differenceInDays(new Date(), new Date(job.discovered_at)) <= 2

  const typeColor: Record<string, string> = {
    job: 'bg-purple-100 text-purple-800',
    internship: 'bg-blue-100 text-blue-800',
    attachment: 'bg-green-100 text-green-800',
    tender: 'bg-amber-100 text-amber-800',
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link href="/jobs" className="text-sm text-gray-500 hover:text-black mb-6 inline-block">
          ← Back to jobs
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <h1 className="text-3xl font-bold leading-tight">{job.title}</h1>
              <p className="text-lg text-gray-600 mt-2">
                {job.company} {job.location && `• ${job.location}`}
              </p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={toggleSave}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSaved
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-white text-gray-600 border border-gray-300 hover:border-gray-400'
                }`}
              >
                {isSaved ? '✓ Saved' : 'Save'}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShareOpen(!shareOpen)}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-600 border border-gray-300 hover:border-gray-400"
                >
                  Share
                </button>
                {shareOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <button
                      onClick={shareToWhatsApp}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={shareToTwitter}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-t border-gray-200"
                    >
                      Twitter
                    </button>
                    <button
                      onClick={shareLink}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-t border-gray-200"
                    >
                      Copy link
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mt-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeColor[job.type] || typeColor.job}`}>
              {job.type.charAt(0).toUpperCase() + job.type.slice(1)}
            </span>
            {isNew && <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">NEW</span>}
            {isExpired && <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">EXPIRED</span>}
            {!isExpired && daysLeft !== null && daysLeft <= 3 && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">CLOSING SOON</span>
            )}
            {job.source_name && <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{job.source_name}</span>}
          </div>
        </div>

        {/* Meta information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Posted</p>
              <p className="text-sm font-medium mt-1">
                {formatDistanceToNow(new Date(job.posted_at || job.discovered_at), { addSuffix: true })}
              </p>
            </div>
            {job.deadline && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Deadline</p>
                <p className={`text-sm font-medium mt-1 ${isExpired ? 'text-red-600' : daysLeft !== null && daysLeft <= 3 ? 'text-red-600' : ''}`}>
                  {job.deadline}
                  {daysLeft !== null && !isExpired && <span className="block text-xs text-gray-500">{daysLeft} days left</span>}
                </p>
              </div>
            )}
            {job.salary && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Salary</p>
                <p className="text-sm font-medium mt-1">{job.salary}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Source</p>
              <p className="text-sm font-medium mt-1">{job.source_name || 'Unknown'}</p>
            </div>
          </div>
        </div>

        {/* Main CTA button */}
        {job.apply_url && (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-black text-white py-3 rounded-lg text-center font-semibold hover:bg-gray-800 mb-6 transition-colors"
          >
            Apply on original site →
          </a>
        )}

        {/* Save status selector (for logged in users) */}
        {user && isSaved && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900 mb-3">Track your progress:</p>
            <div className="flex gap-2 flex-wrap">
              {['saved', 'applied', 'shortlisted', 'rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => updateStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    savedStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {job.description && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">About this role</h2>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
            </div>
          </div>
        )}

        {/* Requirements */}
        {job.requirements && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Requirements</h2>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.requirements}</p>
            </div>
          </div>
        )}

        {/* Duplicates */}
        {duplicates.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Also posted on {duplicates.length} other source{duplicates.length > 1 ? 's' : ''}</h2>
            <div className="space-y-2">
              {duplicates.map(dup => (
                <Link
                  key={dup.id}
                  href={`/jobs/${dup.id}`}
                  className="block border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{dup.source_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Posted {formatDistanceToNow(new Date(dup.posted_at || dup.discovered_at), { addSuffix: true })}</p>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related jobs */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold mb-3">More opportunities</h2>
          <Link href="/jobs" className="text-blue-600 hover:underline text-sm">
            Back to all jobs →
          </Link>
        </div>
      </main>
    </>
  )
}
