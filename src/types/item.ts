export type ItemId = 'herb' | 'antidote'

export type InventoryItem = {
  itemId: ItemId
  quantity: number
}

export type ItemDefinition = {
  id: ItemId
  name: string
  description: string
}
