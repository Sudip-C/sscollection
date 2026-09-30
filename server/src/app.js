import express from 'express'
import adminRouter from './admin.js'
const app = express()

app.disable('x-powered-by')
app.use(express.json({ limit: '100kb' }))

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ss.collection API',
  })
})
app.use('/api/admin', adminRouter)
app.use((_req, res) => {
  res.status(404).json({
    error: 'Route not found',
  })
})

export default app