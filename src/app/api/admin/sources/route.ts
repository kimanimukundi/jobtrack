import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/admin/sources - list all sources with check history
export async function GET(req: NextRequest) {
  const supabase = createAdminClient()

  // Get system sources
  const { data: systemSources } = await supabase
    .from('system_sources')
    .select('*')
    .order('created_at', { ascending: false })

  // Get user-submitted sources
  const { data: userSources } = await supabase
    .from('tracked_sites')
    .select('*')
    .order('created_at', { ascending: false })

  // Get recent source checks
  const { data: recentChecks } = await supabase
    .from('source_checks')
    .select('*')
    .order('checked_at', { ascending: false })
    .limit(50)

  // Get broken sources
  const { data: brokenSources } = await supabase
    .from('broken_sources')
    .select('*')
    .eq('is_ignored', false)

  return NextResponse.json({
    systemSources: systemSources || [],
    userSources: userSources || [],
    recentChecks: recentChecks || [],
    brokenSources: brokenSources || [],
  })
}