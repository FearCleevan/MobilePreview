// src/lib/__tests__/device-registry.test.ts
// Registry invariant test — runs in Vitest.
// Must pass before any phase is committed. Failing = broken registry entry.

import { describe, it, expect } from 'vitest'
import { DEVICE_PRESETS } from '@shared/device-registry'
import { DeviceSchema } from '@shared/device-schema'
import { mockPanes } from '@/mocks/mockPanes'

describe('Device Registry — invariants', () => {
  it('has no duplicate IDs', () => {
    const ids = DEVICE_PRESETS.map((d) => d.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('every entry passes DeviceSchema validation', () => {
    const errors: string[] = []
    for (const preset of DEVICE_PRESETS) {
      const result = DeviceSchema.safeParse(preset)
      if (!result.success) {
        errors.push(`[${preset.id}] ${result.error.message}`)
      }
    }
    if (errors.length > 0) {
      throw new Error(`Registry validation failed:\n${errors.join('\n')}`)
    }
  })

  it('physicalWidth = screenWidth × DPR (±1px) for every preset', () => {
    for (const d of DEVICE_PRESETS) {
      const expected = d.screenWidth * d.devicePixelRatio
      expect(
        Math.abs(d.physicalWidth - expected),
        `[${d.id}] physicalWidth ${d.physicalWidth} ≠ ${expected}`,
      ).toBeLessThanOrEqual(1)
    }
  })

  it('physicalHeight = screenHeight × DPR (±1px) for every preset', () => {
    for (const d of DEVICE_PRESETS) {
      const expected = d.screenHeight * d.devicePixelRatio
      expect(
        Math.abs(d.physicalHeight - expected),
        `[${d.id}] physicalHeight ${d.physicalHeight} ≠ ${expected}`,
      ).toBeLessThanOrEqual(1)
    }
  })

  it('safeArea.top + safeArea.bottom < screenHeight for every preset', () => {
    for (const d of DEVICE_PRESETS) {
      expect(
        d.safeArea.top + d.safeArea.bottom,
        `[${d.id}] safeArea.top+bottom overflows screenHeight`,
      ).toBeLessThan(d.screenHeight)
    }
  })

  it('every frameSvgId is a valid FrameSvgId', () => {
    const validIds = [
      'iphone-notch',
      'iphone-dynamic-island',
      'iphone-classic',
      'samsung-punchhole',
      'pixel-punchhole',
      'ipad-bezel',
      'pixel-foldable',
      'custom-bezel',
    ] as const
    for (const d of DEVICE_PRESETS) {
      expect(
        validIds,
        `[${d.id}] frameSvgId "${d.frameSvgId}" is not valid`,
      ).toContain(d.frameSvgId)
    }
  })

  it('every deviceId used in mockPanes resolves in the registry', () => {
    const ids = new Set(DEVICE_PRESETS.map((d) => d.id))
    for (const pane of mockPanes) {
      expect(
        ids.has(pane.deviceId),
        `mockPane deviceId "${pane.deviceId}" not found in registry`,
      ).toBe(true)
    }
  })
})

