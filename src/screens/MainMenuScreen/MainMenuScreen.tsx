import { useCallback, useEffect, useState } from 'react'
import { getMaxHp } from '../../battle/StatCalculator'
import { getItemDefinition } from '../../data/items'
import { canUseItemOnCharacter } from '../../game/items'
import { InputManager } from '../../input/InputManager'
import type { Character } from '../../types/character'
import type { InventoryItem, ItemId } from '../../types/item'
import { isCriticalHp } from '../../utils/hp'
import { toFullWidthNumber } from '../../utils/numberFormat'

type MainMenuScreenProps = {
  money: number
  party: Character[]
  items: InventoryItem[]
  innCost: number
  onBattle: () => void
  onStayAtInn: () => boolean
  onUseItem: (itemId: ItemId, characterId: number) => boolean
  onDiscardItem: (itemId: ItemId) => void
  onBackToTitle: () => void
}

const menuActions = ['battle', 'items', 'inn', 'title'] as const
type MainMenuAction = (typeof menuActions)[number]
const itemActionCommands = ['use', 'discard'] as const
type ItemActionCommand = (typeof itemActionCommands)[number]
type MenuMode = 'main' | 'itemList' | 'itemAction' | 'itemTarget'
const itemMenuModes: MenuMode[] = ['itemList', 'itemAction', 'itemTarget']

export function MainMenuScreen({
  money,
  party,
  items,
  innCost,
  onBattle,
  onStayAtInn,
  onUseItem,
  onDiscardItem,
  onBackToTitle,
}: MainMenuScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [menuMode, setMenuMode] = useState<MenuMode>('main')
  const [selectedItemIndex, setSelectedItemIndex] = useState(0)
  const [selectedItemActionIndex, setSelectedItemActionIndex] = useState(0)
  const [selectedPartyIndex, setSelectedPartyIndex] = useState(0)
  const canUseInn = money >= innCost
  const isItemMenuOpen = itemMenuModes.includes(menuMode)
  const visibleItems = items.filter((item) => item.quantity > 0)
  const activeSelectedItemIndex = Math.min(selectedItemIndex, Math.max(visibleItems.length - 1, 0))
  const selectedItem = visibleItems[activeSelectedItemIndex]
  const selectedItemDefinition = selectedItem ? getItemDefinition(selectedItem.itemId) : undefined
  const isSingleItemWindow = menuMode === 'itemAction' || menuMode === 'itemTarget'

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

    if (action === 'items') {
      setMenuMode('itemList')
      setSelectedItemIndex(0)
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

  const moveItemSelection = useCallback((direction: -1 | 1) => {
    setSelectedItemIndex((currentIndex) =>
      visibleItems.length === 0
        ? 0
        : (currentIndex + direction + visibleItems.length) % visibleItems.length,
    )
  }, [visibleItems.length])

  const moveItemActionSelection = useCallback((direction: -1 | 1) => {
    setSelectedItemActionIndex((currentIndex) =>
      (currentIndex + direction + itemActionCommands.length) % itemActionCommands.length,
    )
  }, [])

  const movePartySelection = useCallback((offset: number) => {
    setSelectedPartyIndex((currentIndex) =>
      party.length === 0 ? 0 : (currentIndex + offset + party.length) % party.length,
    )
  }, [party.length])

  const openSelectedItemAction = useCallback(() => {
    if (!selectedItem || selectedItem.quantity <= 0) {
      return
    }

    setMenuMode('itemAction')
    setSelectedItemActionIndex(0)
  }, [selectedItem])

  const openItemAction = useCallback((item: InventoryItem) => {
    if (item.quantity <= 0) {
      return
    }

    setMenuMode('itemAction')
    setSelectedItemActionIndex(0)
  }, [])

  const executeItemAction = useCallback((action: ItemActionCommand) => {
    if (!selectedItem || selectedItem.quantity <= 0) {
      setMenuMode('itemList')
      return
    }

    if (action === 'use') {
      setMenuMode('itemTarget')
      setSelectedPartyIndex(0)
      return
    }

    onDiscardItem(selectedItem.itemId)
    setMenuMode('itemList')
  }, [onDiscardItem, selectedItem])

  const applySelectedItemToTarget = useCallback(() => {
    const targetCharacter = party[selectedPartyIndex]

    if (!selectedItem || !targetCharacter) {
      return
    }

    const didUseItem = onUseItem(selectedItem.itemId, targetCharacter.id)

    if (didUseItem && selectedItem.quantity <= 1) {
      setMenuMode('itemList')
    }
  }, [onUseItem, party, selectedItem, selectedPartyIndex])

  const activeSelectedIndex = isActionEnabled(menuActions[selectedIndex])
    ? selectedIndex
    : 0

  useEffect(() => {
    return InputManager.subscribe(() => {
      if (InputManager.up()) {
        if (menuMode === 'main') {
          moveSelection(-1)
        } else if (menuMode === 'itemList') {
          moveItemSelection(-1)
        } else if (menuMode === 'itemAction') {
          moveItemActionSelection(-1)
        } else {
          movePartySelection(-1)
        }
      }

      if (InputManager.down()) {
        if (menuMode === 'main') {
          moveSelection(1)
        } else if (menuMode === 'itemList') {
          moveItemSelection(1)
        } else if (menuMode === 'itemAction') {
          moveItemActionSelection(1)
        } else {
          movePartySelection(1)
        }
      }

      if (InputManager.left() && menuMode === 'itemTarget') {
        movePartySelection(-3)
      }

      if (InputManager.right() && menuMode === 'itemTarget') {
        movePartySelection(3)
      }

      if (InputManager.confirm()) {
        if (menuMode === 'main') {
          executeAction(menuActions[activeSelectedIndex])
        } else if (menuMode === 'itemList') {
          openSelectedItemAction()
        } else if (menuMode === 'itemAction') {
          executeItemAction(itemActionCommands[selectedItemActionIndex])
        } else {
          applySelectedItemToTarget()
        }
      }

      if (InputManager.cancel()) {
        if (menuMode === 'itemTarget') {
          setMenuMode('itemAction')
        } else if (menuMode === 'itemAction') {
          setMenuMode('itemList')
        } else if (menuMode === 'itemList') {
          setMenuMode('main')
        }
      }
    })
  }, [
    activeSelectedIndex,
    applySelectedItemToTarget,
    executeAction,
    executeItemAction,
    menuMode,
    moveItemActionSelection,
    moveItemSelection,
    movePartySelection,
    moveSelection,
    openItemAction,
    openSelectedItemAction,
    selectedItemActionIndex,
  ])

  return (
    <section className={isItemMenuOpen ? 'screen main-menu-screen is-item-menu-open' : 'screen main-menu-screen'}>
      <div className="main-menu-mask" aria-hidden="true" />

      {isItemMenuOpen ? (
        <aside className="main-menu-item-title-window jrpg-menu-window main-menu-text" aria-label="どうぐ">
          <span>どうぐ</span>
        </aside>
      ) : (
        <div className="main-menu-actions jrpg-menu-window main-menu-text" aria-label="メインメニュー">
          <button
            className={activeSelectedIndex === 0 ? 'is-selected' : ''}
            type="button"
            onClick={onBattle}
            onMouseEnter={() => setSelectedIndex(0)}
          >
            戦闘する
          </button>
          <button
            className={activeSelectedIndex === 1 ? 'is-selected' : ''}
            type="button"
            onClick={() => executeAction('items')}
            onMouseEnter={() => setSelectedIndex(1)}
          >
            どうぐ
          </button>
          <div className="main-menu-inn-action">
            <button
              className={activeSelectedIndex === 2 ? 'is-selected' : ''}
              type="button"
              onClick={() => {
                if (canUseInn) {
                  onStayAtInn()
                }
              }}
              onMouseEnter={() => {
                if (canUseInn) {
                  setSelectedIndex(2)
                }
              }}
              disabled={!canUseInn}
            >
              宿屋
            </button>
            <span className="main-menu-inn-cost">{toFullWidthNumber(innCost)}ルク</span>
          </div>
          <button
            className={activeSelectedIndex === 3 ? 'is-selected' : ''}
            type="button"
            onClick={onBackToTitle}
            onMouseEnter={() => setSelectedIndex(3)}
          >
            タイトルへ戻る
          </button>
        </div>
      )}

      {isItemMenuOpen && (
        <aside
          className={
            isSingleItemWindow
              ? 'main-menu-items-window is-single-item jrpg-menu-window main-menu-text'
              : 'main-menu-items-window jrpg-menu-window main-menu-text'
          }
          aria-label="どうぐ一覧"
        >
          {visibleItems.length === 0 && (
            <p className="main-menu-empty-items">なにもありません</p>
          )}
          {(isSingleItemWindow && selectedItem ? [selectedItem] : visibleItems).map((item, index) => {
            const definition = getItemDefinition(item.itemId)
            const itemIndex = isSingleItemWindow ? activeSelectedItemIndex : index

            return (
              <button
                className={activeSelectedItemIndex === itemIndex && menuMode === 'itemList' ? 'is-selected' : ''}
                type="button"
                key={item.itemId}
                onClick={() => {
                  setSelectedItemIndex(itemIndex)
                  openItemAction(item)
                }}
                onMouseEnter={() => setSelectedItemIndex(itemIndex)}
              >
                <span>{definition?.name ?? item.itemId}</span>
                <span>{toFullWidthNumber(item.quantity)}</span>
              </button>
            )
          })}
        </aside>
      )}

      {(menuMode === 'itemAction' || menuMode === 'itemTarget') && (
        <aside className="main-menu-item-action-window jrpg-menu-window main-menu-text" aria-label="どうぐ操作">
          {itemActionCommands.map((action, index) => (
            <button
              className={selectedItemActionIndex === index && menuMode === 'itemAction' ? 'is-selected' : ''}
              type="button"
              key={action}
              onClick={() => {
                setSelectedItemActionIndex(index)
                executeItemAction(action)
              }}
              onMouseEnter={() => setSelectedItemActionIndex(index)}
            >
              {action === 'use' ? 'つかう' : 'すてる'}
            </button>
          ))}
        </aside>
      )}

      {!isItemMenuOpen && (
        <aside className="main-menu-money-window jrpg-menu-window main-menu-text" aria-label="所持金">
          <span>{toFullWidthNumber(money)}</span>
          <span>ルク</span>
        </aside>
      )}

      <aside className="main-menu-party-window jrpg-menu-window main-menu-text" aria-label="味方一覧">
        <ul>
          {party.map((character, index) => {
            const canUseSelectedItem =
              menuMode === 'itemTarget' &&
              selectedItem !== undefined &&
              selectedItem.quantity > 0 &&
              canUseItemOnCharacter(selectedItem.itemId, character)

            return (
              <li
                className={[
                  menuMode === 'itemTarget' && selectedPartyIndex === index ? 'is-selected' : '',
                  menuMode === 'itemTarget' && !canUseSelectedItem ? 'is-inactive-character' : '',
                ].filter(Boolean).join(' ')}
                key={character.id}
                onMouseEnter={() => {
                  if (menuMode === 'itemTarget') {
                    setSelectedPartyIndex(index)
                  }
                }}
              >
                <span className="main-menu-party-name">{character.name}</span>
                <span
                  className={
                    isCriticalHp(character)
                      ? 'main-menu-party-hp is-critical'
                      : 'main-menu-party-hp'
                  }
                >
                  <span className="main-menu-party-heart" aria-label="HP">♥</span>
                  <span>{toFullWidthNumber(character.currentHp)}/{toFullWidthNumber(getMaxHp(character))}</span>
                </span>
                <span className="main-menu-party-level">レベル{toFullWidthNumber(character.level)}</span>
              </li>
            )
          })}
        </ul>
      </aside>

      {isItemMenuOpen && (
        <aside className="main-menu-item-description-window jrpg-menu-window main-menu-text" aria-label="どうぐ説明">
          <span>{selectedItemDefinition?.description ?? ''}</span>
        </aside>
      )}
    </section>
  )
}
