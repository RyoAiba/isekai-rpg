import { getMaxHp } from '../../battle/StatCalculator'
import type { Character } from '../../types/character'

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
                  {enemy.range} HP {enemy.currentHp}/{getMaxHp(enemy)}
                </small>
              )}
            </div>
          )
        })}
      </div>

      <div className="battle-side battle-side-party" aria-label="味方エリア">
        {orderedParty.map((character, index) => {
          const partyClassName = [
            'unit-card',
            'party-unit',
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
              <span>{character.name}</span>
              {showDebugInfo && <small className="unit-debug-info">{character.range}</small>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
