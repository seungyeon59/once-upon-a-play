export type ReadingSpeaker = 'narrator' | 'red' | 'wolf' | 'grandma'
export interface ReadingPart { speaker: ReadingSpeaker; text: string }

const dialogue = /[“"]([^”"]+)[”"]/g
const namedSpeakers: Array<[RegExp, ReadingSpeaker]> = [
  [/\b(?:Gray|wolf)\b/gi, 'wolf'],
  [/\b(?:Nana Wren|Nana|Wren|grandma)\b/gi, 'grandma'],
  [/\bRed\b/gi, 'red'],
]

function closestNamedSpeaker(text: string): ReadingSpeaker | null {
  let closest = -1
  let speaker: ReadingSpeaker | null = null
  for (const [pattern, candidate] of namedSpeakers) {
    for (const match of text.matchAll(pattern)) {
      if (match.index > closest) { closest = match.index; speaker = candidate }
    }
  }
  return speaker
}

function inferSpeaker(before: string, between: string, after: string, previous: ReadingSpeaker | null): ReadingSpeaker {
  // "...", Gray says. / "...", says Nana Wren.
  const followingClause = after.slice(0, 85).split(/[.!?"“”]/, 1)[0]
  const explicitAfter = followingClause.match(/\b(?:Gray|Red|Nana Wren|Nana|Wren|the wolf|the grandmother)\b.{0,24}\b(?:says?|asks?|replies?|whispers?|calls?)\b|\b(?:says?|asks?|replies?|whispers?|calls?)\b.{0,24}\b(?:Gray|Red|Nana Wren|Nana|Wren|the wolf|the grandmother)\b/i)
  if (explicitAfter) return closestNamedSpeaker(explicitAfter[0]) ?? 'narrator'

  const namedBefore = closestNamedSpeaker(before.slice(-160))
  if (/\bhe\s+(?:says?|asks?|replies?|whispers?|calls?)\b/i.test(followingClause)) return 'wolf'
  if (/\bshe\s+(?:says?|asks?|replies?|whispers?|calls?)\b/i.test(followingClause)) {
    return /\b(?:Nana|Wren|grandma)\b/i.test(before.slice(-180)) ? 'grandma' : namedBefore === 'red' ? 'red' : 'grandma'
  }
  const namedBetween = closestNamedSpeaker(between)
  if (namedBetween && /\b(?:says?|asks?|replies?|whispers?|calls?)\b/i.test(between)) return namedBetween
  if (previous && between.trim().length < 110 && (!namedBetween || /^(?:he|she)\b/i.test(between.trim()))) return previous
  if (/\b(?:Gray|Red|Nana Wren|Nana|Wren)\s+(?:says?|asks?|replies?|whispers?|calls?)\b/i.test(before.slice(-90))) return namedBefore ?? 'narrator'
  return namedBetween ?? namedBefore ?? previous ?? 'narrator'
}

export function splitReading(text: string, speakingCharacter?: Exclude<ReadingSpeaker, 'narrator'>): ReadingPart[] {
  // A character's chat reply belongs entirely to that character, including
  // action beats outside quotation marks. Otherwise the male storyteller
  // reads most of Red's reply before her own line begins.
  if (speakingCharacter) return [{ speaker: speakingCharacter, text: text.trim() }]
  const parts: ReadingPart[] = []
  let cursor = 0
  let lastSpeaker: ReadingSpeaker | null = null
  for (const match of text.matchAll(dialogue)) {
    const index = match.index
    const prose = text.slice(cursor, index).trim()
    if (prose) parts.push({ speaker: 'narrator', text: prose })
    const spoken = match[1].trim()
    if (spoken) {
      const speaker: ReadingSpeaker = inferSpeaker(text.slice(Math.max(0, index - 190), index), text.slice(cursor, index), text.slice(index + match[0].length, index + match[0].length + 100), lastSpeaker)
      parts.push({ speaker, text: spoken })
      if (speaker !== 'narrator') lastSpeaker = speaker
    }
    cursor = index + match[0].length
  }
  const tail = text.slice(cursor).trim()
  if (tail) parts.push({ speaker: 'narrator', text: tail })
  if (!parts.length || parts.length > 14) return [{ speaker: 'narrator', text: text.trim() }]
  return parts
}
