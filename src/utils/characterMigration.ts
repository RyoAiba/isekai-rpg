import type { Character } from '../types/character'
import type { BattleTraits, Buff, State, Stats } from '../types/stats'

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
  buffs?: Buff[]
  states?: State[]
  baseStats?: Partial<Stats>
  currentHp?: number
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' ? value : fallback
}

export function normalizeCharacter(character: LegacyCharacter): Character {
  const baseStats: Partial<Stats> = character.baseStats ?? {}
  const maxHp = toNumber(baseStats.maxHp, toNumber(character.maxHp, 1))

  return {
    id: toNumber(character.id, 0),
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
    buffs: Array.isArray(character.buffs) ? character.buffs : [],
    states: Array.isArray(character.states) ? character.states : [],
    range: character.range ?? 'S',
    position: character.position ?? 'front',
  }
}

export function normalizeCharacters(characters: LegacyCharacter[]): Character[] {
  return characters.map((character) => normalizeCharacter(character))
}
