export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)

  const type = searchParams.get('type')
  const search = searchParams.get('search')
  const deadline = searchParams.get('deadline')
  const source = searchParams.get('source')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 20

  let query = supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('discovered_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (type && type !== 'all') query = query.eq('type', type)
  if (source) query = query.eq('source_name', source)

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,company.ilike.%${search}%,description.ilike.%${search}%`
    )
  }

  if (deadline === 'week') {
    const week = new Date()
    week.setDate(week.getDate() + 7)
    query = query.lte('deadline', week.toISOString().split('T')[0])
  } else if (deadline === 'month') {
    const month = new Date()
    month.setDate(month.getDate() + 30)
    query = query.lte('deadline', month.toISOString().split('T')[0])
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ jobs: data, total: count, page, pageSize })
}
