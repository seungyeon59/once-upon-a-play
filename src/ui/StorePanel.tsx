import { useMemo, useState } from 'react'

import { SHOP_ITEMS, shopItem, type AccessoryFit } from '../content/shopItems.ts'
import type { Character } from '../state/types.ts'
import { PixiStage } from '../pixi/PixiStage.tsx'

interface StorePanelProps {
  page: 'map' | 'character' | null
  onPage: (page: 'map' | 'character' | null) => void
  coins: number
  owned: string[]
  placed: string[]
  equipped: Record<string, string>
  accessoryFits: Record<string, AccessoryFit>
  characters: Character[]
  playerRole: string
  onBuy: (id: string) => boolean
  onPlace: (id: string) => boolean
  onEquip: (characterId: string, id: string | null) => void
  onFit: (characterId: string, id: string, changes: Partial<AccessoryFit>) => void
  onClose: () => void
}

export function StorePanel({ page, onPage, coins, owned, placed, equipped, accessoryFits, characters, playerRole, onBuy, onPlace, onEquip, onFit, onClose }: StorePanelProps) {
  const [characterId, setCharacterId] = useState(playerRole)
  const [notice, setNotice] = useState('')
  const availableCharacters = characters.filter((character) => character.id === playerRole || character.id !== 'visitor')
  const worn = shopItem(equipped[characterId] ?? '')
  const fit = accessoryFits[`${characterId}:${worn?.id ?? ''}`] ?? { x: 0, y: 0, scale: 1 }
  const previewCharacter = availableCharacters.find((character) => character.id === characterId)
  const previewCast = useMemo(() => [{ characterId, x: 0.5, y: 0.86, scale: 2.5, facing: (previewCharacter?.art.silhouette === 'wolf' ? -1 : 1) as 1 | -1 }], [characterId, previewCharacter?.art.silhouette])
  const previewCharacters = useMemo(() => previewCharacter ? [previewCharacter] : [], [previewCharacter])

  return <section className="store-panel" aria-label="Store">
    <header className="store-panel__head">{page !== null && <button type="button" className="button button--small" onClick={() => { onPage(null); setNotice('') }}>← Back</button>}<div><h2>{page === 'map' ? 'Map decorations' : page === 'character' ? 'Character accessories' : 'Story Store'}</h2><p>{page === null ? 'Choose a shelf in the store map.' : 'Make your story your own.'}</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close store">✕</button></header>
    <p className="store-panel__balance">🪙 {coins} coins</p>
    <div className="store-panel__scroll">
      {page === null && <div className="store-panel__rooms"><p className="store-panel__hint">Tap the signs above the shelves in the store map, or choose below.</p><button type="button" onClick={() => onPage('map')}><span aria-hidden="true">🌳 ✨</span><strong>Map decorations</strong><small>Place and resize things in your story world</small></button><button type="button" onClick={() => onPage('character')}><span aria-hidden="true">👑 🎀</span><strong>Character accessories</strong><small>Dress up your favorite characters</small></button></div>}
      {page === 'map' && <>
      <p className="store-panel__hint">Owned decorations can be placed again in any scene. Select one on the map to move or resize it.</p>
      <div className="store-panel__items">{SHOP_ITEMS.filter((item) => item.category === 'map').map((item) => <div key={item.id} className="store-item"><span className="store-item__symbol" aria-hidden="true">{item.symbol}</span><div><strong>{item.name}</strong><small>{item.animated ? 'Moving decoration' : 'Map decoration'} · 🪙 {item.price}{placed.filter((id) => id === item.id).length > 0 ? ` · ${placed.filter((id) => id === item.id).length} on map` : ''}</small></div>{owned.includes(item.id) ? <button type="button" className="button button--small" onClick={() => { if (onPlace(item.id)) setNotice(`${item.name} placed on the map!`) }}>Place</button> : <button type="button" className="button button--small button--primary" disabled={coins < item.price} onClick={() => { if (onBuy(item.id)) setNotice(`${item.name} is yours!`) }}>Buy</button>}</div>)}</div>
      </>}
      {page === 'character' && <>
      <label className="store-panel__picker">Dress up <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>{availableCharacters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>
      {previewCharacter && <div className="store-panel__preview" aria-label={`Preview of ${previewCharacter.name}`}><PixiStage sceneKey={`shop-preview:${characterId}`} backdrop="hearth" actions={[]} cast={previewCast} characters={previewCharacters} activeCharacterId={null} playerCharacterId={characterId} speakTick={0} onSelect={() => {}} onMove={() => {}} equippedItems={equipped} accessoryFits={accessoryFits} /></div>}
      {worn?.category === 'character' && <div className="store-panel__fit"><strong>Adjust {worn.name}</strong><p>Move and resize it until it fits your character on the map.</p>
        <label>Left ↔ Right <input type="range" min="-0.4" max="0.4" step="0.01" value={fit.x} onChange={(event) => onFit(characterId, worn.id, { x: Number(event.target.value) })} /></label>
        <label>Up ↕ Down <input type="range" min="-0.35" max="0.35" step="0.01" value={fit.y} onChange={(event) => onFit(characterId, worn.id, { y: Number(event.target.value) })} /></label>
        <label>Size <input type="range" min="0.5" max="1.8" step="0.01" value={fit.scale} onChange={(event) => onFit(characterId, worn.id, { scale: Number(event.target.value) })} /></label>
        <button type="button" className="button button--small" onClick={() => onFit(characterId, worn.id, { x: 0, y: 0, scale: 1 })}>Reset fit</button>
      </div>}
      <div className="store-panel__items">{SHOP_ITEMS.filter((item) => item.category === 'character').map((item) => <div key={item.id} className="store-item"><span className="store-item__symbol" aria-hidden="true">{item.symbol}</span><div><strong>{item.name}</strong><small>Accessory · 🪙 {item.price}</small></div>{owned.includes(item.id) ? <button type="button" className="button button--small" onClick={() => onEquip(characterId, equipped[characterId] === item.id ? null : item.id)}>{equipped[characterId] === item.id ? 'Remove' : 'Wear'}</button> : <button type="button" className="button button--small button--primary" disabled={coins < item.price} onClick={() => { if (onBuy(item.id)) setNotice(`${item.name} is yours!`) }}>Buy</button>}</div>)}</div>
      </>}
      {notice && <p className="store-panel__notice" role="status">{notice}</p>}
    </div>
  </section>
}
