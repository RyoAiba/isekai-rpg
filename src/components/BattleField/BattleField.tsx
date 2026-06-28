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

const ALLEN_APPROACH_ROUTES_BY_FRONT_ENEMY_SLOT: Record<number, MeleeApproachRoute> = {
  1: {
    targetXVw: -56,
    targetYPx: -54,
    arcHeightPx: 150,
  },
  2: {
    targetXVw: -58,
    targetYPx: -70,
    arcHeightPx: 160,
  },
  3: {
    targetXVw: -60,
    targetYPx: -86,
    arcHeightPx: 170,
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

export function BattleField({
  party,
  enemies,
  activeCharacterId,
  activeEnemyId,
  defeatedEnemyId,
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
    ...visibleEnemies.filter((enemy) => enemy.position === 'back'),
    ...visibleEnemies.filter((enemy) => enemy.position === 'front'),
  ]
  const orderedParty = [
    ...party.filter((character) => character.position === 'front'),
    ...party.filter((character) => character.position === 'back'),
  ]
  const frontEnemySlotById = new Map(
    visibleEnemies
      .filter((enemy) => enemy.position === 'front')
      .map((enemy, index) => [enemy.id, index + 1]),
  )

  return (
    <div className="battle-field" aria-label="戦闘フィールド">
      <div className="battle-side battle-side-enemy" aria-label="敵エリア">
        {orderedEnemies.map((enemy, index) => {
          const enemyClassName = [
            'unit-card',
            'enemy-unit',
            'formation-slot-' + (index + 1),
            enemy.id === activeEnemyId ? 'is-active-character' : '',
            enemy.id === actingEnemyId ? 'is-acting-character' : '',
            enemy.id === damagedEnemyId ? 'is-damaged-unit' : '',
            enemy.id === defeatedEnemyId ? 'is-defeated-enemy' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              className={enemyClassName}
              key={enemy.id + '-' + (enemy.id === damagedEnemyId ? damageEventId : 0)}
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
          const frontEnemySlot = actingTargetEnemyId === undefined
            ? undefined
            : frontEnemySlotById.get(actingTargetEnemyId)
          const meleeRoute = character.id === 1 && frontEnemySlot !== undefined
            ? ALLEN_APPROACH_ROUTES_BY_FRONT_ENEMY_SLOT[frontEnemySlot]
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
