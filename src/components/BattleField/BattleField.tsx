import type { Character } from '../../types/character'

type BattleFieldProps = {
  party: Character[]
  enemies: Character[]
  activeCharacterId?: number
  activeEnemyId?: number
  actingCharacterId?: number
  showDebugInfo?: boolean
}

export function BattleField({
  party,
  enemies,
  activeCharacterId,
  activeEnemyId,
  actingCharacterId,
  showDebugInfo = false,
}: BattleFieldProps) {
  const aliveEnemies = enemies.filter((enemy) => enemy.hp > 0)
  const orderedEnemies = [
    ...aliveEnemies.filter((enemy) => enemy.position === 'back'),
    ...aliveEnemies.filter((enemy) => enemy.position === 'front'),
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
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div className={enemyClassName} key={enemy.id}>
              <span>{enemy.name}</span>
              {showDebugInfo && (
                <small className="unit-debug-info">
                  {enemy.range} HP {enemy.hp}/{enemy.maxHp}
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
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div className={partyClassName} key={character.id}>
              <span>{character.name}</span>
              {showDebugInfo && <small className="unit-debug-info">{character.range}</small>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
