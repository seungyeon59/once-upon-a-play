import { appendFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
import express from 'express'

import type { ChatRequest, ChatResponse, SuggestedChoice } from '../src/state/types.ts'
import { getCharacter } from '../src/content/characters.ts'
import { mockReply } from './mock.ts'
import { buildContextBlock, buildSystemPrompt, SPEAK_TOOL } from './persona.ts'
import { checkChildInput, filterCharacterReply, isChoiceSafe } from './safety.ts'
import { resolveCustomCharacter } from './customCharacter.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(HERE, '..', 'dist')

// Either location works: server/.env keeps the key next to the only code that
// reads it, the project root is where most people expect to put one. Neither is
// ever bundled into the client — Vite only exposes VITE_-prefixed variables.
dotenv.config({ path: [join(HERE, '.env'), join(HERE, '..', '.env')], quiet: true })

const API_KEY = process.env.ANTHROPIC_API_KEY
/**
 * Haiku 4.5 is the default: cheapest per token ($1/$5 per MTok) and fastest,
 * which matters more than raw capability for one short in-character line.
 * Set ANTHROPIC_MODEL in .env to trade up — claude-sonnet-5 or claude-opus-5.
 */
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5'

/**
 * Haiku 4.5 predates adaptive thinking and the effort control; sending either
 * is a 400. Newer models get both, with effort held low because a single line
 * of dialogue is not a reasoning problem.
 */
const SUPPORTS_ADAPTIVE_THINKING = !MODEL.startsWith('claude-haiku-4-5')

const client = API_KEY ? new Anthropic({ apiKey: API_KEY }) : null

const app = express()
app.use(express.json({ limit: '64kb' }))
app.set('trust proxy', 1)

// A public demo with an API key needs a small cost guard. This is per server
// instance; a larger launch should use a shared rate limiter and authentication.
const chatUsage = new Map<string, { count: number; resetAt: number }>()
app.use('/api/chat', (req, res, next) => {
  if (!client) return next()
  const now = Date.now()
  const ip = req.ip ?? 'unknown'
  const previous = chatUsage.get(ip)
  const usage = previous && previous.resetAt > now ? previous : { count: 0, resetAt: now + 60 * 60 * 1000 }
  usage.count += 1
  chatUsage.set(ip, usage)
  if (chatUsage.size > 10000) {
    for (const [key, value] of chatUsage) if (value.resetAt <= now) chatUsage.delete(key)
  }
  if (usage.count > 30) {
    res.status(429).json({ error: 'Too many conversations. Please try again later.' })
    return
  }
  next()
})

/* --------------------------------------------------------------- logging --- */

const LOG_DIR = join(HERE, 'logs')

/**
 * Every exchange is appended as JSONL, including the ones the safety layer
 * stopped. Phase 4's parent dashboard reads these files directly.
 */
async function logExchange(entry: Record<string, unknown>): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_CHAT_LOGS !== '1') return
  try {
    await mkdir(LOG_DIR, { recursive: true })
    const day = new Date().toISOString().slice(0, 10)
    await appendFile(join(LOG_DIR, `${day}.jsonl`), `${JSON.stringify({ ts: Date.now(), ...entry })}\n`)
  } catch (error) {
    // Logging must never break play.
    console.error('[log] failed to write exchange:', error)
  }
}

/* ------------------------------------------------------------------ llm --- */

interface SpeakInput {
  reply: string
  suggestions: string[]
}

async function askClaude(request: ChatRequest, systemPrompt: string): Promise<SpeakInput> {
  if (!client) throw new Error('no api key')

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    ...(SUPPORTS_ADAPTIVE_THINKING
      ? { thinking: { type: 'adaptive' as const }, output_config: { effort: 'low' as const } }
      : {}),
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    tools: [SPEAK_TOOL as unknown as Anthropic.Tool],
    tool_choice: { type: 'tool', name: 'speak' },
    messages: [
      { role: 'user', content: buildContextBlock(request) },
      ...request.history.map((turn) => ({
        role: (turn.role === 'child' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: turn.text,
      })),
      { role: 'user', content: request.playerText },
    ],
  })

  if (response.stop_reason === 'refusal') {
    throw new Error(`refused: ${response.stop_details?.category ?? 'unknown'}`)
  }

  const call = response.content.find((block) => block.type === 'tool_use')
  if (!call) throw new Error('model did not call the speak tool')

  // Tool inputs are already parsed JSON; validate the shape before trusting it.
  const input = call.input as Partial<SpeakInput>
  if (typeof input.reply !== 'string' || !Array.isArray(input.suggestions)) {
    throw new Error('speak tool returned an unexpected shape')
  }

  return { reply: input.reply, suggestions: input.suggestions.filter((s) => typeof s === 'string') }
}

/* --------------------------------------------------------------- routes --- */

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, llm: client ? 'live' : 'mock', model: client ? MODEL : null })
})

app.post('/api/chat', async (req, res) => {
  const request = req.body as ChatRequest

  const character = getCharacter(request?.characterId) ?? resolveCustomCharacter(request)
  if (!character || character.id === 'visitor' || character.id === request.playerRole) {
    res.status(400).json({ error: 'unknown character' })
    return
  }

  // 1. Screen the child's message. A rejection never reaches the model.
  const verdict = checkChildInput(String(request.playerText ?? ''))
  if (!verdict.ok) {
    await logExchange({
      kind: 'blocked-input',
      characterId: character.id,
      reason: verdict.reason,
      raw: String(request.playerText ?? '').slice(0, 400),
    })
    const blocked: ChatResponse = {
      reply: '',
      suggestedChoices: [],
      blocked: { reason: verdict.reason, message: verdict.childFacingMessage },
      source: client ? 'llm' : 'mock',
    }
    res.json(blocked)
    return
  }

  const clean: ChatRequest = { ...request, playerText: verdict.text }

  // 2. Ask the model, falling back to the mock on any failure.
  let raw: SpeakInput
  let source: ChatResponse['source'] = 'llm'
  try {
    raw = await askClaude(clean, buildSystemPrompt(character))
  } catch (error) {
    if (client) console.error('[chat] falling back to mock:', describeError(error))
    const fallback = mockReply(clean)
    raw = { reply: fallback.reply, suggestions: fallback.suggestedChoices.map((c) => c.label) }
    source = 'mock'
  }

  // 3. Screen what the character is about to say.
  const filtered = filterCharacterReply(raw.reply, character.safeFallback)
  const suggestedChoices: SuggestedChoice[] = raw.suggestions
    .filter(isChoiceSafe)
    .slice(0, 3)
    .map((label, index) => ({ id: `s-${Date.now()}-${index}`, label }))

  await logExchange({
    kind: 'exchange',
    characterId: character.id,
    sceneTitle: clean.sceneTitle,
    flags: clean.flags,
    child: clean.playerText,
    character: filtered.text,
    filtered: filtered.wasModified ? filtered.reasons : undefined,
    source,
  })

const payload: ChatResponse = { reply: filtered.text, suggestedChoices, source }
  res.json(payload)
})

// Production serves the built Vite app and API from one origin. Vite continues
// to serve the client separately during local development.
if (existsSync(join(DIST_DIR, 'index.html'))) {
  app.use(express.static(DIST_DIR))
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(join(DIST_DIR, 'index.html'))
  })
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return 'invalid API key'
  if (error instanceof Anthropic.RateLimitError) return 'rate limited'
  if (error instanceof Anthropic.BadRequestError) return `bad request: ${error.message}`
  if (error instanceof Anthropic.APIError) return `api error ${error.status}: ${error.message}`
  return error instanceof Error ? error.message : String(error)
}

export default app
