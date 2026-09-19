import type { ChatRequest, ChatResponse } from '../src/state/types.ts'

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
    return {
      reply: `${name} looks up at you. "I am glad you drew me into this story. What should we explore together?"`,
      suggestedChoices: [
        { id: 'custom-1', label: 'Ask about the forest' },
        { id: 'custom-2', label: 'Invite them to walk with us' },
        { id: 'custom-3', label: 'Ask what they noticed' },
      ],
      source: 'mock',
    }
  }
  if (request.characterId === 'grandma' && request.playerRole !== 'red') {
    return {
      reply: request.playerRole === 'wolf'
        ? 'Nana Wren looks at Gray. "You stopped at the gate. That is a good start. What brought you here?"'
        : 'Nana Wren smiles at the visitor. "There is room by the gate. What did you see on the path?"',
      suggestedChoices: [
        { id: 'ask-grandma-1', label: 'Ask about the cottage' },
        { id: 'ask-grandma-2', label: 'Tell her about the path' },
        { id: 'ask-grandma-3', label: 'Ask about Gray and Red' },
      ],
      source: 'mock',
    }
  }
  const voice = VOICES[request.characterId] ?? DEFAULT_VOICE
  const seed = hash(request.playerText + request.history.length)

  return {
    reply: voice.replies[seed % voice.replies.length],
    suggestedChoices: voice.suggestions[seed % voice.suggestions.length].map((label, index) => ({
      id: `mock-${seed}-${index}`,
      label,
    })),
    source: 'mock',
  }
}
