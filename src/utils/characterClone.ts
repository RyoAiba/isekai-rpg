import { getStatsSnapshot } from '../battle/StatCalculator'
import type { Character } from '../types/character'

export function cloneCharacter(character: Character): Character {
  return {
    ...character,
    baseStats: getStatsSnapshot(character),
    battleTraits: { ...character.battleTraits },
    buffs: [...character.buffs],
    states: [...character.states],
  }
}

export function cloneCharacters(characters: Character[]): Character[] {
  return characters.map((character) => cloneCharacter(character))
}
