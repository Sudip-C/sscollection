import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase settings in client/.env.local')
}

if (!supabaseKey.startsWith('sb_publishable_')) {
  throw new Error('Use a Supabase publishable key for the frontend')
}

export const supabase = createClient(supabaseUrl, supabaseKey)