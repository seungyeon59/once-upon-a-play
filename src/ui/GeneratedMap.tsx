import type { ImaginedScene } from '../state/types.ts'
import { secretTiles } from '../content/secretScenery.ts'

const palettes = {
  forest: { sky: '#a8c5b1', far: '#698b70', near: '#315a46', ground: '#294d3b', accent: '#e8c47c' },
  meadow: { sky: '#c8dfdf', far: '#a3bb83', near: '#739760', ground: '#5c8050', accent: '#f6d77d' },
  stream: { sky: '#b6d4d2', far: '#83aa9a', near: '#547e77', ground: '#436e65', accent: '#d2ede4' },
  mountain: { sky: '#c5d5df', far: '#8497a8', near: '#586e78', ground: '#415861', accent: '#f1e2bb' },
  night: { sky: '#253651', far: '#334e68', near: '#284d5a', ground: '#224149', accent: '#ffe7a5' },
  sky: { sky: '#78bce8', far: '#c9e9f5', near: '#e8f7f9', ground: '#f8fbec', accent: '#fff5bd' },
} as const

export function GeneratedMap({ map, imageDataUrl, onObject, onExit, onSecret, foundSecrets = [] }: { map: ImaginedScene['map']; imageDataUrl?: string; onObject: (result: string) => void; onExit: (label: string) => void; onSecret?: (index: number) => void; foundSecrets?: boolean[] }) {
  const color = palettes[map.theme] ?? palettes.forest
  const hiddenCells = secretTiles(map)
  return (
    <div className="stage-generated-map">
    {imageDataUrl ? <img className="stage-generated-image" src={imageDataUrl} alt="" /> : <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="imagined-sky" x2="0" y2="1"><stop stopColor={color.sky} /><stop offset="1" stopColor={color.far} /></linearGradient>
        <linearGradient id="imagined-water" x2="0" y2="1"><stop stopColor={color.accent} stopOpacity=".78" /><stop offset="1" stopColor={color.near} /></linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#imagined-sky)" />
      {map.theme === 'night' ? [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => <circle key={n} cx={90 + n * 127} cy={80 + (n % 3) * 53} r={n % 2 ? 3 : 5} fill={color.accent} />) : <circle cx="920" cy="160" r="72" fill={color.accent} opacity=".75" />}
      {map.theme === 'mountain' && <path d="M0 490 160 230 320 470 505 190 715 470 910 240 1200 520Z" fill={color.far} />}
      {map.theme === 'sky' ? <g fill="#fff" opacity=".85"><ellipse cx="170" cy="325" rx="155" ry="45" /><ellipse cx="700" cy="245" rx="170" ry="48" /><ellipse cx="1050" cy="420" rx="190" ry="55" /><ellipse cx="330" cy="625" rx="215" ry="58" /></g> : <><path d="M0 500Q190 410 390 490T790 475T1200 500V800H0Z" fill={color.far} /><path d="M0 610Q240 515 460 605T920 570T1200 620V800H0Z" fill={color.near} /></>}
      {(map.theme === 'stream' || map.landmark === 'bridge' || map.landmark === 'pond') && <path d="M710 570Q500 590 470 800H1010Q880 655 990 565Z" fill="url(#imagined-water)" opacity=".84" />}
      {map.theme !== 'sky' && <path d="M0 725Q230 655 450 725T890 710T1200 725V800H0Z" fill={color.ground} />}
      {map.theme === 'sky' && map.landmark === 'floating-island' && <g><ellipse cx="610" cy="660" rx="310" ry="56" fill="#ecf8ed" opacity=".8" /><path d="M370 655Q610 760 850 655Q770 780 610 790Q450 770 370 655Z" fill="#a9c9b4" opacity=".75" /></g>}
      {(map.theme === 'forest' || map.theme === 'night') && [80, 230, 355, 855, 1030, 1160].map((x, i) => <g key={x} transform={`translate(${x} ${420 + (i % 3) * 36})`}><rect x="-8" y="0" width="16" height="300" fill="#493f32" /><path d="M-95 110 0 -105 95 110Z" fill={color.ground} /><path d="M-70 20 0 -135 70 20Z" fill={color.near} /></g>)}
      {map.landmark === 'bridge' && <g><path d="M430 670Q680 490 1010 650" fill="none" stroke="#6c4938" strokeWidth="29" /><path d="M430 670Q680 490 1010 650" fill="none" stroke="#d2aa70" strokeWidth="18" /><path d="M520 628V720M650 585V705M790 590V710M925 635V725" stroke="#6c4938" strokeWidth="13" /></g>}
      {map.landmark === 'tower' && <g><rect x="555" y="300" width="160" height="345" rx="12" fill="#d8c9aa" /><path d="M530 310 635 180 740 310Z" fill="#8b6356" /><rect x="617" y="390" width="36" height="75" rx="18" fill="#395166" /><path d="M605 645V570Q635 515 665 570V645" fill="#775a46" /></g>}
      {map.landmark === 'cottage' && <g><rect x="485" y="420" width="280" height="210" rx="12" fill="#e7d4ae" /><path d="M445 430 625 285 805 430Z" fill="#905e4c" /><rect x="610" y="525" width="58" height="105" rx="25" fill="#765542" /><rect x="520" y="475" width="55" height="55" fill="#aec6c1" /></g>}
      {map.landmark === 'garden' && [0, 1, 2, 3, 4, 5, 6, 7].map((n) => <g key={n} transform={`translate(${235 + n * 105} ${620 + (n % 3) * 35})`}><path d="M0 0V95" stroke="#426844" strokeWidth="6" /><circle r="16" fill={n % 2 ? '#f2b4a8' : color.accent} /><circle cy="-15" r="10" fill="#f5d6b7" /></g>)}
      {map.landmark === 'pond' && <ellipse cx="560" cy="695" rx="280" ry="62" fill={color.accent} opacity=".58" />}
    </svg>}
    {map.tiles && <div className={`map-grid map-grid--${map.theme}${imageDataUrl ? ' map-grid--illustrated' : ''}`} aria-label="Generated game map">
      {map.tiles.flatMap((row, y) => row.map((tile, x) => {
        const secretIndex = hiddenCells.findIndex((cell) => cell.x === x && cell.y === y)
        const className = `map-tile map-tile--${tile}${secretIndex >= 0 && !foundSecrets[secretIndex] ? ' map-tile--searchable' : ''}`
        const style = { gridColumn: x + 1, gridRow: y + 1 }
        return secretIndex >= 0 && !foundSecrets[secretIndex] && onSecret
          ? <button key={`${x}-${y}`} type="button" className={className} style={style} onClick={() => onSecret(secretIndex)} aria-label={`Search ${tile} tile`} title={`Search ${tile}`} />
          : <div key={`${x}-${y}`} className={className} style={style} />
      }))}
      {map.objects?.map((object, i) => <button key={i} type="button" className="map-object" style={{ gridColumn: object.x + 1, gridRow: object.y + 1 }} title={object.label} aria-label={object.label} onClick={() => onObject(object.result)}>{object.type === 'lantern' ? '🏮' : object.type === 'tree' ? '🌳' : object.type === 'bridge' ? '🌉' : object.type === 'tower' ? '🏰' : object.type === 'pond' ? '💧' : object.type === 'garden' ? '🌷' : '🏠'}</button>)}
      {map.exit && <button type="button" className="map-exit" style={{ gridColumn: map.exit.x + 1, gridRow: map.exit.y + 1 }} aria-label={map.exit.label} title={map.exit.label} onClick={() => onExit(map.exit!.label)}>➜</button>}
      {map.spawn && <span className="map-spawn" style={{ gridColumn: map.spawn.x + 1, gridRow: map.spawn.y + 1 }} aria-label="Starting place">●</span>}
    </div>}
    </div>
  )
}
