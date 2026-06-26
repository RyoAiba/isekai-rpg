import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BattleField } from '../../components/BattleField/BattleField'
import { enemies } from '../../data/enemies'
import { InputManager } from '../../input/InputManager'
import type { Character } from '../../types/character'
import { saveGame } from '../../utils/saveData'

type ResultScreenProps = {
  party: Character[]
  money: number
  backdropParty: Character[]
  backdropEnemies: Character[]
  onProgressUpdated: (party: Character[], money: number) => void
  onBackToMainMenu: () => void
}

type LevelUpGains = {
  hp: number
  power: number
  directDefense: number
  technique: number
}

type ResultCharacter = Character & {
  levelUpCount: number
  gains?: LevelUpGains
}

const EXP_PER_LEVEL = 1000
const battleExp = enemies.reduce((total, enemy) => total + enemy.baseExp, 0)
const battleMoney = 60

function buildResultCharacters(party: Character[]): ResultCharacter[] {
  return party.map((character) => {
    const totalExp = character.exp + battleExp
    const levelUpCount = Math.floor(totalExp / EXP_PER_LEVEL)
    const nextExp = totalExp % EXP_PER_LEVEL
    const gains =
      levelUpCount > 0
        ? {
          hp: 8 * levelUpCount,
          power: 2 * levelUpCount,
          directDefense: 2 * levelUpCount,
          technique: 2 * levelUpCount,
        }
        : undefined

    return {
      ...character,
      level: character.level + levelUpCount,
      exp: nextExp,
      hp: gains ? character.hp + gains.hp : character.hp,
      maxHp: gains ? character.maxHp + gains.hp : character.maxHp,
      power: gains ? character.power + gains.power : character.power,
      directDefense: gains
        ? character.directDefense + gains.directDefense
        : character.directDefense,
      technique: gains ? character.technique + gains.technique : character.technique,
      levelUpCount,
      gains,
    }
  })
}

function toSavedParty(resultCharacters: ResultCharacter[]): Character[] {
  return resultCharacters.map((character) => ({
    id: character.id,
    name: character.name,
    level: character.level,
    exp: character.exp,
    hp: character.hp,
    maxHp: character.maxHp,
    power: character.power,
    directDefense: character.directDefense,
    technique: character.technique,
    range: character.range,
    position: character.position,
  }))
}

function renderStatValue(
  character: ResultCharacter,
  key: keyof LevelUpGains,
  currentValue: number,
) {
  if (character.levelUpCount > 0 && character.gains) {
    return `+${character.gains[key]}`
  }

  return currentValue
}

export function ResultScreen({
  party,
  money,
  backdropParty,
  backdropEnemies,
  onProgressUpdated,
  onBackToMainMenu,
}: ResultScreenProps) {
  const hasSavedRef = useRef(false)
  const backToMainMenuTimerRef = useRef<number | null>(null)
  const [baseMoney] = useState(money)
  const [resultStep, setResultStep] = useState<'exp' | 'money' | 'closing'>('exp')
  const [resultCharacters] = useState(() => buildResultCharacters(party))
  const updatedParty = useMemo(() => toSavedParty(resultCharacters), [resultCharacters])
  const nextMoney = baseMoney + battleMoney

  const closeMoneyResult = useCallback(() => {
    if (backToMainMenuTimerRef.current !== null) {
      return
    }

    setResultStep('closing')
    backToMainMenuTimerRef.current = window.setTimeout(() => {
      onBackToMainMenu()
    }, 600)
  }, [onBackToMainMenu])

  useEffect(() => {
    if (hasSavedRef.current) {
      return
    }

    hasSavedRef.current = true
    onProgressUpdated(updatedParty, nextMoney)
    saveGame({ party: updatedParty, money: nextMoney })
  }, [nextMoney, onProgressUpdated, updatedParty])

  useEffect(() => {
    return () => {
      if (backToMainMenuTimerRef.current !== null) {
        window.clearTimeout(backToMainMenuTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    return InputManager.subscribe(() => {
      if (!InputManager.confirm()) {
        return
      }

      if (resultStep === 'exp') {
        setResultStep('money')
        return
      }

      if (resultStep === 'money') {
        closeMoneyResult()
      }
    })
  }, [closeMoneyResult, resultStep])

  return (
    <section className={resultStep === 'closing' ? 'result-screen is-closing' : 'result-screen'}>
      <div className="result-battle-backdrop" aria-hidden="true">
        <BattleField party={backdropParty} enemies={backdropEnemies} />
      </div>
      <div className="result-mask" />

      {resultStep === 'exp' && (
        <div className="result-panel" aria-label="リザルト画面">
          <div className="result-grid">
            {resultCharacters.map((character) => (
              <article className="result-card" key={character.id}>
                <div
                  className={
                    character.levelUpCount > 0
                      ? 'portrait-placeholder is-level-up'
                      : 'portrait-placeholder'
                  }
                  style={{ animationIterationCount: character.levelUpCount }}
                >
                  {character.levelUpCount > 0 ? 'Lv UP' : 'IMAGE'}
                </div>

                <dl className="result-stats">
                  <div>
                    <dt>力</dt>
                    <dd>{renderStatValue(character, 'power', character.power)}</dd>
                  </div>
                  <div>
                    <dt>直守</dt>
                    <dd>
                      {renderStatValue(
                        character,
                        'directDefense',
                        character.directDefense,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>技</dt>
                    <dd>
                      {renderStatValue(character, 'technique', character.technique)}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <span className="heart-mark" aria-label="HP">
                        ♥
                      </span>
                    </dt>
                    <dd>{renderStatValue(character, 'hp', character.hp)}</dd>
                  </div>
                </dl>

                <div className="result-character-info">
                  <h2>{character.name}</h2>
                  <p>
                    <span>Lv.</span>
                    <strong>{character.level}</strong>
                    <span>Exp</span>
                    <strong>{character.exp}</strong>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {resultStep === 'closing' && <div className="result-fade-overlay" aria-hidden="true" />}

      {resultStep === 'money' && (
        <button className="result-money-window battle-window" type="button" onClick={closeMoneyResult}>
          <span>{battleMoney}ルクを</span>
          <span>手に入れた</span>
          <span>現在の所持金は</span>
          <span>{nextMoney}ルクです</span>
        </button>
      )}
    </section>
  )
}
