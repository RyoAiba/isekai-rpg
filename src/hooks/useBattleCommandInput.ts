import { useEffect } from 'react'
import { DEFAULT_CHARACTER_COMMANDS, CONFIRM_COMMANDS, PARTY_COMMANDS } from '../data/battleCommands'
import { InputManager } from '../input/InputManager'
import type { BattleState } from '../types/battle'

type UseBattleCommandInputParams = {
  battleState: BattleState
  targetCount: number
  onMoveSelection: (direction: 'previous' | 'next', commandCount: number) => void
  onMoveTargetSelection: (direction: 'up' | 'down' | 'left' | 'right') => void
  onPartyCommandConfirm: () => void
  onCharacterCommandConfirm: () => void
  onTargetConfirm: () => void
  onConfirmCommandConfirm: () => void
  onCancelCharacterCommand: () => void
  onCancelTargetSelection: () => void
}

function getCommandCount(battleState: BattleState, targetCount: number) {
  if (battleState.phase === 'partyCommand') {
    return PARTY_COMMANDS.length
  }

  if (battleState.phase === 'characterCommand') {
    return DEFAULT_CHARACTER_COMMANDS.length
  }

  if (battleState.phase === 'targetSelection') {
    return targetCount
  }

  return CONFIRM_COMMANDS.length
}

export function useBattleCommandInput({
  battleState,
  targetCount,
  onMoveSelection,
  onMoveTargetSelection,
  onPartyCommandConfirm,
  onCharacterCommandConfirm,
  onTargetConfirm,
  onConfirmCommandConfirm,
  onCancelCharacterCommand,
  onCancelTargetSelection,
}: UseBattleCommandInputParams) {
  useEffect(() => {
    return InputManager.subscribe(() => {
      if (battleState.phase === 'resolving') {
        return
      }

      if (battleState.phase === 'targetSelection' && InputManager.up()) {
        onMoveTargetSelection('up')
      } else if (InputManager.up()) {
        onMoveSelection('previous', getCommandCount(battleState, targetCount))
      }

      if (battleState.phase === 'targetSelection' && InputManager.down()) {
        onMoveTargetSelection('down')
      } else if (InputManager.down()) {
        onMoveSelection('next', getCommandCount(battleState, targetCount))
      }

      if (battleState.phase === 'targetSelection' && InputManager.left()) {
        onMoveTargetSelection('left')
      }

      if (battleState.phase === 'targetSelection' && InputManager.right()) {
        onMoveTargetSelection('right')
      }

      if (InputManager.confirm()) {
        if (battleState.phase === 'partyCommand') {
          onPartyCommandConfirm()
          return
        }

        if (battleState.phase === 'confirmActions') {
          onConfirmCommandConfirm()
          return
        }

        if (battleState.phase === 'targetSelection') {
          onTargetConfirm()
          return
        }

        onCharacterCommandConfirm()
      }

      if (InputManager.cancel() && battleState.phase === 'characterCommand') {
        onCancelCharacterCommand()
      }

      if (InputManager.cancel() && battleState.phase === 'targetSelection') {
        onCancelTargetSelection()
      }
    })
  }, [
    battleState,
    onCancelCharacterCommand,
    onCancelTargetSelection,
    onCharacterCommandConfirm,
    onConfirmCommandConfirm,
    onMoveSelection,
    onMoveTargetSelection,
    onPartyCommandConfirm,
    onTargetConfirm,
    targetCount,
  ])
}
