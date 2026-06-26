export type CharacterRange = 'S' | 'M' | 'L'

export type CharacterPosition = 'front' | 'back'

export type Character = {
  id: number
  name: string
  level: number
  exp: number
  hp: number
  maxHp: number
  power: number
  directDefense: number
  technique: number
  range: CharacterRange
  position: CharacterPosition
}

export type EnemyCharacter = Character & {
  baseExp: number
}
