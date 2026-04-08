/**
 * Scales Tarot API Server
 * Serves static assets (images, fonts, icons) and provides REST APIs for
 * tarot card data and reading interpretation.
 *
 * Static:  /static/*  → server/public/static/
 * API:     /api/v1/*
 */

import express from 'express'
import path from 'path'
import cardsRouter from './routes/cards'
import readingsRouter from './routes/readings'

const app = express()
const PORT = Number(process.env.PORT ?? 3000)

// CORS — allow all origins in development
// TODO Phase 2: restrict to registered mini program domains in production
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  if (_req.method === 'OPTIONS') { res.sendStatus(200); return }
  next()
})

app.use(express.json())

// Static tarot assets (images, fonts, icons)
app.use('/static', express.static(path.join(__dirname, '../public/static')))

// API routes
app.use('/api/v1/cards', cardsRouter)
app.use('/api/v1/readings', readingsRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// H5 SPA — serve built frontend and fall back to index.html for client-side routing
const h5Dist = path.join(__dirname, '../../dist/build/h5')
app.use(express.static(h5Dist))
app.get('*', (_req, res) => {
  res.sendFile(path.join(h5Dist, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`[server] Scales Tarot API running on http://localhost:${PORT}`)
})

export default app
