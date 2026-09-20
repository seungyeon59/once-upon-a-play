import { useEffect, useState } from 'react'

import type { Character } from '../state/types.ts'

type Card = { id: number; symbol: string; label: string }

const THEMES: Record<string, [string, string][]> = {
  red: [['🧺', 'basket'], ['🧁', 'muffin'], ['🌼', 'flower'], ['🏡', 'cottage']],
  wolf: [['🐾', 'paw print'], ['🌲', 'pine tree'], ['🍄', 'mushroom'], ['🌙', 'moon']],
  grandma: [['🌿', 'herb'], ['🫖', 'teapot'], ['🌻', 'sunflower'], ['📖', 'book']],
  moss: [['🍃', 'leaf'], ['🪵', 'log'], ['🧭', 'compass'], ['🌱', 'sprout']],
  bramble: [['🦊', 'fox'], ['🍂', 'autumn leaf'], ['🫐', 'berries'], ['🌸', 'blossom']],
}
const DEFAULT_THEME: [string, string][] = [['⭐', 'star'], ['🌈', 'rainbow'], ['🍀', 'clover'], ['🦋', 'butterfly']]

function makeCards(characterId: string): Card[] {
  const symbols = THEMES[characterId] ?? DEFAULT_THEME
  const cards = symbols.flatMap(([symbol, label], id) => [
    { id: id * 2, symbol, label },
    { id: id * 2 + 1, symbol, label },
  ])
  for (let index = cards.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[cards[index], cards[other]] = [cards[other], cards[index]]
  }
  return cards
}

export function MemoryGame({ character, onClose, onWin }: { character: Character; onClose: () => void; onWin: (coins: number) => void }) {
  const [cards, setCards] = useState(() => makeCards(character.id))
  const [picked, setPicked] = useState<number[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [moves, setMoves] = useState(0)
  const locked = picked.length === 2
  const complete = matched.length === 4
  const reward = Math.max(4, 14 - Math.max(0, moves - 4) * 2)

  useEffect(() => { if (complete) onWin(reward) }, [complete]) // One reward per completed board.

  useEffect(() => {
    if (!locked) return
    const first = cards.find((card) => card.id === picked[0])
    const second = cards.find((card) => card.id === picked[1])
    if (first?.symbol === second?.symbol) {
      setMatched((previous) => [...previous, first!.symbol])
      setPicked([])
      return
    }
    const timer = window.setTimeout(() => setPicked([]), 850)
    return () => window.clearTimeout(timer)
  }, [cards, locked, picked])

  function choose(id: number) {
    if (locked || picked.includes(id) || complete) return
    setPicked((previous) => [...previous, id])
    if (picked.length === 1) setMoves((previous) => previous + 1)
  }

  function restart() {
    setCards(makeCards(character.id))
    setPicked([])
    setMatched([])
    setMoves(0)
  }

  return (
    <section className="memory-game" aria-label={`Matching game with ${character.name}`}>
      <div className="memory-game__head">
        <div><h3>Forest pairs</h3><p>{character.name} has hidden four matching pairs. Turn over two cards at a time!</p></div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Return to conversation">✕</button>
      </div>
      <p className="memory-game__score">{matched.length} of 4 pairs · {moves} turns</p>
      <div className="memory-game__grid">
        {cards.map((card) => {
          const shown = picked.includes(card.id) || matched.includes(card.symbol)
          return <button key={card.id} type="button" className={`memory-game__card${shown ? ' memory-game__card--shown' : ''}`} onClick={() => choose(card.id)} disabled={shown || locked || complete} aria-label={shown ? card.label : 'Hidden card'} aria-pressed={shown}>
            {shown ? card.symbol : '?'}
          </button>
        })}
      </div>
      {complete && <div className="memory-game__finish" role="status"><strong>All pairs found! +{reward} coins</strong><p>{character.name} cheers. You found them in {moves} turns.</p></div>}
      <div className="memory-game__actions">
        <button type="button" className="button" onClick={restart}>Play again</button>
        <button type="button" className="button button--primary" onClick={onClose}>Talk to {character.name}</button>
      </div>
    </section>
  )
}
