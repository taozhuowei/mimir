const MAX_UINT32 = 4294967296

function getCryptoRandom(): number {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return buffer[0] / MAX_UINT32
}

export function secureRandomInt(max: number): number {
  return Math.floor(getCryptoRandom() * max)
}

export function secureRandomBoolean(): boolean {
  return getCryptoRandom() > 0.5
}

export function secureRandomRange(min: number, max: number): number {
  return min + getCryptoRandom() * (max - min)
}
