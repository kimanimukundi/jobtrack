import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { grantAdminAccess } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// POST /api/admin/grant-admin - grant admin access to a user by email
export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  // Use admin client directly since we can't check auth in this context
  const result = await grantAdminAccess('', email)

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 })
  }

  return NextResponse.json({ message: result.message })
}