// shared/viewport.ts
// Pure functions for viewport size and safe-area rotation.
// Used by both Electron main (CDP device emulation) and the renderer (CSS layout).

import type { DevicePreset, SafeAreaInsets, Orientation } from './device-types'

export interface ViewportSize {
  width: number
  height: number
}

/**
 * Returns the logical CSS viewport size for the given device and orientation.
 * Landscape swaps width and height.
 */
export function viewportFor(device: DevicePreset, orientation: Orientation): ViewportSize {
  if (orientation === 'portrait') {
    return { width: device.screenWidth, height: device.screenHeight }
  }
  return { width: device.screenHeight, height: device.screenWidth }
}

/**
 * Rotates portrait safe-area insets to landscape.
 * Rotation: top→right, right→bottom, bottom→left, left→top
 * (90° clockwise screen rotation, device tilted right)
 */
export function rotateInsets(insets: SafeAreaInsets, orientation: Orientation): SafeAreaInsets {
  if (orientation === 'portrait') return insets
  return {
    top: insets.left,
    right: insets.top,
    bottom: insets.right,
    left: insets.bottom,
  }
}

