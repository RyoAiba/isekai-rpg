import type { Character } from '../types/character'

export function getMaxHp(character: Character) {
  return character.baseStats.maxHp
}

export function getPower(character: Character) {
  return character.baseStats.power
}

export function getMagic(character: Character) {
  return character.baseStats.magic
}

export function getDirectDefense(character: Character) {
  return character.baseStats.directDefense
}

export function getMagicDefense(character: Character) {
  return character.baseStats.magicDefense
}

export function getTechnique(character: Character) {
  return character.baseStats.technique
}

export function getSpeed(character: Character) {
  return character.baseStats.speed
}

export function getStatsSnapshot(character: Character) {
  return { ...character.baseStats }
}

export function getStatsWithGains(
  character: Character,
  gains: Partial<Record<keyof ReturnType<typeof getStatsSnapshot>, number>>,
) {
  const stats = getStatsSnapshot(character)

  return {
    ...stats,
    maxHp: stats.maxHp + (gains.maxHp ?? 0),
    power: stats.power + (gains.power ?? 0),
    magic: stats.magic + (gains.magic ?? 0),
    directDefense: stats.directDefense + (gains.directDefense ?? 0),
    magicDefense: stats.magicDefense + (gains.magicDefense ?? 0),
    technique: stats.technique + (gains.technique ?? 0),
    speed: stats.speed + (gains.speed ?? 0),
  }
}
