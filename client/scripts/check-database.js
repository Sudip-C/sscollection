import process from 'node:process'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

async function checkDatabase() {
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

  const expectedSlugs = [
    'oversized-tees',
    'graphic-tees',
    'essential-tees',
    'cargo-shorts',
    'denim-shorts',
    'active-shorts',
  ]

  const { data: categories, error: categoryError } = await supabase
    .from('categories')
    .select('id, name, slug')
    .in('slug', expectedSlugs)

  if (categoryError) {
    throw new Error(`Category read failed: ${categoryError.message}`)
  }

  if (categories.length !== expectedSlugs.length) {
    throw new Error('Expected all six starter categories')
  }

  console.log('Public category read: OK')

  const { error: productError } = await supabase
    .from('products')
    .select('id, name, price_paise')
    .limit(1)

  if (productError) {
    throw new Error(`Product read failed: ${productError.message}`)
  }

  console.log('Public product read: OK')

  const { error: insertError } = await supabase
    .from('categories')
    .insert({
      name: `Permission check ${randomUUID()}`,
      slug: `permission-check-${randomUUID()}`,
    })

  if (!insertError) {
    throw new Error('Public category insert was allowed unexpectedly')
  }

  if (insertError.code !== '42501') {
    throw new Error(`Unexpected insert error: ${insertError.message}`)
  }

  console.log('Public category insert blocked: OK')
}

checkDatabase().catch((error) => {
  console.error(`Database check failed: ${error.message}`)
  process.exitCode = 1
})