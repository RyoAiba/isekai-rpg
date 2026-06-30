import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { getMaxHp } from '../../battle/StatCalculator'
import {
  applyCharacterCommand,
  applyConfirmCommand,
  applyPartyCommand,
  applyTargetSelection,
  advanceAnimatedPartyActionToAttack,
  beginAnimatedPartyAction,
  cancelTargetSelection,
  canUseAnimatedPartyAction,
  createInitialBattleState,
  executeNextBattleAction,
  finishAnimatedPartyAction,
  forceBattleDefeat,
  forceBattleVictory,
  getActiveCharacter,
  getAlivePartyMembers,
  moveSelection,
  moveTargetSelection,
  resolveAnimatedPartyActionHit,
  returnToPreviousCharacter,
  setSelectedCharacterCommand,
  setSelectedConfirmCommand,
  setSelectedPartyCommand,
  setSelectedTarget,
} from '../../battle/BattleManager'
import { BattleField } from '../../components/BattleField/BattleField'
import {
  BattleField3D,
  type BattleField3DCameraMode,
} from '../../components/battle/BattleField3D/BattleField3D'
import { BattleTimeline } from '../../components/BattleTimeline/BattleTimeline'
import { ResultOverlay } from '../../components/ResultOverlay/ResultOverlay'
import {
  CONFIRM_COMMANDS,
  DEFAULT_CHARACTER_COMMANDS,
  PARTY_COMMANDS,
} from '../../data/battleCommands'
import { enemies as initialEnemies } from '../../data/enemies'
import { useBattleCommandInput } from '../../hooks/useBattleCommandInput'
import { InputManager } from '../../input/InputManager'
import type { Character } from '../../types/character'
import { isCriticalHp } from '../../utils/hp'
import { toFullWidthNumber } from '../../utils/numberFormat'

type BattleScreenProps = {
  party: Character[]
  money: number
  onBattleComplete: (party: Character[], money: number) => void
  onEscape: (party?: Character[]) => void
}

type DefeatResultStep = 'none' | 'message' | 'closing'
type EscapeResultStep = 'none' | 'message' | 'closing'

const isBattleDebugEnabled = import.meta.env.VITE_ENABLE_BATTLE_DEBUG === 'true'
const BATTLE_START_DELAY_MS = 1000
const BATTLE_ACTION_INTERVAL_MS = 1000
const BATTLE_DEFEAT_CHAIN_INTERVAL_MS = 450
const RESULT_OVERLAY_DELAY_MS = 1000
const DEFEAT_RESULT_FADE_DURATION_MS = 1000
const ESCAPE_RESULT_FADE_DURATION_MS = 1000
const APPROACH_DURATION_MS = 560
const RETURN_DURATION_MS = 520
const DEFAULT_ATTACK_HIT_FRAME_MS = 320

export function BattleScreen({ party, money, onBattleComplete, onEscape }: BattleScreenProps) {
  const resultTimerRef = useRef<number | null>(null)
  const actionTimerRef = useRef<number | null>(null)
  const defeatResultTimerRef = useRef<number | null>(null)
  const escapeResultTimerRef = useRef<number | null>(null)
  const [battleState, setBattleState] = useState(() => createInitialBattleState(initialEnemies, party))
  const [isResultOverlayReady, setIsResultOverlayReady] = useState(false)
  const [defeatResultStep, setDefeatResultStep] = useState<DefeatResultStep>('none')
  const [escapeResultStep, setEscapeResultStep] = useState<EscapeResultStep>('none')
  const [fieldCameraMode, setFieldCameraMode] = useState<BattleField3DCameraMode>('commandView')
  const isExecuting = battleState.phase === 'executing'
  const isResolving = battleState.phase === 'resolving'
  const effectiveDefeatResultStep =
    battleState.phase === 'resolving' && battleState.isDefeat && defeatResultStep === 'none'
      ? 'entering'
      : defeatResultStep
  const isSelectingCharacter =
    battleState.phase === 'characterCommand' ||
    battleState.phase === 'targetSelection' ||
    (battleState.phase === 'confirmActions' && !battleState.isAutoCommandConfirm)
  const isShowingEscapeResult = escapeResultStep !== 'none'
  const showsBattleWindows =
    !isShowingEscapeResult &&
    (battleState.phase === 'partyCommand' ||
      battleState.phase === 'characterCommand' ||
      battleState.phase === 'targetSelection')
  const activeCharacter = getActiveCharacter(battleState, battleState.party)
  const activePartyListCharacter = useMemo(() => {
    if (activeCharacter) {
      return activeCharacter
    }

    if (battleState.phase === 'confirmActions' && !battleState.isAutoCommandConfirm) {
      return getAlivePartyMembers(battleState.party)[battleState.activeCharacterIndex]
    }

    return undefined
  }, [
    activeCharacter,
    battleState.activeCharacterIndex,
    battleState.isAutoCommandConfirm,
    battleState.party,
    battleState.phase,
  ])

  const enemyColumns = useMemo(() => {
    const aliveEnemies = battleState.enemies.filter((enemy) => enemy.currentHp > 0)
    const frontEnemies = aliveEnemies
      .filter((enemy) => enemy.position === 'front')
      .sort((a, b) => (a.lane ?? 1) - (b.lane ?? 1))
    const backEnemies = aliveEnemies
      .filter((enemy) => enemy.position === 'back')
      .sort((a, b) => (a.lane ?? 1) - (b.lane ?? 1))

    return [
      backEnemies,
      frontEnemies,
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
    const defaultEnemyId = frontAliveEnemies.sort((a, b) => (a.lane ?? 1) - (b.lane ?? 1))[0]?.id
      ?? selectableEnemies[0]?.id

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
      if (defeatResultTimerRef.current !== null) {
        window.clearTimeout(defeatResultTimerRef.current)
      }
      if (escapeResultTimerRef.current !== null) {
        window.clearTimeout(escapeResultTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (battleState.phase !== 'executing') {
      return
    }

    if (battleState.executionStep === 'approach') {
      actionTimerRef.current = window.setTimeout(() => {
        setBattleState((currentState) => advanceAnimatedPartyActionToAttack(currentState))
      }, APPROACH_DURATION_MS)

      return () => {
        if (actionTimerRef.current !== null) {
          window.clearTimeout(actionTimerRef.current)
        }
      }
    }

    if (battleState.executionStep === 'attack') {
      const actingCharacter = battleState.party.find(
        (character) => character.id === battleState.executingCharacterId,
      )
      const hitFrameMs = actingCharacter?.battleSprite?.attackHitFrameMs ?? DEFAULT_ATTACK_HIT_FRAME_MS

      actionTimerRef.current = window.setTimeout(() => {
        setBattleState((currentState) => resolveAnimatedPartyActionHit(currentState))
      }, hitFrameMs)

      return () => {
        if (actionTimerRef.current !== null) {
          window.clearTimeout(actionTimerRef.current)
        }
      }
    }

    if (battleState.executionStep === 'return') {
      actionTimerRef.current = window.setTimeout(() => {
        setBattleState((currentState) => finishAnimatedPartyAction(currentState))
      }, RETURN_DURATION_MS)

      return () => {
        if (actionTimerRef.current !== null) {
          window.clearTimeout(actionTimerRef.current)
        }
      }
    }

    const delay = battleState.executingCharacterId === undefined && battleState.executingEnemyId === undefined
      ? battleState.executingActionIndex === 0
        ? BATTLE_START_DELAY_MS
        : 0
      : battleState.lastActionDefeatedEnemy
        ? BATTLE_DEFEAT_CHAIN_INTERVAL_MS
        : BATTLE_ACTION_INTERVAL_MS

    actionTimerRef.current = window.setTimeout(() => {
      setBattleState((currentState) =>
        canUseAnimatedPartyAction(currentState)
          ? beginAnimatedPartyAction(currentState)
          : executeNextBattleAction(currentState),
      )
    }, delay)

    return () => {
      if (actionTimerRef.current !== null) {
        window.clearTimeout(actionTimerRef.current)
      }
    }
  }, [
    battleState.executingActionIndex,
    battleState.executingCharacterId,
    battleState.executingEnemyId,
    battleState.executionStep,
    battleState.lastActionDefeatedEnemy,
    battleState.party,
    battleState.phase,
  ])

  useEffect(() => {
    if (battleState.phase !== 'resolving' || !battleState.isVictory) {
      return
    }

    resultTimerRef.current = window.setTimeout(() => {
      setIsResultOverlayReady(true)
    }, RESULT_OVERLAY_DELAY_MS)

    return () => {
      if (resultTimerRef.current !== null) {
        window.clearTimeout(resultTimerRef.current)
      }
    }
  }, [battleState.isVictory, battleState.phase])

  useEffect(() => {
    if (battleState.phase !== 'resolving' || !battleState.isDefeat) {
      return
    }

    if (defeatResultStep !== 'none') {
      return
    }

    if (defeatResultTimerRef.current !== null) {
      return
    }

    defeatResultTimerRef.current = window.setTimeout(() => {
      setDefeatResultStep('message')
      defeatResultTimerRef.current = null
    }, DEFEAT_RESULT_FADE_DURATION_MS)
  }, [battleState.isDefeat, battleState.phase, defeatResultStep])

  const closeDefeatResult = useCallback(() => {
    if (defeatResultStep !== 'message') {
      return
    }

    setDefeatResultStep('closing')
    defeatResultTimerRef.current = window.setTimeout(() => {
      onEscape(battleState.party)
      defeatResultTimerRef.current = null
    }, DEFEAT_RESULT_FADE_DURATION_MS)
  }, [battleState.party, defeatResultStep, onEscape])

  useEffect(() => {
    if (defeatResultStep !== 'message') {
      return
    }

    return InputManager.subscribe(() => {
      if (InputManager.confirm()) {
        closeDefeatResult()
      }
    })
  }, [closeDefeatResult, defeatResultStep])

  const showEscapeResult = useCallback(() => {
    if (escapeResultStep !== 'none') {
      return
    }

    setEscapeResultStep('message')
  }, [escapeResultStep])

  const closeEscapeResult = useCallback(() => {
    if (escapeResultStep !== 'message') {
      return
    }

    if (escapeResultTimerRef.current !== null) {
      return
    }

    setEscapeResultStep('closing')
    escapeResultTimerRef.current = window.setTimeout(() => {
      onEscape(battleState.party)
      escapeResultTimerRef.current = null
    }, ESCAPE_RESULT_FADE_DURATION_MS)
  }, [battleState.party, escapeResultStep, onEscape])

  useEffect(() => {
    if (escapeResultStep !== 'message') {
      return
    }

    return InputManager.subscribe(() => {
      if (InputManager.confirm()) {
        closeEscapeResult()
      }
    })
  }, [closeEscapeResult, escapeResultStep])

  const executePartyCommand = useCallback(() => {
    const command = PARTY_COMMANDS[battleState.selectedPartyCommandIndex]

    if (!command.enabled) {
      return
    }

    if (command.id === 'escape') {
      showEscapeResult()
      return
    }

    setBattleState((currentState) =>
      applyPartyCommand(currentState, command.id, currentState.party, currentState.enemies),
    )
  }, [battleState.selectedPartyCommandIndex, showEscapeResult])

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

  const cancelConfirmCommand = useCallback(() => {
    setBattleState((currentState) => applyConfirmCommand(currentState, 'no', currentState.party))
  }, [])

  const clearBattleTimers = useCallback(() => {
    if (resultTimerRef.current !== null) {
      window.clearTimeout(resultTimerRef.current)
      resultTimerRef.current = null
    }
    if (actionTimerRef.current !== null) {
      window.clearTimeout(actionTimerRef.current)
      actionTimerRef.current = null
    }
    if (defeatResultTimerRef.current !== null) {
      window.clearTimeout(defeatResultTimerRef.current)
      defeatResultTimerRef.current = null
    }
    if (escapeResultTimerRef.current !== null) {
      window.clearTimeout(escapeResultTimerRef.current)
      escapeResultTimerRef.current = null
    }
    setDefeatResultStep('none')
    setEscapeResultStep('none')
  }, [])

  const debugWinBattle = useCallback(() => {
    clearBattleTimers()
    setIsResultOverlayReady(true)
    setBattleState((currentState) => forceBattleVictory(currentState))
  }, [clearBattleTimers])

  const debugLoseBattle = useCallback(() => {
    clearBattleTimers()
    const defeatedState = forceBattleDefeat(battleState)
    setBattleState(defeatedState)
  }, [battleState, clearBattleTimers])

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
    onCancelConfirmCommand: cancelConfirmCommand,
    disabled: escapeResultStep !== 'none',
  })

  return (
    <section
      className={`battle-screen${isResolving ? ' is-resolving' : ''}${
        battleState.phase === 'targetSelection' ? ' is-target-selecting' : ''
      }`}
    >
      <BattleField3D cameraMode={fieldCameraMode} />

      {isBattleDebugEnabled && (
        <div className="battle-debug-tools">
          <div className="battle-camera-tools battle-window" aria-label="3Dカメラ確認用">
            {(['commandView', 'actionView'] as BattleField3DCameraMode[]).map((cameraMode) => (
              <button
                className={fieldCameraMode === cameraMode ? 'is-selected' : ''}
                type="button"
                key={cameraMode}
                onClick={() => setFieldCameraMode(cameraMode)}
              >
                {cameraMode}
              </button>
            ))}
          </div>

          <div className="battle-resolution-tools battle-window" aria-label="戦闘デバッグ操作">
            <button type="button" onClick={debugWinBattle}>
              即勝利
            </button>
            <button type="button" onClick={debugLoseBattle}>
              即敗北
            </button>
          </div>
        </div>
      )}

      <BattleField
        party={battleState.party}
        enemies={battleState.enemies}
        activeCharacterId={activeCharacter?.id}
        activeEnemyId={battleState.phase === 'targetSelection' ? activeEnemy?.id : undefined}
        defeatedEnemyId={isExecuting || isResolving ? battleState.lastDefeatedEnemyId : undefined}
        promotedEnemyId={isExecuting || isResolving ? battleState.promotedEnemyId : undefined}
        promotionAnimationId={battleState.promotionAnimationId}
        damagedEnemyId={battleState.lastDamagedEnemyId}
        damagedCharacterId={battleState.lastDamagedCharacterId}
        damageEventId={battleState.lastDamageEventId}
        executionStep={battleState.executionStep}
        meleeActionKey={String(battleState.executionAnimationId)}
        actingCharacterId={isExecuting || isResolving ? battleState.executingCharacterId : undefined}
        actingEnemyId={isExecuting || isResolving ? battleState.executingEnemyId : undefined}
        actingTargetEnemyId={isExecuting || isResolving ? battleState.executingTargetEnemyId : undefined}
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
                        showEscapeResult()
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
                      ? character.id === activePartyListCharacter?.id
                        ? 'is-active-character'
                        : 'is-inactive-character'
                      : ''
                  }
                  key={character.id}
                >
                  <span>{character.name}</span>
                  <span className={isCriticalHp(character) ? 'hp-value is-critical-hp' : 'hp-value'}>
                    <span className="heart-mark" aria-label="HP">
                      ♥
                    </span>
                    <span>{toFullWidthNumber(character.currentHp)}</span>
                    <span>/</span>
                    <span>{toFullWidthNumber(getMaxHp(character))}</span>
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

      {isBattleDebugEnabled && !isShowingEscapeResult && <BattleTimeline events={battleState.timeline} />}

      {battleState.phase === 'resolving' && battleState.isVictory && isResultOverlayReady && (
        <ResultOverlay
          party={battleState.party}
          rewards={battleState.rewards}
          money={money}
          onComplete={onBattleComplete}
        />
      )}

      {effectiveDefeatResultStep !== 'none' && (
        <div className={`defeat-result-screen is-${effectiveDefeatResultStep}`} aria-label="全滅結果">
          {(effectiveDefeatResultStep === 'message' || effectiveDefeatResultStep === 'closing') && (
            <div className="defeat-result-window battle-window">
              <p>全滅しました</p>
              <p>メイン画面に戻ります</p>
              <button
                className="is-selected"
                type="button"
                onClick={closeDefeatResult}
                disabled={effectiveDefeatResultStep === 'closing'}
              >
                はい
              </button>
            </div>
          )}
          {(effectiveDefeatResultStep === 'entering' || effectiveDefeatResultStep === 'closing') && (
            <div className="result-fade-overlay" aria-hidden="true" />
          )}
        </div>
      )}

      {escapeResultStep !== 'none' && (
        <div className="escape-result-screen" aria-label="逃走結果">
          {(escapeResultStep === 'message' || escapeResultStep === 'closing') && (
            <button
              className="escape-result-window battle-window"
              type="button"
              onClick={closeEscapeResult}
              disabled={escapeResultStep === 'closing'}
            >
              にげきれた
            </button>
          )}
          {escapeResultStep === 'closing' && <div className="result-fade-overlay" aria-hidden="true" />}
        </div>
      )}
    </section>
  )
}
