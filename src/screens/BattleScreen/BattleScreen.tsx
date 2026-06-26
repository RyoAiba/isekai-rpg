import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyCharacterCommand,
  applyConfirmCommand,
  applyPartyCommand,
  applyTargetSelection,
  cancelTargetSelection,
  createInitialBattleState,
  getActiveCharacter,
  moveSelection,
  moveTargetSelection,
  returnToPreviousCharacter,
  setSelectedCharacterCommand,
  setSelectedConfirmCommand,
  setSelectedPartyCommand,
  setSelectedTarget,
} from '../../battle/BattleManager'
import { BattleField } from '../../components/BattleField/BattleField'
import {
  CONFIRM_COMMANDS,
  DEFAULT_CHARACTER_COMMANDS,
  PARTY_COMMANDS,
} from '../../data/battleCommands'
import { enemies } from '../../data/enemies'
import { useBattleCommandInput } from '../../hooks/useBattleCommandInput'
import type { Character } from '../../types/character'

type BattleScreenProps = {
  party: Character[]
  onBattleEnd: () => void
  onEscape: () => void
}

const frontEnemies = enemies.filter((enemy) => enemy.position === 'front')
const backEnemies = enemies.filter((enemy) => enemy.position === 'back')
const selectableEnemyColumns = [
  [...backEnemies].reverse(),
  [...frontEnemies].reverse(),
]
const selectableEnemies = selectableEnemyColumns.flatMap((column) => column)
const targetRowCount = selectableEnemyColumns[0]?.length ?? 0
const defaultTargetIndex = Math.max(
  selectableEnemies.findIndex((enemy) => enemy.id === frontEnemies.at(-1)?.id),
  0,
)

export function BattleScreen({ party, onBattleEnd, onEscape }: BattleScreenProps) {
  const timerRef = useRef<number | null>(null)
  const [battleState, setBattleState] = useState(createInitialBattleState)
  const isResolving = battleState.phase === 'resolving'
  const isSelectingCharacter = battleState.phase === 'characterCommand'
  const showsBattleWindows =
    battleState.phase === 'partyCommand' ||
    battleState.phase === 'characterCommand' ||
    battleState.phase === 'targetSelection'
  const activeCharacter = getActiveCharacter(battleState, party)
  const activeEnemy = selectableEnemies[battleState.selectedTargetIndex]

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  const resolveBattle = useCallback(() => {
    if (timerRef.current !== null) {
      return
    }

    setBattleState((currentState) => ({ ...currentState, phase: 'resolving' }))
    timerRef.current = window.setTimeout(() => {
      onBattleEnd()
    }, 3000)
  }, [onBattleEnd])

  const executePartyCommand = useCallback(() => {
    const command = PARTY_COMMANDS[battleState.selectedPartyCommandIndex]

    if (!command.enabled) {
      return
    }

    if (command.id === 'escape') {
      onEscape()
      return
    }

    setBattleState((currentState) =>
      applyPartyCommand(currentState, command.id, party, selectableEnemies),
    )
  }, [battleState.selectedPartyCommandIndex, onEscape, party])

  const selectCharacterCommand = useCallback(() => {
    const command = DEFAULT_CHARACTER_COMMANDS[battleState.selectedCharacterCommandIndex]
    setBattleState((currentState) =>
      applyCharacterCommand(currentState, command, party, defaultTargetIndex),
    )
  }, [battleState.selectedCharacterCommandIndex, party])

  const cancelCharacterCommand = useCallback(() => {
    setBattleState((currentState) => returnToPreviousCharacter(currentState))
  }, [])

  const selectTarget = useCallback(() => {
    setBattleState((currentState) =>
      applyTargetSelection(currentState, selectableEnemies[currentState.selectedTargetIndex], party),
    )
  }, [party])

  const cancelTarget = useCallback(() => {
    setBattleState((currentState) => cancelTargetSelection(currentState))
  }, [])

  const executeConfirmCommand = useCallback(() => {
    const command = CONFIRM_COMMANDS[battleState.selectedConfirmIndex]

    if (command.id === 'yes') {
      resolveBattle()
      return
    }

    setBattleState((currentState) => applyConfirmCommand(currentState, command.id, party))
  }, [battleState.selectedConfirmIndex, party, resolveBattle])

  const moveSelectedCommand = useCallback(
    (direction: 'previous' | 'next', commandCount: number) => {
      setBattleState((currentState) => moveSelection(currentState, direction, commandCount))
    },
    [],
  )

  const moveSelectedTarget = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    setBattleState((currentState) =>
      moveTargetSelection(currentState, direction, targetRowCount, selectableEnemies.length),
    )
  }, [])

  useBattleCommandInput({
    battleState,
    targetCount: selectableEnemies.length,
    onMoveTargetSelection: moveSelectedTarget,
    onMoveSelection: moveSelectedCommand,
    onPartyCommandConfirm: executePartyCommand,
    onCharacterCommandConfirm: selectCharacterCommand,
    onTargetConfirm: selectTarget,
    onConfirmCommandConfirm: executeConfirmCommand,
    onCancelCharacterCommand: cancelCharacterCommand,
    onCancelTargetSelection: cancelTarget,
  })

  return (
    <section
      className={`battle-screen${isResolving ? ' is-resolving' : ''}${
        battleState.phase === 'targetSelection' ? ' is-target-selecting' : ''
      }`}
    >
      <BattleField
        party={party}
        activeCharacterId={activeCharacter?.id}
        activeEnemyId={battleState.phase === 'targetSelection' ? activeEnemy?.id : undefined}
      />

      {showsBattleWindows && (
        <div className="battle-hud">
          {battleState.phase !== 'targetSelection' && (
            <div className="battle-command-window battle-window">
              {battleState.phase === 'partyCommand' &&
                PARTY_COMMANDS.map((command, index) => (
                  <button
                    className={battleState.selectedPartyCommandIndex === index ? 'is-selected' : ''}
                    type="button"
                    key={command.id}
                    onClick={() => {
                      setBattleState((currentState) => setSelectedPartyCommand(currentState, index))
                      if (command.id === 'escape') {
                        onEscape()
                        return
                      }
                      setBattleState((currentState) =>
                        applyPartyCommand(currentState, command.id, party, selectableEnemies),
                      )
                    }}
                    onMouseEnter={() =>
                      setBattleState((currentState) => setSelectedPartyCommand(currentState, index))
                    }
                    disabled={isResolving}
                  >
                    {command.label}
                  </button>
                ))}

              {battleState.phase === 'characterCommand' &&
                DEFAULT_CHARACTER_COMMANDS.map((command, index) => (
                  <button
                    className={battleState.selectedCharacterCommandIndex === index ? 'is-selected' : ''}
                    type="button"
                    key={command.id}
                    onClick={() =>
                      setBattleState((currentState) =>
                        applyCharacterCommand(currentState, command, party, defaultTargetIndex),
                      )
                    }
                    onMouseEnter={() =>
                      setBattleState((currentState) => setSelectedCharacterCommand(currentState, index))
                    }
                    disabled={!command.enabled}
                  >
                    {command.label}
                  </button>
                ))}
            </div>
          )}

          <div className="party-hp-window battle-window">
            <ul>
              {party.map((character) => (
                <li
                  className={
                    isSelectingCharacter
                      ? character.id === activeCharacter?.id
                        ? 'is-active-character'
                        : 'is-inactive-character'
                      : ''
                  }
                  key={character.id}
                >
                  <span>{character.name}</span>
                  <span className="hp-value">
                    <span className="heart-mark" aria-label="HP">
                      ♥
                    </span>
                    <span>{character.hp}</span>
                    <span>/</span>
                    <span>{character.maxHp}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showsBattleWindows && (
        <div className="enemy-list-window battle-window">
          {battleState.phase === 'targetSelection' ? (
            selectableEnemyColumns.map((column, columnIndex) => (
              <ul key={columnIndex}>
                {column.map((enemy) => {
                  const enemyIndex = selectableEnemies.findIndex(
                    (selectableEnemy) => selectableEnemy.id === enemy.id,
                  )

                  return (
                    <li key={enemy.id}>
                      <button
                        className={battleState.selectedTargetIndex === enemyIndex ? 'is-selected' : ''}
                        type="button"
                        onClick={() =>
                          setBattleState((currentState) => applyTargetSelection(currentState, enemy, party))
                        }
                        onMouseEnter={() =>
                          setBattleState((currentState) => setSelectedTarget(currentState, enemyIndex))
                        }
                      >
                        {enemy.name}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ))
          ) : (
            selectableEnemyColumns.map((column, index) => (
              <ul key={index}>
                {column.map((enemy) => (
                  <li key={enemy.id}>{enemy.name}</li>
                ))}
              </ul>
            ))
          )}
        </div>
      )}

      {battleState.phase === 'confirmActions' && (
        <div className="battle-confirm-window battle-window">
          <p>よろしいですか？</p>
          {CONFIRM_COMMANDS.map((command, index) => (
            <button
              className={battleState.selectedConfirmIndex === index ? 'is-selected' : ''}
              type="button"
              key={command.id}
              onClick={() => {
                if (command.id === 'yes') {
                  resolveBattle()
                  return
                }
                setBattleState((currentState) => applyConfirmCommand(currentState, command.id, party))
              }}
              onMouseEnter={() =>
                setBattleState((currentState) => setSelectedConfirmCommand(currentState, index))
              }
            >
              {command.label}
            </button>
          ))}
        </div>
      )}

      {isResolving && (
        <p className="battle-status">
          戦闘結果を計算中... {battleState.actions.length}/{party.length}
        </p>
      )}
    </section>
  )
}
