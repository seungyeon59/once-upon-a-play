import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Request, Response } from 'express'
import { createNarrateHandler } from './narrate.ts'

function fakeResponse() {
  const result = { status: 200, headers: {} as Record<string, string>, body: undefined as unknown }
  const response = {
    status(code: number) { result.status = code; return response },
    set(name: string, value: string) { result.headers[name] = value; return response },
    json(body: unknown) { result.body = body; return response },
    send(body: unknown) { result.body = body; return response },
  } as unknown as Response
  return { result, response }
}

test('requires an ElevenLabs key before requesting audio', async () => {
  const { result, response } = fakeResponse()
  await createNarrateHandler(undefined)({ body: { text: 'A new path appears.' } } as Request, response)
  assert.equal(result.status, 503)
})

test('sends the current scene to ElevenLabs and returns MP3 audio', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const requestAudio = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
  }
  const { result, response } = fakeResponse()
  await createNarrateHandler('secret-key', 'voice-123', requestAudio as typeof fetch)({ body: { text: 'A bridge appears.' } } as Request, response)
  assert.match(calls[0].url, /voice-123\/stream/)
  assert.equal((calls[0].init.headers as Record<string, string>)['xi-api-key'], 'secret-key')
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { text: 'A bridge appears.', model_id: 'eleven_flash_v2_5', voice_settings: { stability: 0.65, similarity_boost: 0.75, style: 0, speed: 0.93 } })
  assert.deepEqual(result.body, { clips: [{ speaker: 'narrator', audioBase64: Buffer.from([1, 2, 3]).toString('base64') }] })
})

test('dialogue uses a character voice while prose keeps the narrator voice', async () => {
  const urls: string[] = []
  const requestAudio = async (url: string | URL | Request) => {
    urls.push(String(url))
    return new Response(new Uint8Array([1]), { status: 200 })
  }
  const { result, response } = fakeResponse()
  await createNarrateHandler('secret-key', 'storyteller-id', requestAudio as typeof fetch)({ body: { text: 'Gray waits by the path. "Hello," he says.' } } as Request, response)
  assert.equal(urls.length, 3)
  assert.match(urls[0], /storyteller-id/)
  assert.match(urls[1], /pNInz6obpgDQGcFmaJgB/)
  assert.deepEqual((result.body as { clips: Array<{ speaker: string }> }).clips.map((clip) => clip.speaker), ['narrator', 'wolf', 'narrator'])
})

test('a dialogue reply uses the selected character voice', async () => {
  const urls: string[] = []
  const requestAudio = async (url: string | URL | Request) => {
    urls.push(String(url))
    return new Response(new Uint8Array([1]), { status: 200 })
  }
  const { result, response } = fakeResponse()
  await createNarrateHandler('secret-key', 'storyteller-id', requestAudio as typeof fetch)({ body: { text: 'Red lifts the basket. "Come with me," she says.', speaker: 'red' } } as Request, response)
  assert.equal(urls.length, 1)
  assert.match(urls[0], /21m00Tcm4TlvDq8ikWAM/)
  assert.deepEqual((result.body as { clips: Array<{ speaker: string }> }).clips.map((clip) => clip.speaker), ['red'])
})

test('rejects empty and oversized narration before spending credits', async () => {
  const { result, response } = fakeResponse()
  await createNarrateHandler('secret-key')({ body: { text: 'a'.repeat(1801) } } as Request, response)
  assert.equal(result.status, 400)
})
