import type { EffectDefinition } from './types'

const effectDefinitions: EffectDefinition[] = [
  {
    id: 'poison',
    name: '毒',
    category: 'state',
    removeTimings: ['inn', 'item'],
  },
]

const effectDefinitionMap = new Map(
  effectDefinitions.map((definition) => [definition.id, definition]),
)

export function getEffectDefinition(effectId: string) {
  return effectDefinitionMap.get(effectId)
}

export function getEffectName(effectId: string) {
  return getEffectDefinition(effectId)?.name ?? effectId
}

export function getAllEffectDefinitions() {
  return [...effectDefinitions]
}
