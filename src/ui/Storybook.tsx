import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { StoryEntry } from '../state/types.ts'
import type { Character, PlayerRole } from '../state/types.ts'
import { makeStoryPages } from './storyPages.ts'
import { renderStoryArt } from './renderStoryArt.ts'

interface Props { title: string; log: StoryEntry[]; onClose: () => void; taleId: string; endingSceneId: string; role: PlayerRole; characters: Character[]; companionIds: string[]; characterPositions: Record<string, Record<string, { x: number; y: number }>> }

export function Storybook({ title, log, onClose, taleId, endingSceneId, role, characters, companionIds, characterPositions }: Props) {
  const pages = useMemo(() => makeStoryPages(log), [log])
  const [art, setArt] = useState<Record<string, string>>({})
  const [artError, setArtError] = useState(false)
  const sceneIds = pages.map((page, index) => page.sceneId ?? (index === pages.length - 1 ? endingSceneId : ['forest-path', 'fork', 'cottage'][Math.min(index, 2)]))
  const ready = [...new Set(sceneIds)].every((id) => art[id])

  useEffect(() => {
    let cancelled = false
    async function prepare() {
      try {
        const images: Record<string, string> = {}
        for (const id of [...new Set(sceneIds)]) {
          images[id] = await renderStoryArt(taleId, id, role, characters, companionIds, characterPositions[id])
          const preview = new Image()
          preview.src = images[id]
          await preview.decode()
        }
        if (!cancelled) setArt(images)
      } catch {
        if (!cancelled) setArtError(true)
      }
    }
    void prepare()
    return () => { cancelled = true }
  // The book is a snapshot of the finished story.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return createPortal(<div className="storybook-overlay" role="dialog" aria-modal="true" aria-label="Your storybook">
    <div className="storybook-controls">
      <button type="button" className="button" onClick={onClose}>Close book</button>
      <button type="button" className="button button--primary" disabled={!ready} onClick={() => window.print()}>{ready ? 'Print or save as PDF' : 'Preparing illustrations…'}</button>
    </div>
    {artError && <p className="storybook__error" role="alert">The illustrations could not be prepared. Close the book and try again.</p>}
    <article className="storybook">
      <header className="storybook__cover"><p>My fairy tale</p><h1>{title}</h1><span>A story you helped create</span></header>
      {pages.map((page, index) => <section className="storybook__page" key={index}>
        <p className="storybook__number">{index + 1} / {pages.length}</p>
        {art[sceneIds[index]] && <img className="storybook__illustration" src={art[sceneIds[index]]} alt={`Illustration for page ${index + 1}`} />}
        {page.narration.split('\n\n').filter(Boolean).map((paragraph, paragraphIndex) => <p className="storybook__narration" key={paragraphIndex}>{paragraph}</p>)}
        {page.moments.map((moment) => <p className="storybook__moment" key={moment.id}>
          {moment.speaker && <strong>{moment.speaker}: </strong>}{moment.text}
        </p>)}
      </section>)}
    </article>
  </div>, document.body)
}
