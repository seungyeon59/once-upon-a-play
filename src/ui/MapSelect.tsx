import { useState, type CSSProperties } from 'react'
import type { PlayerRole, Tale } from '../state/types.ts'

interface MapSelectProps {
  tales: Tale[]
  hasSave: boolean
  onStart: (taleId: string, role: PlayerRole) => void
  onResume: () => void
}

/**
 * Crayon colours in rainbow order, for anything carrying text. Every one clears
 * 3.5:1 against both the yellow paper and the card, so no card is harder to
 * read than its neighbour. Pale yellow is missing on purpose: it vanishes.
 */
const CRAYONS = ['#d8432e', '#b85c12', '#2a74b8', '#2f8341', '#8b4fc0', '#cc3a77']

/**
 * The drawn rainbow keeps its bright yellow band. It is decoration, and the
 * band is boxed in by orange and green rather than sitting on the paper.
 */
const BANDS = ['#e8503a', '#f0922e', '#efc02c', '#3f9e52', '#3d8fd1', '#8b4fc0']

const TITLE = 'Once upon a play'

/** Six passes of a crayon, none of them quite level. */
function CrayonRainbow() {
  return (
    <svg className="maps__rainbow" viewBox="0 0 220 112" aria-hidden="true">
      {BANDS.map((color, band) => {
        const lift = [3, -2, 2, -3, 1, -1][band]
        const wobble = [-4, 3, -2, 4, -3, 2][band]
        return (
          <path
            key={color}
            d={`M${10 + band * 13} ${105 + lift} Q${110 + wobble} ${-89 + band * 28} ${210 - band * 13} ${105 - lift}`}
            stroke={color}
            strokeWidth={11 - band * 0.6}
            strokeLinecap="round"
            fill="none"
          />
        )
      })}
    </svg>
  )
}

/**
 * Phase 1 ships one map. The locked slots are there so the shape of the screen
 * does not change when Phase 2 adds more.
 */
export function MapSelect({ tales, hasSave, onStart, onResume }: MapSelectProps) {
  const [selectedTale, setSelectedTale] = useState<string | null>(null)
  const roles: { id: PlayerRole; title: string; description: string }[] = [
    { id: 'red', title: 'Be Red', description: 'Carry the basket and lead the story.' },
    { id: 'wolf', title: 'Be Gray the wolf', description: 'See the forest from Gray’s point of view.' },
    { id: 'visitor', title: 'Be a visitor', description: 'Meet and talk to both Red and Gray.' },
  ]
  return (
    <main className="maps">
      <header className="maps__head">
        <CrayonRainbow />
        {/* The letters are decoration; the heading is announced from aria-label. */}
        <h1 aria-label={TITLE}>
          {/* Spaces stay plain text, so the title can still wrap on a phone. */}
          {[...TITLE].map((letter, index) => letter === ' ' ? ' ' : (
            <span key={index} aria-hidden="true" style={{ color: CRAYONS[index % CRAYONS.length] }}>
              {letter}
            </span>
          ))}
        </h1>
        <p>Pick a world. Talk to the people in it. The story is whatever you two decide.</p>
      </header>

      <div className="maps__grid">
        {tales.map((tale, index) => (
          <button
            key={tale.id}
            type="button"
            className={`map-card${selectedTale === tale.id ? ' map-card--picked' : ''}`}
            style={{ '--crayon': CRAYONS[index % CRAYONS.length] } as CSSProperties}
            onClick={() => setSelectedTale(tale.id)}
            aria-pressed={selectedTale === tale.id}
          >
            <span className={`map-card__art map-card__art--${tale.backdrop}`} aria-hidden="true" />
            <span className="map-card__body">
              <strong>{tale.title}</strong>
              <span>{tale.tagline}</span>
            </span>
          </button>
        ))}

        {['Snow White', 'Cinderella'].map((name) => (
          <div key={name} className="map-card map-card--locked">
            <span className="map-card__art map-card__art--locked" aria-hidden="true" />
            <span className="map-card__body">
              <strong>{name}</strong>
              <span>Coming soon</span>
            </span>
          </div>
        ))}
      </div>

      {selectedTale && (
        <section className="role-picker" aria-label="Choose your role">
          <h2>Who will you be?</h2>
          <div className="role-picker__options">
            {roles.map((role, index) => (
              <button
                key={role.id}
                type="button"
                className="role-option"
                style={{ '--crayon': CRAYONS[(index + 2) % CRAYONS.length] } as CSSProperties}
                onClick={() => onStart(selectedTale, role.id)}
              >
                <strong>{role.title}</strong>
                <span>{role.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {hasSave && (
        <button type="button" className="button maps__resume" onClick={onResume}>
          Continue where you left off
        </button>
      )}
    </main>
  )
}
