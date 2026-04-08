/**
 * Cards Router
 * GET /api/v1/cards — Returns all 78 tarot cards with server-resolved image URLs.
 */

import { Router } from 'express'
import { getAllCards } from '../services/card_loader'

const router = Router()

router.get('/', (_req, res) => {
  res.json({ cards: getAllCards() })
})

export default router
