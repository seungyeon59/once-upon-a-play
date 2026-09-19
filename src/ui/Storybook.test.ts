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
