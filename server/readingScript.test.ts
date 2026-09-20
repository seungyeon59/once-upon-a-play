import assert from 'node:assert/strict'
import { test } from 'node:test'
import { splitReading } from './readingScript.ts'
import { TALES } from '../src/content/tales/redRidingHood.ts'

test('keeps narration and dialogue in order and assigns known speakers', () => {
  const parts = splitReading('Gray steps out of the ferns. "Hello," he says. "Follow me." Nana Wren opens the door. "Come in," she says.')
  assert.deepEqual(parts.map((part) => part.speaker), ['narrator', 'wolf', 'narrator', 'wolf', 'narrator', 'grandma', 'narrator'])
  assert.deepEqual(parts.filter((part) => part.speaker !== 'narrator').map((part) => part.text), ['Hello,', 'Follow me.', 'Come in,'])
})

test('unattributed speech uses the narrator rather than guessing a character', () => {
  assert.deepEqual(splitReading('A voice calls from far away. "Hello!"').map((part) => part.speaker), ['narrator', 'narrator'])
})

test('a character reply keeps its spoken line in that character voice', () => {
  assert.deepEqual(splitReading('Gray sniffs the basket. "Muffins?"', 'wolf').map((part) => part.speaker), ['wolf'])
  assert.deepEqual(splitReading('Follow me.', 'red'), [{ speaker: 'red', text: 'Follow me.' }])
  assert.deepEqual(splitReading('Red lifts the basket. "Come with me," she says.', 'red'), [{ speaker: 'red', text: 'Red lifts the basket. "Come with me," she says.' }])
})

test('the authored cottage scene keeps Nana Wren and Gray distinct', () => {
  const scene = TALES[0].scenes.find((item) => item.id === 'ending-friend')!
  const variant = scene.variants.find((item) => item.id === 'friend-shared')!
  const spoken = splitReading(variant.narration).filter((part) => part.speaker !== 'narrator')
  assert.deepEqual(spoken.map((part) => part.speaker), ['grandma', 'grandma', 'wolf', 'wolf', 'grandma', 'grandma'])
})
