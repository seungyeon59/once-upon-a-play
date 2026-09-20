import { useState } from 'react'
import type { Character, PlayerRole, Scene, StoryEntry } from '../state/types.ts'
import { Storybook } from './Storybook.tsx'

interface EndingCardProps {
  title?: string
  scene: Scene
  narration: string
  log: StoryEntry[]
  onRestart: () => void
  onMap: () => void
  onClose: () => void
  taleId: string
  role: PlayerRole
  characters: Character[]
  companionIds: string[]
  characterPositions: Record<string, Record<string, { x: number; y: number }>>
}

export function EndingCard({ scene, title, narration, log, onRestart, onMap, onClose, taleId, role, characters, companionIds, characterPositions }: EndingCardProps) {
  const ending = scene.ending
  const [bookOpen, setBookOpen] = useState(false)

  return (
    <div className="ending">
      <div className="ending__card">
        <button type="button" className="button button--small ending__close" onClick={onClose} aria-label="Close ending">Back to final scene</button>
        <p className="ending__eyebrow">The end — for now</p>
        <h2>{title ?? ending?.title ?? scene.title}</h2>
        {ending?.blurb && <p className="ending__blurb">{ending.blurb}</p>}
        <button type="button" className="button button--primary ending__save" onClick={() => setBookOpen(true)}>
          Open storybook / Save as PDF
        </button>

        {narration.split('\n\n').map((paragraph, index) => (
          <p key={index} className="ending__text">
            {paragraph}
          </p>
        ))}

        <details className="ending__full">
          <summary>Read the whole story ({log.length} moments)</summary>
          <div className="ending__scroll">
            {log.map((item) => (
              <p key={item.id} className={`log__entry log__entry--${item.kind}`}>
                {item.speaker && <strong>{item.speaker}: </strong>}
                {item.text}
              </p>
            ))}
          </div>
        </details>

        <div className="ending__actions">
          <button type="button" className="button button--primary" onClick={onRestart}>
            Tell it a different way
          </button>
          <button type="button" className="button" onClick={onMap}>
            Back to the maps
          </button>
        </div>
      </div>
      {bookOpen && <Storybook title={title ?? ending?.title ?? scene.title} log={log} onClose={() => setBookOpen(false)} taleId={taleId} endingSceneId={scene.id} role={role} characters={characters} companionIds={companionIds} characterPositions={characterPositions} />}
    </div>
  )
}
