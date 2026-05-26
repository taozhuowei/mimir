/**
 * Name: flows/answer/lib/rule_based_answer_provider
 * Purpose: divination provider backed by the project's rule-based backend.
 * Reason: implements the provider boundary for the current non-LLM reading
 *         pipeline. The backend now owns shuffling, drawing, and rule-based
 *         interpretation in a single transaction (`POST /api/v1/divinations`),
 *         so this provider just forwards the spread kind through.
 * Data flow: spread kind flows in; hydrated `Divination` (drawn + reading
 *         with resolved asset URLs) flows out.
 */

import { requestDivination, type Divination } from '../../../core/api/divinations'
import type { AnswerProvider, AnswerRequest } from './answer_provider'

export class RuleBasedAnswerProvider implements AnswerProvider {
  readonly type = 'rule_based' as const

  async requestAnswer(request: AnswerRequest): Promise<Divination> {
    // No client-side fallback to 'single_card' here — when `spreadKind` is
    // missing, the server's zod default fills it in. Single source of truth.
    return requestDivination(request.spreadKind)
  }

  isAvailable(): boolean {
    return true
  }
}
