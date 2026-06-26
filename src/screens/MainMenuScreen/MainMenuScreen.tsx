import { useCallback, useEffect, useState } from 'react'
import { InputManager } from '../../input/InputManager'

type MainMenuScreenProps = {
  onBattle: () => void
  onBackToTitle: () => void
}

const menuActions = ['battle', 'title'] as const
type MainMenuAction = (typeof menuActions)[number]

export function MainMenuScreen({
  onBattle,
  onBackToTitle,
}: MainMenuScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const executeAction = useCallback((action: MainMenuAction) => {
    if (action === 'battle') {
      onBattle()
      return
    }

    onBackToTitle()
  }, [onBackToTitle, onBattle])

  useEffect(() => {
    return InputManager.subscribe(() => {
      if (InputManager.up()) {
        setSelectedIndex((currentIndex) =>
          currentIndex === 0 ? menuActions.length - 1 : currentIndex - 1,
        )
      }

      if (InputManager.down()) {
        setSelectedIndex((currentIndex) =>
          currentIndex === menuActions.length - 1 ? 0 : currentIndex + 1,
        )
      }

      if (InputManager.confirm()) {
        executeAction(menuActions[selectedIndex])
      }
    })
  }, [executeAction, selectedIndex])

  return (
    <section className="screen">
      <h1>メイン画面</h1>
      <div className="button-list">
        <button
          className={selectedIndex === 0 ? 'is-selected' : ''}
          type="button"
          onClick={onBattle}
          onMouseEnter={() => setSelectedIndex(0)}
        >
          戦闘する
        </button>
        <button
          className={selectedIndex === 1 ? 'is-selected' : ''}
          type="button"
          onClick={onBackToTitle}
          onMouseEnter={() => setSelectedIndex(1)}
        >
          タイトルへ戻る
        </button>
      </div>
    </section>
  )
}
