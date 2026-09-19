import { Application, Rectangle, Sprite, Texture } from 'pixi.js'
import { getScene, getTale } from '../content/tales/redRidingHood.ts'
import { getRoleView } from '../content/tales/roleViews.ts'
import { paintParallaxBackdrop, bakeCharacter } from '../pixi/placeholderArt.ts'
import type { Character, PlayerRole, ScenePlacement } from '../state/types.ts'

async function imageTexture(dataUrl: string): Promise<Texture> {
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  return Texture.from(image)
}

/** Renders the same scene art used by the map into a printable image. */
export async function renderStoryArt(taleId: string, sceneId: string, role: PlayerRole, characters: Character[], companionIds: string[], positions: Record<string, { x: number; y: number }> = {}): Promise<string> {
  const tale = getTale(taleId)
  const scene = tale && getScene(tale, sceneId)
  if (!scene) throw new Error('Story scene not found')
  const width = 960
  const height = 540
  const app = new Application()
  await app.init({ width, height, background: 0xfffaf0, antialias: true, preference: 'webgl', preserveDrawingBuffer: true })
  const ownedTextures: Texture[] = []
  try {
    const view = getRoleView(scene, {}, role)
    const layers = paintParallaxBackdrop(scene.backdrop, width, height)
    app.stage.addChild(layers.base, layers.middle)
    const placements: ScenePlacement[] = [...view.scene.cast, ...(view.variant.addCast ?? [])]
    const slots = [0.85, 0.14, 0.72, 0.28, 0.5]
    for (const id of companionIds) {
      if (placements.some((placement) => placement.characterId === id)) continue
      const x = slots.find((slot) => placements.every((actor) => Math.abs(actor.x - slot) > 0.12)) ?? 0.5
      placements.push({ characterId: id, x, y: 0.84, scale: 0.8, facing: x > 0.5 ? -1 : 1 })
    }
    for (const original of placements.map((placement) => positions[placement.characterId]
      ? { ...placement, ...positions[placement.characterId] }
      : placement).sort((a, b) => a.y - b.y)) {
      const placement = original
      const character = characters.find((item) => item.id === placement.characterId)
      if (!character) continue
      const texture = character.imageDataUrl ? await imageTexture(character.imageDataUrl) : bakeCharacter(app.renderer, character.art)
      if (!character.imageDataUrl) ownedTextures.push(texture)
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5, 1)
      sprite.position.set(width * placement.x, height * placement.y)
      const scale = placement.scale * Math.min(width / 1100, height / 720) * (character.imageDataUrl ? character.art.height / texture.height : 1)
      sprite.scale.set(scale * placement.facing, scale)
      app.stage.addChild(sprite)
    }
    app.stage.addChild(layers.front)
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
