import type { Catalog, CharacterEntry, CupEntry, TrackEntry } from '../../shared/catalog'

const ch = (id: string, name: string, base: string, variant?: string): CharacterEntry => ({
  id, name, base, ...(variant ? { variant } : {}), icon: `/assets/characters/${id}.png`,
})
const tr = (id: string, name: string, cupId: string): TrackEntry => ({
  id, name, cupId, thumb: `/assets/tracks/${id}.png`, image: `/assets/tracks/${id}-large.jpg`,
})
const cup = (id: string, name: string, tracks: [string, string, string, string]): CupEntry => ({
  id, name, emblem: `/assets/cups/${id}.png`, tracks,
})

export const fixtureCatalog: Catalog = {
  characters: [
    ch('mario', 'Mario', 'mario'),
    ch('luigi', 'Luigi', 'luigi'),
    ch('peach', 'Peach', 'peach'),
    ch('yoshi', 'Yoshi', 'yoshi'),
    ch('yoshi-red', 'Yoshi (Red)', 'yoshi', 'Red'),
    ch('bowser', 'Bowser', 'bowser'),
    ch('pink-gold-peach', 'Pink Gold Peach', 'pink-gold-peach'),
    ch('peachette', 'Peachette', 'peachette'),
  ],
  cups: [
    cup('mushroom', 'Mushroom Cup', ['mario-kart-stadium', 'water-park', 'sweet-sweet-canyon', 'thwomp-ruins']),
    cup('flower', 'Flower Cup', ['mario-circuit', 'toad-harbor', 'twisted-mansion', 'shy-guy-falls']),
    cup('boomerang', 'Boomerang Cup', ['tour-bangkok-rush', 'ds-mario-circuit', 'gcn-waluigi-stadium', 'tour-singapore-speedway']),
  ],
  tracks: [
    tr('mario-kart-stadium', 'Mario Kart Stadium', 'mushroom'),
    tr('water-park', 'Water Park', 'mushroom'),
    tr('sweet-sweet-canyon', 'Sweet Sweet Canyon', 'mushroom'),
    tr('thwomp-ruins', 'Thwomp Ruins', 'mushroom'),
    tr('mario-circuit', 'Mario Circuit', 'flower'),
    tr('toad-harbor', 'Toad Harbor', 'flower'),
    tr('twisted-mansion', 'Twisted Mansion', 'flower'),
    tr('shy-guy-falls', 'Shy Guy Falls', 'flower'),
    tr('tour-bangkok-rush', 'Tour Bangkok Rush', 'boomerang'),
    tr('ds-mario-circuit', 'DS Mario Circuit', 'boomerang'),
    tr('gcn-waluigi-stadium', 'GCN Waluigi Stadium', 'boomerang'),
    tr('tour-singapore-speedway', 'Tour Singapore Speedway', 'boomerang'),
  ],
}
