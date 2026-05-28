/**
 * Boot status seam tests
 * Verifies the pending → ok | failed tri-state and the isFailed gate that
 * pages/index.vue uses to pick LoadingView vs MainSurface, including the
 * reactive recovery path (failed → ok flips isFailed back to false).
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBootStatus } from '../src/flows/base/composables/use_boot_status'

describe('boot status', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults to pending and is not failed', () => {
    const { status, isFailed } = useBootStatus()
    expect(status.value).toBe('pending')
    expect(isFailed.value).toBe(false)
  })

  it('markFailed sets failed and flips isFailed', () => {
    const { status, isFailed, markFailed } = useBootStatus()
    markFailed()
    expect(status.value).toBe('failed')
    expect(isFailed.value).toBe(true)
  })

  it('markOk sets ok and isFailed stays false', () => {
    const { status, isFailed, markOk } = useBootStatus()
    markOk()
    expect(status.value).toBe('ok')
    expect(isFailed.value).toBe(false)
  })

  it('recovery: markOk after markFailed clears the failed gate', () => {
    const { status, isFailed, markFailed, markOk } = useBootStatus()
    markFailed()
    expect(isFailed.value).toBe(true)
    markOk()
    expect(status.value).toBe('ok')
    expect(isFailed.value).toBe(false)
  })

  it('shares one store instance across seam calls', () => {
    useBootStatus().markFailed()
    expect(useBootStatus().isFailed.value).toBe(true)
  })
})
