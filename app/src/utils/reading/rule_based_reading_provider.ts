/**
 * Name: rule_based_reading_provider
 * Purpose: reading provider backed by the project's own rule-based backend.
 * Reason: implements the provider boundary for the current non-LLM reading
 *         pipeline. The name reflects the interpretation strategy (rules,
 *         not an AI model); networking is still required — readings are
 *         scored on the server.
 * Data flow: drawn cards flow in; backend response (normalized to
 *         ReadingResult) flows out.
 */

import { fetchReading } from '../../api/readings'
import type { ReadingResult } from '../tarot_reading'
import type { ReadingProvider, ReadingRequest } from './reading_provider'

export class RuleBasedReadingProvider implements ReadingProvider {
  readonly type = 'rule_based' as const

  async requestReading(request: ReadingRequest): Promise<ReadingResult> {
    return fetchReading(request.cards, request.spreadKind)
  }

  isAvailable(): boolean {
    return true
  }
}
