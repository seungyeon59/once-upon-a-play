import type { Character, Choice, Flags, PlayerRole, Scene, ScenePlacement, SceneVariant } from '../../state/types.ts'
import { resolveVariant } from './redRidingHood.ts'
import { getCharacter } from '../characters.ts'
import { profileMoment } from '../customProfile.ts'

const cinderella: ScenePlacement = { characterId: 'cinderella', x: 0.34, y: 0.87, scale: 1, facing: 1 }
const whisk: ScenePlacement = { characterId: 'whisk', x: 0.66, y: 0.85, scale: 1, facing: -1 }
const dame: ScenePlacement = { characterId: 'dame', x: 0.78, y: 0.86, scale: 0.9, facing: -1 }
const visitor: ScenePlacement = { characterId: 'visitor', x: 0.13, y: 0.88, scale: 0.9, facing: 1 }

function choice(id: string, label: string, flags: Flags, next: string, kind: Choice['kind'] = 'act'): Choice {
  return { id, label, kind, effects: { setFlags: flags, goToScene: next } }
}

function roleNarration(sceneId: string, flags: Flags, role: Exclude<PlayerRole, 'cinderella'>): string {
  if (role === 'whisk') {
    switch (sceneId) {
      case 'castle-scullery': return 'You are Whisk, the ash-spirit of the scullery hearth. Ellie is carrying glass slippers toward the ballroom terrace. You stir out of the cold ashes, hoping to speak without frightening her. Ellie stops and waits. What will you do?'
      case 'castle-corridor': return flags.whiskFriendly
        ? 'Ellie walks beside you now. At the glass door, the conservatory path is slow and bright; the servants’ stair reaches the terrace first. Ellie looks to you for a suggestion.'
        : 'Ellie reaches the glass door while you follow at a respectful distance. The conservatory and the stair lead to the same terrace. You can still decide how to approach.'
      case 'castle-terrace': return flags.tookBlossoms
        ? 'You arrive at Dame Ferro’s terrace with Ellie and an armful of moonflowers. Dame Ferro looks from Ellie to you. You have one chance to explain why you came.'
        : 'The terrace comes into view. Ellie is at the doors and Dame Ferro is nearby. You stop where they can see you and decide what to say next.'
      case 'ending-friend': return 'You tell Dame Ferro that you wanted to see Ellie reach the ball, nothing more. Ellie makes room in the doorway, and Dame Ferro leaves the doors wide. For once, the hearth feels less lonely.'
      case 'ending-clever': return 'You give Ellie and Dame Ferro space and explain yourself from the terrace. They listen, then choose to keep the doors closed tonight. You leave knowing you can ask again another day.'
      default: return 'You hurry toward the terrace before finding the right words. Ellie and Dame Ferro step inside to talk. You wait outside, then head back along the gallery through the quiet corridor.'
    }
  }

  switch (sceneId) {
    case 'castle-scullery': return 'You are a visitor in the castle. Ahead, Ellie carries a pair of glass slippers and Whisk the ash-spirit stirs out of the cold hearth. Neither has noticed you yet. You can speak to either of them.'
    case 'castle-corridor': return flags.whiskFriendly
      ? 'Ellie and Whisk walk together to the glass door. You follow close enough to join their conversation. The conservatory is slower; the servants’ stair leads straight to the terrace.'
      : 'Ellie pauses at the glass door. Whisk keeps its distance, but it is still nearby. You can talk with either of them before the group chooses a path.'
    case 'castle-terrace': return 'You reach Dame Ferro’s terrace with Ellie and Whisk. Dame Ferro is by the doors. All three can hear you, and your next choice will shape how they meet.'
    case 'ending-friend': return 'You help Ellie introduce Whisk to Dame Ferro. They listen to one another, and the doors are left open a little wider. You have become part of their story.'
    case 'ending-clever': return 'You ask everyone to pause at the doors. Ellie and Dame Ferro feel safe, and Whisk gets a chance to explain itself. The doors stay closed tonight, with a promise to talk again.'
    default: return 'You step back and let Ellie and Dame Ferro decide what to do. Whisk returns to the shadows. The three of you have more to say another day.'
  }
}

function roleChoices(sceneId: string, role: Exclude<PlayerRole, 'cinderella'>): Choice[] {
  if (sceneId === 'castle-scullery') return role === 'whisk' ? [
    choice('whisk-offer', 'Introduce yourself and offer to walk with Ellie.', { whiskFriendly: true }, 'castle-corridor', 'say'),
    choice('whisk-ask', 'Ask where Ellie is going, then give her room.', { whiskKnows: true }, 'castle-corridor', 'say'),
    choice('whisk-wait', 'Stay back and let Ellie choose whether to speak.', { whiskCurious: true }, 'castle-corridor'),
  ] : [
    choice('visitor-introduce', 'Introduce Ellie and Whisk to each other.', { whiskFriendly: true }, 'castle-corridor', 'say'),
    choice('visitor-ask', 'Ask Ellie where the corridor leads.', { whiskKnows: true }, 'castle-corridor', 'say'),
    choice('visitor-observe', 'Watch quietly and follow at a distance.', { whiskCurious: true }, 'castle-corridor'),
  ]
  if (sceneId === 'castle-corridor') return [
    choice(`${role}-conservatory`, 'Take the conservatory path and gather moonflowers.', { tookBlossoms: true }, 'castle-terrace'),
    choice(`${role}-stair`, 'Take the servants’ stair to the terrace.', { tookBlossoms: false }, 'castle-terrace'),
  ]
  if (sceneId === 'castle-terrace') return role === 'whisk' ? [
    choice('whisk-explain', 'Tell Dame Ferro you hoped to make a friend.', { introduced: true }, 'ending-friend', 'say'),
    choice('whisk-give-space', 'Ask from the terrace if you may visit another day.', { warned: true }, 'ending-clever', 'say'),
    choice('whisk-leave', 'Step back and return to the shadows.', { snuck: true }, 'ending-close-call'),
  ] : [
    choice('visitor-introduce-whisk', 'Introduce Whisk to Dame Ferro.', { introduced: true }, 'ending-friend', 'say'),
    choice('visitor-pause', 'Ask everyone to pause and talk from the terrace.', { warned: true }, 'ending-clever', 'say'),
    choice('visitor-step-back', 'Let Ellie and Dame Ferro decide for themselves.', { snuck: true }, 'ending-close-call'),
  ]
  return []
}

/** Ellie keeps the original authored path; other roles get their own point of view and choices. */
export function getRoleView(scene: Scene, flags: Flags, role: PlayerRole, companionId: string | null = null, customCharacter: Character | null = null, companionNames: string[] = [], customCharacters: Character[] = []): { scene: Scene; variant: SceneVariant } {
  const companion = companionId ? getCharacter(companionId) ?? (customCharacter?.id === companionId ? customCharacter : undefined) : undefined
  const names = companionNames.length ? companionNames : companion ? [companion.name] : []
  const companionLine = names.length && scene.id !== 'castle-scullery'
    ? `\n\n${names.join(' and ')} ${names.length === 1 ? 'stays' : 'stay'} beside the group, ready to share what they know about the castle.`
    : ''
  const profileLines = customCharacters.filter((character) => character.talent && character.goal && names.includes(character.name))
    .map((character) => profileMoment(character.name, character.talent!, character.goal!, scene.id)).filter(Boolean)
  const fullCompanionLine = companionLine + (profileLines.length ? `\n\n${profileLines.join(' ')}` : '')
  if (role === 'cinderella') {
    const variant = resolveVariant(scene, flags)
    return { scene, variant: fullCompanionLine ? { ...variant, narration: variant.narration + fullCompanionLine } : variant }
  }

  const ending = Boolean(scene.ending)
  const cast = scene.id === 'castle-scullery' || scene.id === 'castle-corridor'
    ? [cinderella, whisk, ...(role === 'visitor' ? [visitor] : [])]
    : [cinderella, whisk, dame, ...(role === 'visitor' ? [visitor] : [])]
  const viewScene: Scene = {
    ...scene,
    cast,
    objective: ending ? '' : role === 'whisk' ? 'Decide how Whisk approaches the others.' : 'Choose how to join the story.',
    ending: ending ? {
      title: role === 'whisk' ? 'Whisk’s Story' : 'The Visitor’s Story',
      blurb: role === 'whisk' ? 'The choices you made changed how the others saw Whisk.' : 'Your choices changed the meeting on Dame Ferro’s terrace.',
    } : undefined,
  }
  return {
    scene: viewScene,
    variant: {
      id: `${role}-${scene.id}`,
      narration: roleNarration(scene.id, flags, role as Exclude<PlayerRole, 'cinderella'>) + fullCompanionLine,
      anchors: roleChoices(scene.id, role as Exclude<PlayerRole, 'cinderella'>),
    },
  }
}
