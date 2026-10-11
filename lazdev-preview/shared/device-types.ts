// shared/device-types.ts
// Single source of truth for device type definitions.
// Imported by both Electron main (via @shared/*) and the React renderer.

export type DeviceBrand = 'Apple' | 'Samsung' | 'Google' | 'Xiaomi' | 'OnePlus' | 'Custom'
export type DeviceCategory = 'phone' | 'tablet' | 'foldable' | 'desktop'

export type NotchType =
  | 'none'
  | 'notch'
  | 'dynamic_island'
  | 'punch_hole_center'
  | 'punch_hole_left'
  | 'teardrop'

export interface SafeAreaInsets {
  top: number
  bottom: number
  left: number
  right: number
}

export type FrameSvgId =
  | 'iphone-notch'
  | 'iphone-dynamic-island'
  | 'iphone-classic'
  | 'samsung-punchhole'
  | 'pixel-punchhole'
  | 'ipad-bezel'
  | 'pixel-foldable'
  | 'custom-bezel'

export interface DevicePreset {
  /** Stable slug, e.g. "iphone-15-pro-max". Never changes once published. */
  id: string
  brand: DeviceBrand
  name: string
  category: DeviceCategory
  releaseYear: number
  /** CSS logical px, PORTRAIT width */
  screenWidth: number
  /** CSS logical px, PORTRAIT height */
  screenHeight: number
  devicePixelRatio: number
  /** physicalWidth = screenWidth × devicePixelRatio (±1 rounding) */
  physicalWidth: number
  physicalHeight: number
  diagonalInches: number
  ppi: number
  notchType: NotchType
  /** CSS px corner radius */
  cornerRadius: number
  /** PORTRAIT safe-area insets; use rotateInsets() for landscape */
  safeArea: SafeAreaInsets
  hasHomeIndicator: boolean
  hasPhysicalBezel: boolean
  frameSvgId: FrameSvgId
  userAgent?: string
  defaultOrientation: 'portrait' | 'landscape'
  tags: string[]
}

export type Orientation = 'portrait' | 'landscape'

