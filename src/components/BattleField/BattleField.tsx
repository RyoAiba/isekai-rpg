import { enemies } from '../../data/enemies'
import type { Character, CharacterPosition } from '../../types/character'

type BattleFieldProps = {
  party: Character[]
  activeCharacterId?: number
}

const positionLabel: Record<CharacterPosition, string> = {
  front: '前衛',
  back: '後衛',
}

const orderedEnemies = [
  ...enemies.filter((enemy) => enemy.position === 'back'),
  ...enemies.filter((enemy) => enemy.position === 'front'),
]

export function BattleField({ party, activeCharacterId }: BattleFieldProps) {
  const orderedParty = [
    ...party.filter((character) => character.position === 'front'),
    ...party.filter((character) => character.position === 'back'),
  ]

  return (
    <div className="battle-field" aria-label="戦闘フィールド">
      <div className="battle-side battle-side-enemy" aria-label="敵エリア">
        {orderedEnemies.map((enemy, index) => (
          <div
            className={`unit-card enemy-unit formation-slot-${index + 1}`}
            key={enemy.id}
          >
            <span>{enemy.name}</span>
            <small>
              {positionLabel[enemy.position]} / {enemy.range}
            </small>
          </div>
        ))}
      </div>

      <div className="battle-side battle-side-party" aria-label="味方エリア">
        {orderedParty.map((character, index) => (
          <div
            className={`unit-card party-unit formation-slot-${index + 1}${
              character.id === activeCharacterId ? ' is-active-character' : ''
            }`}
            key={character.id}
          >
            <span>{character.name}</span>
            <small>
              {positionLabel[character.position]} / {character.range}
            </small>
          </div>
        ))}
      </div>
    </div>
  )
}
