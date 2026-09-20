import type { Character, Flags, PlayerRole, Scene, SceneVariant, Tale } from '../../state/types.ts'
import { RED_RIDING_HOOD, getScene, resolveVariant } from './redRidingHood.ts'
import { getRoleView as redRidingHoodRoleView } from './roleViews.ts'
import { SNOW_WHITE } from './snowWhite.ts'
import { getRoleView as snowWhiteRoleView } from './snowWhiteRoleViews.ts'
import { CINDERELLA } from './cinderella.ts'
import { getRoleView as cinderellaRoleView } from './cinderellaRoleViews.ts'

export { getScene, resolveVariant }

/** Every playable tale, in the order the map-select screen offers them. */
export const TALES: Tale[] = [RED_RIDING_HOOD, SNOW_WHITE, CINDERELLA]

export function getTale(id: string): Tale | undefined {
  return TALES.find((tale) => tale.id === id)
}

/**
 * Each tale keeps its own role-view logic (its own scene ids and flags), so
 * this just routes to the right one. `redRidingHoodRoleView` is the fallback,
 * matching the app's original default before this tale registry existed.
 */
export function getRoleView(
  tale: Tale,
  scene: Scene,
  flags: Flags,
  role: PlayerRole,
  companionId: string | null = null,
  customCharacter: Character | null = null,
  companionNames: string[] = [],
  customCharacters: Character[] = [],
): { scene: Scene; variant: SceneVariant } {
  const view = tale.id === 'snow-white' ? snowWhiteRoleView
    : tale.id === 'cinderella' ? cinderellaRoleView
      : redRidingHoodRoleView
  return view(scene, flags, role, companionId, customCharacter, companionNames, customCharacters)
}
