export type Stats = {
  maxHp: number
  power: number
  magic: number
  directDefense: number
  magicDefense: number
  technique: number
  speed: number
}

export type BattleTraits = {
  initiativeVariance: number
}

export type Buff = {
  id: string
}

export type StateRemovalTiming =
  | 'battleEnd'
  | 'inn'
  | 'itemOrMagic'
  | 'never'

export type State = {
  id: string
  removalTiming?: StateRemovalTiming
}
