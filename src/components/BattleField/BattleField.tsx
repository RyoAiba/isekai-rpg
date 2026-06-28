import { getActiveEffectDefinitions } from '../../battle/effects/EffectManager'
import { getMaxHp } from '../../battle/StatCalculator'
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
  actingCharacterId?: number
  actingEnemyId?: number
  showDebugInfo?: boolean
}

function getDebugInfo(character: Character, options: { showHp?: boolean } = {}) {
  const effectNames = getActiveEffectDefinitions(character).map((effect) => effect.name)
  const effectText = effectNames.length > 0 ? effectNames.join('・') : 'なし'
  const hpText = options.showHp ? ' HP ' + character.currentHp + '/' + getMaxHp(character) : ''

  return character.range + ' / ' + effectText + hpText
}

function getBattleSpriteMotion(
  character: Character,
  options: { actingCharacterId?: number; damagedCharacterId?: number },
): BattleSpriteMotion {
  if (character.id === options.damagedCharacterId) {
    return 'damaged'
  }

  if (character.id === options.actingCharacterId) {
    return 'attack'
  }

  return 'idle'
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
  actingCharacterId,
  actingEnemyId,
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
            damagedCharacterId,
          })
          const battleSpriteSrc =
            battleSprite?.motions[battleSpriteMotion] ?? battleSprite?.motions.idle
          const partyClassName = [
            'unit-card',
            'party-unit',
            battleSprite ? 'has-battle-sprite' : '',
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
              key={character.id + '-' + (character.id === damagedCharacterId ? damageEventId : 0)}
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
