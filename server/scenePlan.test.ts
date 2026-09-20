import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateScenePlan } from './scenePlan.ts'

test('invalid assets, coordinates, and unlisted characters are discarded', () => {
  const plan = validateScenePlan({ backdropId: 'space', props: [
    { id: 'rocket', x: 0.5, y: 0.7, label: 'Rocket', result: 'Ready to fly.' },
    { id: 'unknown', x: 0.5, y: 0.7, label: 'Unknown', result: 'No.' },
    { id: 'star', x: 5, y: 0.7, label: 'Far', result: 'No.' },
  ], cast: [{ characterId: 'red', x: 0.3, y: 0.75 }, { characterId: 'stranger', x: 0.6, y: 0.75 }] }, ['red'])
  assert.equal(plan.backdropId, 'space')
  assert.deepEqual(plan.props?.map((prop) => prop.id), ['rocket'])
  assert.deepEqual(plan.cast?.map((actor) => actor.characterId), ['red'])
})

test('expanded assets are available and enlarged props do not overlap', () => {
  const plan = validateScenePlan({ backdropId: 'airship', props: [
    { id: 'telescope', x: 0.3, y: 0.65, label: 'Telescope', result: 'You see an island.' },
    { id: 'robot', x: 0.35, y: 0.68, label: 'Robot', result: 'It waves.' },
    { id: 'butterfly', x: 0.75, y: 0.45, label: 'Butterfly', result: 'It flutters.' },
  ] }, [])
  assert.equal(plan.backdropId, 'airship')
  assert.deepEqual(plan.props?.map((prop) => prop.id), ['telescope', 'butterfly'])
})
