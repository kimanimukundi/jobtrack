import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase'
import { fetchRSSFeed, scrapeCareerPage, upsertJobs } from '@/lib/discovery'

// GET /api/sites — list user's tracked sites
export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('tracked_sites')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sites: data })
}

// POST /api/sites — add a new tracked site
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, url, type, category, check_interval_hours } = body

  if (!name || !url || !type) {
    return NextResponse.json({ error: 'name, url, and type are required' }, { status: 400 })
  }

  // Validate URL
  try { new URL(url) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tracked_sites')
    .insert({
      user_id: user.id,
      name,
      url,
      type,
      category: category || 'all',
      check_interval_hours: check_interval_hours || 6,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Do an immediate first check
  let jobs: any[] = []
  if (type === 'rss') {
    jobs = await fetchRSSFeed(url, name)
  } else if (['website', 'linkedin'].includes(type)) {
    jobs = await scrapeCareerPage(url, name)
  }

  if (jobs.length > 0) {
    await upsertJobs(jobs, data.id)
    await createAdminClient()
      .from('tracked_sites')
      .update({ last_checked_at: new Date().toISOString(), last_found_count: jobs.length })
      .eq('id', data.id)
  }

  return NextResponse.json({ site: data, initial_jobs_found: jobs.length })
}

// DELETE /api/sites?id=xxx — remove a tracked site
export async function DELETE(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('tracked_sites')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
