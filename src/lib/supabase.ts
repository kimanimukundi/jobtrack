import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client (use in 'use client' components)
export const createBrowserClient = () => createClientComponentClient()

// Server-side Supabase client (use in server components & API route handlers)
export const createServerClient = () => {
  const { createServerComponentClient } = require('@supabase/auth-helpers-nextjs')
  const { cookies } = require('next/headers')
  return createServerComponentClient({ cookies })
}

// Admin client with service role — bypasses RLS (API routes only, never client-side)
export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )