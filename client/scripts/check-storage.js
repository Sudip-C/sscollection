import process from 'node:process'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

async function checkStorage() {
  const url = process.env.VITE_SUPABASE_URL?.trim()
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!url || !key || !key.startsWith('sb_publishable_')) {
    throw new Error('Check your Supabase settings in .env.local')
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  // A tiny PNG used only to test upload permissions.
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZkAAAAASUVORK5CYII='

  const image = new Blob(
    [Buffer.from(base64, 'base64')],
    { type: 'image/png' },
  )

  const path = `permission-check/${randomUUID()}.png`

  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, image, {
      contentType: 'image/png',
      upsert: false,
    })

  if (!error) {
    throw new Error(
      `Public upload was allowed unexpectedly. Remove ${path} from Storage.`,
    )
  }

  const deniedByPolicy =
    /row-level security/i.test(error.message) ||
    error.code === 'AccessDenied' ||
    error.error === 'AccessDenied'

  if (!deniedByPolicy) {
    throw new Error(`Unexpected Storage error: ${error.message}`)
  }

  console.log('Public image upload blocked: OK')
}

checkStorage().catch((error) => {
  console.error(`Storage check failed: ${error.message}`)
  process.exitCode = 1
})