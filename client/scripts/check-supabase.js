import process from 'node:process'

async function checkConnection() {
  const url = process.env.VITE_SUPABASE_URL?.trim()
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  if (!key.startsWith('sb_publishable_')) {
    throw new Error('Expected a Supabase publishable key')
  }

  const response = await fetch(new URL('/auth/v1/settings', url), {
    headers: {
      apikey: key,
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Supabase returned HTTP ${response.status}`)
  }

  const settings = await response.json()

  if (
    !settings ||
    typeof settings.external !== 'object' ||
    settings.external === null
  ) {
    throw new Error('Unexpected Supabase Auth response')
  }

  console.log('Supabase Auth connection: OK')
}

checkConnection().catch((error) => {
  console.error(`Supabase connection failed: ${error.message}`)
  process.exitCode = 1
})