/**
 * Readings Router
 * POST /api/v1/readings — Accepts drawn card IDs + positions, returns interpretation.
 * Body: { cards: [{ cardId: string, position: 'upright' | 'reversed' }] }
 */

import { Router, type Request, type Response } from 'express'
import { generateReading, type DrawnInput } from '../services/tarot_reading'

const router = Router()

router.post('/', (req: Request, res: Response) => {
  const body = req.body as unknown

  if (!Array.isArray((body as { cards?: unknown })?.cards) || (body as { cards?: unknown[] }).cards!.length === 0) {
    res.status(400).json({ error: 'cards array is required' })
    return
  }

  const cards = (body as { cards: unknown[] }).cards
  const isValidCard = (c: unknown): c is { cardId: string; position: 'upright' | 'reversed' } =>
    typeof (c as { cardId?: unknown })?.cardId === 'string' &&
    (c as { cardId?: string }).cardId!.length > 0 &&
    ((c as { position?: unknown })?.position === 'upright' || (c as { position?: unknown })?.position === 'reversed')

  if (!cards.every(isValidCard)) {
    res.status(400).json({ error: 'each card must have cardId (string) and position (upright|reversed)' })
    return
  }

  const drawnCards = cards as DrawnInput[]

  try {
    res.json(generateReading(drawnCards))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reading failed'
    res.status(422).json({ error: message })
  }
})

export default router
