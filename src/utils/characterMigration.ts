import type { Character } from '../types/character'
import type { ActiveEffect } from '../battle/effects/types'
import type { BattleTraits, Stats } from '../types/stats'
import { defaultBattleSpritesByCharacterId } from '../data/battleSprites'

type LegacyCharacter = Partial<Character> & {
  hp?: number
  maxHp?: number
  power?: number
  magic?: number
  directDefense?: number
  magicDefense?: number
  technique?: number
  speed?: number
  battleTraits?: Partial<BattleTraits>
  activeEffects?: ActiveEffect[]
  buffs?: { id: string }[]
  states?: { id: string }[]
  baseStats?: Partial<Stats>
  currentHp?: number
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' ? value : fallback
}

function normalizeActiveEffects(character: LegacyCharacter): ActiveEffect[] {
  if (Array.isArray(character.activeEffects)) {
    return character.activeEffects.map((effect) => ({ ...effect }))
  }

  const legacyEffects = [
    ...(Array.isArray(character.buffs) ? character.buffs : []),
    ...(Array.isArray(character.states) ? character.states : []),
  ]

  return legacyEffects.map((effect) => ({ effectId: effect.id }))
}

export function normalizeCharacter(character: LegacyCharacter): Character {
  const baseStats: Partial<Stats> = character.baseStats ?? {}
  const maxHp = toNumber(baseStats.maxHp, toNumber(character.maxHp, 1))
  const id = toNumber(character.id, 0)
  const defaultBattleSprite = defaultBattleSpritesByCharacterId[id]
  const battleSprite = character.battleSprite || defaultBattleSprite

  return {
    id,
    name: typeof character.name === 'string' ? character.name : 'Unknown',
    level: toNumber(character.level, 1),
    exp: toNumber(character.exp, 0),
    currentHp: Math.min(toNumber(character.currentHp, toNumber(character.hp, maxHp)), maxHp),
    baseStats: {
      maxHp,
      power: toNumber(baseStats.power, toNumber(character.power, 1)),
      magic: toNumber(baseStats.magic, toNumber(character.magic, 0)),
      directDefense: toNumber(
        baseStats.directDefense,
        toNumber(character.directDefense, 0),
      ),
      magicDefense: toNumber(
        baseStats.magicDefense,
        toNumber(character.magicDefense, 0),
      ),
      technique: toNumber(baseStats.technique, toNumber(character.technique, 0)),
      speed: toNumber(baseStats.speed, toNumber(character.speed, 10)),
    },
    battleTraits: {
      initiativeVariance: toNumber(character.battleTraits?.initiativeVariance, 0),
    },
    activeEffects: normalizeActiveEffects(character),
    range: character.range ?? 'S',
    position: character.position ?? 'front',
    battleSprite: battleSprite
      ? {
          ...defaultBattleSprite,
          ...battleSprite,
          attackHitFrameMs: toNumber(
            battleSprite.attackHitFrameMs,
            defaultBattleSprite?.attackHitFrameMs ?? 320,
          ),
          motions: {
            ...defaultBattleSprite?.motions,
            ...battleSprite.motions,
          },
        }
      : undefined,
  }
}

export function normalizeCharacters(characters: LegacyCharacter[]): Character[] {
  return characters.map((character) => normalizeCharacter(character))
}
