import type { CSSProperties } from 'react'
import { getActiveEffectDefinitions } from '../../battle/effects/EffectManager'
import { getMaxHp } from '../../battle/StatCalculator'
import type { BattleExecutionStep } from '../../types/battle'
import type { BattleSpriteMotion, Character } from '../../types/character'

type BattleFieldProps = {
  party: Character[]
  enemies: Character[]
  activeCharacterId?: number
  activeEnemyId?: number
  defeatedEnemyId?: number
  promotedEnemyId?: number
  promotionAnimationId?: number
  damagedEnemyId?: number
  damagedCharacterId?: number
  damageEventId?: number
  executionStep?: BattleExecutionStep
  meleeActionKey?: string
  actingCharacterId?: number
  actingEnemyId?: number
  actingTargetEnemyId?: number
  showDebugInfo?: boolean
}

type MeleeApproachRoute = {
  targetXVw: number
  targetYPx: number
  arcHeightPx: number
}

type PromotionRoute = {
  startX: string
  startY: string
}

const ALLEN_APPROACH_ROUTES_BY_FRONT_ENEMY_SLOT: Record<number, MeleeApproachRoute> = {
  1: {
    targetXVw: -48,
    targetYPx: -36,
    arcHeightPx: 145,
  },
  2: {
    targetXVw: -38,
    targetYPx: -66,
    arcHeightPx: 165,
  },
  3: {
    targetXVw: -28,
    targetYPx: -96,
    arcHeightPx: 185,
  },
}

const ENEMY_PROMOTION_ROUTES_BY_LANE: Record<number, PromotionRoute> = {
  1: {
    startX: '-48px',
    startY: '-116px',
  },
  2: {
    startX: '-48px',
    startY: '-116px',
  },
  3: {
    startX: '-48px',
    startY: '-116px',
  },
}

function getDebugInfo(character: Character, options: { showHp?: boolean } = {}) {
  const effectNames = getActiveEffectDefinitions(character).map((effect) => effect.name)
  const effectText = effectNames.length > 0 ? effectNames.join('・') : 'なし'
  const hpText = options.showHp ? ' HP ' + character.currentHp + '/' + getMaxHp(character) : ''

  return character.range + ' / ' + effectText + hpText
}

function getBattleSpriteMotion(
  character: Character,
  options: { actingCharacterId?: number; executionStep?: BattleExecutionStep },
): BattleSpriteMotion {
  if (character.id === options.actingCharacterId) {
    if (options.executionStep === 'approach') {
      return 'approach'
    }

    if (options.executionStep === 'attack') {
      return 'attack'
    }

    if (options.executionStep === 'return') {
      return 'return'
    }
  }

  return 'idle'
}

function getMeleeRouteStyle(route: MeleeApproachRoute): CSSProperties {
  const style = {
    '--melee-target-x': `${route.targetXVw}vw`,
    '--melee-target-y': `${route.targetYPx}px`,
  } as CSSProperties

  for (let step = 10; step <= 90; step += 10) {
    const progress = step / 100
    const x = route.targetXVw * progress
    const y = route.targetYPx * progress - route.arcHeightPx * 4 * progress * (1 - progress)

    Object.assign(style, {
      [`--melee-step-${step}-x`]: `${x}vw`,
      [`--melee-step-${step}-y`]: `${y}px`,
    })
  }

  return style
}

function getPromotionRouteStyle(route: PromotionRoute): CSSProperties {
  return {
    '--enemy-promote-start-x': route.startX,
    '--enemy-promote-start-y': route.startY,
  } as CSSProperties
}

export function BattleField({
  party,
  enemies,
  activeCharacterId,
  activeEnemyId,
  defeatedEnemyId,
  promotedEnemyId,
  promotionAnimationId = 0,
  damagedEnemyId,
  damagedCharacterId,
  damageEventId = 0,
  executionStep,
  meleeActionKey,
  actingCharacterId,
  actingEnemyId,
  actingTargetEnemyId,
  showDebugInfo = false,
}: BattleFieldProps) {
  const visibleEnemies = enemies.filter(
    (enemy) => enemy.currentHp > 0 || enemy.id === defeatedEnemyId,
  )
  const orderedEnemies = [
    ...visibleEnemies
      .filter((enemy) => enemy.position === 'back')
      .sort((a, b) => (a.lane ?? 1) - (b.lane ?? 1)),
    ...visibleEnemies
      .filter((enemy) => enemy.position === 'front')
      .sort((a, b) => (a.lane ?? 1) - (b.lane ?? 1)),
  ]
  const orderedParty = [
    ...party.filter((character) => character.position === 'front'),
    ...party.filter((character) => character.position === 'back'),
  ]
  const frontEnemySlotById = new Map(
    visibleEnemies
      .filter((enemy) => enemy.position === 'front')
      .map((enemy) => [enemy.id, enemy.lane ?? 1]),
  )

  return (
    <div className="battle-field" aria-label="戦闘フィールド">
      <div className="battle-side battle-side-enemy" aria-label="敵エリア">
        {orderedEnemies.map((enemy, index) => {
          const enemyLane = enemy.lane ?? ((index % 3) + 1)
          const enemyFormationSlot = enemy.position === 'back' ? enemyLane : enemyLane + 3
          const promotionRoute = enemy.id === promotedEnemyId
            ? ENEMY_PROMOTION_ROUTES_BY_LANE[enemyLane]
            : undefined
          const enemyClassName = [
            'unit-card',
            'enemy-unit',
            'formation-slot-' + enemyFormationSlot,
            enemy.id === activeEnemyId ? 'is-active-character' : '',
            enemy.id === actingEnemyId ? 'is-acting-character' : '',
            enemy.id === damagedEnemyId ? 'is-damaged-unit' : '',
            enemy.id === defeatedEnemyId ? 'is-defeated-enemy' : '',
            enemy.id === promotedEnemyId ? 'is-promoted-enemy' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              className={enemyClassName}
              key={
                enemy.id
                + '-'
                + (enemy.id === damagedEnemyId ? damageEventId : 0)
                + '-'
                + (enemy.id === promotedEnemyId ? promotionAnimationId : 0)
              }
              style={promotionRoute ? getPromotionRouteStyle(promotionRoute) : undefined}
            >
              <span>{enemy.name}</span>
              {showDebugInfo && (
                <small className="unit-debug-info">
                  {getDebugInfo(enemy, { showHp: true })}
                </small>
              )}
            </div>
          )
        })}
      </div>

      <div className="battle-side battle-side-party" aria-label="味方エリア">
        {orderedParty.map((character, index) => {
          const battleSprite = character.battleSprite
          const battleSpriteMotion = getBattleSpriteMotion(character, {
            actingCharacterId,
            executionStep,
          })
          const battleSpriteSrc =
            battleSprite?.motions[battleSpriteMotion] ?? battleSprite?.motions.idle
          const targetEnemy = actingTargetEnemyId === undefined
            ? undefined
            : enemies.find((enemy) => enemy.id === actingTargetEnemyId)
          const targetLane = targetEnemy?.lane
            ?? (actingTargetEnemyId === undefined ? undefined : frontEnemySlotById.get(actingTargetEnemyId))
          const meleeRoute = character.id === 1 && targetLane !== undefined
            ? ALLEN_APPROACH_ROUTES_BY_FRONT_ENEMY_SLOT[targetLane]
            : undefined
          const isMeleeActingCharacter =
            character.id === actingCharacterId && executionStep !== undefined && meleeRoute !== undefined
          const partyClassName = [
            'unit-card',
            'party-unit',
            battleSprite ? 'has-battle-sprite' : '',
            isMeleeActingCharacter ? 'is-melee-acting-character' : '',
            isMeleeActingCharacter ? 'is-melee-' + executionStep : '',
            'formation-slot-' + (index + 1),
            character.id === activeCharacterId ? 'is-active-character' : '',
            character.id === actingCharacterId ? 'is-acting-character' : '',
            character.id === damagedCharacterId ? 'is-damaged-unit' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              className={partyClassName}
              key={
                character.id
                + '-'
                + (character.id === damagedCharacterId ? damageEventId : 0)
                + '-'
                + (isMeleeActingCharacter ? meleeActionKey : 'idle')
              }
              style={meleeRoute ? getMeleeRouteStyle(meleeRoute) : undefined}
            >
              {battleSprite && battleSpriteSrc ? (
                <img
                  alt={battleSprite.alt}
                  className="battle-unit-sprite"
                  src={battleSpriteSrc}
                  style={{
                    width: battleSprite.width,
                    height: battleSprite.height,
                  }}
                />
              ) : (
                <span>{character.name}</span>
              )}
              {showDebugInfo && <small className="unit-debug-info">{getDebugInfo(character)}</small>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
