import type { Character } from '../state/types.ts'

interface Props {
  characters: Character[]
  onChoose: (id: string) => void
  onClose: () => void
}

const color = (value: number) => `#${value.toString(16).padStart(6, '0')}`

export function CharacterCodex({ characters, onChoose, onClose }: Props) {
  return (
    <section className="codex" aria-label="Ready-made characters">
      <header className="codex__head">
        <div>
          <h2>Choose a ready-made character</h2>
          <p>They join the map right away and can talk with you.</p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close character codex">✕</button>
      </header>
      <div className="codex__list">
        {characters.map((character) => (
          <article className="codex__card" key={character.id}>
            <div className="codex__portrait" aria-hidden="true">
              <svg viewBox="0 0 100 100" role="img">
                {character.art.silhouette === 'wolf' ? (
                  <>
                    <path d="M18 66 5 38 30 53 70 50 82 61 77 78 24 78Z" fill={color(character.art.body)} />
                    <path d="M58 43 62 19 74 36 84 22 87 49Z" fill={color(character.art.accent)} />
                    <ellipse cx="73" cy="52" rx="17" ry="13" fill={color(character.art.body)} />
                    <ellipse cx="85" cy="55" rx="10" ry="6" fill={color(character.art.skin)} />
                    <circle cx="76" cy="48" r="2" fill="#2b2119" />
                  </>
                ) : (
                  <>
                    <path d="M32 86 38 48 62 48 69 86Z" fill={color(character.art.body)} />
                    <circle cx="50" cy="34" r="18" fill={color(character.art.body)} />
                    <circle cx="55" cy="38" r="13" fill={color(character.art.skin)} />
                    <circle cx="61" cy="36" r="2" fill="#2b2119" />
                    <rect x="64" y="60" width="15" height="13" rx="3" fill={color(character.art.accent)} />
                  </>
                )}
              </svg>
            </div>
            <div className="codex__details">
              <h3>{character.name}</h3>
              <p>{character.title}</p>
              <div className="codex__traits">{character.traits.map((trait) => <span className="trait" key={trait}>{trait}</span>)}</div>
            </div>
            <button type="button" className="button button--primary" onClick={() => onChoose(character.id)}>
              Invite
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
