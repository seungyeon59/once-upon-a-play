import { useEffect, useRef, useState } from 'react'

type Speaker = 'narrator' | 'red' | 'wolf' | 'grandma'
type Clip = { speaker: Speaker; audio: Blob }
type PlaybackState = 'idle' | 'loading' | 'playing'
const speakerNames: Record<Speaker, string> = { narrator: 'Storyteller', red: 'Red', wolf: 'Gray', grandma: 'Nana Wren' }

function decodeClip(audioBase64: string): Blob {
  const binary = atob(audioBase64)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new Blob([bytes], { type: 'audio/mpeg' })
}

export function ListenButton({ text, speakingCharacter, replyMode = false }: { text: string; speakingCharacter?: 'red' | 'wolf' | 'grandma'; replyMode?: boolean }) {
  const [state, setState] = useState<PlaybackState>('idle')
  const [speaker, setSpeaker] = useState<Speaker | null>(null)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const urlRef = useRef<string | null>(null)
  const cacheRef = useRef(new Map<string, Clip[]>())
  const playbackIdRef = useRef(0)

  function clearAudio() {
    audioRef.current?.pause()
    audioRef.current = null
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }

  function stop(updateState = true) {
    playbackIdRef.current++
    requestRef.current?.abort()
    requestRef.current = null
    clearAudio()
    if (updateState) { setState('idle'); setSpeaker(null) }
  }

  useEffect(() => {
    setState('idle')
    setSpeaker(null)
    setError(null)
    return () => stop(false)
  }, [text, speakingCharacter]) // eslint-disable-line react-hooks/exhaustive-deps

  function playClips(clips: Clip[], index: number, playbackId: number) {
    if (playbackIdRef.current !== playbackId) return
    if (index >= clips.length) { stop(); return }
    clearAudio()
    const clip = clips[index]
    const url = URL.createObjectURL(clip.audio)
    urlRef.current = url
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => playClips(clips, index + 1, playbackId)
    audio.onerror = () => { stop(); setError('The audio could not be played. Please try again.') }
    setSpeaker(clip.speaker)
    setState('playing')
    void audio.play().catch(() => {
      if (playbackIdRef.current !== playbackId) return
      stop()
      setError('The audio could not be played. Please try again.')
    })
  }

  async function listen() {
    if (state !== 'idle') { stop(); return }
    setError(null)
    setState('loading')
    const playbackId = ++playbackIdRef.current
    const request = new AbortController()
    requestRef.current = request
    const cacheKey = `${speakingCharacter ?? 'scene'}:${text}`
    try {
      let clips = cacheRef.current.get(cacheKey)
      if (!clips) {
        const response = await fetch('/api/narrate', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text, speaker: speakingCharacter }), signal: request.signal,
        })
        if (!response.ok) {
          const message = response.status === 503
            ? 'Story audio needs an ElevenLabs API key in the local server.'
            : response.status === 429 ? 'Take a little break before listening again.'
              : 'The story could not be read aloud right now.'
          throw new Error(message)
        }
        const payload = await response.json() as { clips?: Array<{ speaker: Speaker; audioBase64: string }> }
        if (!payload.clips?.length) throw new Error('The story audio was empty. Please try again.')
        clips = payload.clips.map((clip) => ({ speaker: clip.speaker, audio: decodeClip(clip.audioBase64) }))
        cacheRef.current.set(cacheKey, clips)
        if (cacheRef.current.size > 5) cacheRef.current.delete(cacheRef.current.keys().next().value!)
      }
      if (request.signal.aborted || playbackIdRef.current !== playbackId) return
      requestRef.current = null
      playClips(clips, 0, playbackId)
    } catch (cause) {
      if (request.signal.aborted) return
      stop()
      setError(cause instanceof Error ? cause.message : 'The story could not be read aloud right now.')
    }
  }

  return (
    <div className="listen-control">
      <button type="button" className="button button--small" onClick={() => void listen()} aria-label={state === 'idle' ? replyMode ? 'Listen to this reply' : 'Listen to this scene' : 'Stop reading'}>
        {state === 'loading' ? 'Preparing voices… Stop' : state === 'playing' ? '■ Stop reading' : replyMode ? '▶ Listen to reply' : '▶ Listen to this scene'}
      </button>
      {speaker && <span className="listen-control__speaker" role="status">{speakerNames[speaker]} is reading</span>}
      {error && <p className="listen-control__error" role="status">{error}</p>}
    </div>
  )
}
