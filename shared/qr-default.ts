import type { QrData } from './types'

/** Placeholder links: set the real ones on the Text & Fonts tab. */
export const DEFAULT_QR: QrData = {
  text: 'Payment to be made as a donation to the cause by scanning a QR code using MS Edge on your mobile device, or search Mario Kart on Viva Engage',
  items: [{ label: 'External', url: 'https://example.com/external' }, { label: 'Internal', url: 'https://example.com/internal' }],
}
