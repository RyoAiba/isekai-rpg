import type { BattleTraits, Buff, State, Stats } from './stats'

export type CharacterRange = 'S' | 'M' | 'L'

export type CharacterPosition = 'front' | 'back'

export type Character = {
  id: number
  name: string
  level: number
  exp: number
  currentHp: number
  baseStats: Stats
  battleTraits: BattleTraits
  buffs: Buff[]
  states: State[]
  range: CharacterRange
  position: CharacterPosition
}

export type EnemyCharacter = Character & {
  baseExp: number
}
