export type BattleActionType = 'attack' | 'defense' | 'skill' | 'magic' | 'item'

export type BattlePhase = 'partyCommand' | 'characterCommand' | 'confirmActions' | 'resolving'

export type PartyCommandType = 'fight' | 'escape' | 'auto'

export type ConfirmCommandType = 'yes' | 'no'

export type BattleAction = {
  characterId: number
  type: BattleActionType
  targetId?: number
  skillId?: string
  itemId?: string
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
  selectedConfirmIndex: number
  actions: BattleAction[]
}
