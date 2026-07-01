import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getStatsSnapshot,
  getStatsWithGains,
} from '../../battle/StatCalculator'
import { InputManager } from '../../input/InputManager'
import type { BattleRewards } from '../../types/battle'
import type { Character } from '../../types/character'
import type { Stats } from '../../types/stats'
import {
  toFullWidthNumber,
  toFullWidthPaddedNumber,
  toFullWidthSignedNumber,
} from '../../utils/numberFormat'

type ResultOverlayProps = {
  party: Character[]
  rewards: BattleRewards
  money: number
  onComplete: (party: Character[], money: number) => void
}

type LevelUpGains = {
  hp: number
  power: number
  directDefense: number
  technique: number
  speed: number
}

type ResultCharacter = Character & {
  initialExp: number
  initialHp: number
  initialStats: Stats
  levelUpCount: number
  gains?: LevelUpGains
}

type ResultCharacterDisplay = {
  characterId: number
  level: number
  exp: number
  revealedLevelUpCount: number
  remainingExpGain: number
}

const EXP_PER_LEVEL = 1000
const EXP_COUNT_STEP = 24
const EXP_COUNT_INTERVAL_MS = 18
const RESULT_CLOSE_DELAY_MS = 1000
const isMouseAdvanceEnabled = import.meta.env.DEV

function buildResultCharacters(party: Character[], expReward: number): ResultCharacter[] {
  return party.map((character) => {
    const earnedExp = character.currentHp > 0 ? expReward : 0
    const totalExp = character.exp + earnedExp
    const levelUpCount = Math.floor(totalExp / EXP_PER_LEVEL)
    const nextExp = totalExp % EXP_PER_LEVEL
    const initialStats = getStatsSnapshot(character)
    const gains =
      levelUpCount > 0
        ? {
          hp: 8 * levelUpCount,
          power: 2 * levelUpCount,
          directDefense: 2 * levelUpCount,
          technique: 2 * levelUpCount,
          speed: 2 * levelUpCount,
        }
        : undefined

    return {
      ...character,
      level: character.level + levelUpCount,
      exp: nextExp,
      currentHp: gains ? character.currentHp + gains.hp : character.currentHp,
      baseStats: gains
        ? getStatsWithGains(character, {
          maxHp: gains.hp,
          power: gains.power,
          directDefense: gains.directDefense,
          technique: gains.technique,
          speed: gains.speed,
        })
        : initialStats,
      initialExp: character.exp,
      initialHp: character.currentHp,
      initialStats,
      levelUpCount,
      gains,
    }
  })
}

function buildInitialDisplays(party: Character[], expReward: number): ResultCharacterDisplay[] {
  return party.map((character) => ({
    characterId: character.id,
    level: character.level,
    exp: character.exp,
    revealedLevelUpCount: 0,
    remainingExpGain: character.currentHp > 0 ? expReward : 0,
  }))
}

function buildFinalDisplays(resultCharacters: ResultCharacter[]): ResultCharacterDisplay[] {
  return resultCharacters.map((character) => ({
    characterId: character.id,
    level: character.level,
    exp: character.exp,
    revealedLevelUpCount: character.levelUpCount,
    remainingExpGain: 0,
  }))
}

function toSavedParty(resultCharacters: ResultCharacter[]): Character[] {
  return resultCharacters.map((character) => ({
    id: character.id,
    name: character.name,
    level: character.level,
    exp: character.exp,
    currentHp: character.currentHp,
    baseStats: getStatsSnapshot(character),
    battleTraits: { ...character.battleTraits },
    activeEffects: character.activeEffects.map((effect) => ({ ...effect })),
    range: character.range,
    position: character.position,
    battleSprite: character.battleSprite
      ? {
        ...character.battleSprite,
        motions: { ...character.battleSprite.motions },
      }
      : undefined,
  }))
}

function advanceDisplay(display: ResultCharacterDisplay): ResultCharacterDisplay {
  if (display.remainingExpGain <= 0) {
    return display
  }

  const expToNextLevel = EXP_PER_LEVEL - display.exp
  const expGainCandidate = Math.min(EXP_COUNT_STEP, display.remainingExpGain, expToNextLevel)
  const expGain = expToNextLevel > 1 && expGainCandidate === expToNextLevel
    ? expToNextLevel - 1
    : expGainCandidate
  const nextRemainingExpGain = display.remainingExpGain - expGain
  const nextExp = display.exp + expGain

  if (nextExp >= EXP_PER_LEVEL) {
    return {
      ...display,
      level: display.level + 1,
      exp: 0,
      revealedLevelUpCount: display.revealedLevelUpCount + 1,
      remainingExpGain: nextRemainingExpGain,
    }
  }

  return {
    ...display,
    exp: nextExp,
    remainingExpGain: nextRemainingExpGain,
  }
}

function renderStatValue(
  display: ResultCharacterDisplay,
  key: keyof LevelUpGains,
  value: number,
  showFinalValue: boolean,
) {
  if (!showFinalValue) {
    if (display.revealedLevelUpCount === 0) {
      return 'ーーー'
    }

    const gainPerLevel = key === 'hp' ? 8 : 2
    return toFullWidthSignedNumber(gainPerLevel * display.revealedLevelUpCount)
  }

  return toFullWidthNumber(value)
}

export function ResultOverlay({ party, rewards, money, onComplete }: ResultOverlayProps) {
  const closeTimerRef = useRef<number | null>(null)
  const expTimerRef = useRef<number | null>(null)
  const [resultStep, setResultStep] = useState<'exp' | 'stats' | 'money' | 'closing'>('exp')
  const [resultCharacters] = useState(() => buildResultCharacters(party, rewards.exp))
  const [characterDisplays, setCharacterDisplays] = useState(() =>
    buildInitialDisplays(party, rewards.exp),
  )
  const updatedParty = useMemo(() => toSavedParty(resultCharacters), [resultCharacters])
  const nextMoney = money + rewards.money
  const isExpAnimationComplete = characterDisplays.every((display) => display.remainingExpGain <= 0)
  const canClickAdvance = isMouseAdvanceEnabled && resultStep !== 'closing'
  const completeExpAnimation = useCallback(() => {
    setCharacterDisplays(buildFinalDisplays(resultCharacters))
  }, [resultCharacters])

  const closeMoneyResult = useCallback(() => {
    if (closeTimerRef.current !== null) {
      return
    }

    setResultStep('closing')
    closeTimerRef.current = window.setTimeout(() => {
      onComplete(updatedParty, nextMoney)
    }, RESULT_CLOSE_DELAY_MS)
  }, [nextMoney, onComplete, updatedParty])

  const advanceResult = useCallback(() => {
    if (resultStep === 'exp') {
      if (!isExpAnimationComplete) {
        completeExpAnimation()
        return
      }

      setResultStep('stats')
      return
    }

    if (resultStep === 'stats') {
      setResultStep('money')
      return
    }

    if (resultStep === 'money') {
      closeMoneyResult()
    }
  }, [closeMoneyResult, completeExpAnimation, isExpAnimationComplete, resultStep])

  useEffect(() => {
    if (resultStep !== 'exp' || isExpAnimationComplete) {
      return
    }

    expTimerRef.current = window.setInterval(() => {
      setCharacterDisplays((currentDisplays) => currentDisplays.map((display) => advanceDisplay(display)))
    }, EXP_COUNT_INTERVAL_MS)

    return () => {
      if (expTimerRef.current !== null) {
        window.clearInterval(expTimerRef.current)
      }
    }
  }, [isExpAnimationComplete, resultStep])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
      if (expTimerRef.current !== null) {
        window.clearInterval(expTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    return InputManager.subscribe(() => {
      if (!InputManager.confirm()) {
        return
      }

      advanceResult()
    })
  }, [advanceResult])

  return (
    <div
      className={resultStep === 'closing' ? 'result-overlay is-closing' : 'result-overlay'}
      onClick={canClickAdvance ? advanceResult : undefined}
      role={canClickAdvance ? 'button' : undefined}
      tabIndex={canClickAdvance ? 0 : undefined}
    >
      <div className="result-mask" />

      {(resultStep === 'exp' || resultStep === 'stats') && (
        <div className="result-panel" aria-label="リザルト画面">
          <div className="result-grid">
            {resultCharacters.map((character) => {
              const display = characterDisplays.find(
                (characterDisplay) => characterDisplay.characterId === character.id,
              ) ?? {
                characterId: character.id,
                level: character.level,
                exp: character.exp,
                revealedLevelUpCount: character.levelUpCount,
                remainingExpGain: 0,
              }

              const showFinalValue = resultStep === 'stats'

              return (
                <article className="result-card" key={character.id}>
                  <div
                    className={
                      display.revealedLevelUpCount > 0
                        ? 'portrait-placeholder is-level-up'
                        : 'portrait-placeholder'
                    }
                    key={character.id + '-' + display.level}
                  >
                    {display.revealedLevelUpCount > 0 ? 'Lv UP' : 'IMAGE'}
                  </div>

                  <dl className="result-stats">
                    <div>
                      <dt>力</dt>
                      <dd>
                        {renderStatValue(
                          display,
                          'power',
                          showFinalValue ? character.baseStats.power : character.initialStats.power,
                          showFinalValue,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>直守</dt>
                      <dd>
                        {renderStatValue(
                          display,
                          'directDefense',
                          showFinalValue
                            ? character.baseStats.directDefense
                            : character.initialStats.directDefense,
                          showFinalValue,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>技</dt>
                      <dd>
                        {renderStatValue(
                          display,
                          'technique',
                          showFinalValue
                            ? character.baseStats.technique
                            : character.initialStats.technique,
                          showFinalValue,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>速</dt>
                      <dd>
                        {renderStatValue(
                          display,
                          'speed',
                          showFinalValue ? character.baseStats.speed : character.initialStats.speed,
                          showFinalValue,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <span className="heart-mark" aria-label="HP">
                          ♥
                        </span>
                      </dt>
                      <dd>
                        {renderStatValue(
                          display,
                          'hp',
                          showFinalValue ? character.currentHp : character.initialHp,
                          showFinalValue,
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="result-character-info">
                    <h2>{character.name}</h2>
                    <p>
                      <span>Lv.</span>
                      <strong>{toFullWidthPaddedNumber(display.level, 2)}</strong>
                      <span>Exp.</span>
                      <strong>{toFullWidthNumber(display.exp)}</strong>
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}

      {resultStep === 'closing' && <div className="result-fade-overlay" aria-hidden="true" />}

      {resultStep === 'money' && (
        <div className="result-money-window battle-window">
          <span>{toFullWidthNumber(rewards.money)}ルクを</span>
          <span>手に入れた</span>
          <span>現在の所持金は</span>
          <span>{toFullWidthNumber(nextMoney)}ルクです</span>
        </div>
      )}
    </div>
  )
}
