import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase'
import { fetchRSSFeed, scrapeCareerPage, upsertJobs, notifyUsersForSite } from '@/lib/discovery'

// POST /api/sites/refresh — manually trigger a check for a site
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { site_id } = await req.json()
  if (!site_id) return NextResponse.json({ error: 'site_id required' }, { status: 400 })

  // Verify ownership
  const { data: site, error: siteErr } = await supabase
    .from('tracked_sites')
    .select('*')
    .eq('id', site_id)
    .eq('user_id', user.id)
    .single()

  if (siteErr || !site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  let jobs: any[] = []

  if (site.type === 'rss') {
    jobs = await fetchRSSFeed(site.url, site.name)
  } else if (['website', 'linkedin'].includes(site.type)) {
    jobs = await scrapeCareerPage(site.url, site.name)
  } else {
    return NextResponse.json({ error: `Manual refresh not supported for type: ${site.type}` }, { status: 400 })
  }

  const newCount = await upsertJobs(jobs, site.id)

  await createAdminClient()
    .from('tracked_sites')
    .update({
      last_checked_at: new Date().toISOString(),
      last_found_count: jobs.length,
    })
    .eq('id', site.id)

  if (newCount > 0) {
    await notifyUsersForSite(site.id, newCount, site.name)
  }

  return NextResponse.json({
    success: true,
    site: site.name,
    jobs_found: jobs.length,
    new_jobs: newCount,
  })
}
