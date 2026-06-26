import { useEffect, useState } from 'react'
import { enemies as initialEnemies } from './data/enemies'
import { party as initialParty } from './data/party'
import { canStayAtInn, healPartyAtInn, INN_COST } from './game/inn'
import { InputManager } from './input/InputManager'
import { BattleScreen } from './screens/BattleScreen/BattleScreen'
import { MainMenuScreen } from './screens/MainMenuScreen/MainMenuScreen'
import { ResultScreen } from './screens/ResultScreen/ResultScreen'
import { TitleScreen } from './screens/TitleScreen/TitleScreen'
import type { Character } from './types/character'
import type { GameScreen } from './types/game'
import { clearSaveGame, hasSaveGame, loadGame, saveGame } from './utils/saveData'
import './App.css'

function cloneParty(party: Character[]) {
  return party.map((character) => ({ ...character }))
}

function App() {
  const [screen, setScreen] = useState<GameScreen>('title')
  const [party, setParty] = useState<Character[]>(() => cloneParty(initialParty))
  const [money, setMoney] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasSaveData, setHasSaveData] = useState(() => hasSaveGame())
  const [lastBattleParty, setLastBattleParty] = useState<Character[] | null>(null)
  const [lastBattleEnemies, setLastBattleEnemies] = useState<Character[] | null>(null)
  const [isInnFadeActive, setIsInnFadeActive] = useState(false)

  useEffect(() => {
    InputManager.initialize()

    return () => {
      InputManager.destroy()
    }
  }, [])

  const startNewGame = () => {
    clearSaveGame()
    setParty(cloneParty(initialParty))
    setMoney(0)
    setHasSaveData(false)
    setSaveError(null)
    setLastBattleParty(null)
    setLastBattleEnemies(null)
    setScreen('mainMenu')
  }

  const continueGame = () => {
    const saveData = loadGame()

    if (!saveData) {
      setSaveError('セーブデータがありません')
      return
    }

    setParty(cloneParty(saveData.party))
    setMoney(saveData.money)
    setHasSaveData(true)
    setSaveError(null)
    setLastBattleParty(null)
    setLastBattleEnemies(null)
    setScreen('mainMenu')
  }

  const updateProgress = (nextParty: Character[], nextMoney: number) => {
    setParty(nextParty)
    setMoney(nextMoney)
    setHasSaveData(true)
  }

  const stayAtInn = () => {
    if (!canStayAtInn(money)) {
      return false
    }

    const nextParty = healPartyAtInn(party)
    const nextMoney = money - INN_COST

    setParty(nextParty)
    setMoney(nextMoney)
    setHasSaveData(true)
    saveGame({ party: nextParty, money: nextMoney })
    setIsInnFadeActive(true)
    window.setTimeout(() => setIsInnFadeActive(false), 1000)

    return true
  }

  const returnToMainMenu = (nextParty?: Character[]) => {
    if (nextParty) {
      setParty(nextParty)
      saveGame({ party: nextParty, money })
      setHasSaveData(true)
    }

    setScreen('mainMenu')
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
          money={money}
          party={party}
          innCost={INN_COST}
          onBattle={() => setScreen('battle')}
          onStayAtInn={stayAtInn}
          onBackToTitle={() => setScreen('title')}
        />
      )}

      {screen === 'battle' && (
        <BattleScreen
          party={party}
          onBattleEnd={(nextParty, nextEnemies) => {
            setParty(nextParty)
            setLastBattleParty(nextParty)
            setLastBattleEnemies(nextEnemies)
            setScreen('result')
          }}
          onEscape={returnToMainMenu}
        />
      )}

      {isInnFadeActive && <div className="screen-fade-overlay is-active" aria-hidden="true" />}

      {screen === 'result' && (
        <ResultScreen
          party={party}
          money={money}
          backdropParty={lastBattleParty ?? party}
          backdropEnemies={lastBattleEnemies ?? initialEnemies}
          onProgressUpdated={updateProgress}
          onBackToMainMenu={() => setScreen('mainMenu')}
        />
      )}
    </main>
  )
}

export default App
