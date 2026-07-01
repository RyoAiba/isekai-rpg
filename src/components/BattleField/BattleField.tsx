import type { CSSProperties } from 'react'
import { getActiveEffectDefinitions } from '../../battle/effects/EffectManager'
import { getMaxHp } from '../../battle/StatCalculator'
import type { BattleDamagePopup, BattleExecutionStep, BattlePartyMotion } from '../../types/battle'
import type { BattleSpriteMotion, Character } from '../../types/character'
import { toFullWidthNumber } from '../../utils/numberFormat'

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
  activePartyMotions?: BattlePartyMotion[]
  damagePopups?: BattleDamagePopup[]
  showDebugInfo?: boolean
}

type MeleeApproachRoute = {
  targetXPx: number
  targetYPx: number
  arcHeightPx: number
}

type FormationOffset = {
  xPx: number
  yPx: number
}

type PromotionRoute = {
  startX: string
  startY: string
}

const PARTY_GRID_COLUMN_WIDTH_PX = 112
const PARTY_GRID_ROW_HEIGHT_PX = 74
const PARTY_GRID_COLUMN_GAP_PX = 12
const PARTY_GRID_ROW_GAP_PX = 16

const PARTY_FORMATION_TRANSFORMS_BY_SLOT: Record<number, FormationOffset> = {
  1: { xPx: -30, yPx: 2 },
  2: { xPx: -16, yPx: -14 },
  3: { xPx: -2, yPx: -30 },
  4: { xPx: 18, yPx: 28 },
  5: { xPx: 32, yPx: 12 },
  6: { xPx: 46, yPx: -4 },
}

const PARTY_MELEE_REFERENCE_SLOT = 1

const BASE_PARTY_MELEE_ROUTES_BY_FRONT_ENEMY_SLOT: Record<number, MeleeApproachRoute> = {
  1: {
    targetXPx: -636,
    targetYPx: -90,
    arcHeightPx: 168,
  },
  2: {
    targetXPx: -498,
    targetYPx: -106,
    arcHeightPx: 184,
  },
  3: {
    targetXPx: -360,
    targetYPx: -122,
    arcHeightPx: 200,
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
  const hpText = options.showHp
    ? ' HP ' + toFullWidthNumber(character.currentHp) + '/' + toFullWidthNumber(getMaxHp(character))
    : ''

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

function getPartyMeleeRoute(partyFormationSlot: number, targetEnemySlot: number) {
  const baseRoute = BASE_PARTY_MELEE_ROUTES_BY_FRONT_ENEMY_SLOT[targetEnemySlot]
  const referenceOffset = getPartyFormationOffset(PARTY_MELEE_REFERENCE_SLOT)
  const currentOffset = getPartyFormationOffset(partyFormationSlot)

  if (!baseRoute || !referenceOffset || !currentOffset) {
    return undefined
  }

  return {
    ...baseRoute,
    targetXPx: baseRoute.targetXPx + referenceOffset.xPx - currentOffset.xPx,
    targetYPx: baseRoute.targetYPx + referenceOffset.yPx - currentOffset.yPx,
  }
}

function getPartyFormationOffset(partyFormationSlot: number) {
  const transform = PARTY_FORMATION_TRANSFORMS_BY_SLOT[partyFormationSlot]

  if (!transform) {
    return undefined
  }

  const columnIndex = (partyFormationSlot - 1) % 3
  const rowIndex = Math.floor((partyFormationSlot - 1) / 3)

  return {
    xPx: columnIndex * (PARTY_GRID_COLUMN_WIDTH_PX + PARTY_GRID_COLUMN_GAP_PX) + transform.xPx,
    yPx: rowIndex * (PARTY_GRID_ROW_HEIGHT_PX + PARTY_GRID_ROW_GAP_PX) + transform.yPx,
  }
}

function getMeleeRouteStyle(route: MeleeApproachRoute): CSSProperties {
  const style = {
    '--melee-target-x': `${route.targetXPx}px`,
    '--melee-target-y': `${route.targetYPx}px`,
  } as CSSProperties

  for (let step = 10; step <= 90; step += 10) {
    const progress = step / 100
    const xPx = route.targetXPx * progress
    const y = route.targetYPx * progress - route.arcHeightPx * 4 * progress * (1 - progress)

    Object.assign(style, {
      [`--melee-step-${step}-x`]: `${xPx}px`,
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
  activePartyMotions = [],
  damagePopups = [],
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
          const damagePopup = damagePopups.find(
            (popup) => popup.targetSide === 'enemy' && popup.targetId === enemy.id,
          )
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
              {damagePopup && (
                <span className="damage-popup" key={damagePopup.id}>
                  {toFullWidthNumber(damagePopup.damage)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="battle-side battle-side-party" aria-label="味方エリア">
        {orderedParty.map((character, index) => {
          const damagePopup = damagePopups.find(
            (popup) => popup.targetSide === 'party' && popup.targetId === character.id,
          )
          const activePartyMotion = activePartyMotions.find((motion) => motion.characterId === character.id)
          const battleSprite = character.battleSprite
          const battleSpriteMotion = getBattleSpriteMotion(character, {
            actingCharacterId: activePartyMotion?.characterId ?? actingCharacterId,
            executionStep: activePartyMotion?.executionStep ?? executionStep,
          })
          const battleSpriteSrc =
            battleSprite?.motions[battleSpriteMotion] ?? battleSprite?.motions.idle
          const motionTargetEnemyId = activePartyMotion?.targetEnemyId ?? actingTargetEnemyId
          const targetEnemy = motionTargetEnemyId === undefined
            ? undefined
            : enemies.find((enemy) => enemy.id === motionTargetEnemyId)
          const targetLane = targetEnemy?.lane
            ?? (motionTargetEnemyId === undefined ? undefined : frontEnemySlotById.get(motionTargetEnemyId))
          const partyFormationSlot = index + 1
          const meleeRoute = battleSprite && targetLane !== undefined
            ? getPartyMeleeRoute(partyFormationSlot, targetLane)
            : undefined
          const isMeleeActingCharacter =
            (activePartyMotion !== undefined || character.id === actingCharacterId)
            && battleSpriteMotion !== 'idle'
            && meleeRoute !== undefined
          const partyClassName = [
            'unit-card',
            'party-unit',
            battleSprite ? 'has-battle-sprite' : '',
            isMeleeActingCharacter ? 'is-melee-acting-character' : '',
            isMeleeActingCharacter ? 'is-melee-' + battleSpriteMotion : '',
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
                + (isMeleeActingCharacter ? (activePartyMotion?.animationId ?? meleeActionKey) : 'idle')
              }
              style={
                meleeRoute
                  ? {
                    ...getMeleeRouteStyle(meleeRoute),
                    '--melee-start-delay': `${activePartyMotion?.startDelayMs ?? 0}ms`,
                  } as CSSProperties
                  : undefined
              }
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
              {damagePopup && (
                <span className="damage-popup" key={damagePopup.id}>
                  {toFullWidthNumber(damagePopup.damage)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
