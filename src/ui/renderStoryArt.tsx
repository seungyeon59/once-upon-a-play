import { Application, Rectangle, Sprite, Texture } from 'pixi.js'
import { renderToStaticMarkup } from 'react-dom/server'
import { getScene, getTale } from '../content/tales/redRidingHood.ts'
import { getRoleView } from '../content/tales/roleViews.ts'
import { paintParallaxBackdrop, bakeCharacter } from '../pixi/placeholderArt.ts'
import { accessoryBadge, decorationBadge } from '../pixi/accessory.ts'
import type { AccessoryFit } from '../content/shopItems.ts'
import type { Character, Flags, ImaginedScene, PlayerRole, ScenePlacement } from '../state/types.ts'
import { BackdropArt } from './PrebuiltMap.tsx'
import { PropArt } from './PropArt.tsx'
import { GeneratedMap } from './GeneratedMap.tsx'
import { loadBackground } from '../state/imageCache.ts'

function prebuiltImage(scene: ImaginedScene): string {
  const map = scene.map
  if (!map.backdropId) throw new Error('Prebuilt backdrop missing')
  if (map.backdropId === 'steelhacks') return '/maps/steelhacks-xiii.png'
  const background = renderToStaticMarkup(<BackdropArt id={map.backdropId} />)
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" ')
  const props = (map.props ?? []).map((prop) => {
    const size = (prop.size ?? 1) * 2.3
    return `<g transform="translate(${prop.x * 1200 - 22 * size} ${prop.y * 800 - 22 * size}) scale(${size})">${renderToStaticMarkup(<PropArt id={prop.id} />)}</g>`
  }).join('')
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(background.replace('</svg>', `${props}</svg>`))}`
}

function legacyGeneratedImage(scene: ImaginedScene): string {
  const markup = renderToStaticMarkup(<GeneratedMap map={scene.map} onObject={() => {}} onExit={() => {}} />)
  const svg = markup.match(/<svg\b[\s\S]*?<\/svg>/)?.[0]
  if (!svg) throw new Error('Generated map illustration missing')
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" '))}`
}

async function imageTexture(dataUrl: string): Promise<Texture> {
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  return Texture.from(image)
}

/**
 * What the child bought and arranged, so the printed page matches the map they
 * played on rather than a bare version of it.
 */
export interface StoryArtExtras {
  /** Picks the same scene variant the child saw, instead of the default one. */
  flags?: Flags
  equippedItems?: Record<string, string>
  accessoryFits?: Record<string, AccessoryFit>
  decorations?: Array<{ id: string; x: number; y: number; size?: number }>
}

/** Renders the same scene art used by the map into a printable image. */
export async function renderStoryArt(taleId: string, sceneId: string, role: PlayerRole, characters: Character[], companionIds: string[], positions: Record<string, { x: number; y: number }> = {}, imaginedScene?: ImaginedScene, extras: StoryArtExtras = {}): Promise<string> {
  const tale = getTale(taleId)
  const scene = tale && getScene(tale, sceneId)
  if (!scene) throw new Error('Story scene not found')
  const width = 960
  const height = 540
  const app = new Application()
  await app.init({ width, height, background: 0xfffaf0, antialias: true, preference: 'webgl', preserveDrawingBuffer: true })
  const ownedTextures: Texture[] = []
  try {
    const view = getRoleView(scene, extras.flags ?? {}, role)
    const layers = imaginedScene ? null : paintParallaxBackdrop(scene.backdrop, width, height)
    if (layers) app.stage.addChild(layers.base, layers.middle)
    else {
      const background = imaginedScene!.map.backdropId
        ? prebuiltImage(imaginedScene!)
        : imaginedScene!.map.imageDataUrl ?? (imaginedScene!.map.imageId ? await loadBackground(imaginedScene!.map.imageId) : undefined) ?? legacyGeneratedImage(imaginedScene!)
      const texture = await imageTexture(background)
      const sprite = new Sprite(texture)
      sprite.width = width
      sprite.height = height
      app.stage.addChild(sprite)
    }
    const placements: ScenePlacement[] = [...view.scene.cast, ...(view.variant.addCast ?? [])]
    const slots = [0.85, 0.14, 0.72, 0.28, 0.5]
    for (const id of companionIds) {
      if (placements.some((placement) => placement.characterId === id)) continue
      const x = slots.find((slot) => placements.every((actor) => Math.abs(actor.x - slot) > 0.12)) ?? 0.5
      placements.push({ characterId: id, x, y: 0.84, scale: 0.8, facing: x > 0.5 ? -1 : 1 })
    }
    for (const original of placements.map((placement) => {
      const planned = imaginedScene?.map.cast?.find((actor) => actor.characterId === placement.characterId)
      return { ...placement, ...planned, ...positions[placement.characterId] }
    }).sort((a, b) => a.y - b.y)) {
      const placement = original
      const character = characters.find((item) => item.id === placement.characterId)
      if (!character) continue
      const texture = character.imageDataUrl ? await imageTexture(character.imageDataUrl) : bakeCharacter(app.renderer, character.art, character.id === role)
      if (!character.imageDataUrl) ownedTextures.push(texture)
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5, 1)
      sprite.position.set(width * placement.x, height * placement.y)
      const scale = placement.scale * Math.min(width / 1100, height / 720) * (character.imageDataUrl ? character.art.height / texture.height : 1)
      sprite.scale.set(scale * placement.facing, scale)
      const badge = accessoryBadge(character, extras.equippedItems?.[character.id], extras.accessoryFits, texture.height)
      if (badge) sprite.addChild(badge)
      app.stage.addChild(sprite)
    }
    if (layers) app.stage.addChild(layers.front)
    // Bought decorations sit in front of everything, exactly as the
    // `.placed-decorations` layer does over the live stage.
    for (const placement of extras.decorations ?? []) {
      const decoration = decorationBadge(placement.id, placement.size, Math.min(width / 1100, height / 720))
      if (!decoration) continue
      decoration.position.set(width * placement.x, height * placement.y)
      app.stage.addChild(decoration)
    }
    app.render()
    // Backdrop shapes deliberately extend beyond the viewport. Extracting the
    // stage's bounds includes those offscreen shapes and creates white strips
    // when the result is fitted into a 16:9 book frame.
    return await app.renderer.extract.base64({ target: app.stage, frame: new Rectangle(0, 0, width, height), clearColor: 0xfffaf0 })
  } finally {
    app.destroy(true, { children: true })
    for (const texture of ownedTextures) texture.destroy(true)
  }
}
