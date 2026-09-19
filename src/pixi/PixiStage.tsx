import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Rectangle, Sprite, Text, Texture, type FederatedPointerEvent } from 'pixi.js'

import type { Character, ScenePlacement } from '../state/types.ts'
import { bakeCharacter, paintParallaxBackdrop } from './placeholderArt.ts'
import {
  createProceduralState,
  pokeTalk,
  tickProcedural,
  type ProceduralState,
} from './procedural.ts'

interface PixiStageProps {
  backdrop: Parameters<typeof paintParallaxBackdrop>[0]
  cast: ScenePlacement[]
  characters: Character[]
  /** The character currently being talked to, if any. */
  activeCharacterId: string | null
  playerCharacterId: string
  /** Bumped by the caller whenever a new line is spoken, to trigger the talk animation. */
  speakTick: number
  onSelect: (characterId: string) => void
  onMove: (characterId: string, x: number, y: number) => void
}

interface Actor {
  sprite: Sprite
  state: ProceduralState
  ring?: Graphics
  label?: Container
  characterId: string
  suppressTap: boolean
}

interface Drag {
  actor: Actor
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  moved: boolean
  width: number
  height: number
}

export function PixiStage(props: PixiStageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const actorsRef = useRef<Actor[]>([])
  const texturesRef = useRef<Map<string, Texture>>(new Map())
  const dragRef = useRef<Drag | null>(null)
  const panRef = useRef<{ pointerId: number; lastX: number; width: number } | null>(null)
  const cameraRef = useRef({ current: 0, target: 0 })
  const layersRef = useRef<ReturnType<typeof paintParallaxBackdrop> | null>(null)
  const backdropRef = useRef(props.backdrop)
  /** Latest props, read from the ticker and the rebuild effect without re-mounting. */
  const propsRef = useRef(props)
  propsRef.current = props

  // Mount the Pixi application exactly once.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cancelled = false
    const app = new Application()

    void app
      .init({
        background: 0x1d2e28,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })
      .then(() => {
        if (cancelled) {
          app.destroy(true, { children: true })
          return
        }
        host.appendChild(app.canvas)
        appRef.current = app
        app.stage.eventMode = 'static'
        app.stage.on('pointerdown', (event: FederatedPointerEvent) => {
          if (event.target !== app.stage) return
          panRef.current = { pointerId: event.pointerId, lastX: event.global.x, width: app.screen.width }
          app.canvas.setPointerCapture?.(event.pointerId)
        })
        app.stage.on('globalpointermove', (event: FederatedPointerEvent) => {
          const drag = dragRef.current
          if (!drag || drag.pointerId !== event.pointerId) {
            const pan = panRef.current
            if (pan?.pointerId === event.pointerId) {
              cameraRef.current.target = Math.max(-0.15, Math.min(0.15, cameraRef.current.target + (event.global.x - pan.lastX) / pan.width))
              pan.lastX = event.global.x
            }
            return
          }
          if (!drag.moved && Math.hypot(event.global.x - drag.startX, event.global.y - drag.startY) < 6) return
          drag.moved = true
          drag.actor.suppressTap = true
          drag.actor.state.dragging = true
          const { state, sprite, ring, label } = drag.actor
          const halfWidth = Math.min(drag.width * 0.4, sprite.texture.width * state.baseScale * 0.5)
          const spriteHeight = Math.min(drag.height * 0.8, sprite.texture.height * state.baseScale)
          state.baseX = Math.max(halfWidth, Math.min(drag.width - halfWidth, event.global.x - drag.offsetX))
          state.baseY = Math.max(spriteHeight, Math.min(drag.height - 8, event.global.y - drag.offsetY))
          sprite.position.set(state.baseX, state.baseY)
          if (ring) ring.position.set(state.baseX, state.baseY)
          if (label) label.position.set(state.baseX, state.baseY + 14)
        })
        app.stage.on('pointerup', finishPointer)
        app.stage.on('pointerupoutside', finishPointer)

        app.ticker.add((ticker) => {
          const camera = cameraRef.current
          camera.current += (camera.target - camera.current) * Math.min(1, ticker.deltaTime * 0.13)
          const layers = layersRef.current
          if (layers) {
            const width = app.screen.width
            layers.base.x = -layers.margin + camera.current * width * 0.45
            layers.middle.x = -layers.margin + camera.current * width * 0.8
            layers.front.x = -layers.margin + camera.current * width * 1.2
          }
          const active = propsRef.current.activeCharacterId
          for (const actor of actorsRef.current) {
            actor.state.focusTarget = actor.characterId === active ? 1 : 0
            tickProcedural(actor.sprite, actor.state, ticker.deltaTime)
            if (actor.ring) {
              actor.ring.alpha = 0.16 + Math.sin(actor.state.phase * 1.6) * 0.1 + actor.state.hover * 0.3
            }
            if (actor.label) {
              actor.label.alpha = Math.max(actor.state.hover, actor.state.focus)
              actor.label.y = actor.state.baseY + 14
            }
          }
        })

        rebuild()
      })

    return () => {
      cancelled = true
      for (const texture of texturesRef.current.values()) texture.destroy(true)
      texturesRef.current.clear()
      actorsRef.current = []
      dragRef.current = null
      panRef.current = null
      layersRef.current = null
      if (appRef.current) {
        appRef.current.destroy(true, { children: true })
        appRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Tear down the old scene and paint the new one. Cheap enough to redo wholesale. */
  function rebuild(): void {
    const app = appRef.current
    if (!app) return

    const host = hostRef.current
    if (!host) return

    const { backdrop, cast, characters, onSelect } = propsRef.current

    // The DOM box is the single source of truth. Pixi's own `resizeTo` applies
    // on its next tick, which would let us paint the scenery at the previous
    // size and leave bare background around it.
    const { width, height } = host.getBoundingClientRect()
    if (width < 2 || height < 2) return
    app.renderer.resize(width, height)
    app.stage.hitArea = new Rectangle(0, 0, width, height)

    app.stage.removeChildren()
    actorsRef.current = []
    dragRef.current = null

    if (backdropRef.current !== backdrop) {
      backdropRef.current = backdrop
      cameraRef.current = { current: 0, target: 0 }
    }
    const layers = paintParallaxBackdrop(backdrop, width, height)
    layers.base.eventMode = 'none'
    layers.middle.eventMode = 'none'
    layers.front.eventMode = 'none'
    layersRef.current = layers
    app.stage.addChild(layers.base, layers.middle)

    // Painter's algorithm: characters lower on screen stand in front.
    const ordered = [...cast].sort((a, b) => a.y - b.y)

    for (const placement of ordered) {
      const character = characters.find((c) => c.id === placement.characterId)
      if (!character) continue

      let texture = texturesRef.current.get(character.id)
      if (!texture) {
        if (character.imageDataUrl) continue // Loaded asynchronously below.
        texture = bakeCharacter(app.renderer, character.art)
        texturesRef.current.set(character.id, texture)
      }

      const x = width * placement.x
      const y = height * placement.y
      // Keyed to whichever dimension is tighter: scaling on height alone makes
      // the cast balloon on a tall, narrow stage.
      const scale = placement.scale * Math.min(width / 1100, height / 720) *
        (character.imageDataUrl ? character.art.height / texture.height : 1)
      const interactive = character.id !== propsRef.current.playerCharacterId

      let ring: Graphics | undefined
      if (interactive) {
        ring = new Graphics()
        ring.ellipse(0, 0, character.art.height * scale * 0.34, character.art.height * scale * 0.1)
        ring.fill(0xf5e6b8)
        ring.position.set(x, y)
        app.stage.addChild(ring)
      }

      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5, 1)
      sprite.position.set(x, y)
      app.stage.addChild(sprite)

      const state = createProceduralState(scale, x, y, placement.facing)
      const actor: Actor = { sprite, state, ring, characterId: character.id, suppressTap: false }

      sprite.eventMode = 'static'
      sprite.cursor = 'grab'
      sprite.on('pointerdown', (event: FederatedPointerEvent) => {
        event.stopPropagation()
        app.canvas.setPointerCapture?.(event.pointerId)
        actor.suppressTap = false
        dragRef.current = { actor, pointerId: event.pointerId, startX: event.global.x, startY: event.global.y,
          offsetX: event.global.x - state.baseX, offsetY: event.global.y - state.baseY, moved: false, width, height }
        sprite.cursor = 'grabbing'
      })
      sprite.on('pointerup', () => { sprite.cursor = 'grab' })
      sprite.on('pointerupoutside', (event: FederatedPointerEvent) => { sprite.cursor = 'grab'; finishDrag(event) })

      if (interactive) {
        sprite.on('pointerover', () => {
          state.hoverTarget = 1
        })
        sprite.on('pointerout', () => {
          state.hoverTarget = 0
        })
        sprite.on('pointertap', () => {
          if (actor.suppressTap) return
          pokeTalk(state)
          onSelect(character.id)
        })
        actor.label = buildLabel(character.name, x, y)
        app.stage.addChild(actor.label)
      }

      actorsRef.current.push(actor)
    }
    app.stage.addChild(layers.front)
  }

  function finishPointer(event: FederatedPointerEvent): void {
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null
    finishDrag(event)
  }

  function finishDrag(event: FederatedPointerEvent): void {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    drag.actor.state.dragging = false
    if (drag.moved) {
      drag.actor.state.land = 1
      propsRef.current.onMove(drag.actor.characterId, drag.actor.state.baseX / drag.width, drag.actor.state.baseY / drag.height)
    }
  }

  // Repaint when the scene changes, and when the stage is resized.
  useEffect(() => {
    rebuild()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.backdrop, props.cast, props.characters])

  useEffect(() => {
    let cancelled = false
    const images: HTMLImageElement[] = []
    for (const custom of props.characters.filter((character) => character.imageDataUrl && !texturesRef.current.has(character.id))) {
      const image = new Image()
      image.onload = () => {
        if (cancelled) return
        texturesRef.current.set(custom.id, Texture.from(image))
        rebuild()
      }
      image.src = custom.imageDataUrl!
      images.push(image)
    }
    return () => { cancelled = true; images.forEach((image) => { image.onload = null }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.characters])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => rebuild())
    })
    observer.observe(host)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Squash & stretch whoever just spoke.
  useEffect(() => {
    const actor = actorsRef.current.find((a) => a.characterId === props.activeCharacterId)
    if (actor) pokeTalk(actor.state)
  }, [props.speakTick, props.activeCharacterId])

  return <div ref={hostRef} className="stage" />
}

function buildLabel(name: string, x: number, y: number): Container {
  const container = new Container()
  const text = new Text({
    text: name,
    style: { fill: 0x2b2119, fontSize: 15, fontWeight: '700', fontFamily: 'Georgia, serif' },
  })
  text.anchor.set(0.5)

  const pad = 10
  const plate = new Graphics()
  plate.roundRect(-text.width / 2 - pad, -text.height / 2 - 4, text.width + pad * 2, text.height + 8, 9)
  plate.fill(0xf5e6b8)

  container.addChild(plate, text)
  container.position.set(x, y + 14)
  container.alpha = 0
  return container
}
