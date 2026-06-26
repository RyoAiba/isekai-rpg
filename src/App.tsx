import { useEffect, useState } from 'react'
import { party as initialParty } from './data/party'
import { InputManager } from './input/InputManager'
import { BattleScreen } from './screens/BattleScreen/BattleScreen'
import { MainMenuScreen } from './screens/MainMenuScreen/MainMenuScreen'
import { ResultScreen } from './screens/ResultScreen/ResultScreen'
import { TitleScreen } from './screens/TitleScreen/TitleScreen'
import type { Character } from './types/character'
import type { GameScreen } from './types/game'
import { clearSaveGame, hasSaveGame, loadGame } from './utils/saveData'
import './App.css'

function cloneParty(party: Character[]) {
  return party.map((character) => ({ ...character }))
}

function App() {
  const [screen, setScreen] = useState<GameScreen>('title')
  const [party, setParty] = useState<Character[]>(() => cloneParty(initialParty))
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasSaveData, setHasSaveData] = useState(() => hasSaveGame())

  useEffect(() => {
    InputManager.initialize()

    return () => {
      InputManager.destroy()
    }
  }, [])

  const startNewGame = () => {
    clearSaveGame()
    setParty(cloneParty(initialParty))
    setHasSaveData(false)
    setSaveError(null)
    setScreen('mainMenu')
  }

  const continueGame = () => {
    const saveData = loadGame()

    if (!saveData) {
      setSaveError('セーブデータがありません')
      return
    }

    setParty(cloneParty(saveData.party))
    setHasSaveData(true)
    setSaveError(null)
    setScreen('mainMenu')
  }

  const updateParty = (nextParty: Character[]) => {
    setParty(nextParty)
    setHasSaveData(true)
  }

  return (
    <main className="game-root">
      {screen === 'title' && (
        <TitleScreen
          hasSaveData={hasSaveData}
          saveError={saveError}
          onNewGame={startNewGame}
          onContinue={continueGame}
        />
      )}

      {screen === 'mainMenu' && (
        <MainMenuScreen
          onBattle={() => setScreen('battle')}
          onBackToTitle={() => setScreen('title')}
        />
      )}

      {screen === 'battle' && (
        <BattleScreen
          party={party}
          onBattleEnd={() => setScreen('result')}
          onEscape={() => setScreen('mainMenu')}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          party={party}
          onPartyUpdated={updateParty}
          onBackToMainMenu={() => setScreen('mainMenu')}
        />
      )}
    </main>
  )
}

export default App
