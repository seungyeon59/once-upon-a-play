import type { Request, Response } from 'express'
import { splitReading, type ReadingSpeaker } from './readingScript.ts'

const MAX_NARRATION_CHARS = 1800
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'
const DEFAULT_RED_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'
const DEFAULT_WOLF_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'
const DEFAULT_GRANDMA_VOICE_ID = '9BWtsMINqrJLrRacOk9x'

function voiceFor(speaker: ReadingSpeaker, narratorVoiceId: string): string {
  switch (speaker) {
    case 'red': return process.env.ELEVENLABS_RED_VOICE_ID || DEFAULT_RED_VOICE_ID
    case 'wolf': return process.env.ELEVENLABS_WOLF_VOICE_ID || DEFAULT_WOLF_VOICE_ID
    case 'grandma': return process.env.ELEVENLABS_GRANDMA_VOICE_ID || DEFAULT_GRANDMA_VOICE_ID
    default: return narratorVoiceId
  }
}

export function createNarrateHandler(
  apiKey: string | undefined,
  voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID,
  requestAudio: typeof fetch = fetch,
) {
  return async (req: Request, res: Response) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
    if (!text || text.length > MAX_NARRATION_CHARS) {
      res.status(400).json({ error: `Story text must be 1–${MAX_NARRATION_CHARS} characters.` })
      return
    }
    if (!apiKey) {
      res.status(503).json({ error: 'Story audio is not set up yet.' })
      return
    }

    try {
      const requestedSpeaker = req.body?.speaker
      const speakingCharacter = requestedSpeaker === 'red' || requestedSpeaker === 'wolf' || requestedSpeaker === 'grandma' ? requestedSpeaker : undefined
      const parts = splitReading(text, speakingCharacter)
      const clips: Array<{ speaker: ReadingSpeaker; audioBase64: string }> = []
      for (let index = 0; index < parts.length; index += 3) {
        const batch = await Promise.all(parts.slice(index, index + 3).map(async (part) => {
          const upstream = await requestAudio(
            `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceFor(part.speaker, voiceId))}/stream?output_format=mp3_44100_128`,
            {
              method: 'POST',
              headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
              body: JSON.stringify({
                text: part.text,
                model_id: 'eleven_flash_v2_5',
                voice_settings: { stability: part.speaker === 'narrator' ? 0.65 : 0.55, similarity_boost: 0.75, style: 0, speed: part.speaker === 'narrator' ? 0.93 : 0.97 },
              }),
              signal: AbortSignal.timeout(30000),
            },
          )
          if (!upstream.ok) throw new Error(`ElevenLabs returned ${upstream.status} for ${part.speaker}`)
          const bytes = Buffer.from(await upstream.arrayBuffer())
          if (!bytes.length) throw new Error(`Empty audio for ${part.speaker}`)
          return { speaker: part.speaker, audioBase64: bytes.toString('base64') }
        }))
        clips.push(...batch)
      }
      res.set('Cache-Control', 'no-store')
      res.json({ clips })
    } catch (error) {
      console.error('[narrate] ElevenLabs request failed:', error)
      res.status(502).json({ error: 'Story audio could not be created right now.' })
    }
  }
}
