import { create } from 'zustand'

import type {
  ChatTurn,
  Choice,
  Flags,
  StoryEntry,
  SuggestedChoice,
  PlayerRole,
  ImaginedScene,
  ImagineResponse,
} from './types.ts'
import { getScene, getTale, getRoleView } from '../content/tales/index.ts'
import { CODEX_CHARACTERS, getCharacter } from '../content/characters.ts'
import { requestReply } from '../api/chat.ts'
import { checkChildInput } from '../../server/safety.ts'
import { isTalent, isGoal, isCustomProfileText, type Talent, type Goal } from '../content/customProfile.ts'
import { shopItem, type AccessoryFit } from '../content/shopItems.ts'

const SAVE_KEY = 'tale-weaver:v1'

export type Screen = 'mapSelect' | 'play'

interface Saved {
  screen: Screen
  taleId: string | null
  sceneId: string
  flags: Flags
  log: StoryEntry[]
  dialogues: Record<string, ChatTurn[]>
  playerRole: PlayerRole
  companionId: string | null
  customCharacter: import('./types.ts').Character | null
  companionIds: string[]
  customCharacters: import('./types.ts').Character[]
  characterPositions: Record<string, Record<string, { x: number; y: number }>>
  codexDismissed: boolean
  imaginedScene: ImaginedScene | null
  coins: number
  foundSecrets: string[]
  ownedItems: string[]
  placedItems: Record<string, Array<{ id: string; x: number; y: number; size?: number }>>
  equippedItems: Record<string, string>
  accessoryFits: Record<string, AccessoryFit>
}

interface StoryStore extends Saved {
  /** Who the dialogue panel is open on. */
  activeCharacterId: string | null
  suggestions: SuggestedChoice[]
  pending: boolean
  /** A gentle in-world message from the safety layer. */
  notice: string | null
  /** Bumped on every spoken line so the stage can fire its talk animation. */
  speakTick: number
  llmSource: 'llm' | 'mock' | null
  imagining: boolean
  imagineNotice: string | null

  startTale: (taleId: string, role?: PlayerRole) => void
  backToMap: () => void
  resume: () => void
  openDialogue: (characterId: string) => void
  closeDialogue: () => void
  say: (text: string) => Promise<void>
  chooseAnchor: (choice: Choice) => void
  imagine: (idea: string, ending?: boolean) => Promise<void>
  interactMap: (result: string) => void
  updateMapProp: (index: number, changes: { x?: number; y?: number; size?: number }) => void
  removeMapProp: (index: number) => void
  addCompanion: (characterId: string) => void
  addScannedCompanion: (name: string, personality: string, imageDataUrl: string, talent?: Talent, goal?: Goal) => boolean
  moveCharacter: (characterId: string, x: number, y: number) => void
  dismissCodexOffer: () => void
  dismissNotice: () => void
  restart: () => void
  awardCoins: (amount: number) => void
  discoverSecret: (id: string) => boolean
  buyItem: (id: string) => boolean
  placeItem: (sceneKey: string, id: string) => boolean
  moveItem: (sceneKey: string, index: number, x: number, y: number) => void
  resizeItem: (sceneKey: string, index: number, size: number) => void
  removeItem: (sceneKey: string, index: number) => void
  equipItem: (characterId: string, id: string | null) => void
  setAccessoryFit: (characterId: string, id: string, changes: Partial<AccessoryFit>) => void
}

let entrySeq = 0
function entry(kind: StoryEntry['kind'], text: string, speaker?: string, sceneId?: string): StoryEntry {
  entrySeq += 1
  return { id: `e${Date.now()}-${entrySeq}`, kind, speaker, text, ts: Date.now(), sceneId }
}

function updateLatestMap(log: StoryEntry[], sceneId: string, map: ImaginedScene['map']): StoryEntry[] {
  const index = log.findLastIndex((item) => item.sceneId === sceneId && item.imaginedScene)
  if (index < 0) return log
  return log.map((item, current) => current === index && item.imaginedScene
    ? { ...item, imaginedScene: { ...item.imaginedScene, map } }
    : item)
}

const EMPTY: Saved = {
  screen: 'mapSelect',
  taleId: null,
  sceneId: '',
  flags: {},
  log: [],
  dialogues: {},
  playerRole: 'red',
  companionId: null,
  customCharacter: null,
  companionIds: [],
  customCharacters: [],
  characterPositions: {},
  codexDismissed: false,
  imaginedScene: null,
  coins: 0,
  foundSecrets: [],
  ownedItems: [],
  placedItems: {},
  equippedItems: {},
  accessoryFits: {},
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return EMPTY
    const saved = JSON.parse(raw) as Saved
    // A save from an older content version would point at a scene that no
    // longer exists; starting over is better than a blank stage.
    if (saved.taleId && !getTale(saved.taleId)) return EMPTY
    return {
      ...EMPTY, ...saved,
      playerRole: saved.playerRole ?? 'red',
      companionId: saved.companionId ?? null,
      customCharacter: saved.customCharacter ?? saved.customCharacters?.at(-1) ?? null,
      companionIds: saved.companionIds ?? (saved.companionId ? [saved.companionId] : []),
      customCharacters: saved.customCharacters ?? (saved.customCharacter ? [saved.customCharacter] : []),
      characterPositions: saved.characterPositions ?? {},
      codexDismissed: saved.codexDismissed ?? false,
      coins: saved.coins ?? 0,
      foundSecrets: saved.foundSecrets ?? [],
      ownedItems: saved.ownedItems ?? [],
      placedItems: saved.placedItems ?? {},
      equippedItems: saved.equippedItems ?? {},
      accessoryFits: saved.accessoryFits ?? {},
    }
  } catch {
    return EMPTY
  }
}

function persist(state: Saved): void {
  const { screen, taleId, sceneId, flags, log, dialogues, playerRole, companionId, companionIds, customCharacters, characterPositions, codexDismissed, imaginedScene, coins, foundSecrets, ownedItems, placedItems, equippedItems, accessoryFits } = state
  try {
    const savedScene = imaginedScene ? { ...imaginedScene, map: { ...imaginedScene.map, imageDataUrl: undefined } } : null
    const savedLog = log.map((item) => item.imaginedScene ? { ...item, imaginedScene: { ...item.imaginedScene, map: { ...item.imaginedScene.map, imageDataUrl: undefined } } } : item)
    localStorage.setItem(SAVE_KEY, JSON.stringify({ screen, taleId, sceneId, flags, log: savedLog, dialogues, playerRole, companionId, companionIds, customCharacters, characterPositions, codexDismissed, imaginedScene: savedScene, coins, foundSecrets, ownedItems, placedItems, equippedItems, accessoryFits }))
  } catch {
    // Private browsing or a full quota — play on, just without a save.
  }
}

export const useStory = create<StoryStore>((set, get) => ({
  ...EMPTY,
  activeCharacterId: null,
  suggestions: [],
  pending: false,
  notice: null,
  speakTick: 0,
  llmSource: null,
  imagining: false,
  imagineNotice: null,

  resume: () => {
    const saved = load()
    if (saved.taleId) {
      const next: Saved = { ...saved, screen: 'play' }
      set({ ...next, activeCharacterId: null, suggestions: [], pending: false, notice: null })
      persist(next)
    }
  },

  startTale: (taleId, playerRole = 'red') => {
    const tale = getTale(taleId)
    if (!tale) return
    const scene = getScene(tale, tale.startSceneId)
    if (!scene) return

    const next: Saved = {
      screen: 'play',
      taleId,
      sceneId: scene.id,
      flags: {},
      log: [entry('narration', getRoleView(tale, scene, {}, playerRole).variant.narration, undefined, scene.id)],
      dialogues: {},
      playerRole,
      companionId: null,
      customCharacter: null,
      companionIds: [],
      customCharacters: [],
      characterPositions: {},
      codexDismissed: false,
      imaginedScene: null,
      coins: get().taleId ? get().coins : load().coins,
      foundSecrets: [],
      ownedItems: get().taleId ? get().ownedItems : load().ownedItems,
      placedItems: {},
      equippedItems: get().taleId ? get().equippedItems : load().equippedItems,
      accessoryFits: get().taleId ? get().accessoryFits : load().accessoryFits,
    }
    set({ ...next, activeCharacterId: null, suggestions: [], notice: null })
    persist(next)
  },

  backToMap: () => {
    set({ screen: 'mapSelect', activeCharacterId: null })
    persist({ ...get(), screen: 'mapSelect' })
  },

  restart: () => {
    localStorage.removeItem(SAVE_KEY)
    set({ ...EMPTY, activeCharacterId: null, suggestions: [], notice: null, llmSource: null })
  },

  awardCoins: (amount) => {
    if (!Number.isInteger(amount) || amount < 1 || amount > 100) return
    const next = { ...get(), coins: get().coins + amount }
    set(next)
    persist(next)
  },

  discoverSecret: (id) => {
    if (!id || get().foundSecrets.includes(id)) return false
    const next = { ...get(), foundSecrets: [...get().foundSecrets, id] }
    set(next)
    persist(next)
    return true
  },

  buyItem: (id) => {
    const item = shopItem(id)
    const state = get()
    if (!item || state.ownedItems.includes(id) || state.coins < item.price) return false
    const next = { ...state, coins: state.coins - item.price, ownedItems: [...state.ownedItems, id] }
    set(next)
    persist(next)
    return true
  },

  placeItem: (sceneKey, id) => {
    const state = get()
    const item = shopItem(id)
    if (!sceneKey || !item || item.category !== 'map' || !state.ownedItems.includes(id) || (state.placedItems[sceneKey]?.length ?? 0) >= 30) return false
    const existing = state.placedItems[sceneKey] ?? []
    const next = { ...state, placedItems: { ...state.placedItems, [sceneKey]: [...existing, { id, x: 0.36 + (existing.length % 4) * 0.09, y: 0.68 + (Math.floor(existing.length / 4) % 3) * 0.06 }] } }
    set(next)
    persist(next)
    return true
  },

  moveItem: (sceneKey, index, x, y) => {
    const state = get()
    const items = state.placedItems[sceneKey]
    if (!items || !Number.isInteger(index) || index < 0 || index >= items.length || !Number.isFinite(x) || !Number.isFinite(y) || x < 0.05 || x > 0.95 || y < 0.12 || y > 0.92) return
    const next = { ...state, placedItems: { ...state.placedItems, [sceneKey]: items.map((item, i) => i === index ? { ...item, x, y } : item) } }
    set(next)
    persist(next)
  },

  resizeItem: (sceneKey, index, size) => {
    const state = get()
    const items = state.placedItems[sceneKey]
    if (!items || !Number.isInteger(index) || index < 0 || index >= items.length || !Number.isFinite(size) || size < 0.5 || size > 2.5) return
    const next = { ...state, placedItems: { ...state.placedItems, [sceneKey]: items.map((item, i) => i === index ? { ...item, size } : item) } }
    set(next)
    persist(next)
  },

  removeItem: (sceneKey, index) => {
    const state = get()
    const items = state.placedItems[sceneKey]
    if (!items || !Number.isInteger(index) || index < 0 || index >= items.length) return
    const next = { ...state, placedItems: { ...state.placedItems, [sceneKey]: items.filter((_, i) => i !== index) } }
    set(next)
    persist(next)
  },

  equipItem: (characterId, id) => {
    const state = get()
    if (!characterId || (id !== null && (!state.ownedItems.includes(id) || shopItem(id)?.category !== 'character'))) return
    const equippedItems = { ...state.equippedItems }
    if (id === null) delete equippedItems[characterId]
    else equippedItems[characterId] = id
    const next = { ...state, equippedItems }
    set(next)
    persist(next)
  },

  setAccessoryFit: (characterId, id, changes) => {
    const state = get()
    if (!characterId || !state.ownedItems.includes(id) || shopItem(id)?.category !== 'character') return
    const key = `${characterId}:${id}`
    const previous = state.accessoryFits[key]
    const fit = { x: changes.x ?? previous?.x ?? 0, y: changes.y ?? previous?.y ?? 0, scale: changes.scale ?? previous?.scale ?? 1 }
    if (![fit.x, fit.y, fit.scale].every(Number.isFinite) || fit.x < -0.4 || fit.x > 0.4 || fit.y < -0.35 || fit.y > 0.35 || fit.scale < 0.5 || fit.scale > 1.8) return
    const next = { ...state, accessoryFits: { ...state.accessoryFits, [key]: fit } }
    set(next)
    persist(next)
  },

  openDialogue: (characterId) => {
    if (characterId === get().playerRole) return
    set({ activeCharacterId: characterId, notice: null })
    const { dialogues } = get()
    const character = getCharacter(characterId) ?? get().customCharacters.find((candidate) => candidate.id === characterId)
    // First time meeting them: offer openers so a blank input is never the only way in.
    if (character && (dialogues[characterId]?.length ?? 0) === 0) {
      set({
        suggestions: character.starters.map((label, index) => ({ id: `start-${index}`, label })),
      })
    } else {
      set({ suggestions: [] })
    }
  },

  closeDialogue: () => set({ activeCharacterId: null, suggestions: [], notice: null }),

  dismissNotice: () => set({ notice: null }),

  say: async (text) => {
    const state = get()
    const characterId = state.activeCharacterId
    const tale = state.taleId ? getTale(state.taleId) : undefined
    const character = characterId ? getCharacter(characterId) ?? state.customCharacters.find((candidate) => candidate.id === characterId) : undefined
    const scene = tale ? getScene(tale, state.sceneId) : undefined
    if (!characterId || !character || !tale || !scene || state.pending) return

    const variant = getRoleView(tale, scene, state.flags, state.playerRole, state.companionId, state.customCharacter, state.companionIds.map((id) => getCharacter(id)?.name ?? state.customCharacters.find((item) => item.id === id)?.name ?? id), state.customCharacters).variant
    const history = state.dialogues[characterId] ?? []

    const withSaid: Saved = {
      ...state,
      log: [...state.log, entry('say', text, 'You', state.sceneId)],
      dialogues: { ...state.dialogues, [characterId]: [...history, { role: 'child', text }] },
    }
    set({ ...withSaid, pending: true, suggestions: [], notice: null })

    const response = await requestReply({
      taleId: tale.id,
      characterId,
      playerRole: state.playerRole,
      companionId: state.companionId,
      companionNames: state.companionIds.map((id) => getCharacter(id)?.name ?? state.customCharacters.find((item) => item.id === id)?.name ?? id),
      companionProfiles: state.customCharacters.filter((item) => state.companionIds.includes(item.id)).map((item) => ({ id: item.id, name: item.name, personality: item.personality ?? '', talent: item.talent, goal: item.goal })),
      customCharacter: character?.imageDataUrl
        ? { id: character.id, name: character.name, personality: character.personality ?? '', talent: character.talent, goal: character.goal }
        : undefined,
      sceneTitle: scene.title,
      objective: scene.objective,
      narration: state.imaginedScene?.narration ?? variant.narration,
      flags: state.flags,
      // Keep the window short: the scene context carries the story, not the transcript.
      history: history.slice(-8),
      playerText: text,
      recentStory: state.log.slice(-8).map((item) => item.text),
    })

    if (response.blocked) {
      // Roll the child's line back out of the story — it never happened in-world.
      const rolledBack: Saved = {
        ...withSaid,
        log: state.log,
        dialogues: { ...state.dialogues, [characterId]: history },
      }
      set({
        ...rolledBack,
        pending: false,
        notice: response.blocked.message,
        suggestions: character.starters.map((label, index) => ({ id: `retry-${index}`, label })),
      })
      persist(rolledBack)
      return
    }

    const next: Saved = {
      ...withSaid,
      log: [...withSaid.log, entry('reply', response.reply, character.name, state.sceneId)],
      dialogues: {
        ...withSaid.dialogues,
        [characterId]: [
          ...(withSaid.dialogues[characterId] ?? []),
          { role: 'character', text: response.reply },
        ],
      },
    }
    set({
      ...next,
      pending: false,
      suggestions: response.suggestedChoices,
      speakTick: get().speakTick + 1,
      llmSource: response.source,
    })
    persist(next)
  },

  chooseAnchor: (choice) => {
    const state = get()
    const tale = state.taleId ? getTale(state.taleId) : undefined
    if (!tale) return

    const flags: Flags = { ...state.flags, ...(choice.effects.setFlags ?? {}) }
    const log = [...state.log, entry('choice', choice.label, 'You', state.sceneId)]
    if (choice.effects.narration) log.push(entry('narration', choice.effects.narration, undefined, state.sceneId))

    let sceneId = state.sceneId
    if (choice.effects.goToScene) {
      const nextScene = getScene(tale, choice.effects.goToScene)
      if (nextScene) {
        sceneId = nextScene.id
        // The variant is picked with the *new* flags — this is where an earlier
        // choice becomes visible in a later scene.
        log.push(entry('narration', getRoleView(tale, nextScene, flags, state.playerRole, state.companionId, state.customCharacter, state.companionIds.map((id) => getCharacter(id)?.name ?? state.customCharacters.find((item) => item.id === id)?.name ?? id), state.customCharacters).variant.narration, undefined, nextScene.id))
      }
    }

    const next: Saved = { ...state, flags, log, sceneId, imaginedScene: choice.effects.goToScene ? null : state.imaginedScene }
    set({
      ...next,
      // A new scene is a fresh conversation.
      activeCharacterId: null,
      suggestions: [],
      notice: null,
    })
    persist(next)
  },

  imagine: async (idea, ending = false) => {
    const state = get()
    const tale = state.taleId ? getTale(state.taleId) : undefined
    const scene = tale ? getScene(tale, state.sceneId) : undefined
    if (!tale || !scene || scene.ending || state.imaginedScene?.ending || get().imagining) return
    const verdict = checkChildInput(idea)
    if (!verdict.ok) { set({ imagineNotice: verdict.childFacingMessage }); return }
    const view = getRoleView(tale, scene, state.flags, state.playerRole, state.companionId, state.customCharacter, state.companionIds.map((id) => getCharacter(id)?.name ?? state.customCharacters.find((item) => item.id === id)?.name ?? id), state.customCharacters)
    set({ imagining: true, imagineNotice: null })
    try {
      const response = await fetch('/api/imagine', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idea: verdict.text, ending, storyState: state.imaginedScene?.storyState, sceneTitle: state.imaginedScene?.title ?? scene.title, narration: state.imaginedScene?.narration ?? view.variant.narration, playerRole: state.playerRole, cast: [...new Set([...view.scene.cast, ...(view.variant.addCast ?? [])].map((actor) => actor.characterId).concat(state.companionIds))], companions: state.companionIds.map((id) => getCharacter(id)?.name ?? state.customCharacters.find((item) => item.id === id)?.name ?? id), companionProfiles: state.customCharacters.filter((item) => state.companionIds.includes(item.id)).map((item) => ({ id: item.id, name: item.name, personality: item.personality ?? '', talent: item.talent, goal: item.goal })), recentStory: state.log.slice(-8).map((item) => item.text), flags: state.flags }),
      })
      if (!response.ok) {
        if (response.status === 429) {
          const seconds = Number(response.headers?.get('Retry-After'))
          const wait = Number.isFinite(seconds) && seconds > 0 ? ` Try again in about ${Math.ceil(seconds / 60)} minutes.` : ' Please try again later.'
          set({ imagineNotice: `Scene creation limit reached.${wait}` })
          return
        }
        throw new Error(`Story request failed: ${response.status}`)
      }
      const result = await response.json() as ImagineResponse
      if (result.blocked) { set({ imagineNotice: result.blocked.message }); return }
      if (!result.scene?.narration) throw new Error('Empty story response')
      const current = get()
      if (current.sceneId !== state.sceneId || current.taleId !== state.taleId) return
      const sceneEntry = { ...entry('narration', result.scene.narration, undefined, current.sceneId), imaginedScene: result.scene }
      const next: Saved = { ...current, coins: current.coins + 3, imaginedScene: result.scene, characterPositions: { ...current.characterPositions, [current.sceneId]: {} }, flags: { ...current.flags, ...result.setFlags }, log: [...current.log, entry('choice', verdict.text, 'You', current.sceneId), sceneEntry] }
      set({ ...next, imagineNotice: null, activeCharacterId: null })
      persist(next)
    } catch (error) {
      console.error('[imagine]', error)
      set({ imagineNotice: 'The story server is not connected. Please start the local API server and try again.' })
    } finally { set({ imagining: false }) }
  },

  interactMap: (result) => {
    const state = get()
    if (!state.imaginedScene || typeof result !== 'string') return
    const verdict = checkChildInput(result.slice(0, 180))
    if (!verdict.ok) return
    const next: Saved = { ...state, log: [...state.log, entry('narration', verdict.text, undefined, state.sceneId)] }
    set({ ...next, imagineNotice: verdict.text })
    persist(next)
  },

  updateMapProp: (index, changes) => {
    const state = get()
    const scene = state.imaginedScene
    const props = scene?.map.props
    if (!scene?.map.backdropId || !props || !Number.isInteger(index) || index < 0 || index >= props.length) return
    const original = props[index]
    const x = changes.x ?? original.x
    const y = changes.y ?? original.y
    const size = changes.size ?? original.size ?? 1
    if (![x, y, size].every(Number.isFinite) || x < 0.06 || x > 0.94 || y < 0.12 || y > 0.9 || size < 0.6 || size > 1.8) return
    const updatedProps = props.map((prop, currentIndex) => currentIndex === index ? { ...prop, x, y, size } : prop)
    const map = { ...scene.map, props: updatedProps }
    const next: Saved = { ...state, imaginedScene: { ...scene, map }, log: updateLatestMap(state.log, state.sceneId, map) }
    set(next)
    persist(next)
  },

  removeMapProp: (index) => {
    const state = get()
    const scene = state.imaginedScene
    const props = scene?.map.props
    if (!scene?.map.backdropId || !props || !Number.isInteger(index) || index < 0 || index >= props.length) return
    const map = { ...scene.map, props: props.filter((_, currentIndex) => currentIndex !== index) }
    const next: Saved = { ...state, imaginedScene: { ...scene, map }, log: updateLatestMap(state.log, state.sceneId, map) }
    set(next)
    persist(next)
  },

  addCompanion: (characterId) => {
    const state = get()
    const character = CODEX_CHARACTERS.find((candidate) => candidate.id === characterId)
    const scene = state.taleId ? getScene(getTale(state.taleId)!, state.sceneId) : undefined
    if (!character || !scene || scene.ending || state.companionIds.includes(characterId)) return
    const next: Saved = {
      ...state,
      companionId: characterId,
      companionIds: [...state.companionIds, characterId],
      codexDismissed: true,
      log: [...state.log, entry('narration', `${character.name} joins you on the path. ${character.title} is ready to talk.`, undefined, state.sceneId)],
    }
    set({ ...next, activeCharacterId: null, suggestions: [], notice: null })
    persist(next)
  },

  addScannedCompanion: (name, personality, imageDataUrl, talent, goal) => {
    const state = get()
    const cleanName = name.trim()
    const cleanPersonality = personality.trim()
    const personalityVerdict = checkChildInput(cleanPersonality)
    const scene = state.taleId ? getScene(getTale(state.taleId)!, state.sceneId) : undefined
    if (!scene || scene.ending ||
      !/^[\p{L}\p{N} .'-]{1,24}$/u.test(cleanName) || cleanPersonality.length < 2 || cleanPersonality.length > 100 ||
      !personalityVerdict.ok || !isCustomProfileText(cleanPersonality) || (talent !== undefined && !isTalent(talent) && (!isCustomProfileText(talent) || !checkChildInput(talent).ok)) || (goal !== undefined && !isGoal(goal) && (!isCustomProfileText(goal) || !checkChildInput(goal).ok)) || !/^data:image\/png;base64,/.test(imageDataUrl)) return false
    const id = `custom-${Date.now()}${Math.floor(Math.random() * 1000)}`
    const customCharacter: import('./types.ts').Character = {
      id,
      name: cleanName,
      title: 'Your drawing, brought into the story',
      traits: [cleanPersonality],
      personality: cleanPersonality,
      talent,
      goal,
      persona: { role: 'A child-created story companion.', voice: cleanPersonality, wants: goal ? `To ${goal}.` : 'To join the group on the path.', knows: talent ? [`They are good at ${talent}.`] : [], neverDoes: [] },
      art: { body: 0x719579, accent: 0xe4b363, skin: 0xe8ceb1, silhouette: 'child', height: 150 },
      imageDataUrl,
      starters: [`Say hello to ${cleanName}`, `Ask ${cleanName} about the forest`, `Invite ${cleanName} along`],
      safeFallback: `${cleanName} smiles and waits for you to go on.`,
    }
    const next: Saved = {
      ...state,
      companionId: id,
      customCharacter,
      companionIds: [...state.companionIds, id],
      customCharacters: [...state.customCharacters, customCharacter],
      codexDismissed: true,
      log: [...state.log, entry('narration', `${cleanName} steps out of your drawing and joins the story.`, undefined, state.sceneId)],
    }
    set({ ...next, activeCharacterId: null, suggestions: [], notice: null })
    persist(next)
    return true
  },

  moveCharacter: (characterId, x, y) => {
    const state = get()
    if (!state.taleId || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) return
    const next: Saved = {
      ...state,
      characterPositions: {
        ...state.characterPositions,
        [state.sceneId]: { ...state.characterPositions[state.sceneId], [characterId]: { x, y } },
      },
    }
    set(next)
    persist(next)
  },

  dismissCodexOffer: () => {
    const next: Saved = { ...get(), codexDismissed: true }
    set(next)
    persist(next)
  },
}))

/** Derived: the scene and variant currently on screen. */
export function useCurrentScene() {
  const taleId = useStory((s) => s.taleId)
  const sceneId = useStory((s) => s.sceneId)
  const flags = useStory((s) => s.flags)

  const tale = taleId ? getTale(taleId) : undefined
  const scene = tale ? getScene(tale, sceneId) : undefined
  const playerRole = useStory((s) => s.playerRole)
  const companionId = useStory((s) => s.companionId)
  const customCharacter = useStory((s) => s.customCharacter)
  const companionIds = useStory((s) => s.companionIds)
  const customCharacters = useStory((s) => s.customCharacters)
  const companionNames = companionIds.map((id) => getCharacter(id)?.name ?? customCharacters.find((item) => item.id === id)?.name ?? id)
  const view = tale && scene ? getRoleView(tale, scene, flags, playerRole, companionId, customCharacter, companionNames, customCharacters) : undefined
  return { tale, scene: view?.scene, variant: view?.variant }
}
