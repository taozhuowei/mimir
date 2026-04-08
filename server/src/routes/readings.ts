/**
 * Readings Router
 * POST /api/v1/readings — Accepts drawn card IDs + positions, returns interpretation.
 * Body: { cards: [{ cardId: string, position: 'upright' | 'reversed' }] }
 */

import { Router, type Request, type Response } from 'express'
import { generateReading, type DrawnInput } from '../services/tarot_reading'

const router = Router()

router.post('/', (req: Request, res: Response) => {
  const body = req.body as { cards?: DrawnInput[] }

  if (!Array.isArray(body.cards) || body.cards.length === 0) {
    res.status(400).json({ error: 'cards array is required' })
    return
  }

  try {
    res.json(generateReading(body.cards))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reading failed'
    res.status(422).json({ error: message })
  }
})

export default router
