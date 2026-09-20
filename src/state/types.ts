/**
 * Shared vocabulary for the whole app. The server imports the protocol types
 * from here too (type-only imports, so nothing is resolved at runtime).
 */

export type SceneId = string
export type CharacterId = string
/** A tale's protagonist id, one of its supporting characters' ids, or 'visitor'. Each tale declares its own set via `Tale.roles`. */
export type PlayerRole = string
export type FlagValue = string | boolean
export type Flags = Record<string, FlagValue>

/* ------------------------------------------------------------------ art --- */

/**
 * Placeholder art is described as data, not drawn by hand. When real PNG
 * illustrations arrive we swap the texture source and keep every animation.
 */
export interface CharacterArt {
  body: number
  accent: number
  skin: number
  /** Silhouette hint used by the placeholder painter. */
  silhouette: 'child' | 'wolf' | 'elder'
  /** Pixels tall at scale 1. */
  height: number
}

export type BackdropKind =
  | 'forest-path' | 'fork' | 'cottage' | 'hearth'
  | 'castle-courtyard' | 'castle-garden' | 'castle-kitchen' | 'castle-hall'
  | 'castle-scullery' | 'castle-corridor' | 'castle-terrace' | 'ballroom'

/* ------------------------------------------------------------ character --- */

/** Everything the LLM needs to stay in character, plus what the codex shows. */
export interface Persona {
  /** Who they are in one line. */
  role: string
  /** How they talk — cadence, vocabulary, tics. */
  voice: string
  /** What they want in this story. Drives their questions back to the child. */
  wants: string
  /** Facts they know. The model must not invent beyond these. */
  knows: string[]
  /** Hard behavioural limits, on top of the global safety rules. */
  neverDoes: string[]
}

export interface Character {
  id: CharacterId
  name: string
  /** Codex subtitle, e.g. "The hungry wolf". */
  title: string
  /** Codex chips, e.g. ['curious', 'lonely']. */
  traits: string[]
  persona: Persona
  art: CharacterArt
  /** Three openers shown the first time a child talks to them, so the blank input is never the only option. */
  starters: string[]
  /** Shown verbatim when the safety layer replaces a reply. Must stay in voice. */
  safeFallback: string
  /** A scanned, transparent PNG kept in the browser for a child-created character. */
  imageDataUrl?: string
  personality?: string
  talent?: import('../content/customProfile.ts').Talent
  goal?: import('../content/customProfile.ts').Goal
}

/* ---------------------------------------------------------------- story --- */

export interface ChoiceEffects {
  setFlags?: Flags
  /** Only authored anchors may move the story. LLM suggestions never can. */
  goToScene?: SceneId
  /** Narration appended to the log after the choice resolves. */
  narration?: string
}

export interface Choice {
  id: string
  label: string
  kind: 'say' | 'act'
  effects: ChoiceEffects
}

export interface ScenePlacement {
  characterId: CharacterId
  /** Fractions of stage width/height so the layout survives any canvas size. */
  x: number
  y: number
  scale: number
  facing: 1 | -1
}

/**
 * One version of a scene. The first variant whose `when` passes is the one the
 * child sees — this is how earlier choices visibly change a later scene.
 */
export interface SceneVariant {
  id: string
  when?: (flags: Flags) => boolean
  narration: string
  addCast?: ScenePlacement[]
  anchors: Choice[]
}

export interface Scene {
  id: SceneId
  title: string
  backdrop: BackdropKind
  /** A one-line nudge — the "weak guidance" that keeps immersion up. */
  objective: string
  cast: ScenePlacement[]
  variants: SceneVariant[]
  /** Ending scenes have no anchors and show the storybook card instead. */
  ending?: { title: string; blurb: string }
}

export interface TaleRole {
  id: PlayerRole
  title: string
  description: string
}

export interface Tale {
  id: string
  title: string
  tagline: string
  backdrop: BackdropKind
  startSceneId: SceneId
  scenes: Scene[]
  characters: Character[]
  /** Who the child can play as, offered in this order after a map is picked. */
  roles: TaleRole[]
}

/* ------------------------------------------------------------------ log --- */

export type StoryEntryKind = 'narration' | 'say' | 'reply' | 'choice' | 'system'

export interface StoryEntry {
  id: string
  kind: StoryEntryKind
  /** Character name for 'reply', 'You' for 'say'/'choice', absent for narration. */
  speaker?: string
  text: string
  ts: number
  /** Scene active when this moment happened, for illustrated storybook pages. */
  sceneId?: SceneId
  /** Snapshot of a child-created scene, so each map keeps its own book page. */
  imaginedScene?: ImaginedScene
}

/* ------------------------------------------------------------- protocol --- */

export interface ChatTurn {
  role: 'child' | 'character'
  text: string
}

export interface ChatRequest {
  taleId: string
  characterId: CharacterId
  playerRole: PlayerRole
  companionId?: CharacterId | null
  companionNames?: string[]
  companionProfiles?: CompanionProfile[]
  customCharacter?: { id: string; name: string; personality: string; talent?: import('../content/customProfile.ts').Talent; goal?: import('../content/customProfile.ts').Goal }
  sceneTitle: string
  objective: string
  narration: string
  flags: Flags
  history: ChatTurn[]
  playerText: string
  recentStory?: string[]
}

export interface CompanionProfile { id: string; name: string; personality: string; talent?: string; goal?: string }

/** A suggestion carries no effects on purpose — clicking it just says the line. */
export interface SuggestedChoice {
  id: string
  label: string
}

export interface ChatResponse {
  reply: string
  suggestedChoices: SuggestedChoice[]
  /** Set when the child's own message was stopped before reaching the model. */
  blocked?: { reason: string; message: string }
  source: 'llm' | 'mock'
}

export interface ImagineRequest {
  idea: string
  sceneTitle: string
  narration: string
  playerRole: PlayerRole
  companions: string[]
  companionProfiles?: CompanionProfile[]
  recentStory: string[]
  flags: Flags
  cast?: string[]
  storyState?: StoryState
  ending?: boolean
}

export interface StoryState {
  discoveries: string[]
  promises: string[]
  openThreads: string[]
}

/** A short sequence of whole-sprite actions performed when a generated scene appears. */
export interface SceneAction {
  characterId: string
  action: 'walk' | 'gesture' | 'look'
  x?: number
  y?: number
}

export interface ImaginedScene {
  title: string
  narration: string
  setting: string
  choices?: string[]
  storyState?: StoryState
  ending?: boolean
  actions?: SceneAction[]
  map: {
    backdropId?: import('../content/mapAssets.ts').BackdropId
    props?: Array<{ id: import('../content/mapAssets.ts').PropId; x: number; y: number; size?: number; label: string; result: string }>
    cast?: ScenePlacement[]
    imageId?: string
    imageDataUrl?: string
    theme: 'forest' | 'meadow' | 'stream' | 'mountain' | 'night' | 'sky'
    landmark: 'bridge' | 'tower' | 'pond' | 'garden' | 'cottage' | 'floating-island' | 'none'
    tiles?: MapTile[][]
    objects?: MapObject[]
    spawn?: MapPoint
    exit?: MapPoint & { label: string }
  }
}

export type MapTile = 'grass' | 'path' | 'water' | 'stone' | 'flowers' | 'cloud' | 'cloudpath' | 'air'
export interface MapPoint { x: number; y: number }
export interface MapObject extends MapPoint {
  type: 'bridge' | 'tower' | 'pond' | 'garden' | 'cottage' | 'lantern' | 'tree'
  label: string
  action: 'inspect' | 'cross' | 'enter'
  result: string
}

export interface ImagineResponse {
  scene: ImaginedScene
  setFlags: Flags
  source: 'llm' | 'mock'
  blocked?: { message: string }
}
