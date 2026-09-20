import type { ChatRequest, ChatResponse } from '../src/state/types.ts'
import { safeCompanionProfiles } from './customCharacter.ts'

/**
 * Deterministic stand-in for the LLM so the whole loop is playable with no API
 * key. Replies are picked by hashing the player's line, so the same input gives
 * the same answer — which also makes the mock usable as a smoke test.
 */

interface MockVoice {
  replies: string[]
  suggestions: string[][]
}

const VOICES: Record<string, MockVoice> = {
  moss: {
    replies: [
      'Moss points to the softer trail. "The meadow takes longer, but it is easy to follow. Which way would you like to try?"',
      '"I know this bend," Moss says. "The cottage is just beyond the trees. Want me to walk with you?"',
    ],
    suggestions: [['Ask about the meadow', 'Ask about Nana Wren', 'Thank Moss for helping']],
  },
  bramble: {
    replies: [
      'Bramble flicks an ear. "The asters are bright today. Shall I show you where they grow?"',
      '"I usually walk alone," Bramble says. "It is more fun with company. What shall we look for?"',
    ],
    suggestions: [['Ask about the asters', 'Ask about the shortcut', 'Invite Bramble to walk along']],
  },
  red: {
    replies: [
      'Red shifts the basket. "I am taking these muffins to Nana Wren. Would you like to walk with me?"',
      '"The woods feel different with company," Red says. "What do you think is around the bend?"',
      'Red smiles. "I can tell you about Nana Wren if you tell me about this path."',
    ],
    suggestions: [
      ['Ask about Nana Wren', 'Offer to help with the basket', 'Ask which way to go'],
    ],
  },
  wolf: {
    replies: [
      'Gray considers that for a while. "Hm," he says. "Nobody talks to me long enough to get that far."',
      'He sniffs, once, toward the basket. "You keep saying interesting things instead of walking. Why is that?"',
      '"The forest tells me things," Gray says. "It has never once told me what people are actually like."',
      'Gray sits back on his haunches, which somehow makes him look smaller. "Ask me another one."',
      '"Careful," he says, almost amused. "Keep asking and I will start answering properly."',
    ],
    suggestions: [
      ['Ask what he eats out here', 'Tell him about the muffins', 'Ask if he is lonely'],
      ['Ask how he knows this forest', 'Offer to share the basket', 'Ask why people are scared of him'],
      ['Ask what he wants', 'Tell him your name for the story', 'Ask him to walk with you'],
    ],
  },
  grandma: {
    replies: [
      'Nana Wren snorts. "That is either very wise or very silly, sprout, and I cannot tell which yet."',
      'She turns a sprig of rosemary over. "Go on then. I have all evening and so, apparently, do you."',
      '"Hm," says Nana Wren. "You sound like your mother did at your age. That is not an insult."',
      'She sets the bowl down. "Now that is a question worth stopping work for."',
      '"Everything out there is only doing what it needs to," she says. "Including the things with teeth."',
    ],
    suggestions: [
      ['Ask about the wolf', 'Tell her what happened on the path', 'Ask what is for supper'],
      ['Ask if she is ever scared', 'Show her the basket', 'Ask about the herbs'],
      ['Ask what she would do', 'Tell her you were not scared', 'Ask to stay the night'],
    ],
  },
  snow: {
    replies: [
      'Snow shifts the basket. "I am taking these apples to Auntie Hazel. Would you like to walk with me?"',
      '"The garden feels different with company," Snow says. "What do you think is past the wall?"',
      'Snow smiles. "I can tell you about Auntie Hazel if you tell me about this path."',
    ],
    suggestions: [
      ['Ask about Auntie Hazel', 'Offer to help with the basket', 'Ask which way to go'],
    ],
  },
  huntsman: {
    replies: [
      'Rowan considers that for a while. "Hm," he says. "Nobody talks to me long enough to get that far."',
      'He glances back toward the wall. "You keep saying interesting things instead of walking. Why is that?"',
      '"The castle tells me things," Rowan says. "It has never once told me what people are actually like."',
      'Rowan sits back on the step, which somehow makes him look smaller. "Ask me another one."',
      '"Careful," he says, almost amused. "Keep asking and I will start answering properly."',
    ],
    suggestions: [
      ['Ask what he was sent to do', 'Tell him about the apples', 'Ask if he is lonely'],
      ['Ask how he knows the grounds', 'Offer to share the basket', 'Ask why people are wary of him'],
      ['Ask what he wants', 'Tell him your name for the story', 'Ask him to walk with you'],
    ],
  },
  auntie: {
    replies: [
      'Auntie Hazel snorts. "That is either very wise or very silly, sprout, and I cannot tell which yet."',
      'She turns a wooden spoon over. "Go on then. I have all evening and so, apparently, do you."',
      '"Hm," says Auntie Hazel. "You sound like your mother did at your age. That is not an insult."',
      'She sets the bowl down. "Now that is a question worth stopping work for."',
      '"Everything out there is only doing what it needs to," she says. "Including the ones with orders."',
    ],
    suggestions: [
      ['Ask about the huntsman', 'Tell her what happened outside', 'Ask what is in the ovens'],
      ['Ask if she is ever scared', 'Show her the basket', 'Ask about the kitchen'],
      ['Ask what she would do', 'Tell her you were not scared', 'Ask to stay the night'],
    ],
  },
  cinderella: {
    replies: [
      'Ellie adjusts her apron. "I am hoping to reach the terrace before the doors close. Would you like to come?"',
      '"The corridor feels different with company," Ellie says. "What do you think is past the glass door?"',
      'Ellie smiles. "I can tell you about the slippers if you tell me about this hallway."',
    ],
    suggestions: [
      ['Ask about the glass slippers', 'Offer to help her hurry', 'Ask which way to go'],
    ],
  },
  whisk: {
    replies: [
      'Whisk considers that for a while. "Hm," it says. "Nobody talks to me long enough to get that far."',
      'It sniffs, once, toward the candle smoke. "You keep saying interesting things instead of walking. Why is that?"',
      '"The castle tells me things," Whisk says. "It has never once told me what people are actually like."',
      'Whisk sits back on its haunches, which somehow makes it look smaller. "Ask me another one."',
      '"Careful," it says, almost amused. "Keep asking and I will start answering properly."',
    ],
    suggestions: [
      ['Ask what it left in your apron', 'Tell it about the ball', 'Ask if it is lonely'],
      ['Ask how it knows the passages', 'Offer to share a blossom', 'Ask why the staff are wary of it'],
      ['Ask what it wants', 'Tell it your name for the story', 'Ask it to walk with you'],
    ],
  },
  dame: {
    replies: [
      'Dame Ferro snorts. "That is either very wise or very silly, sprout, and I cannot tell which yet."',
      'She turns a candle over. "Go on then. I have all evening and so, apparently, do you."',
      '"Hm," says Dame Ferro. "You sound like your mother did at your age. That is not an insult."',
      'She sets the keys down. "Now that is a question worth stopping work for."',
      '"Everything out there is only doing what it needs to," she says. "Including the things with soot."',
    ],
    suggestions: [
      ['Ask about the ash-spirit', 'Tell her what happened in the corridor', 'Ask what is for the midnight supper'],
      ['Ask if she is ever surprised', 'Show her the slippers', 'Ask about the ballroom'],
      ['Ask what she would do', 'Tell her you were not scared', 'Ask to stay past midnight'],
    ],
  },
}

/** The "grandma"-role character in each tale gets a different aside when the player isn't the protagonist. */
interface ElderAside { primaryRole: string; secondaryRole: string; toSecondary: string; toVisitor: string; suggestions: [string, string, string] }
const ELDER_ASIDES: Record<string, ElderAside> = {
  grandma: {
    primaryRole: 'red', secondaryRole: 'wolf',
    toSecondary: 'Nana Wren looks at Gray. "You stopped at the gate. That is a good start. What brought you here?"',
    toVisitor: 'Nana Wren smiles at the visitor. "There is room by the gate. What did you see on the path?"',
    suggestions: ['Ask about the cottage', 'Tell her about the path', 'Ask about Gray and Red'],
  },
  auntie: {
    primaryRole: 'snow', secondaryRole: 'huntsman',
    toSecondary: 'Auntie Hazel looks at Rowan. "You stopped at the door. That is a good start. What brought you here?"',
    toVisitor: 'Auntie Hazel smiles at the visitor. "There is room by the door. What did you see in the garden?"',
    suggestions: ['Ask about the kitchen', 'Tell her about the garden', 'Ask about Rowan and Snow'],
  },
  dame: {
    primaryRole: 'cinderella', secondaryRole: 'whisk',
    toSecondary: 'Dame Ferro looks at Whisk. "You stopped at the threshold. That is a good start. What brought you here?"',
    toVisitor: 'Dame Ferro smiles at the visitor. "There is room on the terrace. What did you see in the corridor?"',
    suggestions: ['Ask about the ballroom', 'Tell her about the corridor', 'Ask about Whisk and Ellie'],
  },
}

const DEFAULT_VOICE: MockVoice = {
  replies: ['They look at you and wait for you to go on.'],
  suggestions: [['Say hello', 'Ask a question', 'Wait and listen']],
}

function hash(text: string): number {
  let value = 0
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value
}

export function mockReply(request: ChatRequest): ChatResponse {
  if (request.customCharacter?.id === request.characterId) {
    const name = request.customCharacter.name
    const talent = request.customCharacter.talent
    const goal = request.customCharacter.goal
    return {
      reply: `${name} looks up at you. "I hope to ${goal ?? 'explore together'}. Can I help with ${talent ?? 'the next discovery'}?"`,
      suggestedChoices: [
        { id: 'custom-1', label: talent ? `Ask about ${talent}`.slice(0, 60) : 'Ask about the forest' },
        { id: 'custom-2', label: goal ? `Offer to ${goal}`.slice(0, 60) : 'Invite them to walk with us' },
        { id: 'custom-3', label: 'Ask what they noticed' },
      ],
      source: 'mock',
    }
  }
  const elder = ELDER_ASIDES[request.characterId]
  if (elder && request.playerRole !== elder.primaryRole) {
    return {
      reply: request.playerRole === elder.secondaryRole ? elder.toSecondary : elder.toVisitor,
      suggestedChoices: [
        { id: 'ask-elder-1', label: elder.suggestions[0] },
        { id: 'ask-elder-2', label: elder.suggestions[1] },
        { id: 'ask-elder-3', label: elder.suggestions[2] },
      ],
      source: 'mock',
    }
  }
  const voice = VOICES[request.characterId] ?? DEFAULT_VOICE
  const seed = hash(request.playerText + request.history.length)
  const companion = safeCompanionProfiles(request.companionProfiles)[0]
  const labels = [...voice.suggestions[seed % voice.suggestions.length]]
  if (companion?.goal) labels[2] = `Ask how ${companion.name} can ${companion.goal}`.slice(0, 60)

  return {
    reply: voice.replies[seed % voice.replies.length],
    suggestedChoices: labels.map((label, index) => ({
      id: `mock-${seed}-${index}`,
      label,
    })),
    source: 'mock',
  }
}
