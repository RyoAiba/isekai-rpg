import type { Character } from './character'

export type BattleActionType = 'attack' | 'defense' | 'skill' | 'magic' | 'item'

export type BattlePhase =
  | 'partyCommand'
  | 'characterCommand'
  | 'targetSelection'
  | 'confirmActions'
  | 'executing'
  | 'resolving'

export type BattleExecutionStep = 'approach' | 'attack' | 'return'

export type BattlePartyMotion = {
  actionIndex: number
  animationId: number
  characterId: number
  targetEnemyId: number
  damage: number
  executionStep: BattleExecutionStep
  startDelayMs: number
}

export type BattleDamagePopup = {
  id: number
  targetSide: 'party' | 'enemy'
  targetId: number
  damage: number
}

export type PartyCommandType = 'fight' | 'escape' | 'auto'

export type ConfirmCommandType = 'yes' | 'no'

export type BattleAction = {
  characterId: number
  type: BattleActionType
  targetId?: number
  skillId?: string
  itemId?: string
}

export type BattleQueuedAction = BattleAction & {
  actorSide: 'party' | 'enemy'
  initiative: number
}

export type BattleRewards = {
  exp: number
  money: number
}

export type BattleTimelineEvent = {
  id: number
  message: string
}

export type BattleCommand = {
  id: BattleActionType
  label: string
  enabled: boolean
}

export type PartyCommand = {
  id: PartyCommandType
  label: string
  enabled: boolean
}

export type ConfirmCommand = {
  id: ConfirmCommandType
  label: string
  enabled: boolean
}

export type BattleState = {
  phase: BattlePhase
  activeCharacterIndex: number
  selectedPartyCommandIndex: number
  selectedCharacterCommandIndex: number
  selectedTargetIndex: number
  selectedConfirmIndex: number
  isAutoCommandConfirm: boolean
  actions: BattleAction[]
  actionQueue: BattleQueuedAction[]
  rewards: BattleRewards
  roundNumber: number
  party: Character[]
  enemies: Character[]
  timeline: BattleTimelineEvent[]
  executingActionIndex: number
  executionAnimationId: number
  executionStep?: BattleExecutionStep
  executingCharacterId?: number
  executingEnemyId?: number
  executingTargetEnemyId?: number
  activePartyMotions: BattlePartyMotion[]
  damagePopups: BattleDamagePopup[]
  lastActionDefeatedEnemy: boolean
  lastDefeatedEnemyId?: number
  promotedEnemyId?: number
  promotionAnimationId: number
  lastDamagedEnemyId?: number
  lastDamagedCharacterId?: number
  lastDamageEventId: number
  isVictory: boolean
  isDefeat: boolean
}
