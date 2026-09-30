import { Router } from 'express'
import { supabase } from './supabase.js'

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

export default adminRouter