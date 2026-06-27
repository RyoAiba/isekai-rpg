import { useCallback, useEffect, useState } from 'react'
import { getMaxHp } from '../../battle/StatCalculator'
import { InputManager } from '../../input/InputManager'
import type { Character } from '../../types/character'
import { isCriticalHp } from '../../utils/hp'

type MainMenuScreenProps = {
  money: number
  party: Character[]
  innCost: number
  onBattle: () => void
  onStayAtInn: () => boolean
  onBackToTitle: () => void
}

const menuActions = ['battle', 'inn', 'title'] as const
type MainMenuAction = (typeof menuActions)[number]

export function MainMenuScreen({
  money,
  party,
  innCost,
  onBattle,
  onStayAtInn,
  onBackToTitle,
}: MainMenuScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const canUseInn = money >= innCost

  const executeAction = useCallback((action: MainMenuAction) => {
    if (action === 'battle') {
      onBattle()
      return
    }

    if (action === 'inn') {
      if (canUseInn) {
        onStayAtInn()
      }
      return
    }

    onBackToTitle()
  }, [canUseInn, onBackToTitle, onBattle, onStayAtInn])

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
    <section className="screen main-menu-screen">
      <h1>メイン画面</h1>
      <p className="main-menu-money">所持金 {money} ルク</p>

      <div className="button-list main-menu-actions">
        <button
          className={selectedIndex === 0 ? 'is-selected' : ''}
          type="button"
          onClick={onBattle}
          onMouseEnter={() => setSelectedIndex(0)}
        >
          戦闘する
        </button>
        <div className="main-menu-inn-action">
          <button
            className={selectedIndex === 1 ? 'is-selected' : ''}
            type="button"
            onClick={() => {
              if (canUseInn) {
                onStayAtInn()
              }
            }}
            onMouseEnter={() => setSelectedIndex(1)}
            disabled={!canUseInn}
          >
            宿屋
          </button>
          <span className="main-menu-inn-cost">{innCost}ルク</span>
        </div>
        <button
          className={selectedIndex === 2 ? 'is-selected' : ''}
          type="button"
          onClick={onBackToTitle}
          onMouseEnter={() => setSelectedIndex(2)}
        >
          タイトルへ戻る
        </button>
      </div>

      <aside className="main-menu-party-window battle-window" aria-label="味方HP一覧">
        <ul>
          {party.map((character) => (
            <li key={character.id}>
              <span>{character.name}</span>
              <span className={isCriticalHp(character) ? 'hp-value is-critical-hp' : 'hp-value'}>
                <span className="heart-mark" aria-label="HP">
                  ♥
                </span>
                <span>{character.currentHp}</span>
                <span>/</span>
                <span>{getMaxHp(character)}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  )
}
