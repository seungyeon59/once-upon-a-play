import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_MAP, validateMapSpec } from './mapSpec.ts'

test('accepts a connected map and removes objects on water', () => {
  const result = validateMapSpec({ ...DEFAULT_MAP, tiles: DEFAULT_MAP.tiles?.map((row) => [...row]), objects: [
    { type: 'lantern', x: 2, y: 1, action: 'inspect', label: 'Light', result: 'The lantern glows.' },
    { type: 'tree', x: 99, y: 1, action: 'inspect', label: 'Bad', result: 'Bad' },
  ] })
  assert.equal(result.objects?.length, 1)
  assert.equal(result.objects?.[0].type, 'lantern')
})

test('rejects maps with no walkable route', () => {
  const result = validateMapSpec({ ...DEFAULT_MAP, tiles: Array.from({ length: 4 }, () => Array(6).fill('water')) })
  assert.deepEqual(result, DEFAULT_MAP)
})
