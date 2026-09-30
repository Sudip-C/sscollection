import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL?.trim()
const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim()

if (!url || !key?.startsWith('sb_publishable_')) {
  throw new Error('Missing Supabase settings in server/.env')
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})