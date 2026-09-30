import { Router } from 'express'
import { createUserClient,supabase } from './supabase.js'
import { randomUUID } from 'node:crypto'



const adminRouter = Router()

adminRouter.use(async (req, res, next) => {
  const authorization = req.get('authorization') || ''

  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sign in required' })
  }

  const token = authorization.slice(7).trim()

  if (!token || /\s/.test(token)) {
    return res.status(401).json({ error: 'Invalid access token' })
  }

  try {
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid access token' })
    }

    if (data.user.app_metadata?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    res.locals.admin = data.user
    res.locals.accessToken = token
    next()
  } catch {
    return res
      .status(503)
      .json({ error: 'Authentication service unavailable' })
  }
})

adminRouter.get('/me', (_req, res) => {
  const { id, email } = res.locals.admin

  res.json({
    id,
    email,
    role: 'admin',
  })
})
adminRouter.get('/categories', async (_req, res) => {
  try {
    const db = createUserClient(res.locals.accessToken)

    const { data, error } = await db
      .from('categories')
      .select('id, name, slug')
      .order('name')

    if (error) {
      return res.status(502).json({ error: error.message })
    }

    res.json({ categories: data })
  } catch {
    res.status(503).json({ error: 'Catalogue service unavailable' })
  }
})

adminRouter.post('/categories', async (req, res) => {
  const name =
    typeof req.body?.name === 'string'
      ? req.body.name.trim()
      : ''

  const slug = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  if (!name || name.length > 80 || !slug) {
    return res.status(400).json({
      error: 'Enter a category name of up to 80 characters.',
    })
  }

  try {
    const db = createUserClient(res.locals.accessToken)

    const { data, error } = await db
      .from('categories')
      .insert({ name, slug })
      .select('id, name, slug')
      .single()

    if (error?.code === '23505') {
      return res.status(409).json({
        error: 'This category already exists.',
      })
    }

    if (error) {
      return res.status(502).json({ error: error.message })
    }

    res.status(201).json({ category: data })
  } catch {
    res.status(503).json({ error: 'Catalogue service unavailable' })
  }
})
function cleanOptions(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) {
    return null
  }

  const options = value.map((item) =>
    typeof item === 'string' ? item.trim() : ''
  )

  if (options.some((item) => !item || item.length > 40)) {
    return null
  }

  return [...new Set(options)]
}

adminRouter.post('/products', async (req, res) => {
  const categoryId = req.body?.categoryId?.trim()
  const name = req.body?.name?.trim()
  const description = req.body?.description?.trim() ?? ''
  const price = String(req.body?.price ?? '').trim()
  const sizes = cleanOptions(req.body?.sizes)
  const colors = cleanOptions(req.body?.colors)

  const validId =
    typeof categoryId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      categoryId
    )

  if (
    !validId ||
    !name ||
    name.length > 160 ||
    description.length > 2000 ||
    !/^\d{1,7}(\.\d{1,2})?$/.test(price) ||
    !sizes ||
    !colors
  ) {
    return res.status(400).json({ error: 'Check the product details and try again.' })
  }

  const [rupees, decimal = ''] = price.split('.')
  const pricePaise = Number(rupees) * 100 + Number(decimal.padEnd(2, '0'))

  if (pricePaise <= 0) {
    return res.status(400).json({ error: 'Price must be greater than zero.' })
  }

  const userClient = createUserClient(res.locals.accessToken)
  const { data: product, error } = await userClient
    .from('products')
    .insert({
      category_id: categoryId,
      sku: `SSC-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
      name,
      description,
      price_paise: pricePaise,
      sizes,
      colors,
      image_paths: [],
      is_active: false,
    })
    .select('id, sku, name, price_paise, is_active')
    .single()

  if (error) {
    const status = error.code === '23503' ? 400 : 500
    return res.status(status).json({ error: error.message })
  }

  return res.status(201).json({ product })
})
export default adminRouter