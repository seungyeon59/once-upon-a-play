import type { Sprite } from 'pixi.js'

/**
 * Procedural animation for flat, un-rigged sprites.
 *
 * Deliberately no skeletal rigging and no separated limbs (see CLAUDE.md): a
 * whole-sprite acting uses bounce, squash, swaying, and turns, and it
 * works on a child's scanned drawing just as well as on our placeholder art.
 */

export interface ProceduralState {
  /** Radians; advanced every frame so each character bobs out of phase. */
  phase: number
  /** Decaying 0..1 impulse fired when the character speaks. */
  talk: number
  /** Eased 0..1 toward whether the pointer is over the sprite. */
  hover: number
  hoverTarget: number
  /** Eased 0..1 toward whether this character is the one being talked to. */
  focus: number
  focusTarget: number
  baseScale: number
  baseX: number
  baseY: number
  facing: 1 | -1
  dragging: boolean
  land: number
}

export function createProceduralState(baseScale: number, baseX: number, baseY: number, facing: 1 | -1): ProceduralState {
  return {
    phase: Math.random() * Math.PI * 2,
    talk: 0,
    hover: 0,
    hoverTarget: 0,
    focus: 0,
    focusTarget: 0,
    baseScale,
    baseX,
    baseY,
    facing,
    dragging: false,
    land: 0,
  }
}

/** Fire when a character starts a line — a squash, then a stretch on the way up. */
export function pokeTalk(state: ProceduralState): void {
  state.talk = 1
}

function approach(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * Math.min(1, rate * dt)
}

/**
 * @param dt Pixi ticker deltaTime (≈1 at 60fps).
 */
export function tickProcedural(sprite: Sprite, state: ProceduralState, dt: number): void {
  state.phase += dt * 0.06
  state.talk = Math.max(0, state.talk - dt * 0.035)
  state.hover = approach(state.hover, state.hoverTarget, 0.18, dt)
  state.focus = approach(state.focus, state.focusTarget, 0.12, dt)
  state.land = Math.max(0, state.land - dt * 0.045)

  if (state.dragging) {
    sprite.position.set(state.baseX, state.baseY)
    sprite.rotation = 0
    sprite.scale.set(state.facing * state.baseScale * 1.08, state.baseScale * 1.08)
    return
  }

  const idle = Math.sin(state.phase)
  const talk = Math.sin(state.phase * 3.5) * state.talk
  const gesture = Math.sin(state.phase * 2.2 + 0.6) * state.talk
  const landing = Math.sin((1 - state.land) * Math.PI * 3) * state.land

  const lift = idle * 2.5 + Math.abs(talk) * 11 + state.hover * 4 + state.focus * 3 + Math.abs(landing) * 10
  const squash = idle * 0.014 + talk * 0.055 - landing * 0.065
  const grow = state.baseScale * (1 + state.hover * 0.06 + state.focus * 0.05)

  sprite.x = state.baseX + Math.sin(state.phase * 0.55) * 2 + gesture * 8
  sprite.y = state.baseY - lift
  sprite.rotation = Math.sin(state.phase * 0.65) * 0.018 + gesture * 0.11 + landing * 0.08
  sprite.scale.set(state.facing * grow * (1 - squash), grow * (1 + squash))
}

/** Flip horizontally without touching the bounce. Free, because there is no rig. */
export function setFacing(state: ProceduralState, facing: 1 | -1): void {
  state.facing = facing
}
