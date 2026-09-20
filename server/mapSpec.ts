import type { ImaginedScene, MapObject, MapTile } from '../src/state/types.ts'

const WIDTH = 6
const HEIGHT = 4
const TILES = new Set<MapTile>(['grass', 'path', 'water', 'stone', 'flowers', 'cloud', 'cloudpath', 'air'])
const OBJECTS = new Set<MapObject['type']>(['bridge', 'tower', 'pond', 'garden', 'cottage', 'lantern', 'tree'])
const ACTIONS = new Set<MapObject['action']>(['inspect', 'cross', 'enter'])

export const DEFAULT_MAP: Pick<ImaginedScene['map'], 'tiles' | 'objects' | 'spawn' | 'exit'> = {
  tiles: [
    ['grass', 'grass', 'path', 'path', 'grass', 'grass'],
    ['grass', 'flowers', 'path', 'path', 'flowers', 'grass'],
    ['grass', 'grass', 'path', 'path', 'grass', 'grass'],
    ['grass', 'grass', 'path', 'path', 'grass', 'grass'],
  ],
  objects: [], spawn: { x: 2, y: 3 }, exit: { x: 3, y: 0, label: 'Follow the path' },
}

export const SKY_MAP: typeof DEFAULT_MAP = {
  tiles: [
    ['air', 'cloud', 'cloudpath', 'cloudpath', 'cloud', 'air'],
    ['cloud', 'cloud', 'cloudpath', 'cloudpath', 'cloud', 'cloud'],
    ['air', 'cloud', 'cloudpath', 'cloudpath', 'cloud', 'air'],
    ['air', 'cloud', 'cloudpath', 'cloudpath', 'cloud', 'air'],
  ],
  objects: [{ type: 'lantern', x: 4, y: 1, action: 'inspect', label: 'A glowing sky lantern', result: 'The lantern glows among the clouds.' }],
  spawn: { x: 2, y: 3 }, exit: { x: 3, y: 0, label: 'Follow the clouds' },
}

function point(value: unknown): value is { x: number; y: number } {
  if (!value || typeof value !== 'object') return false
  const p = value as { x?: unknown; y?: unknown }
  return Number.isInteger(p.x) && Number.isInteger(p.y) && Number(p.x) >= 0 && Number(p.x) < WIDTH && Number(p.y) >= 0 && Number(p.y) < HEIGHT
}

function reachable(tiles: MapTile[][], start: { x: number; y: number }, end: { x: number; y: number }): boolean {
  const queue = [start]
  const visited = new Set<string>()
  while (queue.length) {
    const cell = queue.shift()!
    const key = `${cell.x},${cell.y}`
    if (visited.has(key) || tiles[cell.y][cell.x] === 'water' || tiles[cell.y][cell.x] === 'air') continue
    if (cell.x === end.x && cell.y === end.y) return true
    visited.add(key)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = cell.x + dx, y = cell.y + dy
      if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) queue.push({ x, y })
    }
  }
  return false
}

/** Discard malformed layout data rather than allowing model output into the renderer. */
export function validateMapSpec(value: unknown): typeof DEFAULT_MAP {
  if (!value || typeof value !== 'object') return DEFAULT_MAP
  const map = value as Record<string, unknown>
  if (!Array.isArray(map.tiles) || map.tiles.length !== HEIGHT || !map.tiles.every((row) => Array.isArray(row) && row.length === WIDTH && row.every((tile) => TILES.has(tile)))) return DEFAULT_MAP
  const tiles = map.tiles as MapTile[][]
  if (!point(map.spawn) || !point(map.exit) || typeof (map.exit as { label?: unknown }).label !== 'string') return DEFAULT_MAP
  if (!reachable(tiles, map.spawn, map.exit)) return DEFAULT_MAP
  const objects: MapObject[] = []
  if (Array.isArray(map.objects)) for (const raw of map.objects.slice(0, 5)) {
    if (!point(raw)) continue
    const object = raw as MapObject
    if (!OBJECTS.has(object.type) || !ACTIONS.has(object.action) || typeof object.label !== 'string' || typeof object.result !== 'string') continue
    if (tiles[object.y][object.x] === 'water' || tiles[object.y][object.x] === 'air') continue
    objects.push({ x: object.x, y: object.y, type: object.type, action: object.action, label: object.label.slice(0, 40), result: object.result.slice(0, 180) })
  }
  const exit = map.exit as { x: number; y: number; label: string }
  return { tiles, objects, spawn: map.spawn, exit: { x: exit.x, y: exit.y, label: exit.label.slice(0, 60) } }
}
