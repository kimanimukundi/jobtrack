import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Client-side Supabase client (use in components)
export const createBrowserClient = () => createClientComponentClient()
