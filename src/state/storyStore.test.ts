import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import type { ChatRequest, ChatResponse } from './types.ts'

/* ----------------------------------------------------- browser stand-ins --- */

const store = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size
  },
} as Storage

/** Records what the UI would have sent to /api/chat, and replies as the server would. */
let sentRequests: ChatRequest[] = []
let nextResponse: ChatResponse = {
  reply: 'Gray sniffs the basket. "Muffins? How far is her cottage?"',
  suggestedChoices: [{ id: 'a', label: 'Tell him it is past the meadow' }],
  source: 'mock',
}

;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async (_url: string, init: RequestInit) => {
  sentRequests.push(JSON.parse(String(init.body)) as ChatRequest)
  return { ok: true, json: async () => nextResponse } as Response
}) as typeof fetch

const { useStory } = await import('./storyStore.ts')

beforeEach(() => {
  store.clear()
  sentRequests = []
  useStory.getState().restart()
})

/* ------------------------------------------------------------------ tests --- */

test('starting a tale opens the first scene and seeds the log', () => {
  useStory.getState().startTale('red-riding-hood')
  const state = useStory.getState()

  assert.equal(state.screen, 'play')
  assert.equal(state.sceneId, 'forest-path')
  assert.equal(state.log.length, 1)
  assert.equal(state.log[0].kind, 'narration')
  assert.ok(localStorage.getItem('tale-weaver:v1'), 'progress should be saved')
})

test('opening a character offers their starters', () => {
  useStory.getState().startTale('red-riding-hood')
  useStory.getState().openDialogue('wolf')

  const state = useStory.getState()
  assert.equal(state.activeCharacterId, 'wolf')
  assert.equal(state.suggestions.length, 3)
})

test('talking sends the live scene context and records both sides', async () => {
  useStory.getState().startTale('red-riding-hood')
  useStory.getState().openDialogue('wolf')
  await useStory.getState().say('Why are you following me?')

  const sent = sentRequests.at(-1)!
  assert.equal(sent.characterId, 'wolf')
  assert.equal(sent.sceneTitle, 'The Path Through the Grey Wood')
  assert.ok(sent.narration.includes('basket'), 'the model gets the narration the child is reading')

  const state = useStory.getState()
  assert.deepEqual(
    state.log.slice(-2).map((entry) => entry.kind),
    ['say', 'reply'],
  )
  assert.equal(state.dialogues.wolf.length, 2)
  assert.equal(state.suggestions.length, 1)
})

test('a blocked line is rolled back out of the story entirely', async () => {
  useStory.getState().startTale('red-riding-hood')
  useStory.getState().openDialogue('wolf')
  const before = useStory.getState().log.length

  nextResponse = {
    reply: '',
    suggestedChoices: [],
    blocked: { reason: 'self-disclosed-pii', message: 'Keep your real-life details private.' },
    source: 'mock',
  }
  await useStory.getState().say('My name is Mina and I live in Pittsburgh')

  const state = useStory.getState()
  assert.equal(state.log.length, before, 'the blocked line never enters the story')
  assert.equal(state.dialogues.wolf?.length ?? 0, 0)
  assert.equal(state.notice, 'Keep your real-life details private.')
  assert.equal(state.suggestions.length, 3, 'the child is offered a way back in')
})

test('a full playthrough accumulates one readable story and reaches an ending', () => {
  const api = useStory.getState()
  api.startTale('red-riding-hood')

  const pick = (id: string) => {
    const state = useStory.getState()
    const { variant } = pickVariant(state.sceneId, state.flags)
    const choice = variant.anchors.find((anchor) => anchor.id === id)!
    assert.ok(choice, `no choice "${id}" in scene ${state.sceneId}`)
    useStory.getState().chooseAnchor(choice)
  }

  pick('share-muffin')
  assert.equal(useStory.getState().flags.wolfFriendly, true)
  assert.equal(useStory.getState().sceneId, 'fork')

  pick('take-short')
  assert.equal(useStory.getState().sceneId, 'cottage')

  pick('introduce')

  const state = useStory.getState()
  assert.equal(state.sceneId, 'ending-friend')
  // narration, choice+narration x3 (the last has no narration of its own), ending narration
  assert.ok(state.log.length >= 7, `expected an accumulated story, got ${state.log.length} entries`)
  assert.equal(state.log.filter((entry) => entry.kind === 'choice').length, 3)
  assert.ok(
    state.log.every((entry) => entry.text.trim().length > 0),
    'no empty entries in the storybook',
  )
  assert.equal(useStory.getState().activeCharacterId, null, 'a new scene closes the old conversation')
})

test('progress survives a reload', () => {
  useStory.getState().startTale('red-riding-hood')
  const { variant } = pickVariant('forest-path', {})
  useStory.getState().chooseAnchor(variant.anchors[0])
  const before = useStory.getState()

  // Simulate a fresh page load: wipe in-memory state, keep localStorage.
  useStory.setState({ screen: 'mapSelect', taleId: null, sceneId: '', flags: {}, log: [], dialogues: {} })
  useStory.getState().resume()

  const after = useStory.getState()
  assert.equal(after.sceneId, before.sceneId)
  assert.deepEqual(after.flags, before.flags)
  assert.equal(after.log.length, before.log.length)
})

test('playing as Gray changes the viewpoint and prevents talking to yourself', async () => {
  useStory.getState().startTale('red-riding-hood', 'wolf')
  assert.match(useStory.getState().log[0].text, /You are Gray/)
  useStory.getState().openDialogue('wolf')
  assert.equal(useStory.getState().activeCharacterId, null)
  useStory.getState().openDialogue('red')
  assert.equal(useStory.getState().activeCharacterId, 'red')
  await useStory.getState().say('Hello, Red.')
  assert.equal(sentRequests.at(-1)?.playerRole, 'wolf')
  assert.equal(sentRequests.at(-1)?.characterId, 'red')
})

test('a visitor can talk to Red and Gray and resume in the same role', () => {
  useStory.getState().startTale('red-riding-hood', 'visitor')
  useStory.getState().openDialogue('red')
  assert.equal(useStory.getState().activeCharacterId, 'red')
  useStory.getState().openDialogue('wolf')
  assert.equal(useStory.getState().activeCharacterId, 'wolf')
  useStory.getState().backToMap()
  useStory.getState().resume()
  assert.equal(useStory.getState().playerRole, 'visitor')
})

test('a codex companion joins at the fork, can speak, and remains after a reload', async () => {
  useStory.getState().startTale('red-riding-hood', 'visitor')
  const firstChoice = pickVariant('forest-path', {}).variant.anchors[0]
  useStory.getState().chooseAnchor(firstChoice)
  assert.equal(useStory.getState().sceneId, 'fork')

  useStory.getState().addCompanion('moss')
  assert.equal(useStory.getState().companionId, 'moss')
  assert.match(useStory.getState().log.at(-1)?.text ?? '', /Moss joins/)
  useStory.getState().openDialogue('moss')
  await useStory.getState().say('Which path should we take?')
  assert.equal(sentRequests.at(-1)?.characterId, 'moss')
  assert.equal(sentRequests.at(-1)?.companionId, 'moss')

  useStory.getState().backToMap()
  useStory.getState().resume()
  assert.equal(useStory.getState().screen, 'play')
  assert.equal(useStory.getState().companionId, 'moss')
  const forkChoice = getRoleViewForTest(TALE.scenes.find((scene) => scene.id === 'fork')!, useStory.getState().flags, 'visitor').variant.anchors[0]
  useStory.getState().chooseAnchor(forkChoice)
  assert.match(useStory.getState().log.at(-1)?.text ?? '', /Moss stays beside/)
})

test('continuing without a companion leaves the story playable', () => {
  useStory.getState().startTale('red-riding-hood')
  useStory.getState().chooseAnchor(pickVariant('forest-path', {}).variant.anchors[0])
  useStory.getState().dismissCodexOffer()
  assert.equal(useStory.getState().codexDismissed, true)
  assert.equal(useStory.getState().companionId, null)
  useStory.getState().chooseAnchor(pickVariant('fork', useStory.getState().flags).variant.anchors[0])
  assert.equal(useStory.getState().sceneId, 'cottage')
})

test('a scanned drawing becomes a saved, talkable companion', async () => {
  useStory.getState().startTale('red-riding-hood')
  useStory.getState().chooseAnchor(pickVariant('forest-path', {}).variant.anchors[0])
  assert.equal(useStory.getState().addScannedCompanion('Sunny', 'curious and gentle', 'data:image/png;base64,AAAA'), true)
  const id = useStory.getState().companionId!
  assert.equal(useStory.getState().customCharacter?.name, 'Sunny')
  useStory.getState().openDialogue(id)
  await useStory.getState().say('Hello, Sunny!')
  assert.deepEqual(sentRequests.at(-1)?.customCharacter, { id, name: 'Sunny', personality: 'curious and gentle' })
  useStory.getState().backToMap()
  useStory.getState().resume()
  assert.equal(useStory.getState().customCharacter?.imageDataUrl, 'data:image/png;base64,AAAA')
})

test('characters can be added in the first scene and again later', async () => {
  useStory.getState().startTale('red-riding-hood', 'visitor')
  useStory.getState().addCompanion('moss')
  assert.deepEqual(useStory.getState().companionIds, ['moss'])
  useStory.getState().chooseAnchor(getRoleViewForTest(TALE.scenes[0], {}, 'visitor').variant.anchors[0])
  useStory.getState().addCompanion('bramble')
  assert.deepEqual(useStory.getState().companionIds, ['moss', 'bramble'])
  useStory.getState().addCompanion('moss')
  assert.deepEqual(useStory.getState().companionIds, ['moss', 'bramble'], 'a ready-made character joins only once')
  assert.equal(useStory.getState().addScannedCompanion('Sunny', 'curious and gentle', 'data:image/png;base64,AAAA'), true)
  assert.equal(useStory.getState().companionIds.length, 3)
  useStory.getState().backToMap()
  useStory.getState().resume()
  assert.equal(useStory.getState().companionIds.length, 3)
  assert.equal(useStory.getState().customCharacters[0].name, 'Sunny')
  assert.equal(JSON.parse(localStorage.getItem('tale-weaver:v1')!).customCharacter, undefined, 'saved image is not duplicated')
  useStory.getState().openDialogue('bramble')
  await useStory.getState().say('Hello, Bramble!')
  assert.deepEqual(sentRequests.at(-1)?.companionNames, ['Moss', 'Bramble', 'Sunny'])
})

test('dragged character positions persist per scene and survive resume', () => {
  useStory.getState().startTale('red-riding-hood')
  useStory.getState().moveCharacter('red', 0.5, 0.75)
  assert.deepEqual(useStory.getState().characterPositions['forest-path'].red, { x: 0.5, y: 0.75 })
  useStory.getState().chooseAnchor(pickVariant('forest-path', {}).variant.anchors[0])
  assert.equal(useStory.getState().characterPositions.fork, undefined)
  useStory.getState().moveCharacter('red', 0.7, 0.8)
  useStory.getState().moveCharacter('red', -1, 0.8)
  assert.deepEqual(useStory.getState().characterPositions.fork.red, { x: 0.7, y: 0.8 })
  useStory.getState().backToMap()
  useStory.getState().resume()
  assert.deepEqual(useStory.getState().characterPositions['forest-path'].red, { x: 0.5, y: 0.75 })
  assert.deepEqual(useStory.getState().characterPositions.fork.red, { x: 0.7, y: 0.8 })
})

function pickVariant(sceneId: string, flags: Record<string, string | boolean>) {
  const scene = TALE.scenes.find((s) => s.id === sceneId)!
  return { scene, variant: resolveVariant(scene, flags) }
}

const { RED_RIDING_HOOD: TALE, resolveVariant } = await import('../content/tales/redRidingHood.ts')
const { getRoleView: getRoleViewForTest } = await import('../content/tales/roleViews.ts')
