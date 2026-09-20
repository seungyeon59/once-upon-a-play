export type ShopItem = {
  id: string
  name: string
  category: 'map' | 'character'
  price: number
  symbol: string
  animated?: boolean
  slot?: 'head' | 'face' | 'neck' | 'back'
}

export type AccessoryFit = { x: number; y: number; scale: number }

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'flower-patch', name: 'Flower patch', category: 'map', price: 8, symbol: '🌷' },
  { id: 'lantern', name: 'Story lantern', category: 'map', price: 10, symbol: '🏮' },
  { id: 'mushroom', name: 'Mushroom nook', category: 'map', price: 12, symbol: '🍄' },
  { id: 'butterflies', name: 'Dancing butterflies', category: 'map', price: 18, symbol: '🦋', animated: true },
  { id: 'fireflies', name: 'Firefly lights', category: 'map', price: 20, symbol: '✨', animated: true },
  { id: 'cloud', name: 'Floating cloud', category: 'map', price: 18, symbol: '☁️', animated: true },
  { id: 'rainbow', name: 'Rainbow arch', category: 'map', price: 24, symbol: '🌈' },
  { id: 'pond', name: 'Little pond', category: 'map', price: 20, symbol: '💧' },
  { id: 'storybook-tree', name: 'Storybook tree', category: 'map', price: 22, symbol: '🌳' },
  { id: 'pine-tree', name: 'Pine tree', category: 'map', price: 16, symbol: '🌲' },
  { id: 'picnic', name: 'Picnic basket', category: 'map', price: 14, symbol: '🧺' },
  { id: 'castle', name: 'Tiny castle', category: 'map', price: 28, symbol: '🏰' },
  { id: 'crystal', name: 'Glowing crystal', category: 'map', price: 22, symbol: '💎', animated: true },
  { id: 'stars', name: 'Twinkling stars', category: 'map', price: 16, symbol: '⭐', animated: true },
  { id: 'snowflakes', name: 'Falling snow', category: 'map', price: 18, symbol: '❄️', animated: true },
  { id: 'music', name: 'Floating music', category: 'map', price: 18, symbol: '🎵', animated: true },
  { id: 'sailboat', name: 'Little sailboat', category: 'map', price: 20, symbol: '⛵' },
  { id: 'sunflower', name: 'Sunflower', category: 'map', price: 12, symbol: '🌻' },
  { id: 'cherry-tree', name: 'Cherry tree', category: 'map', price: 24, symbol: '🌸' },
  { id: 'waterfall', name: 'Waterfall', category: 'map', price: 30, symbol: '🌊', animated: true },
  { id: 'fountain', name: 'Garden fountain', category: 'map', price: 28, symbol: '⛲', animated: true },
  { id: 'campfire', name: 'Cozy campfire', category: 'map', price: 22, symbol: '🔥', animated: true },
  { id: 'moon', name: 'Moonlight', category: 'map', price: 20, symbol: '🌙', animated: true },
  { id: 'comet', name: 'Passing comet', category: 'map', price: 24, symbol: '☄️', animated: true },
  { id: 'balloons', name: 'Party balloons', category: 'map', price: 16, symbol: '🎈', animated: true },
  { id: 'treasure-pile', name: 'Treasure pile', category: 'map', price: 24, symbol: '💰' },
  { id: 'fairy-door', name: 'Fairy door', category: 'map', price: 26, symbol: '🚪' },
  { id: 'potted-plant', name: 'Potted plant', category: 'map', price: 18, symbol: '🪴' },
  { id: 'books', name: 'Book stack', category: 'map', price: 14, symbol: '📚' },
  { id: 'snowman', name: 'Snow friend', category: 'map', price: 18, symbol: '⛄' },
  { id: 'crown', name: 'Little crown', category: 'character', price: 14, symbol: '👑', slot: 'head' },
  { id: 'hat', name: 'Adventure hat', category: 'character', price: 12, symbol: '🎩', slot: 'head' },
  { id: 'bow', name: 'Ribbon bow', category: 'character', price: 10, symbol: '🎀', slot: 'head' },
  { id: 'magic-wand', name: 'Magic wand', category: 'character', price: 20, symbol: '🪄', slot: 'back' },
  { id: 'flower-crown', name: 'Flower crown', category: 'character', price: 16, symbol: '🌼', slot: 'head' },
  { id: 'cap', name: 'Explorer cap', category: 'character', price: 12, symbol: '🧢', slot: 'head' },
  { id: 'glasses', name: 'Round glasses', category: 'character', price: 14, symbol: '👓', slot: 'face' },
  { id: 'sunglasses', name: 'Sunny glasses', category: 'character', price: 14, symbol: '🕶️', slot: 'face' },
  { id: 'scarf', name: 'Cozy scarf', category: 'character', price: 14, symbol: '🧣', slot: 'neck' },
  { id: 'necklace', name: 'Star necklace', category: 'character', price: 16, symbol: '📿', slot: 'neck' },
  { id: 'backpack', name: 'Travel backpack', category: 'character', price: 18, symbol: '🎒', slot: 'back' },
  { id: 'wings', name: 'Butterfly wings', category: 'character', price: 24, symbol: '🪽', slot: 'back' },
  { id: 'tiara', name: 'Sparkly tiara', category: 'character', price: 20, symbol: '💎', slot: 'head' },
  { id: 'party-sparkle', name: 'Party sparkle', category: 'character', price: 14, symbol: '🎉', slot: 'head' },
  { id: 'headphones', name: 'Music headphones', category: 'character', price: 18, symbol: '🎧', slot: 'head' },
  { id: 'mask', name: 'Festival mask', category: 'character', price: 16, symbol: '🎭', slot: 'face' },
  { id: 'medal', name: 'Bravery medal', category: 'character', price: 18, symbol: '🏅', slot: 'neck' },
  { id: 'bell', name: 'Silver bell', category: 'character', price: 12, symbol: '🔔', slot: 'neck' },
  { id: 'satchel', name: 'Explorer satchel', category: 'character', price: 16, symbol: '👜', slot: 'back' },
  { id: 'shield', name: 'Little shield', category: 'character', price: 22, symbol: '🛡️', slot: 'back' },
]

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id)
}
