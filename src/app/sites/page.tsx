'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/layout/AuthProvider'
import type { TrackedSite, SystemSource } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import Navbar from '@/components/layout/Navbar'
import { createBrowserClient } from '@/lib/supabase'

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

export default function SitesPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [sites, setSites] = useState<TrackedSite[]>([])
  const [systemSources, setSystemSources] = useState<SystemSource[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', type: 'website', category: 'all', check_interval_hours: 6 })
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    const [sitesRes, sysRes] = await Promise.all([
      fetch('/api/sites'),
      supabase.from('system_sources').select('*').eq('is_active', true),
    ])
    const sitesData = await sitesRes.json()
    setSites(sitesData.sites || [])
    setSystemSources(sysRes.data || [])
    setLoading(false)
  }

  const addSite = async () => {
    setError('')
    if (!form.name || !form.url) { setError('Name and URL are required'); return }
    setAdding(true)
    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to add site'); setAdding(false); return }
    setSuccessMsg(`Added! Found ${data.initial_jobs_found} jobs on first check.`)
    setShowForm(false)
    setForm({ name: '', url: '', type: 'website', category: 'all', check_interval_hours: 6 })
    await loadData()
    setAdding(false)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const deleteSite = async (id: string) => {
    if (!confirm('Remove this tracked site?')) return
    await fetch(`/api/sites?id=${id}`, { method: 'DELETE' })
    setSites(s => s.filter(x => x.id !== id))
  }

  const refreshSite = async (id: string) => {
    setRefreshing(id)
    const res = await fetch('/api/sites/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: id }),
    })
    const data = await res.json()
    setSuccessMsg(`Refreshed ${data.site}: found ${data.jobs_found} jobs, ${data.new_jobs} new`)
    await loadData()
    setRefreshing(null)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">Please <a href="/auth/login" className="underline">sign in</a> to manage tracked sites.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Tracked sites</h1>
            <p className="text-gray-500 text-sm mt-1">Add any site and we'll watch it for new job postings</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add site'}
          </button>
        </div>

        {successMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
            {successMsg}
          </div>
        )}

        {/* Add site form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="font-medium mb-4">Add a site to track</h2>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Site name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Safaricom Careers"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">URL *</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {SITE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">{SITE_TYPES.find(t => t.value === form.type)?.hint}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Filter for</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Check every</label>
                <select
                  value={form.check_interval_hours}
                  onChange={e => setForm(f => ({ ...f, check_interval_hours: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value={1}>1 hour</option>
                  <option value={3}>3 hours</option>
                  <option value={6}>6 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>Daily</option>
                </select>
              </div>
            </div>
            <button
              onClick={addSite}
              disabled={adding}
              className="bg-black text-white text-sm px-6 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add and check now'}
            </button>
          </div>
        )}

        {/* System sources */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Built-in sources</h2>
          <div className="grid grid-cols-2 gap-2">
            {systemSources.map(s => (
              <div key={s.id} className="bg-white border border-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.type === 'rss' ? 'RSS' : 'Web'} · {s.category}</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Active" />
              </div>
            ))}
          </div>
        </div>

        {/* User-added sites */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Your tracked sites</h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-xl">
              <p>No custom sites yet</p>
              <p className="text-sm mt-1">Add any careers page, RSS feed, or social media page above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sites.map(site => (
                <div key={site.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{site.name}</p>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${site.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{site.url}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="capitalize">{site.type}</span>
                        <span>·</span>
                        <span>Every {site.check_interval_hours}h</span>
                        <span>·</span>
                        <span>{site.last_found_count} jobs found</span>
                        {site.last_checked_at && (
                          <>
                            <span>·</span>
                            <span>Checked {formatDistanceToNow(new Date(site.last_checked_at), { addSuffix: true })}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => refreshSite(site.id)}
                        disabled={refreshing === site.id || !['website', 'rss', 'linkedin'].includes(site.type)}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                        title="Manually refresh now"
                      >
                        {refreshing === site.id ? '...' : '↻ Refresh'}
                      </button>
                      <button
                        onClick={() => deleteSite(site.id)}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
