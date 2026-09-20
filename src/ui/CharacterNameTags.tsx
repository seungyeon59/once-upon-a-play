import { useRef, useState, type PointerEvent } from 'react'

import type { Character, ScenePlacement } from '../state/types.ts'

type Drag = { id: string; pointerId: number; startX: number; startY: number; x: number; y: number }

export function CharacterNameTags({ cast, characters, playerRole, onMove }: { cast: ScenePlacement[]; characters: Character[]; playerRole: string; onMove: (id: string, x: number, y: number) => void }) {
  const layerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const [preview, setPreview] = useState<{ id: string; x: number; y: number } | null>(null)

  function move(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    const bounds = layerRef.current?.getBoundingClientRect()
    if (!drag || !bounds || drag.pointerId !== event.pointerId) return
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4 && !preview) return
    const x = Math.max(0.04, Math.min(0.96, drag.x + (event.clientX - drag.startX) / bounds.width))
    const y = Math.max(0.12, Math.min(0.92, drag.y + (event.clientY - drag.startY) / bounds.height))
    setPreview({ id: drag.id, x, y })
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (preview?.id === drag.id) onMove(drag.id, preview.x, preview.y)
    dragRef.current = null
    setPreview(null)
  }

  return <div className="character-name-tags" ref={layerRef}>
    {cast.map((placement) => {
      const character = characters.find((item) => item.id === placement.characterId)
      if (!character) return null
      const position = preview?.id === character.id ? preview : placement
      const label = character.id === playerRole ? (playerRole === 'visitor' ? 'Me' : `Me: ${character.name}`) : character.name
      return <button key={character.id} type="button" className="character-name-tag" style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }} aria-label={`${label}. Drag to move character.`} title={`Drag to move ${character.name}`} onPointerDown={(event) => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { id: character.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: placement.x, y: placement.y } }} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>{label}</button>
    })}
  </div>
}
