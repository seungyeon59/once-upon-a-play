import { BACKDROP_IDS, PROP_IDS, type BackdropId, type PropId } from '../src/content/mapAssets.ts'
import type { ImaginedScene, ScenePlacement } from '../src/state/types.ts'
import { filterCharacterReply } from './safety.ts'

const backgrounds = new Set<string>(BACKDROP_IDS)
const props = new Set<string>(PROP_IDS)

const finite = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max

export function validateScenePlan(value: unknown, castIds: string[]): Pick<ImaginedScene['map'], 'backdropId' | 'props' | 'cast'> {
  const draft = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const backdropId = backgrounds.has(String(draft.backdropId)) ? draft.backdropId as BackdropId : 'forest'
  const decorations: NonNullable<ImaginedScene['map']['props']> = []
  if (Array.isArray(draft.props)) for (const raw of draft.props.slice(0, 6)) {
    if (!raw || typeof raw !== 'object') continue
    const prop = raw as Record<string, unknown>
    const x = prop.x, y = prop.y
    if (!props.has(String(prop.id)) || !finite(x, 0.08, 0.92) || !finite(y, 0.25, 0.86)) continue
    if (decorations.some((item) => Math.abs(item.x - x) < 0.12 && Math.abs(item.y - y) < 0.12)) continue
    const id = prop.id as PropId
    const label = filterCharacterReply(String(prop.label ?? id).slice(0, 50), id).text.slice(0, 40)
    const result = filterCharacterReply(String(prop.result ?? '').slice(0, 200), 'You find something interesting.').text.slice(0, 160)
    decorations.push({ id, x, y, label, result })
  }
  const allowed = new Set(castIds.slice(0, 8))
  const placements: ScenePlacement[] = []
  if (Array.isArray(draft.cast)) for (const raw of draft.cast.slice(0, 8)) {
    if (!raw || typeof raw !== 'object') continue
    const placement = raw as Record<string, unknown>
    if (!allowed.has(String(placement.characterId)) || placements.some((item) => item.characterId === placement.characterId) || !finite(placement.x, 0.1, 0.9) || !finite(placement.y, 0.55, 0.88)) continue
    placements.push({ characterId: String(placement.characterId), x: placement.x, y: placement.y, scale: 0.8, facing: placement.x > 0.5 ? -1 : 1 })
  }
  return { backdropId, props: decorations, cast: placements }
}
