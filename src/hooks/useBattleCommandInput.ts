import { useEffect } from 'react'
import { DEFAULT_CHARACTER_COMMANDS, CONFIRM_COMMANDS, PARTY_COMMANDS } from '../data/battleCommands'
import { InputManager } from '../input/InputManager'
import type { BattleState } from '../types/battle'

type UseBattleCommandInputParams = {
  battleState: BattleState
  onMoveSelection: (direction: 'previous' | 'next', commandCount: number) => void
  onPartyCommandConfirm: () => void
  onCharacterCommandConfirm: () => void
  onConfirmCommandConfirm: () => void
  onCancelCharacterCommand: () => void
}

function getCommandCount(battleState: BattleState) {
  if (battleState.phase === 'partyCommand') {
    return PARTY_COMMANDS.length
  }

  if (battleState.phase === 'characterCommand') {
    return DEFAULT_CHARACTER_COMMANDS.length
  }

  return CONFIRM_COMMANDS.length
}

export function useBattleCommandInput({
  battleState,
  onMoveSelection,
  onPartyCommandConfirm,
  onCharacterCommandConfirm,
  onConfirmCommandConfirm,
  onCancelCharacterCommand,
}: UseBattleCommandInputParams) {
  useEffect(() => {
    return InputManager.subscribe(() => {
      if (battleState.phase === 'resolving') {
        return
      }

      if (InputManager.up()) {
        onMoveSelection('previous', getCommandCount(battleState))
      }

      if (InputManager.down()) {
        onMoveSelection('next', getCommandCount(battleState))
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

        onCharacterCommandConfirm()
      }

      if (InputManager.cancel() && battleState.phase === 'characterCommand') {
        onCancelCharacterCommand()
      }
    })
  }, [
    battleState,
    onCancelCharacterCommand,
    onCharacterCommandConfirm,
    onConfirmCommandConfirm,
    onMoveSelection,
    onPartyCommandConfirm,
  ])
}
