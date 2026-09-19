import { test } from 'node:test'
import assert from 'node:assert/strict'

import type { Flags } from '../../state/types.ts'
import { RED_RIDING_HOOD, getScene, resolveVariant } from './redRidingHood.ts'

/**
 * These tests are the contract that a choice made early actually changes what
 * the child reads later. If they pass, the branching is real and not cosmetic.
 */

interface Playthrough {
  flags: Flags
  sceneIds: string[]
  variantIds: string[]
  narrations: string[]
  endingTitle: string | undefined
}

/** Walks the tale, picking the named anchor in each scene until an ending. */
function play(choiceIds: string[]): Playthrough {
  let flags: Flags = {}
  let scene = getScene(RED_RIDING_HOOD, RED_RIDING_HOOD.startSceneId)!
  const sceneIds = [scene.id]
  const variantIds: string[] = []
  const narrations: string[] = []

  for (const choiceId of choiceIds) {
    const variant = resolveVariant(scene, flags)
    variantIds.push(variant.id)
    narrations.push(variant.narration)

    const choice = variant.anchors.find((anchor) => anchor.id === choiceId)
    assert.ok(choice, `scene "${scene.id}" (variant "${variant.id}") has no choice "${choiceId}"`)

    flags = { ...flags, ...(choice.effects.setFlags ?? {}) }
    if (choice.effects.goToScene) {
      scene = getScene(RED_RIDING_HOOD, choice.effects.goToScene)!
      sceneIds.push(scene.id)
    }
  }

  const finalVariant = resolveVariant(scene, flags)
  variantIds.push(finalVariant.id)
  narrations.push(finalVariant.narration)

  return { flags, sceneIds, variantIds, narrations, endingTitle: scene.ending?.title }
}

test('every anchor points at a scene that exists', () => {
  for (const scene of RED_RIDING_HOOD.scenes) {
    for (const variant of scene.variants) {
      for (const anchor of variant.anchors) {
        if (!anchor.effects.goToScene) continue
        assert.ok(
          getScene(RED_RIDING_HOOD, anchor.effects.goToScene),
          `${scene.id}/${variant.id}/${anchor.id} -> missing scene "${anchor.effects.goToScene}"`,
        )
      }
    }
  }
})

test('every non-ending scene offers 2-3 choices, endings offer none', () => {
  for (const scene of RED_RIDING_HOOD.scenes) {
    for (const variant of scene.variants) {
      if (scene.ending) {
        assert.equal(variant.anchors.length, 0, `${scene.id}/${variant.id} should be terminal`)
      } else {
        assert.ok(
          variant.anchors.length >= 2 && variant.anchors.length <= 3,
          `${scene.id}/${variant.id} has ${variant.anchors.length} choices`,
        )
      }
    }
  }
})

test('every scene has a default variant that matches empty flags', () => {
  for (const scene of RED_RIDING_HOOD.scenes) {
    const variant = resolveVariant(scene, {})
    assert.ok(variant, `${scene.id} resolves to nothing with no flags`)
    assert.ok(variant.narration.length > 40, `${scene.id} default narration is too thin`)
  }
})

test('what you told the wolf decides which cottage you walk into', () => {
  const cases: Array<[string[], string]> = [
    [['tell-destination', 'take-meadow'], 'he-got-here-first'],
    [['tell-destination', 'take-short'], 'dead-heat'],
    [['share-muffin', 'take-meadow'], 'gate-together'],
    [['share-muffin', 'take-short'], 'gate-together'],
    [['ask-back', 'take-meadow'], 'watched-from-trees'],
    [['ask-back', 'take-short'], 'watched-from-trees'],
  ]

  const seen = new Set<string>()
  for (const [choices, expectedVariant] of cases) {
    const run = play(choices)
    assert.equal(run.sceneIds.at(-1), 'cottage')
    assert.equal(run.variantIds.at(-1), expectedVariant, `choices ${choices.join(' -> ')}`)
    seen.add(expectedVariant)
  }

  // All four authored cottage variants are actually reachable — no dead content.
  assert.equal(seen.size, 4)
})

test('the same two cottage variants read differently', () => {
  const told = play(['tell-destination', 'take-meadow'])
  const shared = play(['share-muffin', 'take-meadow'])
  assert.notEqual(told.narrations.at(-1), shared.narrations.at(-1))
})

test('all three endings are reachable, and the wolf path changes the text', () => {
  const clever = play(['tell-destination', 'take-meadow', 'warn-through-door'])
  const friend = play(['share-muffin', 'take-short', 'introduce'])
  const closeCall = play(['ask-back', 'take-short', 'shut-the-door'])

  assert.equal(clever.endingTitle, 'The Clever Warning')
  assert.equal(friend.endingTitle, 'A Place at the Table')
  assert.equal(closeCall.endingTitle, 'The Close Call')

  // The Clever ending has a flower-specific variant; the short path gets the default.
  const cleverNoFlowers = play(['tell-destination', 'take-short', 'warn-window'])
  assert.equal(cleverNoFlowers.endingTitle, 'The Clever Warning')
  assert.notEqual(clever.narrations.at(-1), cleverNoFlowers.narrations.at(-1))
})

test('every cottage variant can still reach all three endings', () => {
  const firstChoices = ['tell-destination', 'ask-back', 'share-muffin']
  for (const first of firstChoices) {
    for (const second of ['take-meadow', 'take-short']) {
      const run = play([first, second])
      const scene = getScene(RED_RIDING_HOOD, 'cottage')!
      const variant = resolveVariant(scene, run.flags)
      const destinations = new Set(variant.anchors.map((a) => a.effects.goToScene))
      assert.deepEqual(
        [...destinations].sort(),
        ['ending-clever', 'ending-close-call', 'ending-friend'],
        `${first} -> ${second} (variant ${variant.id}) cannot reach every ending`,
      )
    }
  }
})
