import { useEffect, useRef, useState, type PointerEvent } from 'react'

import { shopItem } from '../content/shopItems.ts'

type Placement = { id: string; x: number; y: number; size?: number }

export function MapDecorations({ items, onMove, onResize, onRemove }: { items: Placement[]; onMove: (index: number, x: number, y: number) => void; onResize: (index: number, size: number) => void; onRemove: (index: number) => void }) {
  const layerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ index: number; pointerId: number } | null>(null)
  const previewRef = useRef<{ index: number; x: number; y: number } | null>(null)
  const [preview, setPreview] = useState<typeof previewRef.current>(null)
  const resizeRef = useRef<{ index: number; pointerId: number; x: number; y: number; size: number } | null>(null)
  const sizeRef = useRef<{ index: number; size: number } | null>(null)
  const [previewSize, setPreviewSize] = useState<typeof sizeRef.current>(null)
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    if (selected === null) return
    function dismiss(event: globalThis.PointerEvent) {
      if (!(event.target instanceof Element) || !event.target.closest('.placed-decoration')) setSelected(null)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [selected])

  useEffect(() => { if (selected !== null && selected >= items.length) setSelected(null) }, [items.length, selected])

  function move(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const bounds = layerRef.current?.getBoundingClientRect()
    if (!drag || !bounds || drag.pointerId !== event.pointerId) return
    const x = Math.max(0.05, Math.min(0.95, (event.clientX - bounds.left) / bounds.width))
    const y = Math.max(0.12, Math.min(0.92, (event.clientY - bounds.top) / bounds.height))
    previewRef.current = { index: drag.index, x, y }
    setPreview(previewRef.current)
  }

  function finish(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (previewRef.current?.index === drag.index) onMove(drag.index, previewRef.current.x, previewRef.current.y)
    dragRef.current = null
    previewRef.current = null
    setPreview(null)
  }

  function resizeMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = resizeRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const delta = ((event.clientX - drag.x) + (event.clientY - drag.y)) / 144
    const size = Math.round(Math.max(0.5, Math.min(2.5, drag.size + delta)) * 100) / 100
    sizeRef.current = { index: drag.index, size }
    setPreviewSize(sizeRef.current)
  }

  function resizeFinish(event: PointerEvent<HTMLButtonElement>) {
    const drag = resizeRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (sizeRef.current?.index === drag.index) onResize(drag.index, sizeRef.current.size)
    resizeRef.current = null
    sizeRef.current = null
    setPreviewSize(null)
  }

  return <div className="placed-decorations" ref={layerRef}>
    {items.map((placement, index) => {
      const item = shopItem(placement.id)
      if (!item) return null
      const position = preview?.index === index ? preview : placement
      const size = previewSize?.index === index ? previewSize.size : placement.size ?? 1
      return <div key={`${placement.id}-${index}`} className={`placed-decoration${item.animated ? ' placed-decoration--animated' : ''}${selected === index ? ' placed-decoration--selected' : ''}`} style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%`, width: `${72 * size}px`, height: `${72 * size}px`, fontSize: `${56 * size}px` }} onPointerDown={(event) => { if (event.target !== event.currentTarget && (event.target as Element).closest('button')) return; setSelected(index); event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { index, pointerId: event.pointerId } }} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onFocus={() => setSelected(index)} onKeyDown={(event) => { if (event.key === 'Escape') setSelected(null) }} role="group" tabIndex={0} aria-label={`${item.name} decoration. Select to resize.`}>
        <span aria-hidden="true">{item.symbol}</span>{selected === index && <><button type="button" className="placed-decoration__remove" onClick={() => { onRemove(index); setSelected(null) }} aria-label={`Put away ${item.name}`}>×</button><button type="button" className="placed-decoration__resize" aria-label={`Resize ${item.name}`} title="Drag to resize" onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); resizeRef.current = { index, pointerId: event.pointerId, x: event.clientX, y: event.clientY, size } }} onPointerMove={resizeMove} onPointerUp={resizeFinish} onPointerCancel={resizeFinish} /></>}
      </div>
    })}
  </div>
}
