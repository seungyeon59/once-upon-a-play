import { create } from 'zustand'

import type {
  ChatTurn,
  Choice,
  Flags,
  StoryEntry,
  SuggestedChoice,
  PlayerRole,
} from './types.ts'
import { getScene, getTale } from '../content/tales/redRidingHood.ts'
import { getRoleView } from '../content/tales/roleViews.ts'
import { CODEX_CHARACTERS, getCharacter } from '../content/characters.ts'
import { requestReply } from '../api/chat.ts'
import { checkChildInput } from '../../server/safety.ts'
import { isTalent, isGoal, type Talent, type Goal } from '../content/customProfile.ts'

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

  startTale: (taleId: string, role?: PlayerRole) => void
  backToMap: () => void
  resume: () => void
  openDialogue: (characterId: string) => void
  closeDialogue: () => void
  say: (text: string) => Promise<void>
  chooseAnchor: (choice: Choice) => void
  addCompanion: (characterId: string) => void
  addScannedCompanion: (name: string, personality: string, imageDataUrl: string, talent?: Talent, goal?: Goal) => boolean
  moveCharacter: (characterId: string, x: number, y: number) => void
  dismissCodexOffer: () => void
  dismissNotice: () => void
  restart: () => void
}

let entrySeq = 0
function entry(kind: StoryEntry['kind'], text: string, speaker?: string, sceneId?: string): StoryEntry {
  entrySeq += 1
  return { id: `e${Date.now()}-${entrySeq}`, kind, speaker, text, ts: Date.now(), sceneId }
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
    }
  } catch {
    return EMPTY
  }
}

function persist(state: Saved): void {
  try {
    const { screen, taleId, sceneId, flags, log, dialogues, playerRole, companionId, companionIds, customCharacters, characterPositions, codexDismissed } = state
    localStorage.setItem(SAVE_KEY, JSON.stringify({ screen, taleId, sceneId, flags, log, dialogues, playerRole, companionId, companionIds, customCharacters, characterPositions, codexDismissed }))
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
      log: [entry('narration', getRoleView(scene, {}, playerRole).variant.narration, undefined, scene.id)],
      dialogues: {},
      playerRole,
      companionId: null,
      customCharacter: null,
      companionIds: [],
      customCharacters: [],
      characterPositions: {},
      codexDismissed: false,
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
    if (!characterId || !character || !scene || state.pending) return

    const variant = getRoleView(scene, state.flags, state.playerRole, state.companionId, state.customCharacter, state.companionIds.map((id) => getCharacter(id)?.name ?? state.customCharacters.find((item) => item.id === id)?.name ?? id), state.customCharacters).variant
    const history = state.dialogues[characterId] ?? []

    const withSaid: Saved = {
      ...state,
      log: [...state.log, entry('say', text, 'You', state.sceneId)],
      dialogues: { ...state.dialogues, [characterId]: [...history, { role: 'child', text }] },
    }
    set({ ...withSaid, pending: true, suggestions: [], notice: null })

    const response = await requestReply({
      characterId,
      playerRole: state.playerRole,
      companionId: state.companionId,
      companionNames: state.companionIds.map((id) => getCharacter(id)?.name ?? state.customCharacters.find((item) => item.id === id)?.name ?? id),
      customCharacter: character?.imageDataUrl
        ? { id: character.id, name: character.name, personality: character.personality ?? '', talent: character.talent, goal: character.goal }
        : undefined,
      sceneTitle: scene.title,
      objective: scene.objective,
      narration: variant.narration,
      flags: state.flags,
      // Keep the window short: the scene context carries the story, not the transcript.
      history: history.slice(-8),
      playerText: text,
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
        log.push(entry('narration', getRoleView(nextScene, flags, state.playerRole, state.companionId, state.customCharacter, state.companionIds.map((id) => getCharacter(id)?.name ?? state.customCharacters.find((item) => item.id === id)?.name ?? id), state.customCharacters).variant.narration, undefined, nextScene.id))
      }
    }

    const next: Saved = { ...state, flags, log, sceneId }
    set({
      ...next,
      // A new scene is a fresh conversation.
      activeCharacterId: null,
      suggestions: [],
      notice: null,
    })
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
      !personalityVerdict.ok || (talent !== undefined && !isTalent(talent)) || (goal !== undefined && !isGoal(goal)) || !/^data:image\/png;base64,/.test(imageDataUrl)) return false
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
  const view = scene ? getRoleView(scene, flags, playerRole, companionId, customCharacter, companionNames, customCharacters) : undefined
  return { tale, scene: view?.scene, variant: view?.variant }
}
