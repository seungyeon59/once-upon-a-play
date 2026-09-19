/**
 * Child-safety filter layer.
 *
 * Per CLAUDE.md this layer exists BEFORE any LLM wiring: every request into the
 * model and every reply out of it passes through here. Target audience is 9-12,
 * so the rules are deliberately conservative — when in doubt we replace the text
 * with an in-character safe line rather than surfacing an error to the child.
 */

export const MAX_INPUT_CHARS = 300
export const MAX_REPLY_CHARS = 600

export type InputVerdict =
  | { ok: true; text: string }
  | { ok: false; reason: SafetyReason; childFacingMessage: string }

export type ReplyVerdict = {
  text: string
  wasModified: boolean
  reasons: SafetyReason[]
}

export type SafetyReason =
  | 'too-long'
  | 'empty'
  | 'unsafe-language'
  | 'self-disclosed-pii'
  | 'asks-for-pii'
  | 'prompt-injection'
  | 'out-of-world'

/** Words that should never appear in either direction in a story for 9-12 year olds. */
const UNSAFE_LANGUAGE = [
  'kill', 'killed', 'killing', 'murder', 'stab', 'stabbed', 'blood', 'bloody',
  'gore', 'corpse', 'die', 'died', 'dying', 'dead', 'suicide', 'gun', 'shoot',
  'knife', 'weapon', 'drug', 'drugs', 'drunk', 'beer', 'wine', 'cigarette',
  'sex', 'sexy', 'naked', 'nude', 'kiss me', 'hate you', 'stupid', 'idiot',
  'damn', 'hell', 'crap', 'shut up',
]

/** The child revealing real-world identifying information about themselves. */
const SELF_DISCLOSED_PII: RegExp[] = [
  /\b\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/,                    // phone number
  /[\w.+-]+@[\w-]+\.[\w.]{2,}/,                              // email
  /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|blvd)\b/i,
  /\bmy (real )?name is\b/i,
  /\bi (live|go to school) (in|at|on)\b/i,
  /\bmy (school|address|phone|mom|dad|teacher)('s)? (name|number|is)\b/i,
  /\bi am \d{1,2} years old\b/i,
]

/** The character fishing for identifying information from the child. */
const ASKS_FOR_PII: RegExp[] = [
  /\bwhat('s| is) your (real )?(name|address|phone|school|email)\b/i,
  /\bwhere do you (really )?(live|go to school)\b/i,
  /\bhow old are you\b/i,
  /\btell me your (real )?(name|address|phone|school)\b/i,
  /\bsend me a (photo|picture|selfie)\b/i,
  /\b(meet|see) me in (real life|person)\b/i,
]

/** Attempts to talk to the model rather than to the character. */
const PROMPT_INJECTION: RegExp[] = [
  /\bignore (all |any |your )?(previous|prior|above)\b/i,
  /\b(system|developer) (prompt|message|instruction)/i,
  /\byou are (now|actually) (an? )?(ai|assistant|chatbot|language model)/i,
  /\bpretend (you are|to be) (an? )?(ai|assistant|different)/i,
  /\bdisregard (your|the) (rules|instructions|persona)/i,
  /\breveal your (prompt|instructions|rules)/i,
  /\bact as (an? )?(ai|assistant|dan)\b/i,
]

/** The character breaking the fourth wall. */
const OUT_OF_WORLD: RegExp[] = [
  /\bas an ai\b/i,
  /\blanguage model\b/i,
  /\bi (can't|cannot) (help|assist) with that\b/i,
  /\bmy (system )?(prompt|instructions)\b/i,
  /\bi('m| am) (an? )?(ai|assistant|chatbot)\b/i,
]

function hasUnsafeLanguage(text: string): boolean {
  const lower = ` ${text.toLowerCase().replace(/[^a-z\s']/g, ' ')} `
  return UNSAFE_LANGUAGE.some((word) => lower.includes(` ${word} `))
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

/**
 * Screens what the child typed. A rejection never reaches the model; the caller
 * shows `childFacingMessage` as a gentle in-world nudge instead.
 */
export function checkChildInput(raw: string): InputVerdict {
  const text = raw.trim().replace(/\s+/g, ' ')

  if (!text) {
    return { ok: false, reason: 'empty', childFacingMessage: 'Say something first!' }
  }
  if (text.length > MAX_INPUT_CHARS) {
    return {
      ok: false,
      reason: 'too-long',
      childFacingMessage: `That's a lot of words! Try saying it in ${MAX_INPUT_CHARS} letters or fewer.`,
    }
  }
  if (matchesAny(text, PROMPT_INJECTION)) {
    return {
      ok: false,
      reason: 'prompt-injection',
      childFacingMessage: 'Everyone here only knows about this story world. Try asking about the story!',
    }
  }
  if (matchesAny(text, SELF_DISCLOSED_PII)) {
    return {
      ok: false,
      reason: 'self-disclosed-pii',
      childFacingMessage: 'Keep your real-life details private — even in a story. Try something else!',
    }
  }
  if (hasUnsafeLanguage(text)) {
    return {
      ok: false,
      reason: 'unsafe-language',
      childFacingMessage: "Let's keep this story kind. Try saying it a different way!",
    }
  }

  return { ok: true, text }
}

/**
 * Screens what the character is about to say. This one never rejects outright —
 * a broken story is worse than a blander line — it substitutes a safe reply.
 */
export function filterCharacterReply(raw: string, safeFallback: string): ReplyVerdict {
  const reasons: SafetyReason[] = []
  let text = raw.trim()

  if (!text) {
    return { text: safeFallback, wasModified: true, reasons: ['empty'] }
  }
  if (matchesAny(text, ASKS_FOR_PII)) reasons.push('asks-for-pii')
  if (matchesAny(text, OUT_OF_WORLD)) reasons.push('out-of-world')
  if (hasUnsafeLanguage(text)) reasons.push('unsafe-language')

  if (reasons.length > 0) {
    return { text: safeFallback, wasModified: true, reasons }
  }

  if (text.length > MAX_REPLY_CHARS) {
    // Trim at the last sentence boundary that fits rather than mid-word.
    const clipped = text.slice(0, MAX_REPLY_CHARS)
    const lastStop = Math.max(clipped.lastIndexOf('.'), clipped.lastIndexOf('!'), clipped.lastIndexOf('?'))
    text = lastStop > MAX_REPLY_CHARS * 0.4 ? clipped.slice(0, lastStop + 1) : `${clipped.trimEnd()}...`
    return { text, wasModified: true, reasons: ['too-long'] }
  }

  return { text, wasModified: false, reasons: [] }
}

/** Screens a suggested choice button. Unsafe suggestions are dropped, not rewritten. */
export function isChoiceSafe(label: string): boolean {
  if (!label.trim() || label.length > 80) return false
  if (hasUnsafeLanguage(label)) return false
  if (matchesAny(label, SELF_DISCLOSED_PII)) return false
  if (matchesAny(label, PROMPT_INJECTION)) return false
  return true
}
