import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { fetchRSSFeed, scrapeCareerPage, upsertJobs, notifyUsersForSite, fetchJSearch } from '@/lib/discovery'

// Called by Vercel Cron (configure in vercel.json) or any HTTP scheduler
// Secured by CRON_SECRET header
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results: Record<string, any> = {}

  // ── 1. Check system RSS sources ──────────────────────────
  const { data: systemSources } = await supabase
    .from('system_sources')
    .select('*')
    .eq('is_active', true)
    .not('rss_url', 'is', null)

  for (const source of systemSources || []) {
    const jobs = await fetchRSSFeed(source.rss_url!, source.name)
    const count = await upsertJobs(jobs)
    results[source.name] = { type: 'rss', found: jobs.length, new: count }

    await supabase
      .from('system_sources')
      .update({ last_checked_at: new Date().toISOString() })
      .eq('id', source.id)
  }

  // ── 2. Check system website sources (scrape) ─────────────
  const { data: scrapeSources } = await supabase
    .from('system_sources')
    .select('*')
    .eq('is_active', true)
    .is('rss_url', null)

  for (const source of scrapeSources || []) {
    const jobs = await scrapeCareerPage(source.url, source.name)
    const count = await upsertJobs(jobs)
    results[source.name] = { type: 'scrape', found: jobs.length, new: count }

    await supabase
      .from('system_sources')
      .update({ last_checked_at: new Date().toISOString() })
      .eq('id', source.id)
  }

  // ── 3. Check user-added tracked sites ────────────────────
  const now = new Date()
  const { data: userSites } = await supabase
    .from('tracked_sites')
    .select('*')
    .eq('is_active', true)

  for (const site of userSites || []) {
    // Respect check_interval_hours
    if (site.last_checked_at) {
      const lastCheck = new Date(site.last_checked_at)
      const hoursSince = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60)
      if (hoursSince < site.check_interval_hours) continue
    }

    let jobs: Partial<any>[] = []

    if (site.type === 'rss') {
      jobs = await fetchRSSFeed(site.url, site.name)
    } else if (['website', 'linkedin'].includes(site.type)) {
      jobs = await scrapeCareerPage(site.url, site.name)
    }
    // Twitter/Telegram — handled separately via their own integrations

    const newCount = await upsertJobs(jobs, site.id)

    await supabase
      .from('tracked_sites')
      .update({
        last_checked_at: now.toISOString(),
        last_found_count: jobs.length,
      })
      .eq('id', site.id)

    if (newCount > 0) {
      await notifyUsersForSite(site.id, newCount, site.name)
    }

    results[site.name] = { type: site.type, found: jobs.length, new: newCount }
  }

  // ── 4. Pull from JSearch for broad Kenya IT jobs ──────────
  const searches = [
    'software engineer Kenya',
    'IT internship Kenya',
    'cybersecurity Kenya',
    'data analyst Kenya',
    'network engineer Kenya',
  ]

  let jsearchTotal = 0
  for (const q of searches) {
    const jobs = await fetchJSearch(q)
    const count = await upsertJobs(jobs)
    jsearchTotal += count
  }
  results['JSearch (broad)'] = { type: 'api', new: jsearchTotal }

  return NextResponse.json({
    success: true,
    ran_at: now.toISOString(),
    results,
  })
}
