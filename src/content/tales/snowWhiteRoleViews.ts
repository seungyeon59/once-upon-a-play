import type { Character, Choice, Flags, PlayerRole, Scene, ScenePlacement, SceneVariant } from '../../state/types.ts'
import { resolveVariant } from './redRidingHood.ts'
import { getCharacter } from '../characters.ts'
import { profileMoment } from '../customProfile.ts'

const snow: ScenePlacement = { characterId: 'snow', x: 0.34, y: 0.87, scale: 1, facing: 1 }
const huntsman: ScenePlacement = { characterId: 'huntsman', x: 0.66, y: 0.85, scale: 1, facing: -1 }
const auntie: ScenePlacement = { characterId: 'auntie', x: 0.78, y: 0.86, scale: 0.9, facing: -1 }
const visitor: ScenePlacement = { characterId: 'visitor', x: 0.13, y: 0.88, scale: 0.9, facing: 1 }

function choice(id: string, label: string, flags: Flags, next: string, kind: Choice['kind'] = 'act'): Choice {
  return { id, label, kind, effects: { setFlags: flags, goToScene: next } }
}

function roleNarration(sceneId: string, flags: Flags, role: Exclude<PlayerRole, 'snow'>): string {
  if (role === 'huntsman') {
    switch (sceneId) {
      case 'castle-courtyard': return 'You are Rowan, the huntsman of the castle grounds. Snow is carrying a basket of apples toward the kitchen wing. You step out of the stable shadow, hoping to speak without frightening her. Snow stops and waits. What will you do?'
      case 'castle-garden': return flags.huntsmanFriendly
        ? 'Snow walks beside you now. At the sundial, the orchard path is slow and bright; the wall path reaches the kitchen first. Snow looks to you for a suggestion.'
        : 'Snow reaches the sundial while you follow at a respectful distance. The orchard and the wall path lead to the same door. You can still decide how to approach.'
      case 'castle-kitchen': return flags.tookApples
        ? 'You arrive at Auntie Hazel’s door with Snow and a basket of apples. Auntie Hazel looks from Snow to you. You have one chance to explain why you came.'
        : 'The kitchen comes into view. Snow is at the door and Auntie Hazel is nearby. You stop where they can see you and decide what to say next.'
      case 'ending-friend': return 'You tell Auntie Hazel that you wanted to see Snow safe, not to carry out the order you were given. Snow makes room at the table, and Auntie Hazel invites you to sit on the step. For once, the garden feels less lonely.'
      case 'ending-clever': return 'You give Snow and Auntie Hazel space and explain yourself from the door. They listen, then choose to keep it closed tonight. You leave knowing you can ask again another day.'
      default: return 'You hurry toward the kitchen before finding the right words. Snow and Auntie Hazel step inside to talk. You wait outside, then head back along the wall through the quiet garden.'
    }
  }

  switch (sceneId) {
    case 'castle-courtyard': return 'You are a visitor on the castle grounds. Ahead, Snow carries a basket of apples and Rowan the huntsman steps out of the stable shadow. Neither has noticed you yet. You can speak to either of them.'
    case 'castle-garden': return flags.huntsmanFriendly
      ? 'Snow and Rowan walk together to the sundial. You follow close enough to join their conversation. The orchard is slower; the wall path leads straight to Auntie Hazel.'
      : 'Snow pauses at the sundial. Rowan keeps his distance, but he is still nearby. You can talk with either of them before the group chooses a path.'
    case 'castle-kitchen': return 'You reach Auntie Hazel’s garden with Snow and Rowan. Auntie Hazel is by the door. All three can hear you, and your next choice will shape how they meet.'
    case 'ending-friend': return 'You help Snow introduce Rowan to Auntie Hazel. They listen to one another, and an extra place is set on the step. You have become part of their story.'
    case 'ending-clever': return 'You ask everyone to pause at the door. Snow and Auntie Hazel feel safe, and Rowan gets a chance to explain himself. The door stays closed tonight, with a promise to talk again.'
    default: return 'You step back and let Snow and Auntie Hazel decide what to do. Rowan returns to the wall. The three of you have more to say another day.'
  }
}

function roleChoices(sceneId: string, role: Exclude<PlayerRole, 'snow'>): Choice[] {
  if (sceneId === 'castle-courtyard') return role === 'huntsman' ? [
    choice('huntsman-offer', 'Introduce yourself and offer to walk with Snow.', { huntsmanFriendly: true }, 'castle-garden', 'say'),
    choice('huntsman-ask', 'Ask where Snow is going, then give her room.', { huntsmanKnows: true }, 'castle-garden', 'say'),
    choice('huntsman-wait', 'Stay back and let Snow choose whether to speak.', { huntsmanCurious: true }, 'castle-garden'),
  ] : [
    choice('visitor-introduce', 'Introduce Snow and Rowan to each other.', { huntsmanFriendly: true }, 'castle-garden', 'say'),
    choice('visitor-ask', 'Ask Snow where the path leads.', { huntsmanKnows: true }, 'castle-garden', 'say'),
    choice('visitor-observe', 'Watch quietly and follow at a distance.', { huntsmanCurious: true }, 'castle-garden'),
  ]
  if (sceneId === 'castle-garden') return [
    choice(`${role}-orchard`, 'Take the orchard path and gather apples.', { tookApples: true }, 'castle-kitchen'),
    choice(`${role}-wall`, 'Take the wall path to the kitchen.', { tookApples: false }, 'castle-kitchen'),
  ]
  if (sceneId === 'castle-kitchen') return role === 'huntsman' ? [
    choice('huntsman-explain', 'Tell Auntie Hazel you hoped to keep Snow safe.', { introduced: true }, 'ending-friend', 'say'),
    choice('huntsman-give-space', 'Ask from the door if you may visit another day.', { warned: true }, 'ending-clever', 'say'),
    choice('huntsman-leave', 'Step back and return to the wall.', { snuck: true }, 'ending-close-call'),
  ] : [
    choice('visitor-introduce-huntsman', 'Introduce Rowan to Auntie Hazel.', { introduced: true }, 'ending-friend', 'say'),
    choice('visitor-pause', 'Ask everyone to pause and talk from the door.', { warned: true }, 'ending-clever', 'say'),
    choice('visitor-step-back', 'Let Snow and Auntie Hazel decide for themselves.', { snuck: true }, 'ending-close-call'),
  ]
  return []
}

/** Snow keeps the original authored path; other roles get their own point of view and choices. */
export function getRoleView(scene: Scene, flags: Flags, role: PlayerRole, companionId: string | null = null, customCharacter: Character | null = null, companionNames: string[] = [], customCharacters: Character[] = []): { scene: Scene; variant: SceneVariant } {
  const companion = companionId ? getCharacter(companionId) ?? (customCharacter?.id === companionId ? customCharacter : undefined) : undefined
  const names = companionNames.length ? companionNames : companion ? [companion.name] : []
  const companionLine = names.length && scene.id !== 'castle-courtyard'
    ? `\n\n${names.join(' and ')} ${names.length === 1 ? 'stays' : 'stay'} beside the group, ready to share what they know about the grounds.`
    : ''
  const profileLines = customCharacters.filter((character) => character.talent && character.goal && names.includes(character.name))
    .map((character) => profileMoment(character.name, character.talent!, character.goal!, scene.id)).filter(Boolean)
  const fullCompanionLine = companionLine + (profileLines.length ? `\n\n${profileLines.join(' ')}` : '')
  if (role === 'snow') {
    const variant = resolveVariant(scene, flags)
    return { scene, variant: fullCompanionLine ? { ...variant, narration: variant.narration + fullCompanionLine } : variant }
  }

  const ending = Boolean(scene.ending)
  const cast = scene.id === 'castle-courtyard' || scene.id === 'castle-garden'
    ? [snow, huntsman, ...(role === 'visitor' ? [visitor] : [])]
    : [snow, huntsman, auntie, ...(role === 'visitor' ? [visitor] : [])]
  const viewScene: Scene = {
    ...scene,
    cast,
    objective: ending ? '' : role === 'huntsman' ? 'Decide how Rowan approaches the others.' : 'Choose how to join the story.',
    ending: ending ? {
      title: role === 'huntsman' ? 'Rowan’s Story' : 'The Visitor’s Story',
      blurb: role === 'huntsman' ? 'The choices you made changed how the others saw Rowan.' : 'Your choices changed the meeting at Auntie Hazel’s door.',
    } : undefined,
  }
  return {
    scene: viewScene,
    variant: {
      id: `${role}-${scene.id}`,
      narration: roleNarration(scene.id, flags, role as Exclude<PlayerRole, 'snow'>) + fullCompanionLine,
      anchors: roleChoices(scene.id, role as Exclude<PlayerRole, 'snow'>),
    },
  }
}
