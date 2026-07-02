import { calculateDamage } from './BattleCalculator'
import { getEffectName } from './effects/EffectDatabase'
import { addEffect, hasEffect } from './effects/EffectManager'
import type { AttackEffect } from './effects/types'
import { getSpeed } from './StatCalculator'
import type {
  BattleAction,
  BattleCommand,
  BattleDamagePopup,
  BattlePartyMotion,
  BattleQueuedAction,
  BattleRewards,
  BattleState,
  BattleTimelineEvent,
  ConfirmCommandType,
  PartyCommandType,
} from '../types/battle'
import type { Character } from '../types/character'
import { cloneCharacters } from '../utils/characterClone'

const POISON_DAMAGE = 10
const DEFAULT_BATTLE_MONEY = 60
const PARTY_MOTION_STAGGER_MS = 200

type EnemyReward = {
  baseExp?: number
}

type EnemyAttackEffects = {
  attackEffects?: AttackEffect[]
}

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function getNextTimelineId(timeline: BattleTimelineEvent[]) {
  return timeline.length > 0 ? Math.max(...timeline.map((event) => event.id)) + 1 : 1
}

function addTimeline(timeline: BattleTimelineEvent[], message: string) {
  timeline.push({ id: getNextTimelineId(timeline), message })
}

function createDamagePopup(
  state: BattleState,
  targetSide: BattleDamagePopup['targetSide'],
  targetId: number,
  damage: number,
) {
  return {
    id: state.lastDamageEventId + state.damagePopups.length + 1,
    targetSide,
    targetId,
    damage,
  }
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
    actionQueue: [],
    rewards: { exp: 0, money: 0 },
    roundNumber: 1,
    party: cloneCharacters(party),
    enemies: cloneCharacters(enemies),
    timeline: [],
    executingActionIndex: 0,
    executionAnimationId: 0,
    executionStep: undefined,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    executingTargetEnemyId: undefined,
    activePartyMotions: [],
    damagePopups: [],
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    promotedEnemyId: undefined,
    promotionAnimationId: 0,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: undefined,
    lastDamageEventId: 0,
    isVictory: false,
    isDefeat: false,
  }
}

export function getAlivePartyMembers(party: Character[]) {
  return party.filter((character) => character.currentHp > 0)
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

export function getAliveEnemies(enemies: Character[]) {
  return enemies.filter((enemy) => enemy.currentHp > 0)
}

export function checkVictory(enemies: Character[]) {
  return enemies.every((enemy) => enemy.currentHp <= 0)
}

export function checkDefeat(party: Character[]) {
  return party.every((character) => character.currentHp <= 0)
}

function getPriorityEnemy(enemies: Character[]) {
  const aliveFrontEnemies = enemies.filter(
    (enemy) => enemy.currentHp > 0 && enemy.position === 'front',
  )
  const aliveBackEnemies = enemies.filter((enemy) => enemy.currentHp > 0 && enemy.position === 'back')

  return getRandomAliveEnemy(aliveFrontEnemies) ?? getRandomAliveEnemy(aliveBackEnemies)
}

function resolveActionTarget(enemies: Character[], targetId?: number) {
  const selectedTarget = enemies.find((enemy) => enemy.id === targetId)

  if (selectedTarget && selectedTarget.currentHp > 0) {
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

function getRandomAliveEnemy(enemies: Character[]) {
  if (enemies.length === 0) {
    return undefined
  }

  return enemies[Math.floor(Math.random() * enemies.length)]
}

function promoteBackEnemyInLane(enemies: Character[], defeatedEnemyId?: number) {
  if (defeatedEnemyId === undefined) {
    return { nextEnemies: enemies, promotedEnemyId: undefined }
  }

  const defeatedEnemy = enemies.find((enemy) => enemy.id === defeatedEnemyId)

  if (!defeatedEnemy || defeatedEnemy.position !== 'front' || defeatedEnemy.lane === undefined) {
    return { nextEnemies: enemies, promotedEnemyId: undefined }
  }

  const promotedEnemy = enemies.find(
    (enemy) =>
      enemy.currentHp > 0
      && enemy.position === 'back'
      && enemy.lane === defeatedEnemy.lane,
  )

  if (!promotedEnemy) {
    return { nextEnemies: enemies, promotedEnemyId: undefined }
  }

  return {
    nextEnemies: enemies.map((enemy) =>
      enemy.id === promotedEnemy.id
        ? { ...enemy, position: 'front' as const }
        : enemy,
    ),
    promotedEnemyId: promotedEnemy.id,
  }
}

function createInitiative(character: Character) {
  const variance = character.battleTraits.initiativeVariance
  const speed = getSpeed(character)

  return speed * randomInRange(1 - variance, 1 + variance)
}

function createEnemyAttackActions(enemies: Character[]): BattleQueuedAction[] {
  return getAliveEnemies(enemies).map((enemy) => ({
    characterId: enemy.id,
    type: 'attack',
    actorSide: 'enemy',
    initiative: createInitiative(enemy),
  }))
}

function createPartyQueuedActions(actions: BattleAction[], party: Character[]): BattleQueuedAction[] {
  const queuedActions: BattleQueuedAction[] = []

  for (const action of actions) {
    if (action.type === 'defense') {
      continue
    }

    const actor = party.find((character) => character.id === action.characterId)

    if (!actor || actor.currentHp <= 0) {
      continue
    }

    queuedActions.push({
      ...action,
      actorSide: 'party',
      initiative: createInitiative(actor),
    })
  }

  return queuedActions
}

function addDefenseActionsTimeline(
  timeline: BattleTimelineEvent[],
  actions: BattleAction[],
  party: Character[],
) {
  for (const action of actions) {
    if (action.type !== 'defense') {
      continue
    }

    const actor = party.find((character) => character.id === action.characterId)

    if (actor && actor.currentHp > 0) {
      addTimeline(timeline, actor.name + 'は身を守った')
    }
  }
}

function createTurnQueue(state: BattleState): BattleQueuedAction[] {
  return [
    ...createPartyQueuedActions(state.actions, state.party),
    ...createEnemyAttackActions(state.enemies),
  ].sort((a, b) => b.initiative - a.initiative)
}

function addTurnQueueTimeline(
  timeline: BattleTimelineEvent[],
  queue: BattleQueuedAction[],
  party: Character[],
  enemies: Character[],
) {
  if (queue.length === 0) {
    return
  }

  addTimeline(timeline, '【行動順】')

  for (const action of queue) {
    const actorSource = action.actorSide === 'party' ? party : enemies
    const actor = actorSource.find((character) => character.id === action.characterId)

    if (actor) {
      addTimeline(timeline, actor.name + ' (' + Math.round(action.initiative) + ')')
    }
  }
}

function calculateRewards(enemies: Character[]): BattleRewards {
  return {
    exp: enemies.reduce((total, enemy) => total + ((enemy as EnemyReward).baseExp ?? 0), 0),
    money: DEFAULT_BATTLE_MONEY,
  }
}

export function forceBattleVictory(state: BattleState): BattleState {
  const timeline = [...state.timeline]
  addTimeline(timeline, 'デバッグ: 戦闘に勝利した')

  return {
    ...state,
    phase: 'resolving',
    actions: [],
    actionQueue: [],
    timeline,
    executingActionIndex: 0,
    executionStep: undefined,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    executingTargetEnemyId: undefined,
    activePartyMotions: [],
    damagePopups: [],
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    promotedEnemyId: undefined,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: undefined,
    rewards: calculateRewards(state.enemies),
    isVictory: true,
    isDefeat: false,
  }
}

export function forceBattleDefeat(state: BattleState): BattleState {
  const timeline = [...state.timeline]
  const defeatedParty = state.party.map((character) => ({
    ...character,
    currentHp: 0,
  }))
  addTimeline(timeline, 'デバッグ: 味方は全滅した')

  return {
    ...state,
    phase: 'resolving',
    party: defeatedParty,
    actions: [],
    actionQueue: [],
    timeline,
    executingActionIndex: 0,
    executionStep: undefined,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    executingTargetEnemyId: undefined,
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    promotedEnemyId: undefined,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: undefined,
    isVictory: false,
    isDefeat: true,
  }
}

function applyPoisonDamageToGroup(characters: Character[], timeline: BattleTimelineEvent[]) {
  let lastDamagedCharacterId: number | undefined
  let hasDamage = false

  const nextCharacters = characters.map((character) => {
    if (character.currentHp <= 1 || !hasEffect(character, 'poison')) {
      return character
    }

    const damage = Math.min(POISON_DAMAGE, character.currentHp - 1)
    hasDamage = true
    lastDamagedCharacterId = character.id
    addTimeline(timeline, character.name + 'は毒で' + damage + 'ダメージを受けた')

    return {
      ...character,
      currentHp: character.currentHp - damage,
    }
  })

  return { nextCharacters, lastDamagedCharacterId, hasDamage }
}

function applyRoundStartEffects(state: BattleState): BattleState {
  if (state.roundNumber <= 1) {
    return state
  }

  const timeline = [...state.timeline]
  addTimeline(timeline, '【ラウンド' + state.roundNumber + '】')

  const partyResult = applyPoisonDamageToGroup(state.party, timeline)
  const enemyResult = applyPoisonDamageToGroup(state.enemies, timeline)
  const hasPoisonDamage = partyResult.hasDamage || enemyResult.hasDamage

  return {
    ...state,
    party: partyResult.nextCharacters,
    enemies: enemyResult.nextCharacters,
    timeline,
    lastDamagedCharacterId: partyResult.lastDamagedCharacterId,
    lastDamagedEnemyId: enemyResult.lastDamagedCharacterId,
    lastDamageEventId: hasPoisonDamage ? state.lastDamageEventId + 1 : state.lastDamageEventId,
  }
}

export function createAutoActions(party: Character[], enemies: Character[]): BattleAction[] {
  const priorityEnemy = getPriorityEnemy(enemies)

  return getAlivePartyMembers(party).map((character) => ({
    characterId: character.id,
    type: 'attack',
    targetId: priorityEnemy?.id,
  }))
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
    actionQueue: [],
    executingActionIndex: 0,
    executionAnimationId: 0,
    executionStep: undefined,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    executingTargetEnemyId: undefined,
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    promotedEnemyId: undefined,
    promotionAnimationId: state.promotionAnimationId,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: undefined,
    lastDamageEventId: 0,
    isVictory: false,
    isDefeat: false,
  }
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

  const nextActions = [
    ...state.actions,
    {
      characterId: activeCharacter.id,
      type: command.id,
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

  if (!activeCharacter || !target || target.currentHp <= 0) {
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
      actionQueue: [],
      executingActionIndex: 0,
      executionAnimationId: 0,
      executionStep: undefined,
      executingCharacterId: undefined,
      executingEnemyId: undefined,
      executingTargetEnemyId: undefined,
      activePartyMotions: [],
      damagePopups: [],
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
    actionQueue: [],
    executingActionIndex: 0,
    executionAnimationId: 0,
    executionStep: undefined,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    executingTargetEnemyId: undefined,
    activePartyMotions: [],
    damagePopups: [],
    actions: state.actions.slice(0, -1),
  }
}

export function startBattleExecution(state: BattleState): BattleState {
  const timelineLengthBeforeRoundStart = state.timeline.length
  const stateAfterRoundStartEffects = applyRoundStartEffects(state)
  const actionQueue = createTurnQueue(stateAfterRoundStartEffects)
  const roundStartTimeline = stateAfterRoundStartEffects.timeline.slice(timelineLengthBeforeRoundStart)
  const timeline = [...state.timeline]

  addDefenseActionsTimeline(
    timeline,
    stateAfterRoundStartEffects.actions,
    stateAfterRoundStartEffects.party,
  )

  addTurnQueueTimeline(
    timeline,
    actionQueue,
    stateAfterRoundStartEffects.party,
    stateAfterRoundStartEffects.enemies,
  )
  for (const event of roundStartTimeline) {
    addTimeline(timeline, event.message)
  }

  return {
    ...stateAfterRoundStartEffects,
    phase: 'executing',
    isAutoCommandConfirm: false,
    actionQueue,
    executingActionIndex: 0,
    executionAnimationId: state.executionAnimationId,
    executionStep: undefined,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    executingTargetEnemyId: undefined,
    activePartyMotions: [],
    damagePopups: [],
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    promotedEnemyId: undefined,
    promotionAnimationId: state.promotionAnimationId,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: undefined,
    selectedConfirmIndex: 0,
    timeline,
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
    actionQueue: [],
    executingActionIndex: 0,
    executionAnimationId: state.executionAnimationId,
    executionStep: undefined,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    executingTargetEnemyId: undefined,
    activePartyMotions: [],
    damagePopups: [],
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    promotedEnemyId: undefined,
    promotionAnimationId: state.promotionAnimationId,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: undefined,
    roundNumber: state.roundNumber + 1,
    isVictory: false,
    isDefeat: false,
  }
}

function applyAttackEffects(
  attacker: Character,
  target: Character,
  timeline: BattleTimelineEvent[],
) {
  let nextTarget = target
  const attackEffects = (attacker as EnemyAttackEffects).attackEffects ?? []

  for (const attackEffect of attackEffects) {
    if (nextTarget.currentHp <= 0 || Math.random() > attackEffect.chance) {
      continue
    }

    if (hasEffect(nextTarget, attackEffect.effectId)) {
      addTimeline(timeline, nextTarget.name + 'はすでに' + getEffectName(attackEffect.effectId) + '状態だった')
      continue
    }

    nextTarget = addEffect(nextTarget, attackEffect.effectId, { sourceId: String(attacker.id) })
    addTimeline(timeline, nextTarget.name + 'は' + getEffectName(attackEffect.effectId) + 'になった')
  }

  return nextTarget
}

function getAnimatedPartyActionTarget(
  state: BattleState,
  actionIndex: number,
  enemies: Character[] = state.enemies,
) {
  const action = state.actionQueue[actionIndex]

  if (!action || action.actorSide !== 'party' || action.type !== 'attack') {
    return undefined
  }

  const attacker = state.party.find((character) => character.id === action.characterId)
  const target = resolveActionTarget(enemies, action.targetId)

  if (
    attacker?.battleSprite !== undefined
    && (attacker.range === 'S' || attacker.range === 'M')
    && target?.position === 'front'
    && attacker.currentHp > 0
    && target.currentHp > 0
  ) {
    return target
  }

  return undefined
}

export function canUseAnimatedPartyAction(state: BattleState) {
  return getAnimatedPartyActionTarget(state, state.executingActionIndex) !== undefined
}

function createAnimatedPartyMotions(state: BattleState): BattlePartyMotion[] {
  const motions: BattlePartyMotion[] = []
  const usedTargetIds = new Set<number>()
  const projectedEnemies = cloneCharacters(state.enemies)

  for (let actionIndex = state.executingActionIndex; actionIndex < state.actionQueue.length; actionIndex += 1) {
    const action = state.actionQueue[actionIndex]
    const attacker = state.party.find((character) => character.id === action?.characterId)
    const target = getAnimatedPartyActionTarget(state, actionIndex, projectedEnemies)

    if (!action || !attacker || !target) {
      break
    }

    if (usedTargetIds.has(target.id)) {
      break
    }

    const projectedTargetIndex = projectedEnemies.findIndex((enemy) => enemy.id === target.id)
    const { damage } = calculateDamage({ attacker, defender: target })

    if (projectedTargetIndex >= 0) {
      projectedEnemies[projectedTargetIndex] = {
        ...projectedEnemies[projectedTargetIndex],
        currentHp: Math.max(projectedEnemies[projectedTargetIndex].currentHp - damage, 0),
      }
    }

    usedTargetIds.add(target.id)
    motions.push({
      actionIndex,
      animationId: state.executionAnimationId + motions.length + 1,
      characterId: action.characterId,
      targetEnemyId: target.id,
      damage,
      executionStep: 'approach',
      startDelayMs: motions.length * PARTY_MOTION_STAGGER_MS,
    })
  }

  return motions
}

export function beginAnimatedPartyAction(state: BattleState): BattleState {
  const activePartyMotions = createAnimatedPartyMotions(state)
  const firstMotion = activePartyMotions[0]

  if (!firstMotion) {
    return state
  }

  return {
    ...state,
    executionAnimationId: state.executionAnimationId + activePartyMotions.length,
    executionStep: 'approach',
    executingCharacterId: firstMotion.characterId,
    executingEnemyId: undefined,
    executingTargetEnemyId: firstMotion.targetEnemyId,
    activePartyMotions,
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    promotedEnemyId: undefined,
    promotionAnimationId: state.promotionAnimationId,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: undefined,
  }
}

export function advanceAnimatedPartyActionToAttack(state: BattleState): BattleState {
  if (state.executionStep !== 'approach') {
    return state
  }

  return {
    ...state,
    executionStep: 'attack',
    activePartyMotions: state.activePartyMotions.map((motion) => ({
      ...motion,
      executionStep: 'attack',
    })),
  }
}

function applyAnimatedPartyActionHit(state: BattleState, motion: BattlePartyMotion): BattleState {
  const action = state.actionQueue[motion.actionIndex]
  const nextEnemies = cloneCharacters(state.enemies)
  const timeline: BattleTimelineEvent[] = [...state.timeline]
  const attacker = state.party.find((character) => character.id === action?.characterId)

  if (!action || !attacker || attacker.currentHp <= 0) {
    return {
      ...state,
      timeline,
    }
  }

  let defeatedEnemyThisAction = false
  let defeatedEnemyId: number | undefined
  let damagedEnemyId: number | undefined
  let damageAmount = 0

  const target = nextEnemies.find((enemy) => enemy.id === motion.targetEnemyId && enemy.currentHp > 0)
      ?? resolveActionTarget(nextEnemies, action.targetId)
  const targetIndex = nextEnemies.findIndex((enemy) => enemy.id === target?.id)

  if (targetIndex < 0 || !target) {
    addTimeline(timeline, attacker.name + 'の攻撃対象はいなかった')
  } else {
    const damage = motion.damage > 0
      ? motion.damage
      : calculateDamage({ attacker, defender: target }).damage
    damageAmount = damage
    const nextHp = Math.max(target.currentHp - damage, 0)
    defeatedEnemyThisAction = nextHp === 0
    defeatedEnemyId = defeatedEnemyThisAction ? target.id : undefined
    damagedEnemyId = target.id
    const defeatMessage = defeatedEnemyThisAction ? '。' + target.name + 'を倒した' : ''

    nextEnemies[targetIndex] = {
      ...target,
      currentHp: nextHp,
    }

    addTimeline(timeline, attacker.name + 'は' + target.name + 'を攻撃した。' + damage + 'ダメージ' + defeatMessage)
  }

  const promotionResult = promoteBackEnemyInLane(nextEnemies, defeatedEnemyId)
  const isVictory = checkVictory(promotionResult.nextEnemies)

  if (isVictory) {
    addTimeline(timeline, '敵を全滅させた！')
  }

  return {
    ...state,
    activeCharacterIndex: 0,
    selectedPartyCommandIndex: 0,
    selectedCharacterCommandIndex: 0,
    selectedTargetIndex: 0,
    selectedConfirmIndex: 0,
    isAutoCommandConfirm: false,
    executingCharacterId: attacker.id,
    executingEnemyId: undefined,
    lastActionDefeatedEnemy: defeatedEnemyThisAction,
    lastDefeatedEnemyId: defeatedEnemyId,
    promotedEnemyId: promotionResult.promotedEnemyId,
    promotionAnimationId: promotionResult.promotedEnemyId === undefined
      ? state.promotionAnimationId
      : state.promotionAnimationId + 1,
    lastDamagedEnemyId: damagedEnemyId,
    lastDamagedCharacterId: undefined,
    lastDamageEventId: damagedEnemyId === undefined ? state.lastDamageEventId : state.lastDamageEventId + 1,
    damagePopups: damagedEnemyId === undefined
      ? state.damagePopups
      : [...state.damagePopups, createDamagePopup(state, 'enemy', damagedEnemyId, damageAmount)],
    enemies: promotionResult.nextEnemies,
    rewards: isVictory ? calculateRewards(state.enemies) : state.rewards,
    timeline,
    isVictory,
    isDefeat: false,
  }
}

export function resolveAnimatedPartyActionHit(state: BattleState): BattleState {
  const activePartyMotions = state.activePartyMotions.length > 0
    ? state.activePartyMotions
    : state.executingCharacterId !== undefined && state.executingTargetEnemyId !== undefined
      ? [{
          actionIndex: state.executingActionIndex,
          animationId: state.executionAnimationId,
          characterId: state.executingCharacterId,
          targetEnemyId: state.executingTargetEnemyId,
          damage: 0,
          executionStep: 'attack' as const,
          startDelayMs: 0,
        }]
      : []
  let nextState: BattleState = {
    ...state,
    damagePopups: [],
  }

  for (const motion of activePartyMotions) {
    if (nextState.isVictory) {
      break
    }

    nextState = applyAnimatedPartyActionHit(nextState, motion)
  }

  return {
    ...nextState,
    executionStep: 'return',
    activePartyMotions: nextState.activePartyMotions.map((motion) => ({
      ...motion,
      executionStep: 'return',
    })),
  }
}

export function finishAnimatedPartyAction(state: BattleState): BattleState {
  const isVictory = state.isVictory
  const completedActionCount = Math.max(state.activePartyMotions.length, 1)

  return {
    ...state,
    phase: isVictory ? 'resolving' : 'executing',
    executionStep: undefined,
    executingActionIndex: state.executingActionIndex + completedActionCount,
    executingCharacterId: undefined,
    executingEnemyId: undefined,
    executingTargetEnemyId: undefined,
    activePartyMotions: [],
    actions: isVictory ? [] : state.actions,
    actionQueue: isVictory ? [] : state.actionQueue,
  }
}

function executePartyAction(state: BattleState, action: BattleQueuedAction): BattleState {
  const nextEnemies = cloneCharacters(state.enemies)
  const timeline: BattleTimelineEvent[] = [...state.timeline]
  const attacker = state.party.find((character) => character.id === action.characterId)

  if (!attacker || attacker.currentHp <= 0) {
    return {
      ...state,
      executingActionIndex: state.executingActionIndex + 1,
      executionStep: undefined,
      executingCharacterId: undefined,
      executingTargetEnemyId: undefined,
      promotedEnemyId: undefined,
      timeline,
    }
  }

  let defeatedEnemyThisAction = false
  let defeatedEnemyId: number | undefined
  let damagedEnemyId: number | undefined
  let damageAmount = 0

  if (action.type === 'defense') {
    addTimeline(timeline, attacker.name + 'は身を守った')
  } else if (action.type !== 'attack') {
    addTimeline(timeline, attacker.name + 'はまだ使えない行動を選んだ')
  } else {
    const target = resolveActionTarget(nextEnemies, action.targetId)
    const targetIndex = nextEnemies.findIndex((enemy) => enemy.id === target?.id)

    if (targetIndex < 0 || !target) {
      addTimeline(timeline, attacker.name + 'の攻撃対象はいなかった')
    } else {
      const { damage } = calculateDamage({ attacker, defender: target })
      damageAmount = damage
      const nextHp = Math.max(target.currentHp - damage, 0)
      defeatedEnemyThisAction = nextHp === 0
      defeatedEnemyId = defeatedEnemyThisAction ? target.id : undefined
      damagedEnemyId = target.id
      const defeatMessage = defeatedEnemyThisAction ? '。' + target.name + 'を倒した' : ''

      nextEnemies[targetIndex] = {
        ...target,
        currentHp: nextHp,
      }

      addTimeline(timeline, attacker.name + 'は' + target.name + 'を攻撃した。' + damage + 'ダメージ' + defeatMessage)
    }
  }

  const promotionResult = promoteBackEnemyInLane(nextEnemies, defeatedEnemyId)
  const isVictory = checkVictory(promotionResult.nextEnemies)

  if (isVictory) {
    addTimeline(timeline, '敵を全滅させた！')
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
    executionStep: undefined,
    executingCharacterId: attacker.id,
    executingEnemyId: undefined,
    executingTargetEnemyId: undefined,
    lastActionDefeatedEnemy: defeatedEnemyThisAction,
    lastDefeatedEnemyId: defeatedEnemyId,
    promotedEnemyId: promotionResult.promotedEnemyId,
    promotionAnimationId: promotionResult.promotedEnemyId === undefined
      ? state.promotionAnimationId
      : state.promotionAnimationId + 1,
    lastDamagedEnemyId: damagedEnemyId,
    lastDamagedCharacterId: undefined,
    lastDamageEventId: damagedEnemyId === undefined ? state.lastDamageEventId : state.lastDamageEventId + 1,
    damagePopups: damagedEnemyId === undefined
      ? state.damagePopups
      : [createDamagePopup(state, 'enemy', damagedEnemyId, damageAmount)],
    actions: isVictory ? [] : state.actions,
    actionQueue: isVictory ? [] : state.actionQueue,
    enemies: promotionResult.nextEnemies,
    rewards: isVictory ? calculateRewards(state.enemies) : state.rewards,
    timeline,
    isVictory,
    isDefeat: false,
  }
}

function executeEnemyAction(state: BattleState, action: BattleQueuedAction): BattleState {
  const enemy = state.enemies.find((candidate) => candidate.id === action.characterId)
  const timeline: BattleTimelineEvent[] = [...state.timeline]

  if (!enemy || enemy.currentHp <= 0) {
    return {
      ...state,
      executingActionIndex: state.executingActionIndex + 1,
      executionStep: undefined,
      executingEnemyId: undefined,
      executingTargetEnemyId: undefined,
      promotedEnemyId: undefined,
      timeline,
    }
  }

  const nextParty = cloneCharacters(state.party)
  const target = getRandomAlivePartyMember(nextParty)

  if (!target) {
    addTimeline(timeline, '味方は全滅した')

    return {
      ...state,
      phase: 'resolving',
      party: nextParty,
      timeline,
      executionStep: undefined,
      executingEnemyId: enemy.id,
      executingCharacterId: undefined,
      executingTargetEnemyId: undefined,
      lastDamagedEnemyId: undefined,
      promotedEnemyId: undefined,
      lastDamagedCharacterId: undefined,
      isVictory: false,
      isDefeat: true,
    }
  }

  const targetIndex = nextParty.findIndex((character) => character.id === target.id)
  const { damage } = calculateDamage({ attacker: enemy, defender: target })
  const nextHp = Math.max(target.currentHp - damage, 0)
  const defeatedMessage = nextHp === 0 ? '。' + target.name + 'は戦闘不能になった' : ''

  let nextTarget = {
    ...target,
    currentHp: nextHp,
  }

  addTimeline(timeline, enemy.name + 'の攻撃')
  addTimeline(timeline, enemy.name + 'は' + target.name + 'に' + damage + 'ダメージ' + defeatedMessage)
  nextTarget = applyAttackEffects(enemy, nextTarget, timeline)
  nextParty[targetIndex] = nextTarget

  const isDefeat = checkDefeat(nextParty)

  if (isDefeat) {
    addTimeline(timeline, '味方は全滅した')
  }

  return {
    ...state,
    phase: isDefeat ? 'resolving' : 'executing',
    party: nextParty,
    timeline,
    executingActionIndex: state.executingActionIndex + 1,
    executionStep: undefined,
    executingEnemyId: enemy.id,
    executingCharacterId: undefined,
    executingTargetEnemyId: undefined,
    lastActionDefeatedEnemy: false,
    lastDefeatedEnemyId: undefined,
    promotedEnemyId: undefined,
    lastDamagedEnemyId: undefined,
    lastDamagedCharacterId: target.id,
    lastDamageEventId: state.lastDamageEventId + 1,
    damagePopups: [createDamagePopup(state, 'party', target.id, damage)],
    isVictory: false,
    isDefeat,
  }
}

export function executeNextBattleAction(state: BattleState): BattleState {
  const action = state.actionQueue[state.executingActionIndex]

  if (!action) {
    return resetPlayerTurn(state)
  }

  return action.actorSide === 'party'
    ? executePartyAction(state, action)
    : executeEnemyAction(state, action)
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
