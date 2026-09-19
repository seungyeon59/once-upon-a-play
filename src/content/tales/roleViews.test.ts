import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RED_RIDING_HOOD } from './redRidingHood.ts'
import { getRoleView } from './roleViews.ts'

test('every role-specific choice leads to a scene and each role can finish', () => {
  for (const role of ['wolf', 'visitor'] as const) {
    let scene = RED_RIDING_HOOD.scenes[0]
    let flags = {}
    for (let step = 0; step < 3; step++) {
      const view = getRoleView(scene, flags, role)
      assert.ok(view.variant.narration.length > 0)
      assert.ok(view.scene.cast.some((actor) => actor.characterId === role))
      assert.ok(view.variant.anchors.length >= 2)
      const next = view.variant.anchors[0].effects.goToScene
      scene = RED_RIDING_HOOD.scenes.find((candidate) => candidate.id === next)!
      assert.ok(scene)
      flags = { ...flags, ...view.variant.anchors[0].effects.setFlags }
    }
    assert.ok(getRoleView(scene, flags, role).scene.ending)
  }
})
