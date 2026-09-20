import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { ImaginedScene } from '../state/types.ts'
import type { BackdropId } from '../content/mapAssets.ts'
import { PropArt } from './PropArt.tsx'

const colors: Record<BackdropId, [string, string, string]> = {
  steelhacks: ['#071f54', '#69139a', '#161349'],
  forest: ['#c5dbce', '#709878', '#3f6855'], meadow: ['#d7e8da', '#a7c58a', '#70965e'],
  river: ['#c7e6e4', '#76aaa1', '#477b73'], mountain: ['#d5e3eb', '#91a9ad', '#526f78'],
  sky: ['#80c3eb', '#d6f1fb', '#fff9e9'], ocean: ['#358fa8', '#1b718c', '#14566e'],
  space: ['#111d44', '#303c72', '#191f4d'], classroom: ['#fbebce', '#d8bd93', '#9d8069'],
  hackathon: ['#dce9ed', '#afc6c8', '#697f94'], castle: ['#cfe3e7', '#9ab4ae', '#718c82'],
  village: ['#e7ded0', '#a7bd9e', '#77927b'], cave: ['#263c54', '#435b75', '#1d3045'],
  desert: ['#f5ddbd', '#d6b27f', '#a4825b'], snowfield: ['#c8dfed', '#e6eef0', '#a8c5c7'],
  library: ['#e9d5b7', '#b98d6d', '#715d58'], kitchen: ['#f5e8d0', '#d8c8ad', '#ae947b'],
  city: ['#d9e6e9', '#b7c9c9', '#7f999e'], garden: ['#d7e9d8', '#95bc92', '#527d69'],
  island: ['#addce5', '#e7d8ad', '#7fae9d'], airship: ['#9ccbe7', '#e4edf0', '#c3d3d5'],
  restroom: ['#e4f1ef', '#c7deda', '#8caeae'], bedroom: ['#f2dfd5', '#d5b9ba', '#a28791'],
  playground: ['#bde2e9', '#9ec9aa', '#6c9b78'], hospital: ['#e5f4ef', '#c6dfdc', '#9abfbd'],
  museum: ['#eee3d4', '#d4baa5', '#a18377'], cafe: ['#f6e5ce', '#d9b796', '#9d785f'],
  trainstation: ['#d4e6e9', '#adc5c5', '#718e98'], farm: ['#d8e7cf', '#9fc68a', '#6b945b'],
  beach: ['#a8dded', '#e9d4a5', '#b99771'], jungle: ['#a6d3bc', '#4f9673', '#2b634e'],
  swamp: ['#b7cdc0', '#719889', '#3e685d'], volcano: ['#d9b2a5', '#8c777a', '#4e565d'],
  laboratory: ['#e3f1eb', '#b8d9d4', '#8dacae'], theater: ['#483b59', '#6d4661', '#2e2c45'],
  spaceship: ['#263454', '#526b81', '#243950'],
}

const stars = Array.from({ length: 21 }, (_, i) => ({ x: (i * 137 + 42) % 1200, y: (i * 79 + 53) % 540, r: i % 3 === 0 ? 4 : 2 }))

export function BackdropArt({ id }: { id: BackdropId }) {
  if (id === 'steelhacks') return <img className="prebuilt-art prebuilt-art--steelhacks" src="/maps/steelhacks-xiii.png" alt="" />
  const [top, middle, bottom] = colors[id]
  const outdoor = ['forest', 'meadow', 'river', 'mountain', 'castle', 'village', 'desert', 'snowfield', 'city', 'garden', 'island', 'playground', 'farm', 'beach', 'jungle', 'swamp', 'volcano'].includes(id)
  return <svg className="prebuilt-art" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="prebuilt-gradient" x2="0" y2="1"><stop stopColor={top} /><stop offset="1" stopColor={middle} /></linearGradient><radialGradient id="prebuilt-glow"><stop stopColor="#fff8dc" stopOpacity=".45" /><stop offset="1" stopColor="#fff8dc" stopOpacity="0" /></radialGradient></defs>
    <rect width="1200" height="800" fill="url(#prebuilt-gradient)" />
    {outdoor && <><circle cx="965" cy="140" r="68" fill="#fff0bd" opacity=".8" /><path d="M0 500Q225 405 425 490T805 475T1200 520V800H0Z" fill={middle} /><path d="M0 640Q260 550 520 625T1200 600V800H0Z" fill={bottom} /></>}
    {id === 'forest' && [70, 250, 415, 840, 1020, 1170].map((x, i) => <g key={x} transform={`translate(${x} ${375 + i % 3 * 42})`}><rect x="-9" width="18" height="360" fill="#685944" /><path d="M-100 120 0 -130 100 120Z" fill="#315b48" /><path d="M-72 20 0 -160 72 20Z" fill="#4b7959" /></g>)}
    {id === 'meadow' && Array.from({ length: 17 }, (_, i) => <g key={i} transform={`translate(${55 + i * 70} ${635 + i % 4 * 31})`}><path d="M0 0V42" stroke="#4c8058" strokeWidth="5" /><circle r="12" fill={i % 2 ? '#efb3a6' : '#f5dd83'} /></g>)}
    {id === 'river' && <><path d="M420 550Q720 485 1200 530V800H310Q500 680 420 550Z" fill="#a3d4d5" /><path d="M460 585Q800 530 1160 600" fill="none" stroke="#e9f6e8" strokeWidth="8" opacity=".6" /></>}
    {id === 'mountain' && <><path d="M0 500 205 225 395 490 615 175 840 500 1060 245 1200 420V680H0Z" fill="#718e9e" /><path d="M145 307 205 225 263 308M550 265 615 175 685 272M1011 309 1060 245 1100 300" fill="#e8efed" /></>}
    {id === 'sky' && <><circle cx="925" cy="135" r="72" fill="#fff4c6" />{[170, 480, 800, 1070].map((x, i) => <g key={x} fill="#fff" opacity=".82"><ellipse cx={x} cy={240 + i % 2 * 150} rx="125" ry="40" /><ellipse cx={x - 45} cy={215 + i % 2 * 150} rx="60" ry="52" /></g>)}<ellipse cx="610" cy="675" rx="350" ry="65" fill="#f4f8e7" /><path d="M320 675Q610 810 900 675Q790 795 610 800Q430 795 320 675Z" fill="#a8c6ac" /></>}
    {id === 'ocean' && <><path d="M0 635Q250 580 500 640T1200 600V800H0Z" fill="#174963" />{[160, 360, 840, 1050].map((x, i) => <g key={x}><path d={`M${x} 700Q${x - 60} 590 ${x} 555Q${x + 55} 620 ${x} 700Z`} fill={i % 2 ? '#dc897e' : '#f3b989'} /><circle cx={x + 60} cy={310 + i * 42} r="11" fill="#d5f4f1" opacity=".5" /></g>)}<path d="M180 0 370 740M660 0 510 740M1050 0 800 740" stroke="#b3e3e5" strokeWidth="90" opacity=".09" /></>}
    {id === 'space' && <>{stars.map((star, i) => <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#fff2cf" />)}<circle cx="960" cy="235" r="120" fill="#d8a7a3" /><ellipse cx="960" cy="235" rx="190" ry="40" fill="none" stroke="#ead8b4" strokeWidth="22" transform="rotate(-20 960 235)" /><path d="M0 700Q400 590 690 700T1200 650V800H0Z" fill="#49517c" /></>}
    {id === 'classroom' && <><rect x="70" y="95" width="390" height="280" rx="16" fill="#bcdde0" stroke="#fff7dd" strokeWidth="24" /><path d="M265 95V375M70 235H460" stroke="#fff7dd" strokeWidth="14" /><rect x="630" y="105" width="470" height="275" rx="18" fill="#517a71" stroke="#ab8d67" strokeWidth="26" /><path d="M0 540H1200V800H0Z" fill="#b99671" /><path d="M0 595H1200" stroke="#e4c7a0" strokeWidth="12" /></>}
    {id === 'hackathon' && <><rect x="90" y="80" width="360" height="270" rx="18" fill="#c9e6ee" /><rect x="720" y="100" width="370" height="225" rx="18" fill="#566a83" /><path d="M0 540H1200V800H0Z" fill="#8ca6ac" />{[110, 650].map((x) => <g key={x}><rect x={x} y="510" width="435" height="42" rx="10" fill="#c9a078" /><path d={`M${x + 42} 552V770M${x + 395} 552V770`} stroke="#6d6571" strokeWidth="20" /></g>)}</>}
    {id === 'castle' && <><path d="M330 565V280H415V205H505V280H690V160H790V280H880V220H960V565Z" fill="#d5d5c2" /><path d="M370 270 415 205 460 270M720 230 740 160 770 230M895 270 920 220 945 270" fill="#977c81" /><path d="M0 570H1200V800H0Z" fill="#9ab5a6" /><path d="M595 565V455Q645 390 695 455V565" fill="#746b65" /></>}
    {id === 'village' && [120, 460, 850].map((x, i) => <g key={x}><rect x={x} y={330 - i % 2 * 55} width="240" height="260" fill={i % 2 ? '#dfccb1' : '#efddbd'} /><path d={`M${x - 30} ${330 - i % 2 * 55} ${x + 120} ${220 - i % 2 * 55} ${x + 270} ${330 - i % 2 * 55}Z`} fill={i % 2 ? '#9b7163' : '#af826c'} /><rect x={x + 95} y={470 - i % 2 * 55} width="55" height="120" rx="20" fill="#866b5c" /></g>)}
    {id === 'cave' && <><path d="M0 0 180 245 315 100 505 320 720 65 930 255 1200 0V800H0Z" fill="#162b43" /><path d="M0 800 195 590 375 770 550 530 760 795 1020 560 1200 800Z" fill="#203a53" />{[165, 425, 730, 970].map((x, i) => <path key={x} d={`M${x - 50} 690 ${x} ${440 - i % 2 * 90} ${x + 55} 690Z`} fill={i % 2 ? '#90d5d3' : '#ad9cde'} opacity=".82" />)}</>}
    {id === 'desert' && <><path d="M0 495Q250 395 500 490T1200 455V800H0Z" fill="#edcd91" /><path d="M0 650Q260 520 600 620T1200 560V800H0Z" fill="#d9ad76" /><ellipse cx="900" cy="720" rx="180" ry="48" fill="#79b9af" /><path d="M915 665V430M915 530q-80 0-80-95M915 570q75 0 75-90" stroke="#56876d" strokeWidth="24" /></>}
    {id === 'snowfield' && <><path d="M0 480 200 215 390 490 620 180 850 500 1060 260 1200 460V800H0Z" fill="#a5bdc8" /><path d="M0 605Q230 540 510 615T1200 585V800H0Z" fill="#e6f2f1" />{[130, 360, 910, 1080].map((x) => <path key={x} d={`M${x - 55} 620 ${x} 345 ${x + 55} 620Z`} fill="#5f8c86" />)}</>}
    {id === 'library' && <><path d="M0 580H1200V800H0Z" fill="#ad8366" />{[70, 405, 800].map((x, i) => <g key={x}><rect x={x} y="70" width="300" height="470" rx="9" fill="#765c50" /><rect x={x + 18} y="90" width="264" height="425" fill="#9a7358" />{[0, 1, 2].map((s) => <g key={s}><path d={`M${x + 20} ${235 + s * 125}h260`} stroke="#5d4b47" strokeWidth="13" />{Array.from({ length: 9 }, (_, b) => <rect key={b} x={x + 28 + b * 27} y={104 + s * 125 + b % 3 * 8} width="19" height={122 - b % 3 * 8} fill={['#bd8b79', '#8ca7a0', '#e3c385'][(b + i) % 3]} />)}</g>)}</g>)}</>}
    {id === 'kitchen' && <><path d="M0 550H1200V800H0Z" fill="#c6a88a" /><rect x="100" y="125" width="330" height="270" fill="#a9d5d8" stroke="#f8f1d9" strokeWidth="23" /><path d="M265 125V395" stroke="#f8f1d9" strokeWidth="15" /><rect x="650" y="145" width="390" height="285" rx="12" fill="#e3bc92" /><path d="M660 275h370" stroke="#b28567" strokeWidth="13" /><rect x="130" y="520" width="920" height="55" rx="12" fill="#b58465" /></>}
    {id === 'city' && <><path d="M0 550H1200V800H0Z" fill="#9aacac" />{[60, 315, 585, 875].map((x, i) => <g key={x}><rect x={x} y={280 - i % 2 * 95} width="230" height={340 + i % 2 * 95} fill={['#cda792', '#a2b6b9', '#e0c39b', '#a5aabe'][i]} /><path d={`M${x - 10} ${280 - i % 2 * 95}h250`} stroke="#765f6b" strokeWidth="20" />{[0, 1, 2].map((j) => <rect key={j} x={x + 34 + j * 65} y={350 - i % 2 * 95} width="38" height="55" fill="#e6ebe0" />)}</g>)}</>}
    {id === 'garden' && <><path d="M0 490H1200V800H0Z" fill="#779e7a" /><path d="M0 480Q250 395 500 485T1200 450" fill="none" stroke="#d4c5a7" strokeWidth="45" />{[100, 330, 570, 820, 1080].map((x, i) => <g key={x}><circle cx={x} cy={470 + i % 2 * 55} r="75" fill="#5d936d" /><circle cx={x - 25} cy={450 + i % 2 * 55} r="13" fill="#f2b5b0" /><circle cx={x + 25} cy={480 + i % 2 * 55} r="13" fill="#f1d692" /></g>)}<path d="M485 800Q570 585 715 800" fill="#e7d5b3" /></>}
    {id === 'island' && <><path d="M0 475Q250 430 450 480T1200 450V800H0Z" fill="#77c5cf" /><path d="M165 665Q500 530 860 650Q1020 670 1200 620V800H0Z" fill="#e8d7a7" /><path d="M190 690Q470 600 750 670" fill="none" stroke="#fff4d7" strokeWidth="12" /><path d="M905 610Q920 420 840 305" stroke="#8d7157" strokeWidth="28" /><path d="M840 310Q720 245 630 285M840 310Q900 180 1030 235M840 310Q935 280 1030 345" fill="none" stroke="#4e9a77" strokeWidth="46" /></>}
    {id === 'airship' && <><path d="M0 270Q280 205 520 260T1200 230" fill="none" stroke="#fff" strokeWidth="75" opacity=".7" /><ellipse cx="600" cy="280" rx="340" ry="175" fill="#ebdec5" stroke="#a68e80" strokeWidth="12" /><path d="M320 550H880L795 705H405Z" fill="#aa806a" /><path d="M395 420V560M805 420V560" stroke="#8b746a" strokeWidth="10" /><path d="M390 560H810" stroke="#edcfaa" strokeWidth="12" /><path d="M0 720Q280 660 500 730T1200 700V800H0Z" fill="#e9f1f0" /></>}
    {id === 'restroom' && <><path d="M0 560H1200V800H0Z" fill="#a9c9c4" /><path d="M0 560H1200M0 680H1200M200 560V800M400 560V800M600 560V800M800 560V800M1000 560V800" stroke="#e8f3e9" strokeWidth="7" /><rect x="70" y="90" width="265" height="330" rx="18" fill="#f8f2e5" /><rect x="96" y="115" width="213" height="260" rx="110" fill="#9fc8cd" stroke="#d7bca3" strokeWidth="12" /><rect x="100" y="460" width="210" height="90" rx="35" fill="#fff9e9" /><path d="M205 465v-70h35v45" fill="none" stroke="#788d8b" strokeWidth="17" /><rect x="455" y="100" width="300" height="460" rx="12" fill="#d5e6dc" stroke="#f8f2df" strokeWidth="20" /><path d="M605 115V550" stroke="#b8cfca" strokeWidth="12" /><circle cx="715" cy="365" r="10" fill="#b99d7c" /><rect x="840" y="90" width="285" height="470" rx="12" fill="#d5e6dc" stroke="#f8f2df" strokeWidth="20" /><circle cx="1080" cy="365" r="10" fill="#b99d7c" /><path d="M900 555h165" stroke="#9ebbb5" strokeWidth="16" /></>}
    {id === 'bedroom' && <><path d="M0 540H1200V800H0Z" fill="#b39392" /><rect x="110" y="80" width="300" height="330" rx="100" fill="#c0d9d9" stroke="#fff1dd" strokeWidth="25" /><path d="M260 85V405" stroke="#fff1dd" strokeWidth="14" /><rect x="520" y="350" width="550" height="300" rx="26" fill="#a9787c" /><rect x="550" y="385" width="490" height="210" rx="25" fill="#f0d9be" /><rect x="570" y="380" width="160" height="75" rx="30" fill="#fff1de" /><path d="M520 650v95m550-95v95" stroke="#795f64" strokeWidth="22" /><circle cx="1100" cy="180" r="42" fill="#f5ddad" /></>}
    {id === 'playground' && <><path d="M0 570H1200V800H0Z" fill="#87ad7b" /><path d="M150 560 330 245 510 560" fill="none" stroke="#aa7e66" strokeWidth="25" /><path d="M315 270V455m90-185v185" stroke="#eed7a9" strokeWidth="8" /><rect x="285" y="450" width="150" height="22" rx="8" fill="#e2a689" /><path d="M690 500V250h260V490" fill="none" stroke="#ba8d6e" strokeWidth="24" /><path d="M700 330h240M740 330 650 560h285L835 330" fill="#e8b57c" stroke="#9d8067" strokeWidth="12" /><path d="M600 625q190-70 390 0" fill="none" stroke="#dcc7a4" strokeWidth="65" /></>}
    {id === 'hospital' && <><path d="M0 560H1200V800H0Z" fill="#aacac6" /><rect x="85" y="85" width="300" height="315" rx="15" fill="#b9dbdf" stroke="#fffaf0" strokeWidth="24" /><path d="M235 90V400" stroke="#fffaf0" strokeWidth="14" /><rect x="520" y="270" width="560" height="300" rx="25" fill="#f8faf1" stroke="#83a8a8" strokeWidth="12" /><path d="M510 390h570" stroke="#83a8a8" strokeWidth="16" /><rect x="550" y="315" width="165" height="80" rx="30" fill="#d8ece7" /><path d="M580 580v120m460-120v120" stroke="#709798" strokeWidth="22" /><rect x="850" y="105" width="140" height="115" rx="15" fill="#fff8eb" /><path d="M920 125v76m-40-38h80" stroke="#d48282" strokeWidth="20" /></>}
    {id === 'museum' && <><path d="M0 570H1200V800H0Z" fill="#b79a83" /><rect x="105" y="100" width="280" height="300" fill="#dcb27c" stroke="#7a665e" strokeWidth="23" /><path d="M160 335 225 225l55 65 45-85" fill="none" stroke="#7e9e89" strokeWidth="40" /><rect x="760" y="95" width="290" height="305" fill="#dcb27c" stroke="#7a665e" strokeWidth="23" /><circle cx="910" cy="230" r="80" fill="#b2b7a0" /><path d="M480 620h260l-35-180H515Z" fill="#ebe1cf" /><path d="M540 445q-30-80 58-100 82 0 58 100Z" fill="#d1c0a9" /><path d="M110 575h980" stroke="#e8d4b3" strokeWidth="12" /></>}
    {id === 'cafe' && <><path d="M0 570H1200V800H0Z" fill="#aa8069" /><rect x="95" y="90" width="315" height="340" rx="135" fill="#b9d6cf" stroke="#fae9cf" strokeWidth="24" /><path d="M245 95V420" stroke="#fae9cf" strokeWidth="13" /><rect x="550" y="115" width="505" height="290" rx="14" fill="#8d735e" /><path d="M575 245h455" stroke="#e6c596" strokeWidth="12" /><path d="M620 228q0-55 55-55t55 55m70 0q0-55 55-55t55 55" fill="#eabf89" /><ellipse cx="770" cy="540" rx="210" ry="42" fill="#ead4ae" /><path d="M595 540v180m350-180v180" stroke="#795e54" strokeWidth="18" /><path d="M105 610q100-75 190 0m700 0q100-75 190 0" fill="none" stroke="#6d625f" strokeWidth="22" /></>}
    {id === 'trainstation' && <><path d="M0 500H1200V800H0Z" fill="#95a9aa" /><path d="M0 90h1200v65H0M120 155v350m960-350v350" fill="none" stroke="#677f85" strokeWidth="25" /><path d="M0 510h1200" stroke="#e2d5b7" strokeWidth="30" /><path d="M0 720h1200M0 780h1200" stroke="#585e69" strokeWidth="15" /><rect x="300" y="260" width="665" height="240" rx="35" fill="#b7c6be" stroke="#627f89" strokeWidth="16" /><path d="M430 275v165m195-165v165m190-165v165" stroke="#627f89" strokeWidth="13" /><rect x="450" y="70" width="300" height="110" rx="12" fill="#e5e6d4" /><circle cx="600" cy="125" r="42" fill="#fff9e6" stroke="#627f89" strokeWidth="7" /></>}
    {id === 'farm' && <><path d="M0 560H1200V800H0Z" fill="#86ac6e" /><path d="M0 685Q330 590 660 685T1200 660" fill="none" stroke="#d7bd86" strokeWidth="50" /><rect x="325" y="310" width="480" height="330" fill="#c78369" /><path d="M275 315 565 130 855 315Z" fill="#865c59" /><path d="M500 640V440q65-75 130 0v200" fill="#e7d7b6" /><path d="M90 555h230m510 0h300M145 500v145m130-145v145m600-145v145m200-145v145" stroke="#e9d9b3" strokeWidth="14" /><circle cx="1040" cy="170" r="60" fill="#fff0ba" /></>}
    {id === 'beach' && <><path d="M0 340Q320 280 620 345T1200 325V800H0Z" fill="#70bdc9" /><path d="M0 505Q300 455 550 505T1200 490V800H0Z" fill="#e8d5a9" /><path d="M0 512q280-50 550 0t650-10" fill="none" stroke="#fff8e0" strokeWidth="20" /><path d="M850 650q65-220 10-350" stroke="#876b58" strokeWidth="35" /><path d="M865 300q-140-100-270-25m270 25q110-160 255-80m-255 80q140-25 255 80" fill="none" stroke="#5c9b77" strokeWidth="55" /><path d="M140 690q110-85 220 0" fill="none" stroke="#c5aa82" strokeWidth="10" /></>}
    {id === 'jungle' && <><path d="M0 560H1200V800H0Z" fill="#3d7455" />{[80, 330, 820, 1090].map((x, i) => <g key={x}><path d={`M${x} 0v800`} stroke="#5c5847" strokeWidth="35" /><circle cx={x} cy={225 + i % 2 * 100} r="160" fill={i % 2 ? '#4c956b' : '#397b5b'} /><path d={`M${x + 85} 0q-60 180 90 380`} fill="none" stroke="#79a869" strokeWidth="20" /></g>)}<path d="M410 800q150-310 380 0" fill="#bca978" /></>}
    {id === 'swamp' && <><path d="M0 550Q240 500 490 570T1200 530V800H0Z" fill="#608b84" /><path d="M0 655Q300 600 620 665T1200 640" fill="none" stroke="#b2c8aa" strokeWidth="8" />{[115, 310, 870, 1080].map((x, i) => <g key={x}><path d={`M${x} 570V${190 + i % 2 * 100}`} stroke="#5f6957" strokeWidth="32" /><circle cx={x} cy={220 + i % 2 * 100} r="90" fill="#56866c" /><path d={`M${x + 40} 340q60 150-10 280`} fill="none" stroke="#89a98a" strokeWidth="12" /></g>)}<path d="M130 720v-95m50 95V605m790 85V580m60 110V625" stroke="#748e61" strokeWidth="12" /></>}
    {id === 'volcano' && <><path d="M0 610 265 365 385 610 670 130 970 615 1100 430 1200 570V800H0Z" fill="#605b60" /><path d="M540 315 670 130 790 315 730 275 670 305 610 275Z" fill="#e6a083" /><path d="M650 300q-40 210-135 390m175-380q110 210 180 400" fill="none" stroke="#e58b64" strokeWidth="25" /><path d="M0 650Q260 570 500 670T1200 630V800H0Z" fill="#4a4f54" /><path d="M520 90q-60-60 15-90m100 130q-60-75 10-125m100 100q-35-65 25-105" fill="none" stroke="#c5afb0" strokeWidth="35" opacity=".55" /></>}
    {id === 'laboratory' && <><path d="M0 580H1200V800H0Z" fill="#a8c9c4" /><rect x="85" y="100" width="390" height="340" rx="20" fill="#b9dce0" stroke="#f5f8ea" strokeWidth="24" /><rect x="650" y="90" width="440" height="330" rx="18" fill="#d9e8dc" stroke="#8baaa8" strokeWidth="15" /><path d="M685 220h370M780 105v300" stroke="#8baaa8" strokeWidth="12" /><rect x="120" y="520" width="950" height="55" rx="12" fill="#e4d4b5" /><path d="M175 575v190m850-190v190" stroke="#75918d" strokeWidth="22" /><path d="M520 515v-100h55v100m-115 0 60-100h55l60 100Z" fill="#96cfc6" stroke="#649b9a" strokeWidth="8" /><circle cx="555" cy="470" r="17" fill="#e8bb85" /></>}
    {id === 'theater' && <><path d="M0 0h1200v800H0Z" fill="#55415b" /><path d="M170 50h860v590H170Z" fill="#d4b18b" /><path d="M170 0Q280 330 210 650H0V0Zm860 0q-110 330-40 650h210V0Z" fill="#a15367" /><path d="M0 610h1200v190H0Z" fill="#855e5b" /><path d="M220 640h760" stroke="#e7c99c" strokeWidth="18" /><path d="M350 0 440 320M850 0 760 320" stroke="#f8e7b9" strokeWidth="70" opacity=".18" /><circle cx="600" cy="180" r="85" fill="#fae9b7" opacity=".3" /></>}
    {id === 'spaceship' && <><path d="M0 0h1200v800H0Z" fill="#354762" /><path d="M230 60h740l180 430H50Z" fill="#9abac9" stroke="#92a7b1" strokeWidth="30" /><path d="M245 75h710l125 350H120Z" fill="#243759" />{stars.slice(0, 12).map((star, i) => <circle key={i} cx={star.x} cy={star.y} r={star.r + 1} fill="#fff3d3" />)}<circle cx="730" cy="260" r="85" fill="#d8af9b" /><path d="M0 565h1200v235H0Z" fill="#728a93" /><path d="M160 605h880l95 195H65Z" fill="#a9b8b5" /><rect x="285" y="640" width="180" height="75" rx="12" fill="#506a81" /><rect x="525" y="640" width="180" height="75" rx="12" fill="#506a81" /><rect x="765" y="640" width="180" height="75" rx="12" fill="#506a81" /><circle cx="355" cy="680" r="10" fill="#e4b985" /><circle cx="595" cy="680" r="10" fill="#b8dece" /><circle cx="835" cy="680" r="10" fill="#e4b985" /></>}
    <BackdropFinishing id={id} outdoor={outdoor} />
  </svg>
}

function BackdropFinishing({ id, outdoor }: { id: BackdropId; outdoor: boolean }) {
  const water = ['river', 'ocean', 'island', 'beach', 'swamp'].includes(id)
  const night = ['space', 'cave', 'theater', 'spaceship', 'volcano'].includes(id)
  const leafy = ['forest', 'meadow', 'village', 'garden', 'jungle', 'farm', 'playground'].includes(id)
  return <g aria-hidden="true" pointerEvents="none">
    <ellipse cx={night ? 850 : 950} cy={night ? 160 : 125} rx="310" ry="230" fill="url(#prebuilt-glow)" opacity={night ? '.45' : '.8'} />
    {outdoor && !night && <><path d="M60 175q36-26 72 0m32 30q29-22 58 0M700 132q36-26 72 0" fill="none" stroke="#f9f9ec" strokeWidth="4" strokeLinecap="round" opacity=".48" />{[75, 190, 315, 795, 1000, 1125].map((x, i) => <g key={x} transform={`translate(${x} ${720 + (i % 3) * 24})`} opacity=".72"><path d="M0 0v-28m0 14-12-13m12 12 10-17" fill="none" stroke="#315b43" strokeWidth="4" strokeLinecap="round" /><circle cy="-31" r="7" fill={i % 2 ? '#f6d39b' : '#f4acc1'} /><circle cx="-12" cy="-28" r="4" fill="#fff2cb" /></g>)}</>}
    {leafy && <>{[130, 255, 1010, 1115].map((x, i) => <g key={x} transform={`translate(${x} ${605 + i % 2 * 45})`} opacity=".75"><ellipse cx="-28" cy="0" rx="38" ry="15" fill="#426c50" /><ellipse cx="16" cy="-10" rx="45" ry="20" fill="#548966" /><circle cx="-12" cy="-17" r="4" fill="#f9d8a1" /><circle cx="25" cy="-23" r="4" fill="#f9d8a1" /></g>)}{[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={120 + i * 185} cy={225 + i % 3 * 78} r={i % 2 ? 3 : 5} fill="#fff6c7" opacity=".75" />)}</>}
    {water && <>{[110, 325, 565, 835, 1050].map((x, i) => <path key={x} d={`M${x} ${655 + i % 2 * 48}q32-13 64 0t64 0`} fill="none" stroke="#e7f6ed" strokeWidth="5" strokeLinecap="round" opacity=".48" />)}{id === 'ocean' && [80, 260, 470, 730, 940, 1110].map((x, i) => <g key={x} fill="none" stroke="#d8f5ef" opacity=".48"><circle cx={x} cy={230 + i % 3 * 100} r="7" /><circle cx={x + 22} cy={190 + i % 3 * 100} r="4" /></g>)}</>}
    {night && [85, 270, 460, 710, 935, 1110].map((x, i) => <path key={x} d={`M${x} ${105 + i % 3 * 74}v14m-7-7h14`} stroke={id === 'volcano' ? '#f6bb91' : '#fff5cc'} strokeWidth="3" opacity=".65" />)}
    {!outdoor && !['space', 'cave', 'ocean', 'sky', 'airship', 'spaceship'].includes(id) && <><path d="M0 45H1200M0 78H1200M0 755H1200" stroke="#fff3dc" strokeWidth="6" opacity=".22" />{[85, 315, 885, 1115].map((x) => <g key={x} opacity=".32"><path d={`M${x} 72v360`} stroke="#fff8e9" strokeWidth="8" /><circle cx={x} cy="70" r="13" fill="#fff3d0" /></g>)}</>}
    <rect x="0" y="0" width="1200" height="800" fill="none" stroke="#fff8e7" strokeWidth="14" opacity=".12" />
  </g>
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function PrebuiltMap({ map, onExit, onUpdateProp, onRemoveProp }: { map: ImaginedScene['map']; onExit: (label: string) => void; onUpdateProp: (index: number, changes: { x?: number; y?: number; size?: number }) => void; onRemoveProp: (index: number) => void }) {
  const controlsRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ index: number; pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean } | null>(null)
  const resizeRef = useRef<{ index: number; pointerId: number; startX: number; startY: number; startSize: number; baseWidth: number; baseHeight: number } | null>(null)
  const previewRef = useRef<{ index: number; x: number; y: number } | null>(null)
  const sizeRef = useRef<{ index: number; size: number } | null>(null)
  const [preview, setPreview] = useState<{ index: number; x: number; y: number } | null>(null)
  const [previewSize, setPreviewSize] = useState<{ index: number; size: number } | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    if (selected === null) return
    function dismiss(event: globalThis.PointerEvent) {
      if (!(event.target instanceof Element) || !event.target.closest('.prebuilt-prop-container, .prebuilt-editor')) setSelected(null)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [selected])

  function pointerDown(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (event.button !== 0) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = event.currentTarget.getBoundingClientRect()
    dragRef.current = { index, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: event.clientX - (rect.left + rect.width / 2), offsetY: event.clientY - (rect.top + rect.height / 2), moved: false }
    setSelected(index)
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    const bounds = controlsRef.current?.getBoundingClientRect()
    if (!drag || !bounds || drag.pointerId !== event.pointerId) return
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return
    drag.moved = true
    const position = { index: drag.index, x: clamp((event.clientX - bounds.left - drag.offsetX) / bounds.width, 0.06, 0.94), y: clamp((event.clientY - bounds.top - drag.offsetY) / bounds.height, 0.12, 0.9) }
    previewRef.current = position
    setPreview(position)
  }

  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    const finalPosition = previewRef.current
    if (drag.moved && finalPosition?.index === drag.index) onUpdateProp(drag.index, { x: finalPosition.x, y: finalPosition.y })
    previewRef.current = null
    setPreview(null)
    setSelected(drag.index)
  }

  function resizeDown(event: PointerEvent<HTMLButtonElement>, index: number, size: number) {
    if (event.button !== 0) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const box = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!box) return
    resizeRef.current = { index, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startSize: size, baseWidth: box.width / size, baseHeight: box.height / size }
  }

  function resizeMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = resizeRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const delta = ((event.clientX - drag.startX) / drag.baseWidth + (event.clientY - drag.startY) / drag.baseHeight) / 2
    const size = Math.round(clamp(drag.startSize + delta, 0.6, 1.8) * 100) / 100
    sizeRef.current = { index: drag.index, size }
    setPreviewSize(sizeRef.current)
  }

  function resizeUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = resizeRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const finalSize = sizeRef.current
    if (finalSize?.index === drag.index) onUpdateProp(drag.index, { size: finalSize.size })
    resizeRef.current = null
    sizeRef.current = null
    setPreviewSize(null)
  }

  if (!map.backdropId) return null
  const active = selected === null ? null : map.props?.[selected]
  return <div className="stage-generated-map">
    <BackdropArt id={map.backdropId} />
    <div className="prebuilt-controls" ref={controlsRef}>
      {map.props?.map((prop, index) => {
        const position = preview?.index === index ? preview : prop
        const size = previewSize?.index === index ? previewSize.size : prop.size ?? 1
        return <div key={index} className={`prebuilt-prop-container${selected === index ? ' prebuilt-prop-container--selected' : ''}`} style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%`, transform: `translate(-50%, -50%) scale(${size})` }}>
          <button type="button" className="prebuilt-prop" title={`${prop.label} — drag to move`} aria-label={`${prop.label}. Drag to move or select to resize.`} onPointerDown={(event) => pointerDown(event, index)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { dragRef.current = null; previewRef.current = null; setPreview(null) }} onClick={(event) => { if (event.detail === 0) setSelected(index) }}><PropArt id={prop.id} /></button>
          {selected === index && <button type="button" className="prebuilt-resize-handle" aria-label={`Resize ${prop.label}`} title={`Drag to resize ${prop.label}`} onPointerDown={(event) => resizeDown(event, index, size)} onPointerMove={resizeMove} onPointerUp={resizeUp} onPointerCancel={resizeUp} />}
        </div>
      })}
      {active && <div className="prebuilt-editor" style={{ left: `clamp(7.5rem, ${active.x * 100}%, calc(100% - 7.5rem))`, top: `${active.y * 100}%`, transform: active.y < 0.3 ? 'translate(-50%, 4rem)' : 'translate(-50%, -170%)' }} role="group" aria-label={`${active.label} controls`}>
        <span className="prebuilt-editor__label">{active.label}</span>
        <button type="button" className="prebuilt-editor__delete" aria-label={`Delete ${active.label}`} title={`Delete ${active.label}`} onClick={() => { onRemoveProp(selected!); setSelected(null) }}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v6m4-6v6" /></svg></button>
      </div>}
      <button type="button" className="prebuilt-exit" title={map.exit?.label ?? 'Continue the story'} aria-label={`Next scene: ${map.exit?.label ?? 'Continue the story'}`} onClick={() => onExit(map.exit?.label ?? 'Continue the story')}>Next scene →</button>
    </div>
  </div>
}
