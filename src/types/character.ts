import type { ActiveEffect, AttackEffect } from '../battle/effects/types'
import type { BattleTraits, Stats } from './stats'

export type CharacterRange = 'S' | 'M' | 'L'

export type CharacterPosition = 'front' | 'back'

export type BattleSpriteMotion = 'idle' | 'attack' | 'skill' | 'damaged'

export type BattleSprite = {
  alt: string
  width: number
  height: number
  motions: Partial<Record<BattleSpriteMotion, string>> & {
    idle: string
  }
}

export type Character = {
  id: number
  name: string
  level: number
  exp: number
  currentHp: number
  baseStats: Stats
  battleTraits: BattleTraits
  activeEffects: ActiveEffect[]
  range: CharacterRange
  position: CharacterPosition
  battleSprite?: BattleSprite
}

export type EnemyCharacter = Character & {
  baseExp: number
  attackEffects?: AttackEffect[]
}
