'use client'
import { useState } from 'react'
import { useAuth } from '@/components/layout/AuthProvider'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'

const SITE_TYPES = [
  { value: 'website', label: 'Website / Careers page', hint: 'Any company careers page or job board' },
  { value: 'rss', label: 'RSS Feed', hint: 'Paste the RSS feed URL directly' },
  { value: 'linkedin', label: 'LinkedIn Company Page', hint: 'Company LinkedIn jobs page URL' },
  { value: 'twitter', label: 'Twitter/X Account', hint: 'e.g. https://twitter.com/SafaricomPLC' },
  { value: 'telegram', label: 'Telegram Channel', hint: 'Public Telegram channels only' },
]

const CATEGORIES = [
  { value: 'all', label: 'All types' },
  { value: 'job', label: 'Jobs only' },
  { value: 'internship', label: 'Internships only' },
  { value: 'attachment', label: 'Attachments only' },
  { value: 'tender', label: 'Tenders only' },
]

const CHECK_INTERVALS = [
  { value: 1, label: '1 hour' },
  { value: 3, label: '3 hours' },
  { value: 6, label: '6 hours' },
  { value: 12, label: '12 hours' },
  { value: 24, label: 'Daily' },
]

export default function SourceSubmitPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [verificationResult, setVerificationResult] = useState<{
    status: 'pending' | 'success' | 'error'
    jobsFound?: number
    message?: string
  } | null>(null)

  const [form, setForm] = useState({
    name: '',
    url: '',
    type: 'website',
    category: 'all',
    check_interval_hours: 6,
  })

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">Please <Link href="/auth/login" className="underline">sign in</Link> to submit sources.</p>
        </div>
      </>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setVerificationResult(null)

    if (!form.name.trim() || !form.url.trim()) {
      setError('Name and URL are required')
      return
    }

    try {
      new URL(form.url)
    } catch {
      setError('Please enter a valid URL (starting with http:// or https://)')
      return
    }

    setLoading(true)
    setVerificationResult({ status: 'pending' })

    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to add source')
        setVerificationResult({
          status: 'error',
          message: data.error || 'Failed to verify source',
        })
        setLoading(false)
        return
      }

      setVerificationResult({
        status: 'success',
        jobsFound: data.initial_jobs_found,
        message: `✓ Verified! Found ${data.initial_jobs_found} job${data.initial_jobs_found !== 1 ? 's' : ''} on first check.`,
      })

      setSuccessMsg(`Source added successfully! We'll check it every ${form.check_interval_hours} hours.`)

      // Reset form
      setForm({
        name: '',
        url: '',
        type: 'website',
        category: 'all',
        check_interval_hours: 6,
      })

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/sites')
      }, 2000)
    } catch (err) {
      setError('Connection error. Please try again.')
      setVerificationResult({
        status: 'error',
        message: 'Connection error. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const currentTypeHint = SITE_TYPES.find(t => t.value === form.type)?.hint

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/sites" className="text-sm text-gray-500 hover:text-black mb-6 inline-block">
          ← Back to sources
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Add a job source</h1>
          <p className="text-gray-500 mt-2">Submit any website, RSS feed, or social media page that posts jobs. We'll monitor it for new listings.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Site name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Safaricom Careers, Fuzu Tech Jobs"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-400"
            />
            <p className="text-xs text-gray-500 mt-1">How you'll see this source in the app</p>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              URL *
            </label>
            <input
              type="url"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://careers.example.com"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-400"
            />
            <p className="text-xs text-gray-500 mt-1">Full URL starting with https://</p>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Source type *
            </label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-400"
            >
              {SITE_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">{currentTypeHint}</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Filter for (optional)
            </label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-400"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">If you only want certain types of listings from this source</p>
          </div>

          {/* Check Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Check every (optional)
            </label>
            <select
              value={form.check_interval_hours}
              onChange={e => setForm(f => ({ ...f, check_interval_hours: Number(e.target.value) }))}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-400"
            >
              {CHECK_INTERVALS.map(i => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">How often we'll check for new listings (default: every 6 hours)</p>
          </div>

          {/* Verification Status */}
          {verificationResult && (
            <div className={`p-4 rounded-lg border ${
              verificationResult.status === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <p className={`text-sm font-medium ${
                verificationResult.status === 'success'
                  ? 'text-green-800'
                  : 'text-yellow-800'
              }`}>
                {verificationResult.status === 'pending' && '⏳ Verifying...'}
                {verificationResult.status === 'success' && '✓ ' + verificationResult.message}
                {verificationResult.status === 'error' && '⚠️ ' + verificationResult.message}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verifying...' : 'Submit & Verify'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            We'll verify your source by checking if it contains job listings. This takes 10-30 seconds.
          </p>
        </form>

        {/* Help section */}
        <div className="mt-10 bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Examples</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-900">Website</p>
              <p className="text-gray-600">https://safaricom.co.ke/careers</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">RSS Feed</p>
              <p className="text-gray-600">https://fuzu.com/kenya/jobs.rss</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">LinkedIn Company</p>
              <p className="text-gray-600">https://linkedin.com/company/safaricom-plc/jobs</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Twitter</p>
              <p className="text-gray-600">https://twitter.com/SafaricomPLC</p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
