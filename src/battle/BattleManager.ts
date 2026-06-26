import type {
  BattleAction,
  BattleCommand,
  BattleState,
  ConfirmCommandType,
  PartyCommandType,
} from '../types/battle'
import type { Character } from '../types/character'

export function createInitialBattleState(): BattleState {
  return {
    phase: 'partyCommand',
    activeCharacterIndex: 0,
    selectedPartyCommandIndex: 0,
    selectedCharacterCommandIndex: 0,
    selectedTargetIndex: 0,
    selectedConfirmIndex: 0,
    actions: [],
  }
}

export function getActiveCharacter(state: BattleState, party: Character[]) {
  if (state.phase !== 'characterCommand' && state.phase !== 'targetSelection') {
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
    selectedTargetIndex: 0,
    selectedConfirmIndex: 0,
    actions: [],
  }
}

function getRandomEnemy(enemies: Character[]) {
  if (enemies.length === 0) {
    return undefined
  }

  return enemies[Math.floor(Math.random() * enemies.length)]
}

export function createAutoActions(party: Character[], enemies: Character[]): BattleAction[] {
  return party.map((character) => ({
    characterId: character.id,
    type: 'attack',
    targetId: getRandomEnemy(enemies)?.id,
  }))
}

export function applyPartyCommand(
  state: BattleState,
  command: PartyCommandType,
  party: Character[],
  enemies: Character[],
): BattleState {
  if (command === 'fight') {
    return startCharacterCommandInput(state)
  }

  if (command === 'auto') {
    return {
      ...state,
      phase: 'confirmActions',
      selectedConfirmIndex: 0,
      actions: createAutoActions(party, enemies),
    }
  }

  return state
}

export function applyCharacterCommand(
  state: BattleState,
  command: BattleCommand,
  party: Character[],
  defaultTargetIndex = 0,
): BattleState {
  const activeCharacter = party[state.activeCharacterIndex]

  if (!command.enabled || !activeCharacter) {
    return state
  }

  if (command.id === 'attack') {
    return {
      ...state,
      phase: 'targetSelection',
      selectedTargetIndex: defaultTargetIndex,
    }
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

export function applyTargetSelection(
  state: BattleState,
  target: Character | undefined,
  party: Character[],
): BattleState {
  const activeCharacter = party[state.activeCharacterIndex]

  if (!activeCharacter || !target) {
    return state
  }

  const nextActions = [
    ...state.actions,
    {
      characterId: activeCharacter.id,
      type: 'attack' as const,
      targetId: target.id,
    },
  ]

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
    phase: 'characterCommand',
    activeCharacterIndex: state.activeCharacterIndex + 1,
    selectedCharacterCommandIndex: 0,
    selectedTargetIndex: 0,
    actions: nextActions,
  }
}

export function cancelTargetSelection(state: BattleState): BattleState {
  return {
    ...state,
    phase: 'characterCommand',
    selectedTargetIndex: 0,
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
    selectedTargetIndex: 0,
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

  if (state.phase === 'targetSelection') {
    return { ...state, selectedTargetIndex: moveIndex(state.selectedTargetIndex) }
  }

  return {
    ...state,
    selectedCharacterCommandIndex: moveIndex(state.selectedCharacterCommandIndex),
  }
}

export function moveTargetSelection(
  state: BattleState,
  direction: 'up' | 'down' | 'left' | 'right',
  rowCount: number,
  targetCount: number,
): BattleState {
  const currentIndex = state.selectedTargetIndex
  const currentColumn = Math.floor(currentIndex / rowCount)
  const currentRow = currentIndex % rowCount
  const columnCount = Math.ceil(targetCount / rowCount)

  if (direction === 'left' || direction === 'right') {
    const nextColumn = currentColumn === 0 ? columnCount - 1 : 0
    const nextIndex = Math.min(nextColumn * rowCount + currentRow, targetCount - 1)
    return { ...state, selectedTargetIndex: nextIndex }
  }

  const nextRow =
    direction === 'up'
      ? currentRow === 0
        ? rowCount - 1
        : currentRow - 1
      : currentRow === rowCount - 1
        ? 0
        : currentRow + 1
  const nextIndex = Math.min(currentColumn * rowCount + nextRow, targetCount - 1)

  return { ...state, selectedTargetIndex: nextIndex }
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

export function setSelectedTarget(state: BattleState, selectedIndex: number): BattleState {
  return { ...state, selectedTargetIndex: selectedIndex }
}
