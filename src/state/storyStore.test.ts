import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import type { ChatRequest, ChatResponse, ImagineResponse, StoryEntry } from './types.ts'

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

const imagineResponse: ImagineResponse = { scene: { title: 'The Starlit Bridge', narration: 'A bridge of stars appears over the stream.', setting: 'A starlit stream', map: { theme: 'night', landmark: 'bridge' } }, setFlags: { wolfFriendly: true }, source: 'llm' }

;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async (url: string, init: RequestInit) => {
  sentRequests.push(JSON.parse(String(init.body)) as ChatRequest)
  return { ok: true, json: async () => url === '/api/imagine' ? imagineResponse : nextResponse } as Response
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

test('coins persist across stories and a hidden spot pays out only once', () => {
  useStory.getState().startTale('red-riding-hood')
  assert.equal(useStory.getState().discoverSecret('forest-path:0'), true)
  assert.equal(useStory.getState().discoverSecret('forest-path:0'), false)
  useStory.getState().awardCoins(8)
  useStory.getState().awardCoins(-3)
  assert.equal(useStory.getState().coins, 8)
  useStory.getState().backToMap()
  useStory.getState().resume()
  assert.equal(useStory.getState().coins, 8)
  assert.deepEqual(useStory.getState().foundSecrets, ['forest-path:0'])
  useStory.getState().startTale('red-riding-hood')
  assert.equal(useStory.getState().coins, 8)
  assert.deepEqual(useStory.getState().foundSecrets, [])
})

test('store purchases charge once, decorations and outfits persist, and placement can be changed', () => {
  useStory.getState().startTale('red-riding-hood')
  const api = useStory.getState()
  api.awardCoins(50)
  assert.equal(api.buyItem('butterflies'), true)
  assert.equal(api.buyItem('butterflies'), false)
  assert.equal(useStory.getState().coins, 32)
  assert.equal(api.placeItem('forest-path:authored', 'butterflies'), true)
  assert.equal(api.placeItem('forest-path:authored', 'butterflies'), true)
  api.moveItem('forest-path:authored', 0, 0.25, 0.6)
  api.resizeItem('forest-path:authored', 0, 1.6)
  api.resizeItem('forest-path:authored', 0, 99)
  assert.deepEqual(useStory.getState().placedItems['forest-path:authored'][0], { id: 'butterflies', x: 0.25, y: 0.6, size: 1.6 })
  assert.equal(useStory.getState().placedItems['forest-path:authored'].length, 2)
  assert.equal(api.buyItem('crown'), true)
  api.equipItem('red', 'crown')
  api.setAccessoryFit('red', 'crown', { x: 0.12, y: -0.08, scale: 0.8 })
  useStory.getState().backToMap()
  useStory.getState().resume()
  assert.equal(useStory.getState().equippedItems.red, 'crown')
  assert.deepEqual(useStory.getState().accessoryFits['red:crown'], { x: 0.12, y: -0.08, scale: 0.8 })
  assert.equal(useStory.getState().placedItems['forest-path:authored'][0].id, 'butterflies')
  useStory.getState().removeItem('forest-path:authored', 0)
  assert.equal(useStory.getState().placedItems['forest-path:authored'].length, 1)
  assert.ok(useStory.getState().ownedItems.includes('butterflies'))
  assert.equal(useStory.getState().placeItem('forest-path:authored', 'butterflies'), true)
  assert.equal(useStory.getState().coins, 18)
})

test('an imagined scene changes the visible story, flags, save, and later dialogue context', async () => {
  useStory.getState().startTale('red-riding-hood')
  await useStory.getState().imagine('A bridge of stars appears')
  let state = useStory.getState()
  assert.equal(state.imaginedScene?.title, 'The Starlit Bridge')
  assert.deepEqual(state.imaginedScene?.map, { theme: 'night', landmark: 'bridge' })
  assert.equal(state.flags.wolfFriendly, true)
  assert.equal(state.coins, 3)
  assert.equal(state.log.at(-1)?.text, imagineResponse.scene.narration)
  assert.deepEqual(state.log.at(-1)?.imaginedScene, imagineResponse.scene)
  assert.match(localStorage.getItem('tale-weaver:v1') ?? '', /Starlit Bridge/)
  state.openDialogue('wolf')
  await useStory.getState().say('Look at the bridge!')
  assert.equal(sentRequests.at(-1)?.narration, imagineResponse.scene.narration)
  assert.ok(sentRequests.at(-1)?.recentStory?.some((line) => line.includes('bridge of stars')))
})

test('a child choice carries the generated story memory into the next scene', async () => {
  useStory.getState().startTale('red-riding-hood')
  useStory.setState({ imaginedScene: { ...imagineResponse.scene, choices: ['Cross the bridge'], storyState: { discoveries: ['The bridge glows at night'], promises: ['Help Gray'], openThreads: ['Find the far bank'] } } })
  await useStory.getState().imagine('Cross the bridge')
  const request = sentRequests.at(-1) as unknown as { idea: string; storyState: { discoveries: string[] }; recentStory: string[] }
  assert.equal(request.idea, 'Cross the bridge')
  assert.deepEqual(request.storyState.discoveries, ['The bridge glows at night'])
  assert.equal(useStory.getState().log.at(-2)?.text, 'Cross the bridge')
  assert.equal(useStory.getState().coins, 3)
})

test('moving and resizing a prop updates the saved scene within bounds', () => {
  useStory.getState().startTale('red-riding-hood')
  useStory.setState({ imaginedScene: { title: 'Space', narration: 'A rocket waits.', setting: 'Space', map: { theme: 'forest', landmark: 'none', backdropId: 'space', props: [{ id: 'rocket', x: 0.3, y: 0.6, label: 'Rocket', result: 'It is ready.' }] } } })
  useStory.getState().updateMapProp(0, { x: 0.65, y: 0.72, size: 1.4 })
  const updated = useStory.getState().imaginedScene?.map.props?.[0]
  assert.deepEqual([updated?.x, updated?.y, updated?.size], [0.65, 0.72, 1.4])
  assert.match(localStorage.getItem('tale-weaver:v1') ?? '', /"size":1.4/)
  useStory.getState().updateMapProp(0, { x: 4, size: 9 })
  assert.deepEqual(useStory.getState().imaginedScene?.map.props?.[0], updated)
})

test('deleting a prop removes only that prop and persists the result', () => {
  useStory.getState().startTale('red-riding-hood')
  useStory.setState({ imaginedScene: { title: 'Garden', narration: 'Two things appear.', setting: 'Garden', map: { theme: 'forest', landmark: 'none', backdropId: 'garden', props: [
    { id: 'flower', x: 0.3, y: 0.6, label: 'Flower', result: 'It blooms.' },
    { id: 'butterfly', x: 0.7, y: 0.6, label: 'Butterfly', result: 'It flies.' },
  ] } } })
  useStory.getState().removeMapProp(0)
  assert.deepEqual(useStory.getState().imaginedScene?.map.props?.map((prop) => prop.id), ['butterfly'])
  assert.match(localStorage.getItem('tale-weaver:v1') ?? '', /butterfly/)
  useStory.getState().removeMapProp(10)
  assert.equal(useStory.getState().imaginedScene?.map.props?.length, 1)
})

test('the book keeps edits to the latest generated map without changing earlier maps', () => {
  useStory.getState().startTale('red-riding-hood')
  const first = { title: 'First garden', narration: 'A flower blooms.', setting: 'Garden', map: { theme: 'forest' as const, landmark: 'none' as const, backdropId: 'garden' as const, props: [{ id: 'flower' as const, x: 0.3, y: 0.6, label: 'Flower', result: 'It blooms.' }] } }
  const second = { title: 'Second garden', narration: 'A butterfly lands.', setting: 'Garden', map: { theme: 'forest' as const, landmark: 'none' as const, backdropId: 'garden' as const, props: [{ id: 'butterfly' as const, x: 0.7, y: 0.6, label: 'Butterfly', result: 'It flies.' }] } }
  const log = useStory.getState().log.concat(
    { id: 'generated-1', kind: 'narration', text: first.narration, ts: 1, sceneId: 'forest-path', imaginedScene: first },
    { id: 'generated-2', kind: 'narration', text: second.narration, ts: 2, sceneId: 'forest-path', imaginedScene: second },
  ) as StoryEntry[]
  useStory.setState({ imaginedScene: second, log })
  useStory.getState().updateMapProp(0, { size: 1.5 })
  const updated = useStory.getState()
  assert.equal(updated.log.at(-1)?.imaginedScene?.map.props?.[0].size, 1.5)
  assert.equal(updated.log.at(-2)?.imaginedScene?.map.props?.[0].size, undefined)
  assert.match(localStorage.getItem('tale-weaver:v1') ?? '', /"size":1.5/)
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
  assert.deepEqual(sentRequests.at(-1)?.companionProfiles?.map((profile) => profile.name), ['Sunny'])
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
