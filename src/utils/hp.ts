import { getMaxHp } from '../battle/StatCalculator'
import type { Character } from '../types/character'

const CRITICAL_HP_RATE = 0.35

export function isCriticalHp(character: Character) {
  const maxHp = getMaxHp(character)

  return character.currentHp <= 0 || character.currentHp / maxHp <= CRITICAL_HP_RATE
}
