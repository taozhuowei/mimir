/**
 * Name: reading_provider
 * Purpose: abstract interface for reading request providers.
 * Reason: enables swapping between rule-based and future AI providers
 *         without changing consumers.
 * Data flow: drawn cards flow in; normalized reading result flows out.
 */

import type { DrawnResult, ReadingResult } from '../tarot_reading'

export type ReadingProviderType = 'rule_based' | 'ai'

export interface ReadingRequest {
  cards: DrawnResult[]
  question?: string
  spreadKind: string
}

export interface ReadingProvider {
  readonly type: ReadingProviderType
  requestReading(request: ReadingRequest): Promise<ReadingResult>
  isAvailable(): boolean
}

export interface ReadingProviderFactory {
  createProvider(type: ReadingProviderType): ReadingProvider
}

export class DefaultReadingProviderFactory implements ReadingProviderFactory {
  constructor(
    private ruleBasedProvider: ReadingProvider,
    // Future: private aiProvider: ReadingProvider,
  ) {}

  createProvider(type: ReadingProviderType): ReadingProvider {
    switch (type) {
      case 'rule_based':
        return this.ruleBasedProvider
      // Future:
      // case 'ai':
      //   return this.aiProvider
      default:
        return this.ruleBasedProvider
    }
  }
}
