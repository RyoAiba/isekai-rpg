import { calculateDamage } from './BattleCalculator'
import type {
  BattleAction,
  BattleCommand,
  BattleState,
  BattleTimelineEvent,
  ConfirmCommandType,
  PartyCommandType,
} from '../types/battle'
import type { Character } from '../types/character'

function cloneCharacters(characters: Character[]) {
  return characters.map((character) => ({ ...character }))
}

export function createInitialBattleState(
  enemies: Character[] = [],
  party: Character[] = [],
): BattleState {
  return {
    phase: 'partyCommand',
    activeCharacterIndex: 0,
    selectedPartyCommandIndex: 0,
    selectedCharacterCommandIndex: 0,
    selectedTargetIndex: 0,
    selectedConfirmIndex: 0,
    isAutoCommandConfirm: false,
    actions: [],
    party: cloneCharacters(party),
    enemies: cloneCharacters(enemies),
    timeline: [],
    executingActionIndex: 0,
    executingEnemyIndex: 0,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: undefined,
    lastDamageEventId: 0,
    isVictory: false,
    isDefeat: false,
  }
}

export function getAlivePartyMembers(party: Character[]) {
  return party.filter((character) => character.hp > 0)
}

function getInputParty(party: Character[]) {
  return getAlivePartyMembers(party)
}

export function getActiveCharacter(state: BattleState, party: Character[]) {
  if (state.phase !== 'characterCommand' && state.phase !== 'targetSelection') {
    return undefined
  }

  return getInputParty(party)[state.activeCharacterIndex]
}

export function startCharacterCommandInput(state: BattleState): BattleState {
  return {
    ...state,
    phase: 'characterCommand',
    activeCharacterIndex: 0,
    selectedCharacterCommandIndex: 0,
    selectedTargetIndex: 0,
    selectedConfirmIndex: 0,
    isAutoCommandConfirm: false,
    actions: [],
    executingActionIndex: 0,
    executingEnemyIndex: 0,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: undefined,
    lastDamageEventId: 0,
    isVictory: false,
    isDefeat: false,
  }
}

export function getAliveEnemies(enemies: Character[]) {
  return enemies.filter((enemy) => enemy.hp > 0)
}

export function checkVictory(enemies: Character[]) {
  return enemies.every((enemy) => enemy.hp <= 0)
}

export function checkDefeat(party: Character[]) {
  return party.every((character) => character.hp <= 0)
}

function getPriorityEnemy(enemies: Character[]) {
  const aliveFrontEnemies = enemies.filter(
    (enemy) => enemy.hp > 0 && enemy.position === 'front',
  )
  const aliveBackEnemies = enemies.filter((enemy) => enemy.hp > 0 && enemy.position === 'back')

  return [...aliveFrontEnemies].reverse()[0] ?? [...aliveBackEnemies].reverse()[0]
}

function resolveActionTarget(enemies: Character[], targetId?: number) {
  const selectedTarget = enemies.find((enemy) => enemy.id === targetId)

  if (selectedTarget && selectedTarget.hp > 0) {
    return selectedTarget
  }

  return getPriorityEnemy(enemies)
}

function getRandomAlivePartyMember(party: Character[]) {
  const aliveParty = getAlivePartyMembers(party)

  if (aliveParty.length === 0) {
    return undefined
  }

  return aliveParty[Math.floor(Math.random() * aliveParty.length)]
}

export function createAutoActions(party: Character[], enemies: Character[]): BattleAction[] {
  const priorityEnemy = getPriorityEnemy(enemies)

  return getAlivePartyMembers(party).map((character) => ({
    characterId: character.id,
    type: 'attack',
    targetId: priorityEnemy?.id,
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
      isAutoCommandConfirm: true,
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
  const inputParty = getInputParty(party)
  const activeCharacter = inputParty[state.activeCharacterIndex]

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

  if (state.activeCharacterIndex >= inputParty.length - 1) {
    return {
      ...state,
      phase: 'confirmActions',
      selectedConfirmIndex: 0,
      isAutoCommandConfirm: false,
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
  const inputParty = getInputParty(party)
  const activeCharacter = inputParty[state.activeCharacterIndex]

  if (!activeCharacter || !target || target.hp <= 0) {
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

  if (state.activeCharacterIndex >= inputParty.length - 1) {
    return {
      ...state,
      phase: 'confirmActions',
      selectedConfirmIndex: 0,
      isAutoCommandConfirm: false,
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
  const inputParty = getInputParty(party)

  if (command === 'yes') {
    return startBattleExecution(state)
  }

  if (state.isAutoCommandConfirm) {
    return {
      ...state,
      phase: 'partyCommand',
      activeCharacterIndex: 0,
      selectedPartyCommandIndex: 0,
      selectedCharacterCommandIndex: 0,
      selectedTargetIndex: 0,
      selectedConfirmIndex: 0,
      isAutoCommandConfirm: false,
      executingActionIndex: 0,
      executingEnemyIndex: 0,
      executingCharacterId: undefined,
      executingEnemyId: undefined,
      actions: [],
    }
  }

  return {
    ...state,
    phase: 'characterCommand',
    activeCharacterIndex: Math.max(inputParty.length - 1, 0),
    selectedCharacterCommandIndex: 0,
    selectedTargetIndex: 0,
    selectedConfirmIndex: 0,
    isAutoCommandConfirm: false,
    executingActionIndex: 0,
    executingEnemyIndex: 0,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    actions: state.actions.slice(0, -1),
  }
}

export function startBattleExecution(state: BattleState): BattleState {
  return {
    ...state,
    phase: 'executing',
    isAutoCommandConfirm: false,
    executingActionIndex: 0,
    executingEnemyIndex: 0,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: undefined,
    selectedConfirmIndex: 0,
    isVictory: false,
    isDefeat: false,
  }
}

function resetPlayerTurn(state: BattleState): BattleState {
  return {
    ...state,
    phase: 'partyCommand',
    activeCharacterIndex: 0,
    selectedPartyCommandIndex: 0,
    selectedCharacterCommandIndex: 0,
    selectedTargetIndex: 0,
    selectedConfirmIndex: 0,
    isAutoCommandConfirm: false,
    actions: [],
    executingActionIndex: 0,
    executingEnemyIndex: 0,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: undefined,
    lastDamageEventId: 0,
    isVictory: false,
    isDefeat: false,
  }
}

function startEnemyTurn(state: BattleState): BattleState {
  return {
    ...state,
    phase: 'enemyExecuting',
    activeCharacterIndex: 0,
    selectedPartyCommandIndex: 0,
    selectedCharacterCommandIndex: 0,
    selectedTargetIndex: 0,
    selectedConfirmIndex: 0,
    isAutoCommandConfirm: false,
    actions: [],
    executingActionIndex: 0,
    executingEnemyIndex: 0,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: undefined,
  }
}

function getNextTimelineId(timeline: BattleTimelineEvent[]) {
  return timeline.length > 0 ? Math.max(...timeline.map((event) => event.id)) + 1 : 1
}

export function executeNextBattleAction(state: BattleState): BattleState {
  const action = state.actions[state.executingActionIndex]

  if (!action) {
    return getAliveEnemies(state.enemies).length > 0 ? startEnemyTurn(state) : resetPlayerTurn(state)
  }

  const nextEnemies = cloneCharacters(state.enemies)
  const timeline: BattleTimelineEvent[] = [...state.timeline]
  const addTimeline = (message: string) => {
    timeline.push({ id: getNextTimelineId(timeline), message })
  }
  const attacker = state.party.find((character) => character.id === action.characterId)

  if (!attacker || attacker.hp <= 0) {
    return {
      ...state,
      executingActionIndex: state.executingActionIndex + 1,
      executingCharacterId: undefined,
      timeline,
    }
  }

  let defeatedEnemyThisAction = false
  let defeatedEnemyId: number | undefined
  let damagedEnemyId: number | undefined

  if (action.type === 'defense') {
    addTimeline(attacker.name + 'は身を守った')
  } else if (action.type !== 'attack') {
    addTimeline(attacker.name + 'はまだ使えない行動を選んだ')
  } else {
    const target = resolveActionTarget(nextEnemies, action.targetId)
    const targetIndex = nextEnemies.findIndex((enemy) => enemy.id === target?.id)

    if (targetIndex < 0 || !target) {
      addTimeline(attacker.name + 'の攻撃対象はいなかった')
    } else {
      const { damage } = calculateDamage({ attacker, defender: target })
      const nextHp = Math.max(target.hp - damage, 0)
      defeatedEnemyThisAction = nextHp === 0
      defeatedEnemyId = defeatedEnemyThisAction ? target.id : undefined
      damagedEnemyId = target.id
      const defeatMessage = defeatedEnemyThisAction ? '。' + target.name + 'を倒した' : ''

      nextEnemies[targetIndex] = {
        ...target,
        hp: nextHp,
      }

      addTimeline(attacker.name + 'は' + target.name + 'を攻撃した。' + damage + 'ダメージ' + defeatMessage)
    }
  }

  const isVictory = checkVictory(nextEnemies)

  if (isVictory) {
    addTimeline('敵を全滅させた！')
  }

  return {
    ...state,
    phase: isVictory ? 'resolving' : 'executing',
    activeCharacterIndex: 0,
    selectedPartyCommandIndex: 0,
    selectedCharacterCommandIndex: 0,
    selectedTargetIndex: 0,
    selectedConfirmIndex: 0,
    isAutoCommandConfirm: false,
    executingActionIndex: state.executingActionIndex + 1,
    executingCharacterId: attacker.id,
    executingEnemyId: undefined,
    lastActionDefeatedEnemy: defeatedEnemyThisAction,
    lastDefeatedEnemyId: defeatedEnemyId,
    lastDamagedEnemyId: damagedEnemyId,
    lastDamagedCharacterId: undefined,
    lastDamageEventId: damagedEnemyId === undefined ? state.lastDamageEventId : state.lastDamageEventId + 1,
    actions: isVictory ? [] : state.actions,
    enemies: nextEnemies,
    timeline,
    isVictory,
    isDefeat: false,
  }
}

export function executeNextEnemyAction(state: BattleState): BattleState {
  const aliveEnemies = getAliveEnemies(state.enemies)
  const enemy = aliveEnemies[state.executingEnemyIndex]

  if (!enemy) {
    return resetPlayerTurn(state)
  }

  const nextParty = cloneCharacters(state.party)
  const timeline: BattleTimelineEvent[] = [...state.timeline]
  const addTimeline = (message: string) => {
    timeline.push({ id: getNextTimelineId(timeline), message })
  }
  const target = getRandomAlivePartyMember(nextParty)

  if (!target) {
    addTimeline('味方は全滅した')

    return {
      ...state,
      phase: 'resolving',
      party: nextParty,
      timeline,
      executingEnemyId: enemy.id,
      lastDamagedEnemyId: undefined,
      lastDamagedCharacterId: undefined,
      isVictory: false,
      isDefeat: true,
    }
  }

  const targetIndex = nextParty.findIndex((character) => character.id === target.id)
  const { damage } = calculateDamage({ attacker: enemy, defender: target })
  const nextHp = Math.max(target.hp - damage, 0)
  const defeatedMessage = nextHp === 0 ? '。' + target.name + 'は戦闘不能になった' : ''

  nextParty[targetIndex] = {
    ...target,
    hp: nextHp,
  }

  addTimeline(enemy.name + 'の攻撃')
  addTimeline(enemy.name + 'は' + target.name + 'に' + damage + 'ダメージ' + defeatedMessage)

  const isDefeat = checkDefeat(nextParty)

  if (isDefeat) {
    addTimeline('味方は全滅した')
  }

  return {
    ...state,
    phase: isDefeat ? 'resolving' : 'enemyExecuting',
    party: nextParty,
    timeline,
    executingEnemyIndex: state.executingEnemyIndex + 1,
    executingEnemyId: enemy.id,
    executingCharacterId: undefined,
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: target.id,
    lastDamageEventId: state.lastDamageEventId + 1,
    isVictory: false,
    isDefeat,
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
