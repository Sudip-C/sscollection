import { supabase } from './supabase'

export async function adminFetch(path, options = {}) {
  const { data, error } = await supabase.auth.getSession()

  if (error || !data.session?.access_token) {
    throw new Error('Sign in to access the admin dashboard.')
  }

  return fetch(path, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${data.session.access_token}`,
    },
  })
}