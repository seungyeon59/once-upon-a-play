import { useEffect, useRef, useState } from 'react'

import type { Character } from '../state/types.ts'

export type ExtraGameKind = 'odd' | 'trail' | 'catch' | 'riddle'

const TITLES: Record<ExtraGameKind, string> = {
  odd: 'Odd leaf out', trail: 'Stepping stones', catch: 'Firefly chase', riddle: 'Forest riddles',
}
const RIDDLES = [
  { clue: 'I have leaves but I am not a tree. What am I?', answers: ['A book', 'A river', 'A stone'], correct: 0 },
  { clue: 'I follow you in sunshine but vanish in the dark. What am I?', answers: ['A shadow', 'A cloud', 'A path'], correct: 0 },
  { clue: 'I have a face and hands but no arms. What am I?', answers: ['A clock', 'A flower', 'A basket'], correct: 0 },
  { clue: 'I get wetter as I dry. What am I?', answers: ['A towel', 'A candle', 'A leaf'], correct: 0 },
]

function shuffle<T,>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function ExtraGame({ kind, character, onClose, onWin }: { kind: ExtraGameKind; character: Character; onClose: () => void; onWin: (coins: number) => void }) {
  const [round, setRound] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [finished, setFinished] = useState(false)
  const [oddPosition, setOddPosition] = useState(() => Math.floor(Math.random() * 9))
  const [stones] = useState(() => shuffle(Array.from({ length: 10 }, (_, index) => index + 1)))
  const [firefly, setFirefly] = useState(() => Math.floor(Math.random() * 12))
  const [seconds, setSeconds] = useState(15)
  const [hits, setHits] = useState(0)
  const [riddles] = useState(() => shuffle(RIDDLES.map((item) => ({ ...item, answers: shuffle(item.answers.map((answer, index) => ({ answer, correct: index === item.correct }))) }))))
  const paid = useRef(false)
  const reward = kind === 'catch' ? Math.min(18, 2 + hits * 2) : Math.max(3, 16 - mistakes * 2)

  function finish(coins: number) {
    if (paid.current) return
    paid.current = true
    setFinished(true)
    onWin(coins)
  }

  useEffect(() => {
    if (kind !== 'catch' || finished) return
    if (seconds === 0) { finish(reward); return }
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [kind, seconds, finished])

  function chooseOdd(index: number) {
    if (finished) return
    if (index !== oddPosition) { setMistakes((value) => value + 1); return }
    if (round === 4) { finish(Math.max(3, 16 - mistakes * 2)); return }
    setRound((value) => value + 1)
    setOddPosition(Math.floor(Math.random() * 9))
  }

  function chooseStone(value: number) {
    if (finished) return
    if (value !== round + 1) { setMistakes((current) => current + 1); return }
    if (value === 10) { finish(Math.max(3, 16 - mistakes * 2)); return }
    setRound(value)
  }

  function chooseRiddle(correct: boolean) {
    if (finished) return
    if (!correct) { setMistakes((value) => value + 1); return }
    if (round === riddles.length - 1) { finish(Math.max(3, 16 - mistakes * 2)); return }
    setRound((value) => value + 1)
  }

  return <section className="memory-game" aria-label={`${TITLES[kind]} with ${character.name}`}>
    <div className="memory-game__head"><div><h3>{TITLES[kind]}</h3><p>{kind === 'odd' ? 'Find the one symbol that is different.' : kind === 'trail' ? 'Tap the stones in number order.' : kind === 'catch' ? 'Catch as many fireflies as you can in 15 seconds.' : 'Pick the answer to each riddle.'}</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close game">✕</button></div>
    <p className="memory-game__score">{kind === 'catch' ? `${seconds}s left · ${hits} caught` : `${kind === 'trail' ? `${round}/10 stones` : `${round}/${kind === 'odd' ? 5 : 4} rounds`} · ${mistakes} misses`}</p>
    {kind === 'odd' && !finished && <div className="extra-game__grid">{Array.from({ length: 9 }, (_, index) => <button key={`${round}-${index}`} type="button" className="extra-game__tile" onClick={() => chooseOdd(index)} aria-label={index === oddPosition ? 'Different symbol' : 'Symbol'}>{index === oddPosition ? (round % 2 ? '🍂' : '🌼') : (round % 2 ? '🍃' : '🌻')}</button>)}</div>}
    {kind === 'trail' && <div className="extra-game__grid">{stones.map((value) => <button key={value} type="button" className="extra-game__tile" disabled={value <= round || finished} onClick={() => chooseStone(value)} aria-label={`Stone ${value}`}>{value <= round ? '✓' : value}</button>)}</div>}
    {kind === 'catch' && !finished && <div className="extra-game__grid extra-game__grid--catch">{Array.from({ length: 12 }, (_, index) => <button key={index} type="button" className={`extra-game__tile${index === firefly ? ' extra-game__tile--firefly' : ''}`} disabled={index !== firefly} onClick={() => { setHits((value) => value + 1); setFirefly((current) => (current + 1 + Math.floor(Math.random() * 11)) % 12) }} aria-label={index === firefly ? 'Catch firefly' : 'Empty space'}>{index === firefly ? '✨' : ''}</button>)}</div>}
    {kind === 'riddle' && !finished && <><p className="extra-game__riddle">{riddles[round].clue}</p><div className="extra-game__answers">{riddles[round].answers.map(({ answer, correct }) => <button key={answer} type="button" className="button" onClick={() => chooseRiddle(correct)}>{answer}</button>)}</div></>}
    {finished && <div className="memory-game__finish" role="status"><strong>{character.name} cheers! +{reward} coins</strong></div>}
    <div className="memory-game__actions"><button type="button" className="button button--primary" onClick={onClose}>Back to the map</button></div>
  </section>
}
