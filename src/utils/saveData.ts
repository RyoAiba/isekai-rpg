import type { GameSaveData } from '../types/saveData'

const SAVE_KEY = 'isekai-rpg-save-data'

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function saveGame(saveData: GameSaveData) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(SAVE_KEY, JSON.stringify(saveData))
}

export function loadGame(): GameSaveData | null {
  if (!canUseLocalStorage()) {
    return null
  }

  const rawSaveData = window.localStorage.getItem(SAVE_KEY)

  if (!rawSaveData) {
    return null
  }

  try {
    const parsedSaveData = JSON.parse(rawSaveData) as Partial<GameSaveData>

    if (!Array.isArray(parsedSaveData.party)) {
      return null
    }

    return {
      party: parsedSaveData.party,
      money: typeof parsedSaveData.money === 'number' ? parsedSaveData.money : 0,
    }
  } catch {
    return null
  }
}

export function clearSaveGame() {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.removeItem(SAVE_KEY)
}

export function hasSaveGame() {
  return loadGame() !== null
}
