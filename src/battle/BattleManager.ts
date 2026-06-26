import type { BattleAction, BattleCommand, BattleState, ConfirmCommandType, PartyCommandType } from '../types/battle'
import type { Character } from '../types/character'

export function createInitialBattleState(): BattleState {
  return {
    phase: 'partyCommand',
    activeCharacterIndex: 0,
    selectedPartyCommandIndex: 0,
    selectedCharacterCommandIndex: 0,
    selectedConfirmIndex: 0,
    actions: [],
  }
}

export function getActiveCharacter(state: BattleState, party: Character[]) {
  if (state.phase !== 'characterCommand') {
    return undefined
  }

  return party[state.activeCharacterIndex]
}

export function startCharacterCommandInput(state: BattleState): BattleState {
  return {
    ...state,
    phase: 'characterCommand',
    activeCharacterIndex: 0,
    selectedCharacterCommandIndex: 0,
    selectedConfirmIndex: 0,
    actions: [],
  }
}

export function createAutoActions(party: Character[]): BattleAction[] {
  return party.map((character) => ({
    characterId: character.id,
    type: 'attack',
  }))
}

export function applyPartyCommand(
  state: BattleState,
  command: PartyCommandType,
  party: Character[],
): BattleState {
  if (command === 'fight') {
    return startCharacterCommandInput(state)
  }

  if (command === 'auto') {
    return {
      ...state,
      phase: 'confirmActions',
      selectedConfirmIndex: 0,
      actions: createAutoActions(party),
    }
  }

  return state
}

export function applyCharacterCommand(
  state: BattleState,
  command: BattleCommand,
  party: Character[],
): BattleState {
  const activeCharacter = party[state.activeCharacterIndex]

  if (!command.enabled || !activeCharacter) {
    return state
  }

  const nextAction: BattleAction = {
    characterId: activeCharacter.id,
    type: command.id,
  }

  const nextActions = [...state.actions, nextAction]

  if (state.activeCharacterIndex >= party.length - 1) {
    return {
      ...state,
      phase: 'confirmActions',
      selectedConfirmIndex: 0,
      actions: nextActions,
    }
  }

  return {
    ...state,
    activeCharacterIndex: state.activeCharacterIndex + 1,
    selectedCharacterCommandIndex: 0,
    actions: nextActions,
  }
}

export function returnToPreviousCharacter(state: BattleState): BattleState {
  if (state.activeCharacterIndex === 0) {
    return {
      ...state,
      phase: 'partyCommand',
      selectedPartyCommandIndex: 0,
      actions: [],
    }
  }

  return {
    ...state,
    activeCharacterIndex: state.activeCharacterIndex - 1,
    selectedCharacterCommandIndex: 0,
    actions: state.actions.slice(0, -1),
  }
}

export function applyConfirmCommand(
  state: BattleState,
  command: ConfirmCommandType,
  party: Character[],
): BattleState {
  if (command === 'yes') {
    return {
      ...state,
      phase: 'resolving',
    }
  }

  return {
    ...state,
    phase: 'characterCommand',
    activeCharacterIndex: Math.max(party.length - 1, 0),
    selectedCharacterCommandIndex: 0,
    actions: state.actions.slice(0, -1),
  }
}

export function moveSelection(
  state: BattleState,
  direction: 'previous' | 'next',
  commandCount: number,
): BattleState {
  const moveIndex = (currentIndex: number) => {
    if (direction === 'previous') {
      return currentIndex === 0 ? commandCount - 1 : currentIndex - 1
    }

    return currentIndex === commandCount - 1 ? 0 : currentIndex + 1
  }

  if (state.phase === 'partyCommand') {
    return { ...state, selectedPartyCommandIndex: moveIndex(state.selectedPartyCommandIndex) }
  }

  if (state.phase === 'confirmActions') {
    return { ...state, selectedConfirmIndex: moveIndex(state.selectedConfirmIndex) }
  }

  return {
    ...state,
    selectedCharacterCommandIndex: moveIndex(state.selectedCharacterCommandIndex),
  }
}

export function setSelectedPartyCommand(state: BattleState, selectedIndex: number): BattleState {
  return { ...state, selectedPartyCommandIndex: selectedIndex }
}

export function setSelectedCharacterCommand(state: BattleState, selectedIndex: number): BattleState {
  return { ...state, selectedCharacterCommandIndex: selectedIndex }
}

export function setSelectedConfirmCommand(state: BattleState, selectedIndex: number): BattleState {
  return { ...state, selectedConfirmIndex: selectedIndex }
}
