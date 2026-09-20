import type { BackdropId } from './mapAssets.ts'
import type { ImaginedScene } from '../state/types.ts'

type Scenery = { objects: [string, string]; upper: string; labels: [string, string] }

const DEFAULT: Scenery = { objects: ['🌳', '🌿'], upper: '☁️', labels: ['tree', 'bush'] }

export function sceneryFor(backdrop: BackdropId | undefined, authored: boolean): Scenery {
  if (authored) return { ...DEFAULT, upper: '🍃' }
  switch (backdrop) {
    case 'sky': case 'airship': return { objects: ['☁️', '🪁'], upper: '☀️', labels: ['cloud', 'kite'] }
    case 'space': case 'spaceship': return { objects: ['🪐', '☄️'], upper: '✨', labels: ['planet', 'comet'] }
    case 'ocean': case 'beach': case 'island': return { objects: ['🐚', '🪸'], upper: '🫧', labels: ['shell', 'coral'] }
    case 'classroom': case 'library': case 'museum': return { objects: ['📚', '🖼️'], upper: '📜', labels: ['books', 'painting'] }
    case 'hackathon': case 'laboratory': return { objects: ['💡', '🔬'], upper: '⚙️', labels: ['lamp', 'instrument'] }
    case 'kitchen': case 'cafe': return { objects: ['🫖', '🧁'], upper: '🥄', labels: ['teapot', 'pastry'] }
    case 'bedroom': case 'hospital': return { objects: ['🛏️', '🧸'], upper: '✨', labels: ['bed', 'toy'] }
    case 'restroom': return { objects: ['🪞', '🧼'], upper: '🫧', labels: ['mirror', 'soap'] }
    case 'trainstation': case 'city': case 'village': return { objects: ['🧳', '🏮'], upper: '☁️', labels: ['suitcase', 'lantern'] }
    case 'farm': return { objects: ['🌾', '🚜'], upper: '☀️', labels: ['wheat', 'tractor'] }
    case 'desert': return { objects: ['🌵', '🏺'], upper: '☀️', labels: ['cactus', 'pottery'] }
    case 'snowfield': case 'mountain': return { objects: ['🌲', '🪨'], upper: '❄️', labels: ['pine', 'rock'] }
    case 'cave': case 'volcano': return { objects: ['💎', '🪨'], upper: '✨', labels: ['crystal', 'rock'] }
    case 'theater': return { objects: ['🎭', '🎟️'], upper: '✨', labels: ['mask', 'ticket'] }
    case 'playground': return { objects: ['🛝', '🪁'], upper: '☁️', labels: ['slide', 'kite'] }
    case 'castle': return { objects: ['🏰', '🛡️'], upper: '☁️', labels: ['tower', 'shield'] }
    case 'swamp': case 'river': return { objects: ['🪷', '🪵'], upper: '🫧', labels: ['lily', 'log'] }
    case 'meadow': case 'garden': return { objects: ['🌻', '🦋'], upper: '☁️', labels: ['flower', 'butterfly'] }
    case 'jungle': return { objects: ['🌴', '🍃'], upper: '☁️', labels: ['palm', 'leaves'] }
    default: return DEFAULT
  }
}

export function secretTiles(map: ImaginedScene['map']): { x: number; y: number }[] {
  if (!map.tiles) return []
  const candidates = map.tiles.flatMap((row, y) => row.map((tile, x) => ({ x, y, tile })))
    .filter(({ x, y, tile }) => tile !== 'water' && tile !== 'air' &&
      !(map.spawn?.x === x && map.spawn.y === y) && !(map.exit?.x === x && map.exit.y === y) &&
      !map.objects?.some((object) => object.x === x && object.y === y))
  return [candidates.at(1), candidates.at(-2)].filter((cell): cell is NonNullable<typeof cell> => Boolean(cell))
    .filter((cell, index, chosen) => chosen.findIndex((other) => other.x === cell.x && other.y === cell.y) === index)
    .map(({ x, y }) => ({ x, y }))
}
