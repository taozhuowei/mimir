import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { createPinia, setActivePinia } = require('pinia')
const { generateReading } = require('../.test-dist/utils/tarotReading.js')
const { useTarotStore } = require('../.test-dist/stores/tarot.js')

function createMockCard(id, upright_sentiment, reversed_sentiment) {
  return {
    id,
    name: id,
    nameEn: id,
    number: 1,
    type: 'major',
    image: `/static/${id}.jpeg`,
    upright: {
      keywords: [],
      meaning: `${id} upright`,
      sentiment: upright_sentiment
    },
    reversed: {
      keywords: [],
      meaning: `${id} reversed`,
      sentiment: reversed_sentiment
    }
  }
}

function runGenerateReadingTests() {
  const positive_card = createMockCard('sun', 'positive', 'negative')
  const negative_card = createMockCard('tower', 'negative', 'positive')
  const neutral_card = createMockCard('justice', 'neutral', 'neutral')

  const yes_result = generateReading([
    { card: positive_card, position: 'upright' },
    { card: positive_card, position: 'upright' },
    { card: positive_card, position: 'upright' }
  ])

  assert.equal(yes_result.result, 'yes')
  assert.equal(yes_result.confidence, 100)
  assert.equal(yes_result.cardDetails.length, 3)

  const uncertain_result = generateReading([
    { card: positive_card, position: 'upright' },
    { card: negative_card, position: 'upright' },
    { card: neutral_card, position: 'upright' }
  ])

  assert.equal(uncertain_result.result, 'uncertain')
  assert.equal(uncertain_result.confidence, 0)
}

function runTarotStoreTests() {
  setActivePinia(createPinia())
  const tarot_store = useTarotStore()

  tarot_store.startDivination('Will this work?')

  assert.equal(tarot_store.phase, 'shuffling')
  assert.equal(tarot_store.currentQuestion, 'Will this work?')
  assert.equal(tarot_store.isAnimating, true)
  assert.equal(tarot_store.isResultVisible, false)

  const drawn_cards = tarot_store.drawThreeCards()

  assert.equal(drawn_cards.length, 3)
  assert.equal(tarot_store.drawnCards.length, 3)
  assert.ok(tarot_store.readingResult)

  tarot_store.revealResult()

  assert.equal(tarot_store.phase, 'result')
  assert.equal(tarot_store.isAnimating, false)
  assert.equal(tarot_store.isResultVisible, true)

  tarot_store.reset()

  assert.equal(tarot_store.phase, 'idle')
  assert.equal(tarot_store.drawnCards.length, 0)
  assert.equal(tarot_store.readingResult, null)
  assert.equal(tarot_store.currentQuestion, '')
  assert.equal(tarot_store.isIdle, true)
}

runGenerateReadingTests()
runTarotStoreTests()

console.log('tarot_state.test.mjs passed')
