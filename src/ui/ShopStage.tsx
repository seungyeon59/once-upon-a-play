import { useMemo } from 'react'

import type { Character } from '../state/types.ts'
import type { AccessoryFit } from '../content/shopItems.ts'
import { PixiStage } from '../pixi/PixiStage.tsx'

type ShopPhase = 'entering' | 'open' | 'leaving'

export function ShopStage({ phase, visitor, player, equippedItems, accessoryFits, category, onCategory }: { phase: ShopPhase; visitor: boolean; player?: Character; equippedItems: Record<string, string>; accessoryFits: Record<string, AccessoryFit>; category: 'map' | 'character' | null; onCategory: (category: 'map' | 'character') => void }) {
  const cast = useMemo(() => player ? [{ characterId: player.id, x: 0.5, y: 0.88, scale: 1.25, facing: 1 as const }] : [], [player?.id])
  const characters = useMemo(() => player ? [player] : [], [player])
  return <div className={`shop-stage shop-stage--${phase}`}>
    <div className="shop-stage__entrance">
      <svg viewBox="0 0 320 360" aria-hidden="true">
        <path d="M35 105h250v225H35Z" fill="#e6cda1" stroke="#7b5943" strokeWidth="8" />
        <path d="M18 105 55 38h210l37 67Z" fill="#a45445" stroke="#693e37" strokeWidth="8" />
        <path d="M54 102h212" stroke="#f4e3bd" strokeWidth="12" />
        <rect x="93" y="8" width="134" height="54" rx="12" fill="#f8e6bb" stroke="#6d513f" strokeWidth="6" />
        <text x="160" y="43" textAnchor="middle" fill="#573a2d" fontSize="28" fontFamily="Georgia, serif" fontWeight="bold">SHOP</text>
        <rect x="54" y="145" width="66" height="85" rx="8" fill="#9bc3bb" stroke="#805e48" strokeWidth="8" />
        <rect x="200" y="145" width="66" height="85" rx="8" fill="#9bc3bb" stroke="#805e48" strokeWidth="8" />
        <path d="M58 196h58m88 0h58" stroke="#805e48" strokeWidth="5" />
        <path d="M127 330V166q33-44 66 0v164Z" fill="#634633" stroke="#402d27" strokeWidth="7" />
        <path className="shop-stage__door" d="M127 330V166q33-44 66 0v164Z" fill="#b07a55" stroke="#402d27" strokeWidth="6" />
        <circle className="shop-stage__door" cx="177" cy="250" r="5" fill="#f6d58e" />
        <path d="M20 331h280" stroke="#5b755b" strokeWidth="14" />
      </svg>
      {visitor && <div className="shop-stage__visitor">You</div>}
    </div>
    <div className="shop-stage__interior">
      <div className="shop-stage__scene">
      <svg viewBox="0 0 1200 800" aria-hidden="true">
        <defs><linearGradient id="shop-wall" x2="0" y2="1"><stop stopColor="#f7e8cb" /><stop offset="1" stopColor="#d6b98d" /></linearGradient></defs>
        <rect width="1200" height="800" fill="url(#shop-wall)" />
        <path d="M0 610h1200v190H0Z" fill="#987254" />
        <path d="M0 640h1200M0 730h1200" stroke="#c39870" strokeWidth="10" />
        <path d="M200 0v610M1000 0v610" stroke="#b68e64" strokeWidth="22" />
        <rect x="320" y="66" width="560" height="112" rx="25" fill="#724f3c" stroke="#e0bc7d" strokeWidth="12" />
        <text x="600" y="138" textAnchor="middle" fill="#fff1cd" fontSize="62" fontFamily="Georgia, serif" fontWeight="bold">Story Store</text>
        <path d="M85 245h325v330H85Zm705 0h325v330H790Z" fill="#a47451" stroke="#765038" strokeWidth="13" />
        <path d="M100 335h295m-295 105h295m-295 105h295m410-210h295m-295 105h295m-295 105h295" stroke="#e8c293" strokeWidth="14" />
        <text x="155" y="324" fontSize="62">🌷</text><text x="278" y="324" fontSize="62">🍄</text>
        <text x="155" y="425" fontSize="62">🖼️</text><text x="278" y="425" fontSize="62">🦋</text>
        <text x="155" y="525" fontSize="62">🌙</text><text x="278" y="525" fontSize="62">🌿</text>
        <text x="853" y="324" fontSize="62">👑</text><text x="982" y="324" fontSize="62">🎀</text>
        <text x="853" y="425" fontSize="62">🧣</text><text x="982" y="425" fontSize="62">🧢</text>
        <text x="853" y="525" fontSize="62">🕶️</text><text x="982" y="525" fontSize="62">🪄</text>
        <rect x="460" y="493" width="280" height="94" rx="16" fill="#bd8b62" stroke="#765038" strokeWidth="10" />
        <path d="M480 587v135m240-135v135" stroke="#765038" strokeWidth="20" />
      </svg>
      <button type="button" className={`shop-stage__sign shop-stage__sign--map${category === 'map' ? ' shop-stage__sign--selected' : ''}`} disabled={phase !== 'open'} onClick={() => onCategory('map')}>Map decorations</button>
      <button type="button" className={`shop-stage__sign shop-stage__sign--character${category === 'character' ? ' shop-stage__sign--selected' : ''}`} disabled={phase !== 'open'} onClick={() => onCategory('character')}>Character accessories</button>
      {player && <div className="shop-stage__avatar" aria-label={`${player.name} standing in the store`}><PixiStage sceneKey={`shop-avatar:${player.id}`} backdrop="hearth" generatedBackdrop actions={[]} cast={cast} characters={characters} activeCharacterId={null} playerCharacterId={player.id} speakTick={0} onSelect={() => {}} onMove={() => {}} equippedItems={equippedItems} accessoryFits={accessoryFits} /></div>}
      {player && <span className="shop-stage__player-name">Me: {player.name}</span>}
      </div>
    </div>
  </div>
}
