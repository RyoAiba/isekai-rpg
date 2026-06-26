import type { Character } from './character'

export type BattleActionType = 'attack' | 'defense' | 'skill' | 'magic' | 'item'

export type BattlePhase =
  | 'partyCommand'
  | 'characterCommand'
  | 'targetSelection'
  | 'confirmActions'
  | 'executing'
  | 'resolving'

export type PartyCommandType = 'fight' | 'escape' | 'auto'

export type ConfirmCommandType = 'yes' | 'no'

export type BattleAction = {
  characterId: number
  type: BattleActionType
  targetId?: number
  skillId?: string
  itemId?: string
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
  enemies: Character[]
  timeline: BattleTimelineEvent[]
  executingActionIndex: number
  executingCharacterId?: number
  lastActionDefeatedEnemy: boolean
  isVictory: boolean
}
