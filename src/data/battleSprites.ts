import type { BattleSprite } from '../types/character'
import allenIdleSprite from '../assets/characters/allen/idle.png'

export const allenBattleSprite: BattleSprite = {
  alt: 'アレン',
  width: 128,
  height: 128,
  motions: {
    idle: allenIdleSprite,
    attack: allenIdleSprite,
    skill: allenIdleSprite,
    damaged: allenIdleSprite,
  },
}

export const defaultBattleSpritesByCharacterId: Record<number, BattleSprite> = {
  1: allenBattleSprite,
}
