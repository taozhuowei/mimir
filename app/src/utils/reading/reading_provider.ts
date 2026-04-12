/**
 * Name: reading_provider
 * Purpose: abstract interface for reading request providers.
 * Reason: enables swapping between offline (API) and future AI providers without changing consumers.
 * Data flow: drawn cards flow in; normalized reading result flows out.
 */

import type { DrawnResult, ReadingResult } from '../tarotReading'

export type ReadingProviderType = 'offline' | 'ai'

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
    private offlineProvider: ReadingProvider,
    // Future: private aiProvider: ReadingProvider,
  ) {}

  createProvider(type: ReadingProviderType): ReadingProvider {
    switch (type) {
      case 'offline':
        return this.offlineProvider
      // Future:
      // case 'ai':
      //   return this.aiProvider
      default:
        return this.offlineProvider
    }
  }
}
