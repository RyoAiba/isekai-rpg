import { useEffect, useState } from 'react'
import { InputManager } from '../../input/InputManager'

type TitleScreenProps = {
  hasSaveData: boolean
  saveError: string | null
  onNewGame: () => void
  onContinue: () => void
}

type TitleMenuItem = 'newGame' | 'continue'

export function TitleScreen({
  hasSaveData,
  saveError,
  onNewGame,
  onContinue,
}: TitleScreenProps) {
  const [selectedItem, setSelectedItem] = useState<TitleMenuItem>(
    hasSaveData ? 'continue' : 'newGame',
  )

  useEffect(() => {
    return InputManager.subscribe(() => {
      if (InputManager.up() || InputManager.down()) {
        setSelectedItem((currentItem) =>
          currentItem === 'newGame' ? 'continue' : 'newGame',
        )
      }

      if (InputManager.confirm()) {
        if (selectedItem === 'newGame') {
          onNewGame()
          return
        }

        onContinue()
      }
    })
  }, [onContinue, onNewGame, selectedItem])

  return (
    <section className="title-screen">
      <h1>ISEKAI RPG</h1>
      <div className="title-menu">
        <button
          className={selectedItem === 'newGame' ? 'is-selected' : ''}
          type="button"
          onClick={onNewGame}
          onMouseEnter={() => setSelectedItem('newGame')}
        >
          NEW GAME
        </button>
        <button
          className={selectedItem === 'continue' ? 'is-selected' : ''}
          type="button"
          onClick={onContinue}
          onMouseEnter={() => setSelectedItem('continue')}
        >
          CONTINUE
        </button>
      </div>
      {saveError && <p className="title-error">{saveError}</p>}
    </section>
  )
}
