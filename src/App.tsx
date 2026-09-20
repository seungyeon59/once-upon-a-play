import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'

import { TALES } from './content/tales/index.ts'
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
import { GeneratedMap } from './ui/GeneratedMap.tsx'
import { PrebuiltMap } from './ui/PrebuiltMap.tsx'
import { ListenButton } from './ui/ListenButton.tsx'
import { MemoryGame } from './ui/MemoryGame.tsx'
import { SequenceGame } from './ui/SequenceGame.tsx'
import { ExtraGame, type ExtraGameKind } from './ui/ExtraGames.tsx'
import { CODEX_CHARACTERS } from './content/characters.ts'
import type { Character, ScenePlacement } from './state/types.ts'
import { loadBackground } from './state/imageCache.ts'
import { sceneryFor } from './content/secretScenery.ts'
import { StorePanel } from './ui/StorePanel.tsx'
import { MapDecorations } from './ui/MapDecorations.tsx'
import { ShopStage } from './ui/ShopStage.tsx'
import { CharacterNameTags } from './ui/CharacterNameTags.tsx'
import { InventoryPanel } from './ui/InventoryPanel.tsx'
import { sceneItemKey } from './ui/storyPages.ts'

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
  const [storyIdea, setStoryIdea] = useState('')
  const [cachedBackground, setCachedBackground] = useState<{ id: string; dataUrl: string } | null>(null)
  const [endingOpen, setEndingOpen] = useState(false)
  const [miniGame, setMiniGame] = useState<{ kind: 'pairs' | 'echo' | ExtraGameKind; character: Character } | null>(null)
  const [treasureMessage, setTreasureMessage] = useState<string | null>(null)
  const [shopPhase, setShopPhase] = useState<'closed' | 'entering' | 'open' | 'leaving'>('closed')
  const [shopVisit, setShopVisit] = useState(0)
  const [shopCategory, setShopCategory] = useState<'map' | 'character' | null>(null)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [sceneryPositions, setSceneryPositions] = useState<Record<number, { x: number; y: number }>>({})
  const sceneryDrag = useRef<{ index: number; pointerId: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null)
  const suppressSceneryClick = useRef<number | null>(null)

  useEffect(() => { setEndingOpen(false) }, [scene?.id])
  useEffect(() => { setMiniGame(null); setTreasureMessage(null); setSceneryPositions({}) }, [scene?.id, store.imaginedScene?.title])
  useEffect(() => { setShopPhase('closed'); setInventoryOpen(false) }, [scene?.id, store.screen])
  useEffect(() => {
    if (shopPhase !== 'entering' && shopPhase !== 'leaving') return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setShopPhase(shopPhase === 'entering' ? 'open' : 'closed'), reducedMotion ? 150 : shopPhase === 'entering' ? 1050 : 550)
    return () => window.clearTimeout(timer)
  }, [shopPhase])

  useEffect(() => {
    const id = store.imaginedScene?.map.imageId
    if (!id || store.imaginedScene?.map.imageDataUrl) return
    let active = true
    void loadBackground(id).then((dataUrl) => { if (active && dataUrl) setCachedBackground({ id, dataUrl }) }).catch((error) => console.error('[background]', error))
    return () => { active = false }
  }, [store.imaginedScene?.map.imageId, store.imaginedScene?.map.imageDataUrl])

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
      const slots = [0.62, 0.38, 0.5, 0.72, 0.28, 0.8, 0.2]
      for (const id of store.companionIds) {
        if (placements.some((actor) => actor.characterId === id)) continue
        const x = slots.find((slot) => placements.every((actor) => Math.abs(actor.x - slot) > 0.12)) ?? slots[placements.length % slots.length]
        placements.push({ characterId: id, x, y: 0.84, scale: 0.8, facing: x > 0.5 ? -1 : 1 })
      }
      const planned = store.imaginedScene?.map.cast ?? []
      const positions = store.characterPositions[scene?.id ?? ''] ?? {}
      return placements.map((placement) => {
        const mapPlacement = planned.find((actor) => actor.characterId === placement.characterId)
        return { ...placement, ...mapPlacement, ...positions[placement.characterId] }
      })
    },
    [scene?.id, variant?.id, store.companionIds, store.characterPositions, store.imaginedScene?.map.cast], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const characters = useMemo(
    () => [...(tale?.characters ?? []), ...store.customCharacters],
    [tale?.id, store.customCharacters], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const activeCharacter = store.activeCharacterId
    ? getCharacter(store.activeCharacterId) ?? store.customCharacters.find((item) => item.id === store.activeCharacterId)
    : undefined
  const isEnding = Boolean(store.imaginedScene?.ending || scene?.ending)
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
  const secretSceneKey = sceneItemKey(scene?.id ?? '', store.imaginedScene ? store.log.findLast((item) => item.imaginedScene)?.id ?? '' : undefined)
  const gameKinds = ['pairs', 'echo', 'odd', 'trail', 'catch', 'riddle'] as const
  const isEndingBackdrop = scene?.backdrop === 'hearth' || scene?.backdrop === 'castle-hall' || scene?.backdrop === 'ballroom'
  const scenery = sceneryFor(store.imaginedScene?.map.backdropId ?? (isEndingBackdrop ? 'kitchen' : 'forest'), !store.imaginedScene && !isEndingBackdrop)
  const placedDecorations = store.placedItems[secretSceneKey] ?? []

  function startRandomGame(character: Character) {
    setTreasureMessage(null)
    setMiniGame({ kind: gameKinds[Math.floor(Math.random() * gameKinds.length)], character })
  }

  function findSecret(index: number) {
    if (!store.discoverSecret(`${secretSceneKey}:${index}`)) return
    store.closeDialogue()
    if (Math.random() < 0.35) {
      const amount = 3 + Math.floor(Math.random() * 5)
      store.awardCoins(amount)
      setTreasureMessage(`A hidden coin pouch! +${amount} coins`)
    } else {
      startRandomGame(characters.find((character) => character.id !== store.playerRole) ?? characters[0])
    }
  }

  function startSceneryDrag(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (event.button !== 0) return
    suppressSceneryClick.current = null
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
    const rect = event.currentTarget.getBoundingClientRect()
    if (!bounds) return
    event.currentTarget.setPointerCapture(event.pointerId)
    sceneryDrag.current = { index, pointerId: event.pointerId, x: (rect.left - bounds.left) / bounds.width, y: (rect.top - bounds.top) / bounds.height, startX: event.clientX, startY: event.clientY, moved: false }
  }

  function moveScenery(event: PointerEvent<HTMLButtonElement>) {
    const drag = sceneryDrag.current
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!drag || !bounds || drag.pointerId !== event.pointerId) return
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) return
    drag.moved = true
    setSceneryPositions((positions) => ({ ...positions, [drag.index]: { x: Math.max(0, Math.min(0.9, drag.x + (event.clientX - drag.startX) / bounds.width)), y: Math.max(0.1, Math.min(0.85, drag.y + (event.clientY - drag.startY) / bounds.height)) } }))
  }

  function finishSceneryDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = sceneryDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.moved) suppressSceneryClick.current = drag.index
    sceneryDrag.current = null
  }

  function enterShop() {
    if (shopPhase !== 'closed') return
    setShopVisit((visit) => visit + 1)
    setMiniGame(null)
    setInventoryOpen(false)
    store.closeDialogue()
    setShopCategory(null)
    setShopPhase('entering')
  }

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
      <div className="play__stage" ref={stageRef} onPointerMove={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty('--pointer-x', String((event.clientX - bounds.left) / bounds.width - 0.5)); event.currentTarget.style.setProperty('--pointer-y', String((event.clientY - bounds.top) / bounds.height - 0.5)) }} onPointerLeave={(event) => { event.currentTarget.style.setProperty('--pointer-x', '0'); event.currentTarget.style.setProperty('--pointer-y', '0') }}>
        <div className={`play__world${shopPhase === 'open' || shopPhase === 'leaving' ? ' play__world--shop' : ''}`} onWheel={(event) => { if (shopPhase === 'open') { event.currentTarget.scrollLeft += event.deltaX || event.deltaY; event.preventDefault() } }}>
        <div className="play__world-content">
        {store.imaginedScene?.map && (store.imaginedScene.map.backdropId
          ? <PrebuiltMap map={store.imaginedScene.map} onUpdateProp={store.updateMapProp} onRemoveProp={store.removeMapProp} onExit={(label) => { void store.imagine(`I follow the way toward ${label}.`) }} />
          : <GeneratedMap map={store.imaginedScene.map} imageDataUrl={store.imaginedScene.map.imageDataUrl ?? (cachedBackground && cachedBackground.id === store.imaginedScene.map.imageId ? cachedBackground.dataUrl : undefined)} onObject={store.interactMap} onExit={(label) => { void store.imagine(`I follow the way toward ${label}.`) }} onSecret={findSecret} foundSecrets={[0, 1].map((index) => store.foundSecrets.includes(`${secretSceneKey}:${index}`))} />)}
        <PixiStage
          key={`story-stage:${shopPhase === 'closed' ? shopVisit : shopVisit - 1}`}
          sceneKey={`${scene.id}:${store.imaginedScene ? store.log.findLast((entry) => entry.imaginedScene)?.id ?? '' : ''}`}
          backdrop={scene.backdrop}
          generatedBackdrop={Boolean(store.imaginedScene?.map)}
          actions={store.imaginedScene?.actions ?? []}
          cast={cast}
          characters={characters}
          activeCharacterId={store.activeCharacterId}
          playerCharacterId={store.playerRole}
          markPlayer={store.playerRole === 'visitor'}
          handDrawnCharacterId={store.playerRole}
          speakTick={store.speakTick}
          onSelect={store.openDialogue}
          onMove={store.moveCharacter}
          equippedItems={store.equippedItems}
          accessoryFits={store.accessoryFits}
          shopPhase={shopPhase}
        />
        <MapDecorations key={secretSceneKey} items={placedDecorations} onMove={(index, x, y) => store.moveItem(secretSceneKey, index, x, y)} onResize={(index, size) => store.resizeItem(secretSceneKey, index, size)} onRemove={(index) => store.removeItem(secretSceneKey, index)} />
        {shopPhase === 'closed' && <CharacterNameTags cast={cast} characters={characters} playerRole={store.playerRole} onMove={store.moveCharacter} />}
        <p className="stage-hint">Explore the scenery · {store.imaginedScene?.map.backdropId ? 'Drag props to move' : 'Drag the background to look around'}</p>
        {!isEnding && !store.imaginedScene?.map.tiles && <div className="scenery-layer" aria-label="Scenery to explore">
          <div className="scenery-cloud" aria-hidden="true">{scenery.upper}</div>
          {scenery.objects.map((symbol, index) => {
            const found = store.foundSecrets.includes(`${secretSceneKey}:${index}`)
            return <button key={`${secretSceneKey}:${index}`} type="button" className={`scenery-prop scenery-prop--${index}${found ? ' scenery-prop--found' : ''}`} style={sceneryPositions[index] ? { left: `${sceneryPositions[index].x * 100}%`, top: `${sceneryPositions[index].y * 100}%`, right: 'auto', bottom: 'auto' } : undefined} onPointerDown={(event) => startSceneryDrag(event, index)} onPointerMove={moveScenery} onPointerUp={finishSceneryDrag} onPointerCancel={finishSceneryDrag} onClick={() => { if (suppressSceneryClick.current === index) { suppressSceneryClick.current = null; return } if (!found) findSecret(index) }} aria-label={`${found ? 'Move' : 'Search or move'} the ${scenery.labels[index]}`} title={`${found ? 'Drag to move' : 'Search or drag to move'} the ${scenery.labels[index]}`}>{symbol}{!found && <span className="scenery-prop__secret" aria-hidden="true">✦</span>}</button>
          })}
        </div>}

        {shopPhase === 'closed' && showUserSpeech && latestQuestion && playerCharacter && playerPlacement && stageSize.width > 0 && (
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

        {shopPhase === 'closed' && activeCharacter && activePlacement && stageSize.width > 0 && !showUserSpeech && (store.pending || latestReply) && (
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
            <h1>{store.imaginedScene?.title ?? scene.title}</h1>
          </div>
        </header>
        </div>
        </div>
        {shopPhase !== 'closed' && <ShopStage phase={shopPhase} visitor={store.playerRole === 'visitor' || !playerPlacement} player={characters.find((character) => character.id === store.playerRole)} equippedItems={store.equippedItems} accessoryFits={store.accessoryFits} category={shopCategory} onCategory={setShopCategory} />}
      </div>

      <aside className="play__rail">
        <div className="coin-bar"><span className="coin-balance" aria-live="polite">🪙 {store.coins} coins</span><div className="coin-bar__actions"><button type="button" className={`button button--small${inventoryOpen ? ' button--on' : ''}`} onClick={() => { store.closeDialogue(); setMiniGame(null); setInventoryOpen(true); setCompanionMenuOpen(false); setCodexOpen(false); setScannerOpen(false); if (shopPhase === 'open') setShopPhase('leaving') }} disabled={shopPhase === 'entering' || shopPhase === 'leaving'}>🎒 My items</button><button type="button" className="button button--small" onClick={shopPhase === 'open' ? () => setShopPhase('leaving') : enterShop} disabled={shopPhase === 'entering' || shopPhase === 'leaving'} aria-expanded={shopPhase === 'open'}>🛍️ Store</button></div></div>
        {treasureMessage && shopPhase === 'closed' && <p className="treasure-message" role="status">{treasureMessage}<button type="button" className="icon-button" onClick={() => setTreasureMessage(null)} aria-label="Dismiss treasure message">✕</button></p>}
        {shopPhase === 'closed' && <nav className="rail-nav">
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
        </nav>}

        {shopPhase === 'open' ? <StorePanel page={shopCategory} onPage={setShopCategory} coins={store.coins} owned={store.ownedItems} placed={placedDecorations.map((item) => item.id)} equipped={store.equippedItems} accessoryFits={store.accessoryFits} characters={characters.filter((character) => character.id === store.playerRole || cast.some((placement) => placement.characterId === character.id))} playerRole={store.playerRole} onBuy={store.buyItem} onPlace={(id) => store.placeItem(secretSceneKey, id)} onEquip={store.equipItem} onFit={store.setAccessoryFit} onClose={() => setShopPhase('leaving')} /> : shopPhase !== 'closed' ? <section className="shop-transition" role="status">{shopPhase === 'entering' ? 'Walking into the Story Store…' : 'Returning to your story…'}</section> : miniGame ? (
          miniGame.kind === 'pairs'
            ? <MemoryGame key={`${miniGame.character.id}:${secretSceneKey}`} character={miniGame.character} onClose={() => setMiniGame(null)} onWin={store.awardCoins} />
            : miniGame.kind === 'echo'
              ? <SequenceGame key={`${miniGame.character.id}:${secretSceneKey}`} character={miniGame.character} onClose={() => setMiniGame(null)} onWin={store.awardCoins} />
              : <ExtraGame key={`${miniGame.kind}:${miniGame.character.id}:${secretSceneKey}`} kind={miniGame.kind} character={miniGame.character} onClose={() => setMiniGame(null)} onWin={store.awardCoins} />
        ) : inventoryOpen ? (
          <InventoryPanel owned={store.ownedItems} characters={characters.filter((character) => character.id === store.playerRole || cast.some((placement) => placement.characterId === character.id))} playerRole={store.playerRole} equipped={store.equippedItems} onPlace={(id) => store.placeItem(secretSceneKey, id)} onEquip={store.equipItem} onClose={() => setInventoryOpen(false)} />
        ) : scannerOpen && canInvite ? (
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
            onPlay={() => startRandomGame(activeCharacter)}
          />
        ) : (
          <section className="scene-panel">
            <div className="scene-panel__scroll">
              {!store.imaginedScene && scene.objective && <p className="scene-panel__objective">{scene.objective}</p>}
              {(store.imaginedScene?.narration ?? variant.narration).split('\n\n').map((paragraph, index) => (
                <p key={index} className="scene-panel__text">
                  {paragraph}
                </p>
              ))}
              <ListenButton text={store.imaginedScene?.narration ?? variant.narration} />
              {isEnding && <button type="button" className="button button--primary ending__open" onClick={() => setEndingOpen(true)}>View the ending</button>}
              {!isEnding && <p className="scene-panel__hint">Tap a character to talk or drag them to move. Choose an action below, or write your own idea.</p>}
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
            {!isEnding && <form className="imagine-form" onSubmit={(event) => { event.preventDefault(); const idea = storyIdea.trim(); if (!idea) return; const previousCount = useStory.getState().log.length; void store.imagine(idea).then(() => { if (useStory.getState().log.length > previousCount) setStoryIdea('') }) }}>
              <label htmlFor="story-idea">What happens next? Make up your own idea.</label>
              <textarea id="story-idea" value={storyIdea} onChange={(event) => setStoryIdea(event.target.value)} maxLength={300} placeholder="A glowing bridge appears across the stream…" rows={3} disabled={store.imagining} />
              {store.imagineNotice && <p className="imagine-form__notice" role="status">{store.imagineNotice}</p>}
              <button className="button button--primary" type="submit" disabled={store.imagining || !storyIdea.trim()}>{store.imagining ? 'Creating your scene…' : 'Create my scene'}</button>
            </form>}
            {!isEnding && (store.imaginedScene ? <div className="choices">
              <p className="choices__prompt">What do you do? You can also write your own idea above.</p>
              <div className="choices__list">
                {(store.imaginedScene.choices ?? []).map((choice, index) => <button key={`${index}-${choice}`} type="button" className="choice" disabled={store.imagining} onClick={() => { void store.imagine(choice) }}><span className="choice__kind choice__kind--act">Do</span><span>{choice}</span></button>)}
              </div>
              <button type="button" className="button button--small" disabled={store.imagining} onClick={() => { void store.imagine('Bring my story to a satisfying ending.', true) }}>Finish my story</button>
            </div> : <ChoiceButtons choices={variant.anchors} onChoose={store.chooseAnchor} />)}
          </section>
        )}

        {logOpen && <StoryLog log={store.log} onClose={() => setLogOpen(false)} />}
      </aside>

      {isEnding && endingOpen && (
        <EndingCard
          scene={scene}
          narration={store.imaginedScene?.narration ?? variant.narration}
          title={store.imaginedScene?.title}
          log={store.log}
          taleId={tale.id}
          role={store.playerRole}
          characters={characters}
          companionIds={store.companionIds}
          characterPositions={store.characterPositions}
          flags={store.flags}
          equippedItems={store.equippedItems}
          accessoryFits={store.accessoryFits}
          placedItems={store.placedItems}
          onRestart={() => store.startTale(tale.id, store.playerRole)}
          onMap={store.backToMap}
          onClose={() => setEndingOpen(false)}
        />
      )}
    </main>
  )
}
