export function kebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const ICON_EXCEPTIONS: Record<string, string> = {
  'Donkey Kong': 'MK8DX DK Icon.png',
  'Bowser Jr.': 'MK8 Bowser Jr Icon.png',
  Birdo: 'MK8D Birdo Icon.png',
  'Inkling Girl': 'MK8DX Female Inkling Icon.png',
  'Inkling Boy': 'MK8DX Male Inkling Icon.png',
  'Villager (Boy)': 'MK8DX Male Villager Icon.png',
  'Villager (Girl)': 'MK8DX Female Villager Icon.png',
  Mii: 'Mii MK8.png',
}

export function characterIconCandidates(name: string): string[] {
  const exc = ICON_EXCEPTIONS[name]
  if (exc) return [exc]
  return [`MK8DX ${name} Icon.png`, `MK8D ${name} Icon.png`, `MK8 ${name} Icon.png`]
}

export function characterArtCandidates(name: string): string[] {
  return [`MK8DX - ${name} artwork transparent.png`]
}

export function trackThumbTitle(name: string): string {
  return `MK8D ${name} Course Icon Full.png`
}

export function trackLargeCandidates(name: string): string[] {
  return [`MK8 ${name}.png`, `MK8D ${name}.png`]
}

export interface CharacterSpec {
  id: string
  name: string
  base: string
  variant?: string
  iconCandidates: string[]
  artCandidates: string[]
}

export interface CupSpec {
  id: string
  name: string
  tracks: [string, string, string, string]
}

const BASE_ROSTER = [
  'Mario', 'Luigi', 'Peach', 'Daisy', 'Rosalina', 'Tanooki Mario', 'Cat Peach', 'Birdo', 'Yoshi', 'Toad',
  'Koopa Troopa', 'Shy Guy', 'Lakitu', 'Toadette', 'King Boo', 'Petey Piranha', 'Baby Mario', 'Baby Luigi',
  'Baby Peach', 'Baby Daisy', 'Baby Rosalina', 'Metal Mario', 'Gold Mario', 'Pink Gold Peach', 'Wiggler',
  'Wario', 'Waluigi', 'Donkey Kong', 'Bowser', 'Dry Bones', 'Bowser Jr.', 'Dry Bowser', 'Kamek', 'Lemmy',
  'Larry', 'Wendy', 'Ludwig', 'Iggy', 'Roy', 'Morton', 'Peachette', 'Inkling Girl', 'Inkling Boy',
  'Villager (Boy)', 'Villager (Girl)', 'Isabelle', 'Link', 'Diddy Kong', 'Funky Kong', 'Pauline', 'Mii',
]

interface VariantSpec { variant: string; icon: string }

const YOSHI_COLOURS = ['Light-Blue', 'Black', 'Red', 'Yellow', 'White', 'Blue', 'Pink', 'Orange']
const SHY_GUY_COLOURS = ['Light-Blue', 'Black', 'Green', 'Yellow', 'White', 'Blue', 'Pink', 'Orange']
const BIRDO_COLOURS = ['Light-Blue', 'Black', 'Red', 'Yellow', 'White', 'Blue', 'Green', 'Orange']

const VARIANTS: Record<string, VariantSpec[]> = {
  Yoshi: YOSHI_COLOURS.map((v) => ({ variant: v, icon: `MK8 ${v} Yoshi Icon.png` })),
  'Shy Guy': SHY_GUY_COLOURS.map((v) => ({ variant: v, icon: `MK8 ${v} Shy Guy Icon.png` })),
  Birdo: BIRDO_COLOURS.map((v) => ({ variant: v, icon: `MK8D Birdo ${v} Icon.png` })),
  'Inkling Girl': [
    { variant: 'Green', icon: 'MK8D Green Inkling Icon.png' },
    { variant: 'Pink', icon: 'MK8D Pink Inkling Icon.png' },
  ],
  'Inkling Boy': [
    { variant: 'Purple', icon: 'MK8D Purple Inkling Icon.png' },
    { variant: 'Cyan', icon: 'MK8D Cyan Inkling Icon.png' },
  ],
  Link: [{ variant: "Champion's Tunic", icon: 'MK8D BotW Link Icon.png' }],
}

function buildCharacters(): CharacterSpec[] {
  const out: CharacterSpec[] = []
  for (const name of BASE_ROSTER) {
    const baseId = kebab(name)
    out.push({
      id: baseId,
      name,
      base: baseId,
      iconCandidates: characterIconCandidates(name),
      artCandidates: characterArtCandidates(name),
    })
    for (const v of VARIANTS[name] ?? []) {
      const vName = v.variant.replace(/-/g, ' ')
      out.push({
        id: `${baseId}-${kebab(v.variant)}`,
        name: `${name} (${vName})`,
        base: baseId,
        variant: vName,
        iconCandidates: [v.icon],
        artCandidates: [],
      })
    }
  }
  return out
}

export const CHARACTER_SPECS: CharacterSpec[] = buildCharacters()

const t = (...x: [string, string, string, string]) => x

const CUP_TABLE: [string, string, [string, string, string, string]][] = [
  ['mushroom', 'Mushroom Cup', t('Mario Kart Stadium', 'Water Park', 'Sweet Sweet Canyon', 'Thwomp Ruins')],
  ['flower', 'Flower Cup', t('Mario Circuit', 'Toad Harbor', 'Twisted Mansion', 'Shy Guy Falls')],
  ['star', 'Star Cup', t('Sunshine Airport', 'Dolphin Shoals', 'Electrodrome', 'Mount Wario')],
  ['special', 'Special Cup', t('Cloudtop Cruise', 'Bone-Dry Dunes', "Bowser's Castle", 'Rainbow Road')],
  ['shell', 'Shell Cup', t('Wii Moo Moo Meadows', 'GBA Mario Circuit', 'DS Cheep Cheep Beach', "N64 Toad's Turnpike")],
  ['banana', 'Banana Cup', t('GCN Dry Dry Desert', 'SNES Donut Plains 3', 'N64 Royal Raceway', '3DS DK Jungle')],
  ['leaf', 'Leaf Cup', t('DS Wario Stadium', 'GCN Sherbet Land', '3DS Music Park', 'N64 Yoshi Valley')],
  ['lightning', 'Lightning Cup', t('DS Tick-Tock Clock', '3DS Piranha Plant Slide', 'Wii Grumble Volcano', 'N64 Rainbow Road')],
  ['egg', 'Egg Cup', t('GCN Yoshi Circuit', 'Excitebike Arena', 'Dragon Driftway', 'Mute City')],
  ['triforce', 'Triforce Cup', t("Wii Wario's Gold Mine", 'SNES Rainbow Road', 'Ice Ice Outpost', 'Hyrule Circuit')],
  ['crossing', 'Crossing Cup', t('GCN Baby Park', 'GBA Cheese Land', 'Wild Woods', 'Animal Crossing')],
  ['bell', 'Bell Cup', t('3DS Neo Bowser City', 'GBA Ribbon Road', 'Super Bell Subway', 'Big Blue')],
  ['golden-dash', 'Golden Dash Cup', t('Tour Paris Promenade', '3DS Toad Circuit', 'N64 Choco Mountain', 'Wii Coconut Mall')],
  ['lucky-cat', 'Lucky Cat Cup', t('Tour Tokyo Blur', 'DS Shroom Ridge', 'GBA Sky Garden', 'Ninja Hideaway')],
  ['turnip', 'Turnip Cup', t('Tour New York Minute', 'SNES Mario Circuit 3', 'N64 Kalimari Desert', 'DS Waluigi Pinball')],
  ['propeller', 'Propeller Cup', t('Tour Sydney Sprint', 'GBA Snow Land', 'Wii Mushroom Gorge', 'Sky-High Sundae')],
  ['rock', 'Rock Cup', t('Tour London Loop', 'GBA Boo Lake', '3DS Rock Rock Mountain', 'Wii Maple Treeway')],
  ['moon', 'Moon Cup', t('Tour Berlin Byways', 'DS Peach Gardens', 'Merry Mountain', '3DS Rainbow Road')],
  ['fruit', 'Fruit Cup', t('Tour Amsterdam Drift', 'GBA Riverside Park', 'Wii DK Summit', "Yoshi's Island")],
  ['boomerang', 'Boomerang Cup', t('Tour Bangkok Rush', 'DS Mario Circuit', 'GCN Waluigi Stadium', 'Tour Singapore Speedway')],
  ['feather', 'Feather Cup', t('Tour Athens Dash', 'GCN Daisy Cruiser', 'Wii Moonview Highway', 'Squeaky Clean Sprint')],
  ['cherry', 'Cherry Cup', t('Tour Los Angeles Laps', 'GBA Sunset Wilds', 'Wii Koopa Cape', 'Tour Vancouver Velocity')],
  ['acorn', 'Acorn Cup', t('Tour Rome Avanti', 'GCN DK Mountain', 'Wii Daisy Circuit', 'Piranha Plant Cove')],
  ['spiny', 'Spiny Cup', t('Tour Madrid Drive', "3DS Rosalina's Ice World", 'SNES Bowser Castle 3', 'Wii Rainbow Road')],
]

export const CUP_SPECS: CupSpec[] = CUP_TABLE.map(([id, name, tracks]) => ({ id, name, tracks }))

const BCP_CUPS = new Set([
  'golden-dash', 'lucky-cat', 'turnip', 'propeller', 'rock', 'moon', 'fruit', 'boomerang', 'feather', 'cherry', 'acorn', 'spiny',
])

export function cupEmblemTitle(cupId: string): string {
  const spec = CUP_SPECS.find((c) => c.id === cupId)
  if (!spec) throw new Error(`Unknown cup id: ${cupId}`)
  const short = spec.name.replace(/ Cup$/, '')
  if (cupId === 'mushroom' || cupId === 'flower') return `MK8 ${short}Cup.png`
  if (BCP_CUPS.has(cupId)) return `MK8D BCP ${short} Emblem.png`
  return `MK8 ${short} Cup Emblem.png`
}
