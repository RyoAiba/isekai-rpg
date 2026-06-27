export type EffectCategory = 'buff' | 'state'

export type EffectRemoveTiming = 'battleEnd' | 'turnEnd' | 'inn' | 'item' | 'never'

export type EffectDefinition = {
  id: string
  name: string
  category: EffectCategory
  removeTimings: EffectRemoveTiming[]
}

export type ActiveEffect = {
  effectId: string
  remainingTurns?: number
  sourceId?: string
  stacks?: number
}

export type AttackEffect = {
  effectId: string
  chance: number
}
