import { test } from 'node:test'
import assert from 'node:assert/strict'

import type { Flags } from '../../state/types.ts'
import { getScene, resolveVariant } from './redRidingHood.ts'
import { SNOW_WHITE } from './snowWhite.ts'

/**
 * Mirrors branching.test.ts for the Red Riding Hood tale: the same contract,
 * checked against Snow White's own scenes, flags and endings.
 */

interface Playthrough {
  flags: Flags
  sceneIds: string[]
  variantIds: string[]
  narrations: string[]
  endingTitle: string | undefined
}

function play(choiceIds: string[]): Playthrough {
  let flags: Flags = {}
  let scene = getScene(SNOW_WHITE, SNOW_WHITE.startSceneId)!
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
      scene = getScene(SNOW_WHITE, choice.effects.goToScene)!
      sceneIds.push(scene.id)
    }
  }

  const finalVariant = resolveVariant(scene, flags)
  variantIds.push(finalVariant.id)
  narrations.push(finalVariant.narration)

  return { flags, sceneIds, variantIds, narrations, endingTitle: scene.ending?.title }
}

test('every anchor points at a scene that exists', () => {
  for (const scene of SNOW_WHITE.scenes) {
    for (const variant of scene.variants) {
      for (const anchor of variant.anchors) {
        if (!anchor.effects.goToScene) continue
        assert.ok(
          getScene(SNOW_WHITE, anchor.effects.goToScene),
          `${scene.id}/${variant.id}/${anchor.id} -> missing scene "${anchor.effects.goToScene}"`,
        )
      }
    }
  }
})

test('every non-ending scene offers 2-3 choices, endings offer none', () => {
  for (const scene of SNOW_WHITE.scenes) {
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
  for (const scene of SNOW_WHITE.scenes) {
    const variant = resolveVariant(scene, {})
    assert.ok(variant, `${scene.id} resolves to nothing with no flags`)
    assert.ok(variant.narration.length > 40, `${scene.id} default narration is too thin`)
  }
})

test('what you told the huntsman decides which kitchen variant you walk into', () => {
  const cases: Array<[string[], string]> = [
    [['tell-destination', 'take-orchard'], 'he-got-here-first'],
    [['tell-destination', 'take-wall'], 'dead-heat'],
    [['share-apple', 'take-orchard'], 'gate-together'],
    [['share-apple', 'take-wall'], 'gate-together'],
    [['ask-back', 'take-orchard'], 'watched-from-wall'],
    [['ask-back', 'take-wall'], 'watched-from-wall'],
  ]

  const seen = new Set<string>()
  for (const [choices, expectedVariant] of cases) {
    const run = play(choices)
    assert.equal(run.sceneIds.at(-1), 'castle-kitchen')
    assert.equal(run.variantIds.at(-1), expectedVariant, `choices ${choices.join(' -> ')}`)
    seen.add(expectedVariant)
  }

  assert.equal(seen.size, 4)
})

test('the same two kitchen variants read differently', () => {
  const told = play(['tell-destination', 'take-orchard'])
  const shared = play(['share-apple', 'take-orchard'])
  assert.notEqual(told.narrations.at(-1), shared.narrations.at(-1))
})

test('all three endings are reachable, and the huntsman path changes the text', () => {
  const clever = play(['tell-destination', 'take-orchard', 'warn-through-door'])
  const friend = play(['share-apple', 'take-wall', 'introduce'])
  const closeCall = play(['ask-back', 'take-wall', 'shut-the-door'])

  assert.equal(clever.endingTitle, 'The Clever Warning')
  assert.equal(friend.endingTitle, 'A Place at the Table')
  assert.equal(closeCall.endingTitle, 'The Close Call')

  const cleverNoApples = play(['tell-destination', 'take-wall', 'warn-window'])
  assert.equal(cleverNoApples.endingTitle, 'The Clever Warning')
  assert.notEqual(clever.narrations.at(-1), cleverNoApples.narrations.at(-1))
})

test('every kitchen variant can still reach all three endings', () => {
  const firstChoices = ['tell-destination', 'ask-back', 'share-apple']
  for (const first of firstChoices) {
    for (const second of ['take-orchard', 'take-wall']) {
      const run = play([first, second])
      const scene = getScene(SNOW_WHITE, 'castle-kitchen')!
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
