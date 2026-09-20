import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeStoryPages } from './storyPages.ts'
import type { StoryEntry } from '../state/types.ts'

test('storybook keeps each scene with its conversation and leaves out system messages', () => {
  const log: StoryEntry[] = [
    { id: '1', kind: 'narration', text: 'At the fork.', ts: 1, sceneId: 'fork' },
    { id: '2', kind: 'say', speaker: 'You', text: 'Which way?', ts: 2, sceneId: 'fork' },
    { id: '3', kind: 'reply', speaker: 'Gray', text: 'The meadow.', ts: 3, sceneId: 'fork' },
    { id: '4', kind: 'system', text: 'Could not connect.', ts: 4 },
    { id: '5', kind: 'narration', text: 'At the cottage.', ts: 5, sceneId: 'cottage' },
  ]
  const pages = makeStoryPages(log)
  assert.equal(pages.length, 2)
  assert.deepEqual(pages[0].moments.map((item) => item.id), ['2', '3'])
  assert.equal(pages[1].narration, 'At the cottage.')
})

test('storybook keeps extra narration in its scene instead of creating an empty illustrated page', () => {
  const log: StoryEntry[] = [
    { id: '1', kind: 'narration', text: 'At the fork.', ts: 1, sceneId: 'fork' },
    { id: '2', kind: 'choice', text: 'Take the meadow.', ts: 2, sceneId: 'fork' },
    { id: '3', kind: 'narration', text: 'The asters sway.', ts: 3, sceneId: 'fork' },
    { id: '4', kind: 'narration', text: 'The cottage appears.', ts: 4, sceneId: 'cottage' },
  ]
  const pages = makeStoryPages(log)
  assert.deepEqual(pages.map((page) => page.sceneId), ['fork', 'cottage'])
  assert.match(pages[0].narration, /The asters sway/)
})

test('each child-created map gets its own illustrated page, even in the same scene', () => {
  const sky = { title: 'Cloud Walk', narration: 'We walk among clouds.', setting: 'Sky', map: { theme: 'sky' as const, landmark: 'none' as const, backdropId: 'sky' as const } }
  const sea = { title: 'Sea Dive', narration: 'We dive under the sea.', setting: 'Sea', map: { theme: 'sky' as const, landmark: 'none' as const, backdropId: 'ocean' as const } }
  const pages = makeStoryPages([
    { id: '1', kind: 'narration', text: 'At the fork.', ts: 1, sceneId: 'fork' },
    { id: '2', kind: 'narration', text: sky.narration, ts: 2, sceneId: 'fork', imaginedScene: sky },
    { id: '3', kind: 'narration', text: 'A bird joins us.', ts: 3, sceneId: 'fork' },
    { id: '4', kind: 'narration', text: sea.narration, ts: 4, sceneId: 'fork', imaginedScene: sea },
  ])
  assert.equal(pages.length, 3)
  assert.deepEqual(pages.map((page) => page.key), ['1', '2', '4'])
  assert.deepEqual(pages.map((page) => page.imaginedScene?.map.backdropId), [undefined, 'sky', 'ocean'])
  assert.match(pages[1].narration, /bird joins us/)
})
