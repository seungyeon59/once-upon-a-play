import { useEffect, useRef } from 'react'
import { Application, Graphics, Rectangle, Sprite, Text, Texture, type FederatedPointerEvent } from 'pixi.js'

import type { Character, SceneAction, ScenePlacement } from '../state/types.ts'
import { bakeCharacter, paintParallaxBackdrop } from './placeholderArt.ts'
import { accessoryBadge } from './accessory.ts'
import { type AccessoryFit } from '../content/shopItems.ts'
import {
  createProceduralState,
  pokeTalk,
  tickProcedural,
  type ProceduralState,
} from './procedural.ts'

interface PixiStageProps {
  sceneKey: string
  backdrop: Parameters<typeof paintParallaxBackdrop>[0]
  generatedBackdrop?: boolean
  actions: SceneAction[]
  cast: ScenePlacement[]
  characters: Character[]
  /** The character currently being talked to, if any. */
  activeCharacterId: string | null
  playerCharacterId: string
  /**
   * Badge the player's own character on the map. The Visitor avatar is a plain
   * traveler standing next to another child, so without this the child cannot
   * tell which sprite is theirs. Red and Gray are one of a kind already.
   */
  markPlayer?: boolean
  /**
   * The character to draw in the hand-drawn crayon style. This is the role the
   * child picked at the start, not whoever a panel happens to be previewing, so
   * the store preview and the map always agree.
   */
  handDrawnCharacterId?: string
  /** Bumped by the caller whenever a new line is spoken, to trigger the talk animation. */
  speakTick: number
  onSelect: (characterId: string) => void
  onMove: (characterId: string, x: number, y: number) => void
  equippedItems?: Record<string, string>
  accessoryFits?: Record<string, AccessoryFit>
  shopPhase?: 'closed' | 'entering' | 'open' | 'leaving'
}

interface Actor {
  sprite: Sprite
  state: ProceduralState
  ring?: Graphics
  accessory?: Text
  /** The "this is you" arrow, present only on the badged player character. */
  marker?: Graphics
  characterId: string
  suppressTap: boolean
  travel?: { fromX: number; fromY: number; toX: number; toY: number; start: number; duration: number }
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
  const sceneKeyRef = useRef(props.sceneKey)
  const transitionTimersRef = useRef<number[]>([])
  const actionTimersRef = useRef<number[]>([])
  /** Latest props, read from the ticker and the rebuild effect without re-mounting. */
  const propsRef = useRef(props)
  const previousShopPhase = useRef(props.shopPhase ?? 'closed')
  propsRef.current = props

  function updateAccessories(): void {
    for (const actor of actorsRef.current) {
      if (actor.accessory) { actor.sprite.removeChild(actor.accessory); actor.accessory.destroy(); actor.accessory = undefined }
      const character = propsRef.current.characters.find((candidate) => candidate.id === actor.characterId)
      if (!character) continue
      const badge = accessoryBadge(character, propsRef.current.equippedItems?.[actor.characterId], propsRef.current.accessoryFits, actor.sprite.texture.height)
      if (!badge) continue
      actor.sprite.addChild(badge)
      actor.accessory = badge
    }
  }

  // Mount the Pixi application exactly once.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cancelled = false
    const app = new Application()

    void app
      .init({
        backgroundAlpha: 0,
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
          actionTimersRef.current.forEach(window.clearTimeout)
          actionTimersRef.current = []
          actorsRef.current.forEach((item) => { item.travel = undefined; item.state.walking = 0 })
          drag.actor.suppressTap = true
          drag.actor.state.dragging = true
          const { state, sprite, ring } = drag.actor
          const halfWidth = Math.min(drag.width * 0.4, sprite.texture.width * state.baseScale * 0.5)
          const spriteHeight = Math.min(drag.height * 0.8, sprite.texture.height * state.baseScale)
          state.baseX = Math.max(halfWidth, Math.min(drag.width - halfWidth, event.global.x - drag.offsetX))
          state.baseY = Math.max(spriteHeight, Math.min(drag.height - 8, event.global.y - drag.offsetY))
          sprite.position.set(state.baseX, state.baseY)
          if (ring) ring.position.set(state.baseX, state.baseY)
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
            if (actor.travel && !actor.state.dragging) {
              const travel = actor.travel
              const progress = Math.min(1, (performance.now() - travel.start) / travel.duration)
              const eased = progress * progress * (3 - 2 * progress)
              actor.state.baseX = travel.fromX + (travel.toX - travel.fromX) * eased
              actor.state.baseY = travel.fromY + (travel.toY - travel.fromY) * eased
              actor.state.facing = travel.toX >= travel.fromX ? 1 : -1
              actor.state.walking = progress < 1 ? 1 : 0
              if (progress === 1) actor.travel = undefined
            }
            actor.state.focusTarget = actor.characterId === active ? 1 : 0
            tickProcedural(actor.sprite, actor.state, ticker.deltaTime)
            if (actor.ring) {
              actor.ring.position.set(actor.state.baseX, actor.state.baseY)
              // The player's ring stays solid; only the NPC halos breathe.
              if (!actor.marker) actor.ring.alpha = 0.16 + Math.sin(actor.state.phase * 1.6) * 0.1 + actor.state.hover * 0.3
            }
            if (actor.marker) {
              const above = actor.sprite.texture.height * actor.state.baseScale + 22
              actor.marker.position.set(actor.state.baseX, actor.state.baseY - above + Math.sin(actor.state.phase * 1.8) * 3)
            }
          }
        })

        rebuild()
      })

    return () => {
      cancelled = true
      transitionTimersRef.current.forEach(window.clearTimeout)
      actionTimersRef.current.forEach(window.clearTimeout)
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

    const { backdrop, cast, characters, onSelect, generatedBackdrop } = propsRef.current

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
    const layers = generatedBackdrop ? null : paintParallaxBackdrop(backdrop, width, height)
    if (layers) {
      layers.base.eventMode = 'none'
      layers.middle.eventMode = 'none'
      layers.front.eventMode = 'none'
      app.stage.addChild(layers.base, layers.middle)
    }
    layersRef.current = layers

    // Painter's algorithm: characters lower on screen stand in front.
    const ordered = [...cast].sort((a, b) => a.y - b.y)
    // Collected and added after the cast, so a character standing further
    // forward can never cover the player's own badge.
    const playerMarkers: Graphics[] = []

    for (const placement of ordered) {
      const character = characters.find((c) => c.id === placement.characterId)
      if (!character) continue

      let texture = texturesRef.current.get(character.id)
      if (!texture) {
        if (character.imageDataUrl) continue // Loaded asynchronously below.
        texture = bakeCharacter(app.renderer, character.art, character.id === propsRef.current.handDrawnCharacterId)
        texturesRef.current.set(character.id, texture)
      }

      const x = width * placement.x
      const y = height * placement.y
      // Keyed to whichever dimension is tighter: scaling on height alone makes
      // the cast balloon on a tall, narrow stage.
      const scale = placement.scale * Math.min(width / 1100, height / 720) *
        (character.imageDataUrl ? character.art.height / texture.height : 1)
      const interactive = character.id !== propsRef.current.playerCharacterId
      const marksPlayer = !interactive && Boolean(propsRef.current.markPlayer)

      const radiusX = character.art.height * scale * 0.34
      const radiusY = character.art.height * scale * 0.1

      let ring: Graphics | undefined
      if (interactive || marksPlayer) {
        ring = new Graphics()
        if (marksPlayer) {
          // A solid double ring, deliberately unlike the NPCs' faint "tap me" halo.
          ring.ellipse(0, 0, radiusX * 1.22, radiusY * 1.22).fill(0x315a46)
          ring.ellipse(0, 0, radiusX * 0.92, radiusY * 0.92).fill(0xf5e6b8)
          ring.alpha = 0.9
        } else {
          ring.ellipse(0, 0, radiusX, radiusY).fill(0xf5e6b8)
        }
        ring.position.set(x, y)
        app.stage.addChild(ring)
      }

      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5, 1)
      sprite.position.set(x, y)
      app.stage.addChild(sprite)

      let marker: Graphics | undefined
      if (marksPlayer) {
        marker = new Graphics()
        marker.poly([0, 12, -11, -7, 11, -7]).fill(0x315a46)
        marker.poly([0, 5, -5.5, -3.5, 5.5, -3.5]).fill(0xfff4d5)
        marker.eventMode = 'none'
        playerMarkers.push(marker)
      }

      const state = createProceduralState(scale, x, y, placement.facing)
      const actor: Actor = { sprite, state, ring, marker, characterId: character.id, suppressTap: false }

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
      }

      actorsRef.current.push(actor)
    }
    for (const marker of playerMarkers) app.stage.addChild(marker)
    if (layers) app.stage.addChild(layers.front)
    updateAccessories()
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

  function playActions(delay: number): void {
    actionTimersRef.current.forEach(window.clearTimeout)
    actionTimersRef.current = []
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let at = delay
    for (const beat of propsRef.current.actions.slice(0, 5)) {
      const duration = beat.action === 'walk' ? 1050 : 600
      actionTimersRef.current.push(window.setTimeout(() => {
        const app = appRef.current
        const actor = actorsRef.current.find((item) => item.characterId === beat.characterId)
        if (!app || !actor || actor.state.dragging) return
        if (beat.action === 'walk' && beat.x !== undefined && beat.y !== undefined) {
          actor.travel = { fromX: actor.state.baseX, fromY: actor.state.baseY, toX: beat.x * app.screen.width, toY: beat.y * app.screen.height, start: performance.now(), duration: 900 }
        } else if (beat.action === 'look' && beat.x !== undefined) {
          actor.state.facing = beat.x * app.screen.width >= actor.state.baseX ? 1 : -1
        } else if (beat.action === 'gesture') {
          if (beat.x !== undefined) actor.state.facing = beat.x * app.screen.width >= actor.state.baseX ? 1 : -1
          pokeTalk(actor.state)
        }
      }, at))
      at += duration
    }
  }

  // Repaint when the scene changes, and when the stage is resized.
  useEffect(() => {
    if (sceneKeyRef.current !== props.sceneKey) {
      actionTimersRef.current.forEach(window.clearTimeout)
      actionTimersRef.current = []
      actorsRef.current.forEach((actor) => { actor.travel = undefined; actor.state.walking = 0 })
    }
    if (sceneKeyRef.current !== props.sceneKey && appRef.current && actorsRef.current.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sceneKeyRef.current = props.sceneKey
      transitionTimersRef.current.forEach(window.clearTimeout)
      transitionTimersRef.current = []
      const app = appRef.current
      const width = app.screen.width
      const height = app.screen.height
      const now = performance.now()
      const forest = props.backdrop === 'forest-path' || props.backdrop === 'fork'
      actorsRef.current.forEach((actor, index) => {
        const x = forest ? width * (0.56 + index * 0.06) : width * 1.08
        const y = forest ? height * 0.64 : actor.state.baseY
        actor.travel = { fromX: actor.state.baseX, fromY: actor.state.baseY, toX: x, toY: y, start: now, duration: 850 }
        actor.sprite.eventMode = 'none'
      })
      transitionTimersRef.current.push(window.setTimeout(() => {
        app.canvas.style.opacity = '0'
        transitionTimersRef.current.push(window.setTimeout(() => {
          rebuild()
          app.canvas.style.opacity = '0'
          const entryTime = performance.now()
          actorsRef.current.forEach((actor, index) => {
            const toX = actor.state.baseX
            const toY = actor.state.baseY
            const fromX = forest ? width * (0.56 + index * 0.06) : -width * 0.08
            const fromY = forest ? height * 0.64 : toY
            actor.travel = { fromX, fromY, toX, toY, start: entryTime, duration: 850 }
            actor.state.baseX = fromX
            actor.state.baseY = fromY
          })
          transitionTimersRef.current = []
          requestAnimationFrame(() => { app.canvas.style.opacity = '1' })
          playActions(950)
        }, 250))
      }, 750))
    } else if (sceneKeyRef.current === props.sceneKey && transitionTimersRef.current.length === 0) {
      rebuild()
    } else if (sceneKeyRef.current !== props.sceneKey || !appRef.current || !actorsRef.current.length) {
      sceneKeyRef.current = props.sceneKey
      rebuild()
      playActions(250)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.sceneKey, props.backdrop, props.generatedBackdrop, props.cast, props.characters, props.markPlayer])

  useEffect(() => { updateAccessories() }, [props.equippedItems, props.accessoryFits]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const phase = props.shopPhase ?? 'closed'
    const previous = previousShopPhase.current
    previousShopPhase.current = phase
    if (phase === 'entering') {
      actionTimersRef.current.forEach(window.clearTimeout)
      actionTimersRef.current = []
      const actor = actorsRef.current.find((item) => item.characterId === props.playerCharacterId)
      const app = appRef.current
      if (actor && app) {
        actor.sprite.eventMode = 'none'
        actor.travel = { fromX: actor.state.baseX, fromY: actor.state.baseY, toX: app.screen.width * 0.5, toY: app.screen.height * 0.79, start: performance.now(), duration: 900 }
      }
    } else if (phase === 'closed' && previous !== 'closed') {
      transitionTimersRef.current.forEach(window.clearTimeout)
      transitionTimersRef.current = []
      if (appRef.current) appRef.current.canvas.style.opacity = '1'
      rebuild()
    }
  }, [props.shopPhase]) // eslint-disable-line react-hooks/exhaustive-deps

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
