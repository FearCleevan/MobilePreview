// src/lib/preview-utils.ts
// Renderer-side utility functions for device layout calculations.
// viewportFor and rotateInsets are re-exported from shared/viewport to keep them
// as the single implementation used by both CDP emulation (backend) and CSS layout (frontend).

import type { DevicePreset, SafeAreaInsets, Orientation } from '@shared/device-types'
import { viewportFor, rotateInsets } from '@shared/viewport'

export { viewportFor, rotateInsets }
export type { Orientation }

export const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n))

export const presetById = (id: string, list: DevicePreset[]): DevicePreset | undefined =>
  list.find((d) => d.id === id)

/**
 * Auto-fit scale (excludes user zoom multiplier).
 * Accounts for orientation + bezel thickness and pane cell size.
 *
 * Final render scale = fitScale * pane.zoomMultiplier
 *
 * Capped at 1.0 so the device never renders blurry upscaled;
 * pass allowUpscale for presentation mode.
 *
 * NOTE: Because CSS transform: scale() does not change layout size, the
 * scaled frame must sit inside a wrapper sized to (frame size × scale).
 */
export const fitScale = (
  device: DevicePreset,
  orientation: Orientation,
  paneW: number,
  paneH: number,
  opts: { padding?: number; bezel?: number; allowUpscale?: boolean } = {},
): number => {
  const { padding = 24, bezel = device.hasPhysicalBezel ? 14 : 0, allowUpscale = false } = opts
  const vp = viewportFor(device, orientation)
  const s = Math.min(
    (paneW - padding * 2) / (vp.width + bezel * 2),
    (paneH - padding * 2) / (vp.height + bezel * 2),
  )
  return Math.max(0.05, allowUpscale ? s : Math.min(s, 1))
}

/**
 * Generates a CSS box-shadow string for the safe-area overlay.
 * Uses inset shadows so they sit inside the viewport without overflow.
 */
export const safeAreaBoxShadow = (sa: SafeAreaInsets, o: Orientation = 'portrait'): string => {
  const r = rotateInsets(sa, o)
  return [
    `inset 0 ${r.top}px 0 0 var(--safe-area-overlay)`,
    `inset 0 -${r.bottom}px 0 0 var(--safe-area-overlay)`,
    `inset ${r.left}px 0 0 0 var(--safe-area-overlay)`,
    `inset -${r.right}px 0 0 0 var(--safe-area-overlay)`,
  ].join(', ')
}

export const formatDimensions = (d: DevicePreset): string =>
  `${d.screenWidth} × ${d.screenHeight} @${d.devicePixelRatio}x`

export const groupDevicesByBrand = (
  list: DevicePreset[],
): Record<string, DevicePreset[]> =>
  list.reduce<Record<string, DevicePreset[]>>((acc, d) => {
    ;(acc[d.brand] ??= []).push(d)
    return acc
  }, {})

