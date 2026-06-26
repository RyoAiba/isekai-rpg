import type { Character } from '../types/character'

type DamageCalculationParams = {
  attacker: Character
  defender: Character
}

export type DamageCalculationResult = {
  damage: number
  isCritical: boolean
}

const MINIMUM_DAMAGE = 1

export function calculateDamage({
  attacker,
  defender,
}: DamageCalculationParams): DamageCalculationResult {
  const baseDamage = attacker.power - defender.directDefense

  return {
    damage: Math.max(baseDamage, MINIMUM_DAMAGE),
    isCritical: false,
  }
}
