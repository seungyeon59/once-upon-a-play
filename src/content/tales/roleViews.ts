import type { Character, Choice, Flags, PlayerRole, Scene, ScenePlacement, SceneVariant } from '../../state/types.ts'
import { resolveVariant } from './redRidingHood.ts'
import { getCharacter } from '../characters.ts'
import { profileMoment } from '../customProfile.ts'

const red: ScenePlacement = { characterId: 'red', x: 0.34, y: 0.87, scale: 1, facing: 1 }
const wolf: ScenePlacement = { characterId: 'wolf', x: 0.66, y: 0.85, scale: 1, facing: -1 }
const grandma: ScenePlacement = { characterId: 'grandma', x: 0.78, y: 0.86, scale: 0.9, facing: -1 }
const visitor: ScenePlacement = { characterId: 'visitor', x: 0.13, y: 0.88, scale: 0.9, facing: 1 }

function choice(id: string, label: string, flags: Flags, next: string, kind: Choice['kind'] = 'act'): Choice {
  return { id, label, kind, effects: { setFlags: flags, goToScene: next } }
}

function roleNarration(sceneId: string, flags: Flags, role: Exclude<PlayerRole, 'red'>): string {
  if (role === 'wolf') {
    switch (sceneId) {
      case 'forest-path': return 'You are Gray, the wolf of the grey wood. Red is carrying warm muffins to Nana Wren. You step out of the ferns, hoping to speak without frightening anyone. Red stops and waits. What will you do?'
      case 'fork': return flags.wolfFriendly
        ? 'Red walks beside you now. At the fork, the meadow path is slow and bright; the shortcut reaches Nana Wren first. Red looks to you for a suggestion.'
        : 'Red reaches the fork while you follow at a respectful distance. The meadow and the shortcut lead to the same cottage. You can still decide how to approach.'
      case 'cottage': return flags.tookFlowers
        ? 'You arrive at Nana Wren’s gate with Red and a bunch of asters. Nana Wren looks from Red to you. You have one chance to explain why you came.'
        : 'The cottage comes into view. Red is at the gate and Nana Wren is nearby. You stop where they can see you and decide what to say next.'
      case 'ending-friend': return 'You tell Nana Wren that you wanted company more than muffins. Red makes room at the table, and Nana Wren invites you to stay for supper. For once, the forest feels less lonely.'
      case 'ending-clever': return 'You give Red and Nana Wren space and explain yourself from the gate. They listen, then choose to keep the door closed tonight. You leave knowing you can ask again another day.'
      default: return 'You hurry toward the cottage before finding the right words. Red and Nana Wren step inside to talk. You wait outside, then head home through the quiet wood.'
    }
  }

  switch (sceneId) {
    case 'forest-path': return 'You are a traveler in the grey wood. Ahead, Red carries a basket of muffins and Gray the wolf steps out of the ferns. Neither has noticed you yet. You can speak to either of them.'
    case 'fork': return flags.wolfFriendly
      ? 'Red and Gray walk together to a fork in the path. You follow close enough to join their conversation. The meadow is slower; the shortcut leads straight to Nana Wren.'
      : 'Red pauses at a fork. Gray keeps his distance, but he is still nearby. You can talk with either of them before the group chooses a path.'
    case 'cottage': return 'You reach Nana Wren’s garden with Red and Gray. Nana Wren is by the door. All three can hear you, and your next choice will shape how they meet.'
    case 'ending-friend': return 'You help Red introduce Gray to Nana Wren. They listen to one another, and an extra place is set at the supper table. You have become part of their story.'
    case 'ending-clever': return 'You ask everyone to pause at the gate. Red and Nana Wren feel safe, and Gray gets a chance to explain himself. The door stays closed tonight, with a promise to talk again.'
    default: return 'You step back and let Red and Nana Wren decide what to do. Gray returns to the wood. The three of you have more to say another day.'
  }
}

function roleChoices(sceneId: string, role: Exclude<PlayerRole, 'red'>): Choice[] {
  if (sceneId === 'forest-path') return role === 'wolf' ? [
    choice('wolf-offer', 'Introduce yourself and offer to walk with Red.', { wolfFriendly: true }, 'fork', 'say'),
    choice('wolf-ask', 'Ask where Red is going, then give them room.', { wolfKnows: true }, 'fork', 'say'),
    choice('wolf-wait', 'Stay back and let Red choose whether to speak.', { wolfCurious: true }, 'fork'),
  ] : [
    choice('visitor-introduce', 'Introduce Red and Gray to each other.', { wolfFriendly: true }, 'fork', 'say'),
    choice('visitor-ask', 'Ask Red where the path leads.', { wolfKnows: true }, 'fork', 'say'),
    choice('visitor-observe', 'Watch quietly and follow at a distance.', { wolfCurious: true }, 'fork'),
  ]
  if (sceneId === 'fork') return [
    choice(`${role}-meadow`, 'Take the meadow path and gather asters.', { tookFlowers: true }, 'cottage'),
    choice(`${role}-shortcut`, 'Take the short path to the cottage.', { tookFlowers: false }, 'cottage'),
  ]
  if (sceneId === 'cottage') return role === 'wolf' ? [
    choice('wolf-explain', 'Tell Nana Wren you hoped to make friends.', { introduced: true }, 'ending-friend', 'say'),
    choice('wolf-give-space', 'Ask from the gate if you may visit another day.', { warned: true }, 'ending-clever', 'say'),
    choice('wolf-leave', 'Step back and return to the wood.', { snuck: true }, 'ending-close-call'),
  ] : [
    choice('visitor-introduce-wolf', 'Introduce Gray to Nana Wren.', { introduced: true }, 'ending-friend', 'say'),
    choice('visitor-pause', 'Ask everyone to pause and talk from the gate.', { warned: true }, 'ending-clever', 'say'),
    choice('visitor-step-back', 'Let Red and Nana Wren decide for themselves.', { snuck: true }, 'ending-close-call'),
  ]
  return []
}

/** Red keeps the original authored path; other roles get their own point of view and choices. */
export function getRoleView(scene: Scene, flags: Flags, role: PlayerRole, companionId: string | null = null, customCharacter: Character | null = null, companionNames: string[] = [], customCharacters: Character[] = []): { scene: Scene; variant: SceneVariant } {
  const companion = companionId ? getCharacter(companionId) ?? (customCharacter?.id === companionId ? customCharacter : undefined) : undefined
  const names = companionNames.length ? companionNames : companion ? [companion.name] : []
  const companionLine = names.length && scene.id !== 'forest-path'
    ? `\n\n${names.join(' and ')} ${names.length === 1 ? 'stays' : 'stay'} beside the group, ready to share what they know about the path.`
    : ''
  const profileLines = customCharacters.filter((character) => character.talent && character.goal && names.includes(character.name))
    .map((character) => profileMoment(character.name, character.talent!, character.goal!, scene.id)).filter(Boolean)
  const fullCompanionLine = companionLine + (profileLines.length ? `\n\n${profileLines.join(' ')}` : '')
  if (role === 'red') {
    const variant = resolveVariant(scene, flags)
    return { scene, variant: fullCompanionLine ? { ...variant, narration: variant.narration + fullCompanionLine } : variant }
  }

  const ending = Boolean(scene.ending)
  const cast = scene.id === 'forest-path' || scene.id === 'fork'
    ? [red, wolf, ...(role === 'visitor' ? [visitor] : [])]
    : [red, wolf, grandma, ...(role === 'visitor' ? [visitor] : [])]
  const viewScene: Scene = {
    ...scene,
    cast,
    objective: ending ? '' : role === 'wolf' ? 'Decide how Gray approaches the others.' : 'Choose how to join the story.',
    ending: ending ? {
      title: role === 'wolf' ? 'Gray’s Story' : 'The Visitor’s Story',
      blurb: role === 'wolf' ? 'The choices you made changed how the others saw Gray.' : 'Your choices changed the meeting at Nana Wren’s cottage.',
    } : undefined,
  }
  return {
    scene: viewScene,
    variant: {
      id: `${role}-${scene.id}`,
      narration: roleNarration(scene.id, flags, role) + fullCompanionLine,
      anchors: roleChoices(scene.id, role),
    },
  }
}
