import type { BattleSprite } from '../types/character'
import allenAttackSprite from '../assets/characters/allen/attack.png'
import allenIdleSprite from '../assets/characters/allen/idle.png'
import jowyAttackSprite from '../assets/characters/Jowy/attack.png'
import jowyIdleSprite from '../assets/characters/Jowy/idle.png'

export const allenBattleSprite: BattleSprite = {
  alt: 'アレン',
  width: 128,
  height: 128,
  attackHitFrameMs: 480,
  motions: {
    idle: allenIdleSprite,
    approach: allenIdleSprite,
    attack: allenAttackSprite,
    return: allenIdleSprite,
  },
}

export const jowyBattleSprite: BattleSprite = {
  alt: 'ジョウイ',
  width: 128,
  height: 128,
  attackHitFrameMs: 480,
  motions: {
    idle: jowyIdleSprite,
    approach: jowyIdleSprite,
    attack: jowyAttackSprite,
    return: jowyIdleSprite,
  },
}

export const defaultBattleSpritesByCharacterId: Record<number, BattleSprite> = {
  1: allenBattleSprite,
  2: jowyBattleSprite,
}
