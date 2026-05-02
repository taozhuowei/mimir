/**
 * Divinations Router
 *
 * POST /api/v1/divinations
 *
 * Purpose:
 *   Single-shot endpoint that performs a full divination (random draw +
 *   interpretation) on the server. Replaces the older two-step flow where
 *   the frontend drew cards locally and POSTed them to /api/v1/readings.
 *
 * Request body:
 *   { spreadKind?: 'single_card' }   // defaults to 'single_card' when omitted
 *
 * Response (200):
 *   { spreadKind: SpreadKind,        // echo of the resolved spread kind
 *     drawn:      DrawnInput[],      // cards picked by the server
 *     reading:    ReadingResult }    // scored interpretation
 *
 * Errors:
 *   400 { error: 'Unknown spreadKind', code: 'spreadKind' }
 *       — body.spreadKind is present but not in the supported enum.
 *   500 { error, code: 'DIVINATION_FAILED' }
 *       — unexpected internal failure (e.g. card data corruption).
 */

import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { performDivination } from '../services/tarot_reading'

const router = Router()

// Single source of truth for the supported spread types. Extending here means
// also extending SPREAD_DRAW_COUNT in services/tarot_reading.ts.
const SUPPORTED_SPREADS = ['single_card'] as const
type SpreadKind = (typeof SUPPORTED_SPREADS)[number]

// Body schema: spreadKind is optional and defaults to 'single_card'. Using
// .default() makes the parsed value always concrete, so downstream code does
// not need to handle undefined.
const divinationBodySchema = z.object({
  spreadKind: z.enum(SUPPORTED_SPREADS).default('single_card'),
})

router.post('/', (req: Request, res: Response) => {
  const parseResult = divinationBodySchema.safeParse(req.body ?? {})

  if (!parseResult.success) {
    // The only field we validate is spreadKind — emit a stable error code
    // ('spreadKind') so the frontend can branch without string-matching the
    // human-readable message.
    res.status(400).json({ error: 'Unknown spreadKind', code: 'spreadKind' })
    return
  }

  try {
    const spread_kind: SpreadKind = parseResult.data.spreadKind
    const output = performDivination(spread_kind)
    res.json(output)
  } catch (err) {
    // performDivination only throws for an unknown spread (already filtered
    // by zod) or a corrupted card library. Either way we surface 500 because
    // a well-formed client request should never reach this branch.
    const message = err instanceof Error ? err.message : 'Divination failed'
    res.status(500).json({ error: message, code: 'DIVINATION_FAILED' })
  }
})

export default router
