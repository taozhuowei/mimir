// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { createProgressModel } from '../src/flows/divination/composables/progress_model'

describe('overlay_progress/phase_progress_model', () => {
  describe('createProgressModel', () => {
    it('initializes with correct default state', () => {
      const model = createProgressModel('shuffling')

      expect(model.state.currentPhase).toBe('shuffling')
      expect(model.state.currentPhaseIndex).toBe(0)
      expect(model.state.totalPhases).toBe(4)
      expect(model.state.progressRatio).toBe(0.25)
      expect(model.state.isComplete).toBe(false)
    })

    it('initializes with custom initial phase', () => {
      const model = createProgressModel('drawing')

      expect(model.state.currentPhase).toBe('drawing')
      expect(model.state.currentPhaseIndex).toBe(2)
      expect(model.state.progressRatio).toBe(0.75)
      expect(model.state.isComplete).toBe(false)
    })

    it('transitionTo updates state correctly', () => {
      const model = createProgressModel('shuffling')

      model.transitionTo('cutting')
      expect(model.state.currentPhase).toBe('cutting')
      expect(model.state.currentPhaseIndex).toBe(1)
      expect(model.state.progressRatio).toBe(0.5)

      model.transitionTo('revealing')
      expect(model.state.currentPhase).toBe('revealing')
      expect(model.state.currentPhaseIndex).toBe(3)
      expect(model.state.progressRatio).toBe(1)
      expect(model.state.isComplete).toBe(true)
    })

    it('complete marks as complete', () => {
      const model = createProgressModel('drawing')

      model.complete()
      expect(model.state.progressRatio).toBe(1)
      expect(model.state.isComplete).toBe(true)
    })

    it('reset restores initial state', () => {
      const model = createProgressModel('revealing')

      model.reset()
      expect(model.state.currentPhase).toBe('shuffling')
      expect(model.state.currentPhaseIndex).toBe(0)
      expect(model.state.progressRatio).toBe(0.25)
      expect(model.state.isComplete).toBe(false)
    })
  })
})
