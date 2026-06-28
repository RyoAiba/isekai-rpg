import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { party as initialParty } from './data/party'
import { canStayAtInn, healPartyAtInn, INN_COST } from './game/inn'
import { InputManager } from './input/InputManager'
import { BattleScreen } from './screens/BattleScreen/BattleScreen'
import { MainMenuScreen } from './screens/MainMenuScreen/MainMenuScreen'
import { TitleScreen } from './screens/TitleScreen/TitleScreen'
import type { Character } from './types/character'
import type { GameScreen } from './types/game'
import { clearSaveGame, hasSaveGame, loadGame, saveGame } from './utils/saveData'
import './App.css'

const GAME_VIEWPORT_WIDTH = 1920
const GAME_VIEWPORT_HEIGHT = 1080

function cloneParty(party: Character[]) {
  return party.map((character) => ({ ...character }))
}

function App() {
  const innFadeTimerRef = useRef<number | null>(null)
  const innHealTimerRef = useRef<number | null>(null)
  const [screen, setScreen] = useState<GameScreen>('title')
  const [party, setParty] = useState<Character[]>(() => cloneParty(initialParty))
  const [money, setMoney] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasSaveData, setHasSaveData] = useState(() => hasSaveGame())
  const [isInnFadeActive, setIsInnFadeActive] = useState(false)
  const [gameScale, setGameScale] = useState(() => {
    if (typeof window === 'undefined') {
      return 1
    }

    return Math.min(
      window.innerWidth / GAME_VIEWPORT_WIDTH,
      window.innerHeight / GAME_VIEWPORT_HEIGHT,
    )
  })

  useEffect(() => {
    InputManager.initialize()

    return () => {
      InputManager.destroy()
      if (innFadeTimerRef.current !== null) {
        window.clearTimeout(innFadeTimerRef.current)
      }
      if (innHealTimerRef.current !== null) {
        window.clearTimeout(innHealTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const updateGameScale = () => {
      setGameScale(Math.min(
        window.innerWidth / GAME_VIEWPORT_WIDTH,
        window.innerHeight / GAME_VIEWPORT_HEIGHT,
      ))
    }

    updateGameScale()
    window.addEventListener('resize', updateGameScale)

    return () => window.removeEventListener('resize', updateGameScale)
  }, [])

  const startNewGame = () => {
    clearSaveGame()
    setParty(cloneParty(initialParty))
    setMoney(0)
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
    setMoney(saveData.money)
    setHasSaveData(true)
    setSaveError(null)
    setScreen('mainMenu')
  }

  const completeBattle = (nextParty: Character[], nextMoney: number) => {
    setParty(nextParty)
    setMoney(nextMoney)
    setHasSaveData(true)
    saveGame({ party: nextParty, money: nextMoney })
    setScreen('mainMenu')
  }

  const stayAtInn = () => {
    if (!canStayAtInn(money) || isInnFadeActive) {
      return false
    }

    setIsInnFadeActive(true)
    innHealTimerRef.current = window.setTimeout(() => {
      const nextParty = healPartyAtInn(party)
      const nextMoney = money - INN_COST

      setParty(nextParty)
      setMoney(nextMoney)
      setHasSaveData(true)
      saveGame({ party: nextParty, money: nextMoney })
    }, 550)
    innFadeTimerRef.current = window.setTimeout(() => setIsInnFadeActive(false), 1500)

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
    <div className="game-shell">
      <main
        className="game-root"
        style={{ '--game-scale': gameScale } as CSSProperties}
      >
        <div className="game-content">
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
              money={money}
              onBattleComplete={completeBattle}
              onEscape={returnToMainMenu}
            />
          )}

          {isInnFadeActive && <div className="screen-fade-overlay is-active" aria-hidden="true" />}
        </div>
      </main>
    </div>
  )
}

export default App
