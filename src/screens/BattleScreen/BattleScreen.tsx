import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { getMaxHp } from '../../battle/StatCalculator'
import {
  applyCharacterCommand,
  applyConfirmCommand,
  applyPartyCommand,
  applyTargetSelection,
  cancelTargetSelection,
  createInitialBattleState,
  executeNextBattleAction,
  executeNextEnemyAction,
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
import { enemies as initialEnemies } from '../../data/enemies'
import { useBattleCommandInput } from '../../hooks/useBattleCommandInput'
import type { Character } from '../../types/character'

type BattleScreenProps = {
  party: Character[]
  onBattleEnd: (party: Character[], enemies: Character[]) => void
  onEscape: (party?: Character[]) => void
}

const isBattleDebugEnabled = import.meta.env.VITE_ENABLE_BATTLE_DEBUG === 'true'
const BATTLE_ACTION_INTERVAL_MS = 1000
const BATTLE_DEFEAT_CHAIN_INTERVAL_MS = 450
const ENEMY_ACTION_INTERVAL_MS = 1000

export function BattleScreen({ party, onBattleEnd, onEscape }: BattleScreenProps) {
  const resultTimerRef = useRef<number | null>(null)
  const actionTimerRef = useRef<number | null>(null)
  const [battleState, setBattleState] = useState(() => createInitialBattleState(initialEnemies, party))
  const isExecuting = battleState.phase === 'executing'
  const isResolving = battleState.phase === 'resolving'
  const isSelectingCharacter = battleState.phase === 'characterCommand'
  const showsBattleWindows =
    battleState.phase === 'partyCommand' ||
    battleState.phase === 'characterCommand' ||
    battleState.phase === 'targetSelection'
  const activeCharacter = getActiveCharacter(battleState, battleState.party)

  const enemyColumns = useMemo(() => {
    const aliveEnemies = battleState.enemies.filter((enemy) => enemy.currentHp > 0)
    const frontEnemies = aliveEnemies.filter((enemy) => enemy.position === 'front')
    const backEnemies = aliveEnemies.filter((enemy) => enemy.position === 'back')

    return [
      [...backEnemies].reverse(),
      [...frontEnemies].reverse(),
    ]
  }, [battleState.enemies])

  const selectableEnemyColumns = useMemo(
    () => enemyColumns.map((column) => column.filter((enemy) => enemy.currentHp > 0)),
    [enemyColumns],
  )
  const selectableEnemies = useMemo(
    () => selectableEnemyColumns.flatMap((column) => column),
    [selectableEnemyColumns],
  )
  const targetRowCount = Math.max(selectableEnemyColumns[0]?.length ?? 0, 1)
  const defaultTargetIndex = useMemo(() => {
    const frontAliveEnemies = battleState.enemies.filter(
      (enemy) => enemy.position === 'front' && enemy.currentHp > 0,
    )
    const defaultEnemyId = frontAliveEnemies.at(-1)?.id ?? selectableEnemies[0]?.id

    return Math.max(
      selectableEnemies.findIndex((enemy) => enemy.id === defaultEnemyId),
      0,
    )
  }, [battleState.enemies, selectableEnemies])
  const activeEnemy = selectableEnemies[battleState.selectedTargetIndex]
  const enemyListColumnWidth = useMemo(() => {
    const longestEnemyNameLength = battleState.enemies.reduce(
      (longestLength, enemy) => (enemy.currentHp > 0 ? Math.max(longestLength, enemy.name.length) : longestLength),
      0,
    )

    return `${Math.max(longestEnemyNameLength + 2, 5)}em`
  }, [battleState.enemies])

  useEffect(() => {
    return () => {
      if (resultTimerRef.current !== null) {
        window.clearTimeout(resultTimerRef.current)
      }
      if (actionTimerRef.current !== null) {
        window.clearTimeout(actionTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (battleState.phase !== 'executing') {
      return
    }

    const delay = battleState.executingCharacterId === undefined
      ? 0
      : battleState.lastActionDefeatedEnemy
        ? BATTLE_DEFEAT_CHAIN_INTERVAL_MS
        : BATTLE_ACTION_INTERVAL_MS

    actionTimerRef.current = window.setTimeout(() => {
      setBattleState((currentState) => executeNextBattleAction(currentState))
    }, delay)

    return () => {
      if (actionTimerRef.current !== null) {
        window.clearTimeout(actionTimerRef.current)
      }
    }
  }, [
    battleState.executingActionIndex,
    battleState.executingCharacterId,
    battleState.lastActionDefeatedEnemy,
    battleState.phase,
  ])

  useEffect(() => {
    if (battleState.phase !== 'enemyExecuting') {
      return
    }

    const delay = battleState.executingEnemyId === undefined ? 0 : ENEMY_ACTION_INTERVAL_MS

    actionTimerRef.current = window.setTimeout(() => {
      setBattleState((currentState) => executeNextEnemyAction(currentState))
    }, delay)

    return () => {
      if (actionTimerRef.current !== null) {
        window.clearTimeout(actionTimerRef.current)
      }
    }
  }, [
    battleState.executingEnemyId,
    battleState.executingEnemyIndex,
    battleState.phase,
  ])

  useEffect(() => {
    if (battleState.phase !== 'resolving' || !battleState.isVictory) {
      return
    }

    resultTimerRef.current = window.setTimeout(() => {
      onBattleEnd(battleState.party, battleState.enemies)
    }, BATTLE_ACTION_INTERVAL_MS)

    return () => {
      if (resultTimerRef.current !== null) {
        window.clearTimeout(resultTimerRef.current)
      }
    }
  }, [
    battleState.enemies,
    battleState.isVictory,
    battleState.party,
    battleState.phase,
    onBattleEnd,
  ])

  useEffect(() => {
    if (battleState.phase !== 'resolving' || !battleState.isDefeat) {
      return
    }

    resultTimerRef.current = window.setTimeout(() => {
      onEscape(battleState.party)
    }, BATTLE_ACTION_INTERVAL_MS)

    return () => {
      if (resultTimerRef.current !== null) {
        window.clearTimeout(resultTimerRef.current)
      }
    }
  }, [battleState.isDefeat, battleState.party, battleState.phase, onEscape])

  const executePartyCommand = useCallback(() => {
    const command = PARTY_COMMANDS[battleState.selectedPartyCommandIndex]

    if (!command.enabled) {
      return
    }

    if (command.id === 'escape') {
      onEscape(battleState.party)
      return
    }

    setBattleState((currentState) =>
      applyPartyCommand(currentState, command.id, currentState.party, currentState.enemies),
    )
  }, [battleState.party, battleState.selectedPartyCommandIndex, onEscape])

  const selectCharacterCommand = useCallback(() => {
    const command = DEFAULT_CHARACTER_COMMANDS[battleState.selectedCharacterCommandIndex]
    setBattleState((currentState) =>
      applyCharacterCommand(currentState, command, currentState.party, defaultTargetIndex),
    )
  }, [battleState.selectedCharacterCommandIndex, defaultTargetIndex])

  const cancelCharacterCommand = useCallback(() => {
    setBattleState((currentState) => returnToPreviousCharacter(currentState))
  }, [])

  const selectTarget = useCallback(() => {
    setBattleState((currentState) =>
      applyTargetSelection(currentState, selectableEnemies[currentState.selectedTargetIndex], currentState.party),
    )
  }, [selectableEnemies])

  const cancelTarget = useCallback(() => {
    setBattleState((currentState) => cancelTargetSelection(currentState))
  }, [])

  const executeConfirmCommand = useCallback(() => {
    const command = CONFIRM_COMMANDS[battleState.selectedConfirmIndex]

    setBattleState((currentState) => applyConfirmCommand(currentState, command.id, currentState.party))
  }, [battleState.selectedConfirmIndex])

  const moveSelectedCommand = useCallback(
    (direction: 'previous' | 'next', commandCount: number) => {
      setBattleState((currentState) => moveSelection(currentState, direction, commandCount))
    },
    [],
  )

  const moveSelectedTarget = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      setBattleState((currentState) =>
        moveTargetSelection(currentState, direction, targetRowCount, selectableEnemies.length),
      )
    },
    [selectableEnemies.length, targetRowCount],
  )

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
        party={battleState.party}
        enemies={battleState.enemies}
        activeCharacterId={activeCharacter?.id}
        activeEnemyId={battleState.phase === 'targetSelection' ? activeEnemy?.id : undefined}
        defeatedEnemyId={isExecuting || isResolving ? battleState.lastDefeatedEnemyId : undefined}
        damagedEnemyId={battleState.lastDamagedEnemyId}
        damagedCharacterId={battleState.lastDamagedCharacterId}
        damageEventId={battleState.lastDamageEventId}
        actingCharacterId={isExecuting || isResolving ? battleState.executingCharacterId : undefined}
        actingEnemyId={battleState.phase === 'enemyExecuting' || isResolving ? battleState.executingEnemyId : undefined}
        showDebugInfo={isBattleDebugEnabled}
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
                        onEscape(battleState.party)
                        return
                      }
                      setBattleState((currentState) =>
                        applyPartyCommand(currentState, command.id, currentState.party, currentState.enemies),
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
                        applyCharacterCommand(currentState, command, currentState.party, defaultTargetIndex),
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
              {battleState.party.map((character) => (
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
                    <span>{character.currentHp}</span>
                    <span>/</span>
                    <span>{getMaxHp(character)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showsBattleWindows && (
        <div
          className="enemy-list-window battle-window"
          style={{ '--enemy-list-column-width': enemyListColumnWidth } as CSSProperties}
        >
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
                          setBattleState((currentState) => applyTargetSelection(currentState, enemy, currentState.party))
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
            enemyColumns.map((column, index) => (
              <ul key={index}>
                {column.map((enemy) => (
                  <li key={enemy.id}>
                    <span className="enemy-list-name">{enemy.name}</span>
                  </li>
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
                setBattleState((currentState) => applyConfirmCommand(currentState, command.id, currentState.party))
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

      {isBattleDebugEnabled && battleState.timeline.length > 0 && (
        <aside className="battle-timeline battle-window" aria-label="Battle Timeline">
          <ol>
            {battleState.timeline.map((event) => (
              <li key={event.id}>{event.message}</li>
            ))}
          </ol>
        </aside>
      )}
    </section>
  )
}
