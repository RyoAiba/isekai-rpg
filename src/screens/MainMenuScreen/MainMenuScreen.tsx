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

  const isActionEnabled = useCallback((action: MainMenuAction) => {
    return action !== 'inn' || canUseInn
  }, [canUseInn])

  const moveSelection = useCallback((direction: -1 | 1) => {
    setSelectedIndex((currentIndex) => {
      let nextIndex = isActionEnabled(menuActions[currentIndex]) ? currentIndex : 0

      for (let step = 0; step < menuActions.length; step += 1) {
        nextIndex =
          (nextIndex + direction + menuActions.length) % menuActions.length

        if (isActionEnabled(menuActions[nextIndex])) {
          return nextIndex
        }
      }

      return currentIndex
    })
  }, [isActionEnabled])

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

  const activeSelectedIndex = isActionEnabled(menuActions[selectedIndex])
    ? selectedIndex
    : 0

  useEffect(() => {
    return InputManager.subscribe(() => {
      if (InputManager.up()) {
        moveSelection(-1)
      }

      if (InputManager.down()) {
        moveSelection(1)
      }

      if (InputManager.confirm()) {
        executeAction(menuActions[activeSelectedIndex])
      }
    })
  }, [activeSelectedIndex, executeAction, moveSelection])

  return (
    <section className="screen main-menu-screen">
      <div className="main-menu-mask" aria-hidden="true" />

      <div className="main-menu-actions jrpg-menu-window main-menu-text" aria-label="メインメニュー">
        <button
          className={activeSelectedIndex === 0 ? 'is-selected' : ''}
          type="button"
          onClick={onBattle}
          onMouseEnter={() => setSelectedIndex(0)}
        >
          戦闘する
        </button>
        <div className="main-menu-inn-action">
          <button
            className={activeSelectedIndex === 1 ? 'is-selected' : ''}
            type="button"
            onClick={() => {
              if (canUseInn) {
                onStayAtInn()
              }
            }}
            onMouseEnter={() => {
              if (canUseInn) {
                setSelectedIndex(1)
              }
            }}
            disabled={!canUseInn}
          >
            宿屋
          </button>
          <span className="main-menu-inn-cost">{innCost}ルク</span>
        </div>
        <button
          className={activeSelectedIndex === 2 ? 'is-selected' : ''}
          type="button"
          onClick={onBackToTitle}
          onMouseEnter={() => setSelectedIndex(2)}
        >
          タイトルへ戻る
        </button>
      </div>

      <aside className="main-menu-money-window jrpg-menu-window main-menu-text" aria-label="所持金">
        <span>{money}</span>
        <span>ルク</span>
      </aside>

      <aside className="main-menu-party-window jrpg-menu-window main-menu-text" aria-label="味方一覧">
        <ul>
          {party.map((character) => (
            <li key={character.id}>
              <span className="main-menu-party-name">{character.name}</span>
              <span
                className={
                  isCriticalHp(character)
                    ? 'main-menu-party-hp is-critical'
                    : 'main-menu-party-hp'
                }
              >
                <span className="main-menu-party-heart" aria-label="HP">♥</span>
                <span>{character.currentHp}/{getMaxHp(character)}</span>
              </span>
              <span className="main-menu-party-level">レベル{character.level}</span>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  )
}
