import type { BattleCommand, ConfirmCommand, PartyCommand } from '../types/battle'

export const PARTY_COMMANDS: PartyCommand[] = [
  { id: 'fight', label: 'たたかう', enabled: true },
  { id: 'escape', label: 'にげる', enabled: true },
  { id: 'auto', label: 'おまかせ', enabled: true },
]

export const DEFAULT_CHARACTER_COMMANDS: BattleCommand[] = [
  { id: 'attack', label: 'こうげき', enabled: true },
  { id: 'defense', label: 'ぼうぎょ', enabled: true },
]

export const CONFIRM_COMMANDS: ConfirmCommand[] = [
  { id: 'yes', label: 'はい', enabled: true },
  { id: 'no', label: 'いいえ', enabled: true },
]
