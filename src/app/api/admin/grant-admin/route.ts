import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { isAdmin, grantAdminAccess } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// POST /api/admin/grant-admin - grant admin access to a user by email
export async function POST(req: NextRequest) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()

  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const result = await grantAdminAccess(user.id, email)

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 })
  }

  return NextResponse.json({ message: result.message })
}