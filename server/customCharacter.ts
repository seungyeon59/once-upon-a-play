import type { Character, ChatRequest } from '../src/state/types.ts'
import { checkChildInput } from './safety.ts'
import { isTalent, isGoal } from '../src/content/customProfile.ts'

/** The browser sends profile choices; the server owns the prompt template. */
export function resolveCustomCharacter(request: ChatRequest): Character | undefined {
  const custom = request.customCharacter
  if (!custom || custom.id !== request.characterId || !/^custom-\d{10,}$/.test(custom.id)) return undefined
  const name = custom.name.trim()
  const personality = custom.personality.trim()
  if (!/^[\p{L}\p{N} .'-]{1,24}$/u.test(name) || personality.length < 2 || personality.length > 100) return undefined
  const verdict = checkChildInput(personality)
  if (!verdict.ok) return undefined
  if ((custom.talent !== undefined && !isTalent(custom.talent)) || (custom.goal !== undefined && !isGoal(custom.goal))) return undefined
  return {
    id: custom.id,
    name,
    title: 'A child-created companion in the grey wood',
    traits: [verdict.text],
    personality: verdict.text,
    persona: {
      role: `A friendly companion imagined by the child, traveling with the group in the grey wood.${custom.talent ? ` They are good at ${custom.talent}.` : ''}`,
      voice: `The child describes this character as ${verdict.text}. Speak warmly and briefly.`,
      wants: custom.goal ? `To ${custom.goal}.` : 'To help the group reach Nana Wren’s cottage.',
      knows: ['The group is walking through the grey wood toward Nana Wren’s cottage.'],
      neverDoes: ['Ask about the player’s real life.', 'Decide the plot or speak for another character.'],
    },
    art: { body: 0x719579, accent: 0xe4b363, skin: 0xe8ceb1, silhouette: 'child', height: 150 },
    starters: [],
    safeFallback: `${name} smiles and waits for you to go on.`,
  }
}
