import { removeEffectsByTiming } from '../battle/effects/EffectManager'
import { getMaxHp } from '../battle/StatCalculator'
import type { Character } from '../types/character'

export const INN_COST = 20

export function canStayAtInn(money: number) {
  return money >= INN_COST
}

export function healPartyAtInn(party: Character[]) {
  return party.map((character) => ({
    ...removeEffectsByTiming(character, 'inn'),
    currentHp: getMaxHp(character),
  }))
}
