import { getStatsSnapshot } from '../battle/StatCalculator'
import type { Character } from '../types/character'

export function cloneCharacter(character: Character): Character {
  return {
    ...character,
    baseStats: getStatsSnapshot(character),
    battleTraits: { ...character.battleTraits },
    activeEffects: character.activeEffects.map((effect) => ({ ...effect })),
    battleSprite: character.battleSprite
      ? {
          ...character.battleSprite,
          motions: { ...character.battleSprite.motions },
        }
      : undefined,
  }
}

export function cloneCharacters(characters: Character[]): Character[] {
  return characters.map((character) => cloneCharacter(character))
}
