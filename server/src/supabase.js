import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL?.trim()
const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim()

if (!url || !key?.startsWith('sb_publishable_')) {
  throw new Error('Missing Supabase settings in server/.env')
}

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
}

export const supabase = createClient(url, key, {
  auth: authOptions,
})

export function createUserClient(accessToken) {
  return createClient(url, key, {
    auth: authOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}