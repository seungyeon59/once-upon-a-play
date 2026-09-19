import { useState } from 'react'
import type { PlayerRole, Tale } from '../state/types.ts'

interface MapSelectProps {
  tales: Tale[]
  hasSave: boolean
  onStart: (taleId: string, role: PlayerRole) => void
  onResume: () => void
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
        <h1>Taleprints</h1>
        <p>Pick a world. Talk to the people in it. The story is whatever you two decide.</p>
      </header>

      <div className="maps__grid">
        {tales.map((tale) => (
          <button key={tale.id} type="button" className="map-card" onClick={() => setSelectedTale(tale.id)}>
            <span className={`map-card__art map-card__art--${tale.backdrop}`} aria-hidden="true" />
            <span className="map-card__body">
              <strong>{tale.title}</strong>
              <span>{tale.tagline}</span>
            </span>
          </button>
        ))}

        {['Three houses on the hill', 'The deep, deep sea'].map((name) => (
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
            {roles.map((role) => (
              <button key={role.id} type="button" className="role-option" onClick={() => onStart(selectedTale, role.id)}>
                <strong>{role.title}</strong>
                <span>{role.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {hasSave && (
        <button type="button" className="button button--ghost" onClick={onResume}>
          Continue where you left off
        </button>
      )}
    </main>
  )
}
