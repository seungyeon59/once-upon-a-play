import { test } from 'node:test'
import assert from 'node:assert/strict'

import { sceneryFor, secretTiles } from './secretScenery.ts'
import { DEFAULT_MAP, SKY_MAP } from '../../server/mapSpec.ts'

test('hidden scenery follows the selected backdrop', () => {
  assert.deepEqual(sceneryFor('space', false).objects, ['🪐', '☄️'])
  assert.deepEqual(sceneryFor('library', false).objects, ['📚', '🖼️'])
  assert.deepEqual(sceneryFor('forest', false).objects, ['🌳', '🌿'])
})

test('secret tiles avoid exits, spawn, objects, and blocked cells', () => {
  for (const map of [DEFAULT_MAP, SKY_MAP]) {
    const cells = secretTiles({ ...map, theme: 'forest', landmark: 'none' })
    assert.equal(cells.length, 2)
    for (const cell of cells) {
      assert.notEqual(map.tiles?.[cell.y]?.[cell.x], 'water')
      assert.notEqual(map.tiles?.[cell.y]?.[cell.x], 'air')
      assert.notDeepEqual(cell, map.spawn)
      assert.notDeepEqual(cell, map.exit && { x: map.exit.x, y: map.exit.y })
      assert.ok(!map.objects?.some((object) => object.x === cell.x && object.y === cell.y))
    }
  }
})
