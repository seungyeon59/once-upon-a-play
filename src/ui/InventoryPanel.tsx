import { useState } from 'react'

import { SHOP_ITEMS } from '../content/shopItems.ts'
import type { Character } from '../state/types.ts'

export function InventoryPanel({ owned, characters, playerRole, equipped, onPlace, onEquip, onClose }: { owned: string[]; characters: Character[]; playerRole: string; equipped: Record<string, string>; onPlace: (id: string) => boolean; onEquip: (characterId: string, id: string | null) => void; onClose: () => void }) {
  const [category, setCategory] = useState<'map' | 'character'>('map')
  const [characterId, setCharacterId] = useState(playerRole)
  const [notice, setNotice] = useState('')
  const items = SHOP_ITEMS.filter((item) => owned.includes(item.id) && item.category === category)

  return <section className="inventory-panel" aria-label="My items">
    <header className="store-panel__head"><div><h2>My items</h2><p>Everything you bought is ready to use again.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close my items">✕</button></header>
    <div className="inventory-panel__tabs" role="tablist" aria-label="Item types"><button type="button" role="tab" aria-selected={category === 'map'} className={`button button--small${category === 'map' ? ' button--on' : ''}`} onClick={() => setCategory('map')}>Map decorations</button><button type="button" role="tab" aria-selected={category === 'character'} className={`button button--small${category === 'character' ? ' button--on' : ''}`} onClick={() => setCategory('character')}>Accessories</button></div>
    <div className="store-panel__scroll">
      {category === 'character' && <label className="store-panel__picker">Dress up <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>{characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>}
      {items.length === 0 ? <p className="store-panel__hint">No {category === 'map' ? 'map decorations' : 'accessories'} yet. Find them in the Story Store.</p> : <div className="store-panel__items">{items.map((item) => <div key={item.id} className="store-item"><span className="store-item__symbol" aria-hidden="true">{item.symbol}</span><div><strong>{item.name}</strong><small>Owned · use again anytime</small></div>{category === 'map' ? <button type="button" className="button button--small" onClick={() => { if (onPlace(item.id)) setNotice(`${item.name} placed on the map.`) }}>Place</button> : <button type="button" className="button button--small" onClick={() => onEquip(characterId, equipped[characterId] === item.id ? null : item.id)}>{equipped[characterId] === item.id ? 'Remove' : 'Wear'}</button>}</div>)}</div>}
      {notice && <p className="store-panel__notice" role="status">{notice}</p>}
    </div>
  </section>
}
