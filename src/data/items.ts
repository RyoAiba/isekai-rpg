import type { InventoryItem, ItemDefinition, ItemId } from '../types/item'

export const ITEM_DEFINITIONS: ItemDefinition[] = [
  { id: 'herb', name: 'やくそう' },
  { id: 'antidote', name: 'どくけしそう' },
]

export const INITIAL_INVENTORY: InventoryItem[] = ITEM_DEFINITIONS.map((item) => ({
  itemId: item.id,
  quantity: 5,
}))

const itemDefinitionMap = new Map<ItemId, ItemDefinition>(
  ITEM_DEFINITIONS.map((item) => [item.id, item]),
)

export function getItemDefinition(itemId: ItemId) {
  return itemDefinitionMap.get(itemId)
}
