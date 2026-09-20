import { useEffect, useState } from 'react'

import type { Character } from '../state/types.ts'

const SYMBOLS = ['🌙', '⭐', '🍃', '🌼']
const ROUNDS = 4
const FIRST_LENGTH = 3
const FLASH_MS = 950
const PAUSE_MS = 380

export function SequenceGame({ character, onClose, onWin }: { character: Character; onClose: () => void; onWin: (coins: number) => void }) {
  const [sequence, setSequence] = useState(() => Array.from({ length: FIRST_LENGTH }, () => Math.floor(Math.random() * 4)))
  const [showing, setShowing] = useState(true)
  const [visibleSymbol, setVisibleSymbol] = useState<number | null>(null)
  const [step, setStep] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [finished, setFinished] = useState(false)
  const reward = Math.max(5, 16 - mistakes * 2)

  useEffect(() => {
    if (!showing || finished) return
    const timers: number[] = []
    sequence.forEach((symbol, index) => {
      const start = 500 + index * (FLASH_MS + PAUSE_MS)
      timers.push(window.setTimeout(() => setVisibleSymbol(symbol), start))
      timers.push(window.setTimeout(() => setVisibleSymbol(null), start + FLASH_MS))
    })
    timers.push(window.setTimeout(() => setShowing(false), 500 + sequence.length * (FLASH_MS + PAUSE_MS)))
    return () => timers.forEach(window.clearTimeout)
  }, [showing, sequence, finished])

  function choose(index: number) {
    if (showing || finished) return
    if (sequence[step] !== index) {
      setMistakes((value) => value + 1)
      setStep(0)
      setShowing(true)
      return
    }
    if (step + 1 < sequence.length) { setStep(step + 1); return }
    if (sequence.length === FIRST_LENGTH + ROUNDS - 1) {
      setFinished(true)
      onWin(reward)
      return
    }
    setSequence((current) => [...current, Math.floor(Math.random() * 4)])
    setStep(0)
    setShowing(true)
  }

  return <section className="memory-game" aria-label={`Sequence game with ${character.name}`}>
    <div className="memory-game__head"><div><h3>Forest echo</h3><p>Watch the symbols appear one at a time, then tap them in order.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close game">✕</button></div>
    <p className="memory-game__score">Round {sequence.length - FIRST_LENGTH + 1} of {ROUNDS} · {mistakes} mistakes</p>
    <div className="sequence-game__clue" role="status">{finished ? 'Wonderful memory!' : showing ? (visibleSymbol === null ? 'Watch closely…' : SYMBOLS[visibleSymbol]) : `Your turn: ${step + 1} of ${sequence.length}`}</div>
    <div className="memory-game__grid">{SYMBOLS.map((symbol, index) => <button key={symbol} type="button" className="memory-game__card memory-game__card--shown" disabled={showing || finished} onClick={() => choose(index)} aria-label={symbol}>{symbol}</button>)}</div>
    {finished && <div className="memory-game__finish" role="status"><strong>{character.name} cheers! +{reward} coins</strong></div>}
    <div className="memory-game__actions"><button type="button" className="button button--primary" onClick={onClose}>Back to the map</button></div>
  </section>
}
