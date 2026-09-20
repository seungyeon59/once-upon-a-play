import { Container, Graphics, Sprite, type Renderer, type Texture } from 'pixi.js'

import type { BackdropKind, CharacterArt } from '../state/types.ts'

/**
 * Placeholder art, drawn in code so Phase 1 needs no asset pipeline.
 *
 * Characters are painted once and baked into a texture (`bakeCharacter`), so
 * everything downstream animates a single flat sprite — exactly the shape the
 * real PNG illustrations will have. Swapping in hand-drawn art later means
 * replacing the texture source; none of the animation code changes.
 */

/** Deterministic noise so the scenery is identical on every re-render. */
function rng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

function lerpColor(from: number, to: number, t: number): number {
  const fr = (from >> 16) & 0xff
  const fg = (from >> 8) & 0xff
  const fb = from & 0xff
  const tr = (to >> 16) & 0xff
  const tg = (to >> 8) & 0xff
  const tb = to & 0xff
  return (
    ((fr + (tr - fr) * t) << 16) | (((fg + (tg - fg) * t) | 0) << 8) | ((fb + (tb - fb) * t) | 0)
  )
}

function skyGradient(g: Graphics, width: number, height: number, top: number, bottom: number): void {
  const bands = 24
  for (let i = 0; i < bands; i += 1) {
    g.rect(0, (height / bands) * i, width, height / bands + 1).fill(
      lerpColor(top, bottom, i / (bands - 1)),
    )
  }
}

/** A conifer silhouette: stacked triangles on a trunk. */
function tree(g: Graphics, x: number, baseY: number, size: number, color: number): void {
  g.rect(x - size * 0.05, baseY - size * 0.25, size * 0.1, size * 0.28).fill(lerpColor(color, 0x000000, 0.3))
  for (let tier = 0; tier < 3; tier += 1) {
    const tierY = baseY - size * (0.2 + tier * 0.28)
    const spread = size * (0.42 - tier * 0.1)
    g.poly([x, tierY - size * 0.45, x - spread, tierY, x + spread, tierY]).fill(color)
  }
}

/* ------------------------------------------------------------- backdrops --- */

export function paintBackdrop(kind: BackdropKind, width: number, height: number): Container {
  const layer = new Container()
  const g = new Graphics()
  layer.addChild(g)

  switch (kind) {
    case 'forest-path':
      paintForestPath(g, width, height)
      break
    case 'fork':
      paintFork(g, width, height)
      break
    case 'cottage':
      paintCottage(g, width, height)
      break
    case 'hearth':
      paintHearth(g, width, height)
      break
  }
  paintBackdropDetails(g, kind, width, height)
  return layer
}

function paintBackdropDetails(g: Graphics, kind: BackdropKind, w: number, h: number): void {
  const random = rng(kind === 'forest-path' ? 201 : kind === 'fork' ? 202 : kind === 'cottage' ? 203 : 204)
  if (kind === 'hearth') {
    // Books, warm wall trim and sparks keep the interior distinct from the paths.
    g.rect(w * 0.04, h * 0.12, w * 0.3, h * 0.025).fill(0x9b744e)
    for (let i = 0; i < 10; i += 1) g.rect(w * (0.055 + i * 0.026), h * (0.07 + i % 3 * 0.012), w * 0.018, h * 0.05).fill([0x8a574e, 0x8a986e, 0xceb481][i % 3])
    for (let i = 0; i < 12; i += 1) g.circle(w * (0.64 + random() * 0.16), h * (0.48 + random() * 0.22), 1 + random() * 3).fill({ color: 0xffd17a, alpha: 0.5 })
    g.rect(0, h * 0.93, w, h * 0.012).fill({ color: 0xe1b579, alpha: 0.35 })
    return
  }
  for (let i = 0; i < 38; i += 1) {
    const x = random() * w
    const y = h * (0.63 + random() * 0.34)
    if (Math.abs(x - w * 0.5) < w * 0.16 && y > h * 0.76) continue
    g.circle(x, y, 2 + random() * 3).fill({ color: i % 3 === 0 ? 0xffe4a1 : i % 3 === 1 ? 0xe7b0ca : 0xe8e0f3, alpha: 0.7 })
    g.circle(x + 5, y + 3, 1 + random() * 2).fill({ color: 0xfaf3d6, alpha: 0.6 })
  }
  for (const x of [w * 0.11, w * 0.89]) {
    g.ellipse(x, h * 0.74, w * 0.075, h * 0.037).fill({ color: 0x6d945f, alpha: 0.8 })
    g.ellipse(x + w * 0.025, h * 0.72, w * 0.05, h * 0.029).fill({ color: 0x8cae70, alpha: 0.8 })
  }
  if (kind === 'fork') {
    for (let i = 0; i < 8; i += 1) g.circle(w * (0.14 + random() * 0.22), h * (0.68 + random() * 0.24), 4 + random() * 3).fill(0xf2c5d8)
  }
  if (kind === 'cottage') {
    for (let i = 0; i < 10; i += 1) g.circle(w * (0.31 + random() * 0.56), h * (0.72 + random() * 0.1), 3 + random() * 3).fill(0xf5d4a5)
  }
}

/** Wider scenery with independent middle and near planes for camera parallax. */
export function paintParallaxBackdrop(kind: BackdropKind, width: number, height: number) {
  const worldWidth = width * 1.5
  const margin = (worldWidth - width) / 2
  const base = paintBackdrop(kind, worldWidth, height)
  const middle = new Graphics()
  const front = new Graphics()
  const random = rng(kind === 'cottage' ? 91 : kind === 'fork' ? 93 : kind === 'hearth' ? 97 : 89)

  if (kind === 'hearth') {
    // A nearby chair and the edge of a rug create an indoor foreground.
    front.ellipse(worldWidth * 0.16, height * 0.99, worldWidth * 0.18, height * 0.08).fill(0x6b4a35)
    front.rect(worldWidth * 0.87, height * 0.67, worldWidth * 0.055, height * 0.33).fill(0x33241d)
    front.rect(worldWidth * 0.84, height * 0.83, worldWidth * 0.12, height * 0.035).fill(0x745036)
  } else {
    // Soft distant trunks sit behind the actors and travel more slowly than
    // the leaves in the foreground. Keep the centre open for the cast.
    for (const side of [0.1, 0.18, 0.85, 0.94]) {
      const x = worldWidth * side
      const top = height * (0.42 + random() * 0.13)
      middle.rect(x, top, width * 0.014, height - top).fill({ color: 0x172b24, alpha: 0.35 })
      middle.ellipse(x, top, width * 0.075, height * 0.06).fill({ color: 0x304b38, alpha: 0.55 })
    }
    for (const side of [0.07, 0.17, 0.83, 0.94]) {
      const x = worldWidth * side
      front.ellipse(x, height * 1.02, width * 0.11, height * 0.075).fill(kind === 'cottage' ? 0x4c683c : 0x3b603d)
      for (let i = 0; i < 6; i += 1) {
        const fx = x + (random() - 0.5) * width * 0.14
        const fy = height * (0.95 + random() * 0.045)
        front.circle(fx, fy, 2 + random() * 2).fill(random() > 0.5 ? 0xe4dff0 : 0xe4b363)
      }
    }
  }

  base.x = -margin
  middle.x = -margin
  front.x = -margin
  return { base, middle, front, margin }
}

/**
 * A band of forest in overlapping depth layers.
 *
 * The layering is not decoration: a single row of triangles leaves regular
 * sky-coloured gaps between the trees that read as holes punched in the
 * scenery. Overlapping rows of different sizes close those gaps.
 */
function forestBand(
  g: Graphics,
  random: () => number,
  w: number,
  h: number,
  options: { horizon: number; ground: number; depth?: number },
): void {
  const { horizon, ground, depth = 3 } = options

  const layers = [
    { y: horizon + h * 0.02, size: h * 0.3, color: 0x3c5148, count: 13 },
    { y: horizon + h * 0.1, size: h * 0.42, color: 0x2c4038, count: 10 },
    { y: horizon + h * 0.26, size: h * 0.6, color: 0x1d2e28, count: 7 },
  ].slice(0, depth)

  for (const layer of layers) {
    // Each layer sits on a solid slab of its own colour, so only the treetops
    // break the skyline — without it the gaps between trunks read as holes
    // punched through the forest.
    const slab = layer.y - layer.size * 0.35
    g.rect(0, slab, w, h - slab).fill(layer.color)
    for (let i = 0; i < layer.count; i += 1) {
      const x = (w / (layer.count - 1)) * i + (random() - 0.5) * w * 0.07
      tree(g, x, layer.y + random() * h * 0.02, layer.size, layer.color)
    }
  }

  // Ground goes on last, covering every trunk that hangs below the horizon.
  g.rect(0, horizon, w, h - horizon).fill(ground)
}

function paintForestPath(g: Graphics, w: number, h: number): void {
  const random = rng(11)
  skyGradient(g, w, h, 0x8fa9b8, 0xd9d2bd)
  forestBand(g, random, w, h, { horizon: h * 0.6, ground: 0x4a5c3f })

  // The path: a wedge narrowing toward the horizon.
  g.poly([w * 0.5 - w * 0.04, h * 0.62, w * 0.5 + w * 0.04, h * 0.62, w * 0.86, h, w * 0.22, h]).fill(0x9a8467)
  g.poly([w * 0.5 - w * 0.03, h * 0.63, w * 0.5 + w * 0.03, h * 0.63, w * 0.8, h, w * 0.28, h]).fill(0xa8926f)

  for (let i = 0; i < 40; i += 1) {
    const t = random()
    const y = h * (0.66 + t * 0.34)
    const spread = w * (0.06 + t * 0.34)
    g.circle(w * 0.5 + (random() - 0.5) * 2 * spread, y, 2 + random() * 3).fill(0x6f7f52)
  }
}

function paintFork(g: Graphics, w: number, h: number): void {
  const random = rng(29)
  skyGradient(g, w, h, 0x9fb6c4, 0xe6dcc4)
  forestBand(g, random, w, h, { horizon: h * 0.54, ground: 0x55683f })

  const splitX = w * 0.54
  const splitY = h * 0.56

  // Left branch opens out into the meadow, right branch drops downhill.
  g.poly([splitX - w * 0.035, splitY, splitX + w * 0.035, splitY, w * 0.24, h, -w * 0.08, h]).fill(0x9a8467)
  g.poly([splitX - w * 0.035, splitY, splitX + w * 0.035, splitY, w * 1.04, h * 0.9, w * 0.62, h]).fill(0xa8926f)

  // Meadow: overlapping patches down the left, kept clear of where the
  // characters stand so they are never framed like they are in a pond.
  for (let i = 0; i < 5; i += 1) {
    g.ellipse(w * (0.03 + i * 0.06), h * (0.74 + random() * 0.14), w * 0.08, h * 0.07).fill(0x6f8a4a)
  }
  for (let i = 0; i < 70; i += 1) {
    g.circle(
      w * (0.01 + random() * 0.3),
      h * (0.66 + random() * 0.32),
      2 + random() * 3,
    ).fill(random() > 0.5 ? 0xb49ad6 : 0xe4dff0)
  }

  // Signpost: one arm per path, the upper pointing back left, lower pointing right.
  g.rect(splitX - 5, h * 0.34, 10, h * 0.24).fill(0x6b5439)
  g.poly([
    splitX - 5, h * 0.37, splitX - w * 0.075, h * 0.385,
    splitX - w * 0.075, h * 0.425, splitX - 5, h * 0.44,
  ]).fill(0x8a7050)
  g.poly([
    splitX + 5, h * 0.45, splitX + w * 0.075, h * 0.465,
    splitX + w * 0.075, h * 0.505, splitX + 5, h * 0.52,
  ]).fill(0x9a7f5c)
}

function paintCottage(g: Graphics, w: number, h: number): void {
  const random = rng(47)
  skyGradient(g, w, h, 0xc4a98f, 0xf0dcc0)
  // Only the two distant layers — the cottage itself is the foreground.
  forestBand(g, random, w, h, { horizon: h * 0.46, ground: 0x62743f, depth: 2 })

  // Cottage: body, roof, door, two windows, chimney. Sized to leave the lower
  // third of the frame clear, because that is where the characters stand.
  const cx = w * 0.62
  const cy = h * 0.42
  const cw = w * 0.32
  const ch = h * 0.3
  g.rect(cx - cw / 2, cy, cw, ch).fill(0xd8c3a0)
  g.poly([cx - cw * 0.62, cy, cx + cw * 0.62, cy, cx, cy - ch * 0.5]).fill(0x8d5f42)
  g.rect(cx + cw * 0.2, cy - ch * 0.44, cw * 0.08, ch * 0.44).fill(0x7a6450)
  g.rect(cx - cw * 0.09, cy + ch * 0.44, cw * 0.18, ch * 0.56).fill(0x6b4a33)
  g.circle(cx + cw * 0.05, cy + ch * 0.74, 4).fill(0xe4b363)
  for (const side of [-1, 1]) {
    g.rect(cx + side * cw * 0.3 - cw * 0.08, cy + ch * 0.14, cw * 0.16, ch * 0.22).fill(0xf5e6b8)
    g.rect(cx + side * cw * 0.3 - cw * 0.08, cy + ch * 0.14, cw * 0.16, ch * 0.22).stroke({ width: 4, color: 0x8d5f42 })
  }

  // A hedge of loose bushes down the left edge, rather than one flat slab.
  for (let i = 0; i < 6; i += 1) {
    g.ellipse(w * (-0.02 + i * 0.035), h * (0.56 + random() * 0.16), w * 0.05, h * 0.06).fill(0x2f4a33)
  }

  // Garden rows in front of the house.
  for (let i = 0; i < 7; i += 1) {
    g.ellipse(w * (0.12 + i * 0.06), h * (0.8 + random() * 0.08), 24, 10).fill(0x4f6b39)
  }

  // Fence across the very front of the garden.
  g.rect(0, h * 0.78, w, 7).fill(0xb49873)
  for (let i = 0; i < 18; i += 1) g.rect(w * 0.01 + i * (w / 18), h * 0.74, 7, h * 0.11).fill(0xc9ab84)
}

function paintHearth(g: Graphics, w: number, h: number): void {
  const random = rng(73)
  g.rect(0, 0, w, h).fill(0x3a2a22)
  g.rect(0, 0, w, h * 0.7).fill(0x4a362b)

  // Fireplace with a warm pool of light.
  const fx = w * 0.72
  g.rect(fx - w * 0.12, h * 0.3, w * 0.24, h * 0.5).fill(0x2b1e18)
  g.rect(fx - w * 0.08, h * 0.48, w * 0.16, h * 0.32).fill(0x14100d)
  g.ellipse(fx, h * 0.74, w * 0.06, h * 0.08).fill(0xd98634)
  g.ellipse(fx, h * 0.76, w * 0.04, h * 0.05).fill(0xf2c14e)
  g.ellipse(fx, h * 0.82, w * 0.3, h * 0.12).fill(0x6b4a2e)

  // Night window on the left.
  g.rect(w * 0.1, h * 0.24, w * 0.18, h * 0.24).fill(0x1b2436)
  g.rect(w * 0.1, h * 0.24, w * 0.18, h * 0.24).stroke({ width: 6, color: 0x6b5340 })
  for (let i = 0; i < 12; i += 1) {
    g.circle(w * (0.11 + random() * 0.16), h * (0.25 + random() * 0.22), 1.5).fill(0xd9e2f0)
  }

  // Floor and table.
  g.rect(0, h * 0.8, w, h * 0.2).fill(0x5a4030)
  g.rect(w * 0.3, h * 0.74, w * 0.26, 10).fill(0x8a6a4a)
  for (const x of [w * 0.32, w * 0.54]) g.rect(x, h * 0.75, 8, h * 0.12).fill(0x6f5238)
}

/* ------------------------------------------------------------ characters --- */

/**
 * Paints a character and bakes it into a texture. The result is one flat
 * sprite with no separated limbs — animation is procedural only, by design.
 */
export function bakeCharacter(renderer: Renderer, art: CharacterArt): Texture {
  const g = new Graphics()
  const h = art.height

  switch (art.silhouette) {
    case 'child':
      paintChild(g, art, h)
      break
    case 'wolf':
      paintWolf(g, art, h)
      break
    case 'elder':
      paintElder(g, art, h)
      break
  }

  const texture = renderer.generateTexture({ target: g, resolution: 2, antialias: true })
  g.destroy()
  return texture
}

/** All characters are drawn with their feet at y = 0 and their head at -height. */
function paintChild(g: Graphics, art: CharacterArt, h: number): void {
  const w = h * 0.46
  g.ellipse(0, -2, w * 0.5, 6).fill({ color: 0x000000, alpha: 0.18 })
  for (const side of [-1, 1]) g.roundRect(side * w * 0.16 - 5, -h * 0.2, 10, h * 0.2, 4).fill(0x4a3b2e)
  // Cloak: a flared trapezoid, wider at the hem.
  g.poly([-w * 0.42, 0, w * 0.42, 0, w * 0.3, -h * 0.58, -w * 0.3, -h * 0.58]).fill(art.body)
  g.circle(0, -h * 0.66, w * 0.3).fill(art.skin)
  // Hood sits over the back of the head.
  g.circle(0, -h * 0.7, w * 0.36).fill(art.body)
  g.circle(w * 0.08, -h * 0.66, w * 0.27).fill(art.skin)
  g.circle(w * 0.16, -h * 0.68, 3).fill(0x2b2119)
  g.roundRect(w * 0.26, -h * 0.34, w * 0.34, h * 0.16, 5).fill(art.accent)
  g.rect(w * 0.26, -h * 0.34, w * 0.34, 5).fill(0x8a6a44)
}

function paintWolf(g: Graphics, art: CharacterArt, h: number): void {
  const w = h * 0.86
  g.ellipse(0, -2, w * 0.44, 7).fill({ color: 0x000000, alpha: 0.18 })
  for (const x of [-w * 0.26, -w * 0.12, w * 0.12, w * 0.24]) {
    g.roundRect(x - 5, -h * 0.3, 10, h * 0.3, 4).fill(art.accent)
  }
  g.ellipse(0, -h * 0.44, w * 0.38, h * 0.17).fill(art.body)
  // Tail sweeping back and up.
  g.poly([-w * 0.34, -h * 0.46, -w * 0.62, -h * 0.66, -w * 0.5, -h * 0.4]).fill(art.body)
  g.circle(w * 0.32, -h * 0.66, h * 0.15).fill(art.body)
  for (const side of [-1, 1]) {
    g.poly([
      w * (0.26 + side * 0.05), -h * 0.76,
      w * (0.3 + side * 0.07), -h * 0.95,
      w * (0.38 + side * 0.05), -h * 0.74,
    ]).fill(art.accent)
  }
  // Muzzle.
  g.ellipse(w * 0.47, -h * 0.62, h * 0.11, h * 0.07).fill(art.skin)
  g.circle(w * 0.56, -h * 0.63, 4).fill(0x241f1c)
  g.circle(w * 0.36, -h * 0.7, 3.5).fill(0xf0e4c8)
}

function paintElder(g: Graphics, art: CharacterArt, h: number): void {
  const w = h * 0.5
  // The shawl is a deeper tint of the skirt; the hair keeps the pale accent, so
  // head and shoulders stay readable as two shapes rather than one blob.
  const shawl = lerpColor(art.body, 0x000000, 0.25)
  g.ellipse(0, -2, w * 0.5, 6).fill({ color: 0x000000, alpha: 0.18 })
  g.poly([-w * 0.46, 0, w * 0.46, 0, w * 0.26, -h * 0.5, -w * 0.26, -h * 0.5]).fill(art.body)
  g.poly([-w * 0.36, -h * 0.42, w * 0.36, -h * 0.42, w * 0.2, -h * 0.68, -w * 0.2, -h * 0.68]).fill(shawl)
  g.circle(0, -h * 0.76, w * 0.27).fill(art.skin)
  // Hair sits behind and above the face.
  g.circle(-w * 0.14, -h * 0.86, w * 0.19).fill(art.accent)
  g.circle(0, -h * 0.84, w * 0.26).fill(art.accent)
  g.circle(w * 0.04, -h * 0.76, w * 0.24).fill(art.skin)
  g.circle(w * 0.14, -h * 0.78, 3).fill(0x2b2119)
  g.roundRect(w * 0.22, -h * 0.46, w * 0.26, h * 0.09, 5).fill(0x8a6a44)
}

/** Convenience: a baked character as a feet-anchored sprite. */
export function characterSprite(renderer: Renderer, art: CharacterArt): Sprite {
  const sprite = new Sprite(bakeCharacter(renderer, art))
  sprite.anchor.set(0.5, 1)
  return sprite
}
