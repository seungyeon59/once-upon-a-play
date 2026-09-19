import { useEffect, useMemo, useRef, useState } from 'react'

import { TALES } from './content/tales/redRidingHood.ts'
import { getCharacter } from './content/characters.ts'
import { PixiStage } from './pixi/PixiStage.tsx'
import { useCurrentScene, useStory } from './state/storyStore.ts'
import { ChoiceButtons } from './ui/ChoiceButtons.tsx'
import { DialoguePanel } from './ui/DialoguePanel.tsx'
import { EndingCard } from './ui/EndingCard.tsx'
import { MapSelect } from './ui/MapSelect.tsx'
import { StoryLog } from './ui/StoryLog.tsx'
import { CharacterCodex } from './ui/CharacterCodex.tsx'
import { DrawingScanner } from './ui/DrawingScanner.tsx'
import { CODEX_CHARACTERS } from './content/characters.ts'
import type { Character, ScenePlacement } from './state/types.ts'

function bubblePosition(placement: ScenePlacement, character: Character, stage: { width: number; height: number }, width: number) {
  const x = Math.max(width / 2 + 12, Math.min(placement.x * stage.width, stage.width - width / 2 - 12))
  const actorHeight = character.art.height * placement.scale * Math.min(stage.width / 1100, stage.height / 720)
  const top = placement.y * stage.height - actorHeight - 14
  return { left: x, top: Math.max(0, top), width }
}

export default function App() {
  const store = useStory()
  const { tale, scene, variant } = useCurrentScene()
  const [logOpen, setLogOpen] = useState(false)
  const [hasSave, setHasSave] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [userSpeechFor, setUserSpeechFor] = useState<string | null>(null)
  const [codexOpen, setCodexOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [companionMenuOpen, setCompanionMenuOpen] = useState(false)

  useEffect(() => {
    setHasSave(localStorage.getItem('tale-weaver:v1') !== null)
  }, [store.screen])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const observer = new ResizeObserver(([entry]) => {
      setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [store.screen])

  // The stage rebuilds whenever this array's identity changes, so it must only
  // change when the scene or its variant actually does.
  const cast = useMemo(
    () => {
      const placements = [...(scene?.cast ?? []), ...(variant?.addCast ?? [])]
      const slots = [0.85, 0.14, 0.72, 0.28, 0.5]
      for (const id of store.companionIds) {
        if (placements.some((actor) => actor.characterId === id)) continue
        const x = slots.find((slot) => placements.every((actor) => Math.abs(actor.x - slot) > 0.12)) ?? slots[placements.length % slots.length]
        placements.push({ characterId: id, x, y: 0.84, scale: 0.8, facing: x > 0.5 ? -1 : 1 })
      }
      const positions = store.characterPositions[scene?.id ?? ''] ?? {}
      return placements.map((placement) => positions[placement.characterId]
        ? { ...placement, ...positions[placement.characterId] }
        : placement)
    },
    [scene?.id, variant?.id, store.companionIds, store.characterPositions], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const characters = useMemo(
    () => [...(tale?.characters ?? []), ...store.customCharacters],
    [tale?.id, store.customCharacters], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const activeCharacter = store.activeCharacterId
    ? getCharacter(store.activeCharacterId) ?? store.customCharacters.find((item) => item.id === store.activeCharacterId)
    : undefined
  const isEnding = Boolean(scene?.ending)
  const activePlacement = cast.find((placement) => placement.characterId === store.activeCharacterId)
  const activeTurns = store.activeCharacterId ? store.dialogues[store.activeCharacterId] ?? [] : []
  const latestQuestion = [...activeTurns].reverse().find((turn) => turn.role === 'child')?.text
  const latestReply = [...activeTurns].reverse().find((turn) => turn.role === 'character')?.text
  const bubbleWidth = Math.min(320, Math.max(0, stageSize.width - 24))
  const playerCharacter = getCharacter(store.playerRole)
  const playerPlacement = cast.find((placement) => placement.characterId === store.playerRole)
  const showUserSpeech = Boolean(latestQuestion && userSpeechFor === store.activeCharacterId)
  const canInvite = Boolean(scene && !isEnding)
  const availableReadyMade = CODEX_CHARACTERS.filter((character) => !store.companionIds.includes(character.id))

  // Let the child's line appear first, even when a mock reply returns instantly.
  useEffect(() => {
    if (!store.activeCharacterId || !latestQuestion) return
    if (store.pending) {
      setUserSpeechFor(store.activeCharacterId)
      return
    }
    if (userSpeechFor !== store.activeCharacterId) return
    const timer = window.setTimeout(() => setUserSpeechFor(null), 1700)
    return () => window.clearTimeout(timer)
  }, [store.activeCharacterId, store.pending, latestQuestion, latestReply, userSpeechFor])

  if (store.screen === 'mapSelect' || !tale || !scene || !variant) {
    return (
      <MapSelect
        tales={TALES}
        hasSave={hasSave}
        onStart={store.startTale}
        onResume={store.resume}
      />
    )
  }

  return (
    /**
     * Two columns, not overlays: the map owns its half of the screen and is
     * never covered. Everything that used to float on top of it — narration,
     * choices, conversation, the story log — takes turns in the rail beside it.
     */
    <main className="play">
      <div className="play__stage" ref={stageRef}>
        <PixiStage
          backdrop={scene.backdrop}
          cast={cast}
          characters={characters}
          activeCharacterId={store.activeCharacterId}
          playerCharacterId={store.playerRole}
          speakTick={store.speakTick}
          onSelect={store.openDialogue}
          onMove={store.moveCharacter}
        />
        <p className="stage-hint">Drag the background to look around</p>

        {showUserSpeech && latestQuestion && playerCharacter && playerPlacement && stageSize.width > 0 && (
          <div
            className="map-speech map-speech--player"
            style={bubblePosition(playerPlacement, playerCharacter, stageSize, bubbleWidth)}
            role="status"
            aria-live="polite"
          >
            <strong className="map-speech__speaker">You</strong>
            <span className="map-speech__text" style={{ maxHeight: 100 }}>{latestQuestion}</span>
          </div>
        )}

        {activeCharacter && activePlacement && stageSize.width > 0 && !showUserSpeech && (store.pending || latestReply) && (
          <div
            className="map-speech"
            style={bubblePosition(activePlacement, activeCharacter, stageSize, bubbleWidth)}
            role="status"
            aria-live="polite"
          >
            <strong className="map-speech__speaker">{activeCharacter.name}</strong>
            <span className="map-speech__text" style={{ maxHeight: 100 }}>
              {store.pending ? 'Thinking…' : latestReply}
            </span>
          </div>
        )}

        <header className="topbar">
          <div>
            <p className="topbar__tale">{tale.title}</p>
            <h1>{scene.title}</h1>
          </div>
        </header>
      </div>

      <aside className="play__rail">
        <nav className="rail-nav">
          {canInvite && (
            <button type="button" className="button button--small" onClick={() => { store.closeDialogue(); setCompanionMenuOpen(true); setCodexOpen(false); setScannerOpen(false) }}>
              Add character
            </button>
          )}
          <button
            type="button"
            className={`button button--small${logOpen ? ' button--on' : ''}`}
            onClick={() => setLogOpen((open) => !open)}
          >
            Story so far
          </button>
          <button type="button" className="button button--small" onClick={store.backToMap}>
            Maps
          </button>
        </nav>

        {scannerOpen && canInvite ? (
          <DrawingScanner
            onCreate={store.addScannedCompanion}
            onChooseReadyMade={() => { setScannerOpen(false); setCodexOpen(true) }}
            hasReadyMade={availableReadyMade.length > 0}
            onClose={() => setScannerOpen(false)}
          />
        ) : codexOpen && canInvite ? (
          <CharacterCodex
            characters={availableReadyMade}
            onChoose={(id) => { store.addCompanion(id); setCodexOpen(false) }}
            onClose={() => setCodexOpen(false)}
          />
        ) : companionMenuOpen && canInvite ? (
          <section className="companion-menu">
            <h2>Add a character</h2>
            <p>Pick someone ready to join, or bring your own drawing to life.</p>
            {availableReadyMade.length > 0 && <button type="button" className="button button--primary" onClick={() => { setCompanionMenuOpen(false); setCodexOpen(true) }}>Choose a ready-made character</button>}
            <button type="button" className="button" onClick={() => { setCompanionMenuOpen(false); setScannerOpen(true) }}>Scan my drawing</button>
            <button type="button" className="button" onClick={() => setCompanionMenuOpen(false)}>Back to the story</button>
          </section>
        ) : activeCharacter && !isEnding ? (
          <DialoguePanel
            character={activeCharacter}
            turns={store.dialogues[activeCharacter.id] ?? []}
            suggestions={store.suggestions}
            pending={store.pending}
            notice={store.notice}
            source={store.llmSource}
            onSay={store.say}
            onClose={store.closeDialogue}
          />
        ) : (
          <section className="scene-panel">
            <div className="scene-panel__scroll">
              {scene.objective && <p className="scene-panel__objective">{scene.objective}</p>}
              {variant.narration.split('\n\n').map((paragraph, index) => (
                <p key={index} className="scene-panel__text">
                  {paragraph}
                </p>
              ))}
              {!isEnding && <p className="scene-panel__hint">Tap a character to talk, drag them to move, or drag the background to look around.</p>}
              {scene.id === 'forest-path' && canInvite && !store.codexDismissed && (
                <div className="companion-offer">
                  <strong>You can add a character whenever you like.</strong>
                  <p>Choose a ready-made character, add your drawing, or keep going with the friends already here.</p>
                  {availableReadyMade.length > 0 && <button type="button" className="button button--primary" onClick={() => setCodexOpen(true)}>Choose a ready-made character</button>}
                  <button type="button" className="button" onClick={() => setScannerOpen(true)}>Scan my drawing</button>
                  <button type="button" className="button" onClick={store.dismissCodexOffer}>Keep going</button>
                </div>
              )}
            </div>
            {!isEnding && <ChoiceButtons choices={variant.anchors} onChoose={store.chooseAnchor} />}
          </section>
        )}

        {logOpen && <StoryLog log={store.log} onClose={() => setLogOpen(false)} />}
      </aside>

      {isEnding && (
        <EndingCard
          scene={scene}
          narration={variant.narration}
          log={store.log}
          taleId={tale.id}
          role={store.playerRole}
          characters={characters}
          companionIds={store.companionIds}
          characterPositions={store.characterPositions}
          onRestart={() => store.startTale(tale.id, store.playerRole)}
          onMap={store.restart}
        />
      )}
    </main>
  )
}
