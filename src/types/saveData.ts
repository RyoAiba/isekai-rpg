import type { Character } from './character'
import type { InventoryItem } from './item'

export type GameSaveData = {
  party: Character[]
  money: number
  items: InventoryItem[]
}
