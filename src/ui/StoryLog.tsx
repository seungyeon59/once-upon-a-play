import type { StoryEntry } from '../state/types.ts'

interface StoryLogProps {
  log: StoryEntry[]
  onClose: () => void
}

/** The running story so far — the same array Phase 4's storybook export will read. */
export function StoryLog({ log, onClose }: StoryLogProps) {
  return (
    <aside className="log">
      <header className="log__head">
        <h2>Your story so far</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close story log">
          ✕
        </button>
      </header>
      <div className="log__body">
        {log.map((item) => (
          <p key={item.id} className={`log__entry log__entry--${item.kind}`}>
            {item.speaker && <strong>{item.speaker}: </strong>}
            {item.text}
          </p>
        ))}
      </div>
    </aside>
  )
}
