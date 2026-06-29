import { hasEffect, removeEffect } from '../battle/effects/EffectManager'
import { getMaxHp } from '../battle/StatCalculator'
import type { Character } from '../types/character'
import type { ItemId } from '../types/item'

export function canUseItemOnCharacter(itemId: ItemId, character: Character) {
  if (itemId === 'herb') {
    return character.currentHp > 0 && character.currentHp < getMaxHp(character)
  }

  if (itemId === 'antidote') {
    return hasEffect(character, 'poison')
  }

  return false
}

export function applyItemToCharacter(itemId: ItemId, character: Character): Character {
  if (!canUseItemOnCharacter(itemId, character)) {
    return character
  }

  if (itemId === 'herb') {
    return {
      ...character,
      currentHp: Math.min(character.currentHp + 100, getMaxHp(character)),
    }
  }

  if (itemId === 'antidote') {
    return removeEffect(character, 'poison')
  }

  return character
}
