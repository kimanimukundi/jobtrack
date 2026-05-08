import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'
import { fetchRSSFeed, scrapeCareerPage, upsertJobs } from '@/lib/discovery'

export const dynamic = 'force-dynamic'

// DELETE /api/admin/sources/[id] - delete a tracked site
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()

  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('tracked_sites')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// POST /api/admin/sources/[id] - manually refresh a source
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()

  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const action = new URL(req.url).searchParams.get('action')

  if (action === 'refresh') {
    // Manually refresh a tracked site
    const { data: site } = await supabase
      .from('tracked_sites')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    let jobs: any[] = []

    if (site.type === 'rss') {
      jobs = await fetchRSSFeed(site.url, site.name)
    } else if (['website', 'linkedin'].includes(site.type)) {
      jobs = await scrapeCareerPage(site.url, site.name)
    }

    const newCount = await upsertJobs(jobs, site.id)

    await supabase
      .from('tracked_sites')
      .update({
        last_checked_at: new Date().toISOString(),
        last_found_count: jobs.length,
      })
      .eq('id', site.id)

    // Log the check
    await supabase
      .from('source_checks')
      .insert({
        site_id: site.id,
        checked_at: new Date().toISOString(),
        jobs_found: jobs.length,
        new_jobs: newCount,
        duration_ms: 0,
        status: 'success',
      })

    return NextResponse.json({
      success: true,
      jobs_found: jobs.length,
      new_jobs: newCount,
    })
  }

  if (action === 'mark_broken') {
    // Mark a source as broken
    const reason = new URL(req.url).searchParams.get('reason') || 'marked_by_admin'

    await supabase
      .from('broken_sources')
      .upsert({
        site_id: params.id,
        reason,
        first_detected_at: new Date().toISOString(),
        last_check_at: new Date().toISOString(),
      })

    return NextResponse.json({ success: true })
  }

  if (action === 'ignore_broken') {
    // Ignore a broken source warning
    await supabase
      .from('broken_sources')
      .update({ is_ignored: true })
      .eq('site_id', params.id)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}