import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { scanDrawing, type ScanOptions } from '../pixi/scanDrawing.ts'
import { PERSONALITIES, TALENTS, GOALS, type Talent, type Goal } from '../content/customProfile.ts'

interface Props {
  onCreate: (name: string, personality: string, imageDataUrl: string, talent: Talent, goal: Goal) => boolean
  onChooseReadyMade: () => void
  hasReadyMade: boolean
  onClose: () => void
}

export function DrawingScanner({ onCreate, onChooseReadyMade, hasReadyMade, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [threshold, setThreshold] = useState(210)
  const [mode, setMode] = useState<NonNullable<ScanOptions['mode']>>('sketch')
  const [crop, setCrop] = useState<ScanOptions['crop']>()
  const [name, setName] = useState('')
  const [personality, setPersonality] = useState('')
  const [talent, setTalent] = useState<Talent | ''>('')
  const [goal, setGoal] = useState<Goal | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mountedRef = useRef(true)
  const scanSeq = useRef(0)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setOriginalUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      void videoRef.current.play().catch(() => setError('Could not start the camera preview.'))
    }
  }, [cameraActive])

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraActive(false)
  }

  async function startCamera() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access needs localhost or HTTPS. You can choose an image instead.')
      return
    }
    setCameraStarting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      setCameraActive(true)
    } catch {
      setError('Could not open the camera. Check browser permission, or choose an image instead.')
    } finally {
      if (mountedRef.current) setCameraStarting(false)
    }
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) {
      setError('The camera is still starting. Try again in a moment.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      setError('Could not capture the photo. Try again.')
      return
    }
    context.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!mountedRef.current) return
      if (!blob) {
        setError('Could not capture the photo. Try again.')
        return
      }
      selectFile(new File([blob], 'my-drawing.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.9)
    stopCamera()
  }

  async function process(nextFile: File, nextThreshold: number, nextMode = mode, nextCrop = crop) {
    const sequence = ++scanSeq.current
    setBusy(true)
    setError(null)
    setImageDataUrl(null)
    try {
      const result = await scanDrawing(nextFile, nextThreshold, { mode: nextMode, crop: nextCrop })
      if (sequence === scanSeq.current) setImageDataUrl(result)
    } catch (cause) {
      if (sequence === scanSeq.current) setError(cause instanceof Error ? cause.message : 'The drawing could not be processed.')
    } finally {
      if (sequence === scanSeq.current) setBusy(false)
    }
  }

  function selectFile(selected: File | undefined) {
    if (selected) { stopCamera(); setFile(selected); setCrop(undefined); void process(selected, threshold, mode, undefined) }
  }

  function pointerPosition(event: PointerEvent<HTMLImageElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    }
  }

  function cropFrom(start: { x: number; y: number }, end: { x: number; y: number }) {
    return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(start.x - end.x), height: Math.abs(start.y - end.y) }
  }

  return (
    <section className="scanner" aria-label="Scan your drawing">
      <header className="codex__head">
        <div>
          <h2>Bring your drawing to life</h2>
          <p>Photograph a drawing, then drag a box around just the character.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => { stopCamera(); onClose() }} aria-label="Close drawing scanner">✕</button>
      </header>
      <div className="scanner__body">
        <div className="scanner__sources">
          <button type="button" className="button button--primary" onClick={() => void startCamera()} disabled={cameraStarting || cameraActive}>
            {cameraStarting ? 'Opening camera…' : 'Open camera'}
          </button>
          <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>Choose an image</button>
          <input ref={fileInputRef} type="file" accept="image/*" className="scanner__file-input" aria-label="Choose an image file" onChange={(event) => selectFile(event.target.files?.[0])} />
        </div>
        {cameraActive && (
          <div className="scanner__camera">
            <video ref={videoRef} autoPlay muted playsInline aria-label="Camera preview" />
            <div className="scanner__camera-actions">
              <button type="button" className="button button--primary" onClick={capturePhoto}>Take photo</button>
              <button type="button" className="button" onClick={stopCamera}>Cancel camera</button>
            </div>
          </div>
        )}
        {file && originalUrl && (
          <div className="scanner__original-wrap">
            <p>Drag around your character to leave shadows, hands, and the table outside.</p>
            <div className="scanner__original">
              <img
                src={originalUrl} alt="Original drawing; drag to select the character" draggable={false}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  dragStart.current = pointerPosition(event)
                  setCrop(undefined)
                }}
                onPointerMove={(event) => {
                  if (dragStart.current) setCrop(cropFrom(dragStart.current, pointerPosition(event)))
                }}
                onPointerUp={(event) => {
                  const start = dragStart.current
                  dragStart.current = null
                  if (!start || !file) return
                  const next = cropFrom(start, pointerPosition(event))
                  if (next.width < 0.03 || next.height < 0.03) return
                  setCrop(next)
                  void process(file, threshold, mode, next)
                }}
              />
              {crop && <span className="scanner__selection" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%` }} />}
            </div>
            {crop && <button type="button" className="button button--small" onClick={() => { setCrop(undefined); void process(file, threshold, mode, undefined) }}>Use whole image</button>}
          </div>
        )}
        {file && (
          <fieldset className="scanner__mode">
            <legend>Drawing style</legend>
            <label><input type="radio" name="drawing-mode" checked={mode === 'sketch'} onChange={() => { setMode('sketch'); void process(file, threshold, 'sketch', crop) }} /> Pencil or ink lines</label>
            <label><input type="radio" name="drawing-mode" checked={mode === 'color'} onChange={() => { setMode('color'); void process(file, threshold, 'color', crop) }} /> Colored drawing</label>
          </fieldset>
        )}
        {file && mode === 'color' && (
          <label className="scanner__label">
            Paper brightness: {threshold}
            <input
              type="range" min="160" max="245" value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
              onPointerUp={(event) => {
                const next = Number((event.target as HTMLInputElement).value)
                void process(file, next)
              }}
              onKeyUp={(event) => {
                const next = Number((event.target as HTMLInputElement).value)
                void process(file, next)
              }}
            />
          </label>
        )}
        {busy && <p role="status">Sprinkling magic dust on your drawing…</p>}
        {error && <p className="scanner__error" role="alert">{error}</p>}
        {imageDataUrl && <div className="scanner__preview"><img src={imageDataUrl} alt="Your drawing with its paper background removed" /></div>}
        <label className="scanner__label">
          Character name
          <input type="text" value={name} maxLength={24} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sunny" />
        </label>
        <fieldset className="scanner__profile"><legend>Personality</legend><div className="scanner__options">{PERSONALITIES.map((item) => <label key={item}><input type="checkbox" checked={personality.split(' and ').includes(item)} onChange={() => { const selected = personality ? personality.split(' and ') : []; setPersonality(selected.includes(item) ? selected.filter((value) => value !== item).join(' and ') : [...selected.slice(-1), item].join(' and ')) }} />{item}</label>)}</div><small>Choose one or two.</small></fieldset>
        <fieldset className="scanner__profile"><legend>What is this character good at?</legend><div className="scanner__options">{TALENTS.map((item) => <label key={item}><input type="radio" name="talent" checked={talent === item} onChange={() => setTalent(item)} />{item}</label>)}</div></fieldset>
        <fieldset className="scanner__profile"><legend>What do they want to do?</legend><div className="scanner__options">{GOALS.map((item) => <label key={item}><input type="radio" name="goal" checked={goal === item} onChange={() => setGoal(item)} />{item}</label>)}</div></fieldset>
        <button
          type="button" className="button button--primary"
          disabled={!imageDataUrl || busy || !name.trim() || !personality || !talent || !goal}
          onClick={() => {
            if (imageDataUrl && talent && goal && onCreate(name, personality, imageDataUrl, talent, goal)) onClose()
            else setError('Choose a name, personality, talent, and goal, then try again.')
          }}
        >
          Add to the story
        </button>
        {hasReadyMade && <button type="button" className="button" onClick={() => { stopCamera(); onChooseReadyMade() }}>Choose a ready-made character instead</button>}
      </div>
    </section>
  )
}
