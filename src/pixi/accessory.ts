import { Text } from 'pixi.js'

import { shopItem, type AccessoryFit } from '../content/shopItems.ts'
import type { Character } from '../state/types.ts'

/**
 * The accessory a character is wearing, laid out against a feet-anchored sprite
 * whose texture is `textureHeight` tall. The live map and the printed storybook
 * both call this, so a crown can never sit in two different places.
 *
 * Returns null when nothing is worn, or when the saved id is not an accessory.
 */
export function accessoryBadge(
  character: Character,
  itemId: string | undefined,
  fits: Record<string, AccessoryFit> | undefined,
  textureHeight: number,
): Text | null {
  const item = shopItem(itemId ?? '')
  if (!item || item.category !== 'character') return null

  const wolf = character.art.silhouette === 'wolf'
  const slot = item.slot ?? 'head'
  const baseX = wolf ? (slot === 'back' ? -0.17 : 0.27) : slot === 'back' ? -0.18 : 0
  const baseY = slot === 'head' ? (wolf ? -0.84 : -0.87) : slot === 'face' ? -0.62 : slot === 'neck' ? -0.48 : -0.42
  const fit = fits?.[`${character.id}:${item.id}`] ?? { x: 0, y: 0, scale: 1 }

  const badge = new Text({
    text: item.symbol,
    style: { fontSize: slot === 'face' ? 29 : 34, fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif' },
  })
  badge.anchor.set(0.5, 1)
  badge.position.set((baseX + fit.x) * textureHeight, (baseY + fit.y) * textureHeight)
  badge.scale.set(fit.scale)
  badge.eventMode = 'none'
  return badge
}

/** A bought map decoration, sized the way `.placed-decoration` sizes it on screen. */
export function decorationBadge(id: string, size: number | undefined, fontScale: number): Text | null {
  const item = shopItem(id)
  if (!item || item.category !== 'map') return null

  const badge = new Text({
    text: item.symbol,
    style: { fontSize: 56 * (size ?? 1) * fontScale, fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif' },
  })
  badge.anchor.set(0.5, 0.5)
  badge.eventMode = 'none'
  return badge
}
