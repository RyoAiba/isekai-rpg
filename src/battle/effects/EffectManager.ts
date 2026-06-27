import { getEffectDefinition } from './EffectDatabase'
import type { ActiveEffect, EffectRemoveTiming } from './types'
import type { Character } from '../../types/character'

type AddEffectOptions = Omit<ActiveEffect, 'effectId'>

export function hasEffect(character: Character, effectId: string) {
  return character.activeEffects.some((effect) => effect.effectId === effectId)
}

export function addEffect(
  character: Character,
  effectId: string,
  options: AddEffectOptions = {},
): Character {
  if (!getEffectDefinition(effectId) || hasEffect(character, effectId)) {
    return character
  }

  return {
    ...character,
    activeEffects: [
      ...character.activeEffects,
      {
        effectId,
        ...options,
      },
    ],
  }
}

export function removeEffect(character: Character, effectId: string): Character {
  return {
    ...character,
    activeEffects: character.activeEffects.filter((effect) => effect.effectId !== effectId),
  }
}

export function getActiveEffectDefinitions(character: Character) {
  return character.activeEffects
    .map((effect) => getEffectDefinition(effect.effectId))
    .filter((definition) => definition !== undefined)
}

export function removeEffectsByTiming(character: Character, timing: EffectRemoveTiming): Character {
  return {
    ...character,
    activeEffects: character.activeEffects.filter((effect) => {
      const definition = getEffectDefinition(effect.effectId)
      return !definition?.removeTimings.includes(timing)
    }),
  }
}
