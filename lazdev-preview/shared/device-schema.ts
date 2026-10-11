// shared/device-schema.ts
// Zod schema for DevicePreset validation — complete, strict, no casts.
// Used by: registryService (main), Phase 0 invariant test, custom device editor (Phase 10).

import { z } from 'zod'

export const DeviceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'ID must be lowercase alphanumeric with hyphens'),
  brand: z.enum(['Apple', 'Samsung', 'Google', 'Xiaomi', 'OnePlus', 'Custom']),
  name: z.string().min(1),
  category: z.enum(['phone', 'tablet', 'foldable', 'desktop']),
  releaseYear: z.number().int().min(2007).max(2100),
  screenWidth: z.number().int().min(100).max(4000),
  screenHeight: z.number().int().min(100).max(4000),
  devicePixelRatio: z.number().min(1).max(4),
  physicalWidth: z.number().int().positive(),
  physicalHeight: z.number().int().positive(),
  diagonalInches: z.number().min(3).max(17),
  ppi: z.number().positive(),
  notchType: z.enum([
    'none',
    'notch',
    'dynamic_island',
    'punch_hole_center',
    'punch_hole_left',
    'teardrop',
  ]),
  cornerRadius: z.number().min(0),
  safeArea: z.object({
    top: z.number().min(0),
    bottom: z.number().min(0),
    left: z.number().min(0),
    right: z.number().min(0),
  }),
  hasHomeIndicator: z.boolean(),
  hasPhysicalBezel: z.boolean(),
  frameSvgId: z.enum([
    'iphone-notch',
    'iphone-dynamic-island',
    'iphone-classic',
    'samsung-punchhole',
    'pixel-punchhole',
    'ipad-bezel',
    'pixel-foldable',
    'custom-bezel',
  ]),
  userAgent: z.string().optional(),
  defaultOrientation: z.enum(['portrait', 'landscape']),
  tags: z.array(z.string()),
})
  .strict()
  .superRefine((d, ctx) => {
    // physicalWidth must equal screenWidth × DPR (±1 px for rounding)
    if (Math.abs(d.physicalWidth - d.screenWidth * d.devicePixelRatio) > 1) {
      ctx.addIssue({
        code: 'custom',
        message: `physicalWidth (${d.physicalWidth}) ≠ screenWidth (${d.screenWidth}) × DPR (${d.devicePixelRatio}) = ${d.screenWidth * d.devicePixelRatio}`,
      })
    }
    // physicalHeight must equal screenHeight × DPR (±1 px for rounding)
    if (Math.abs(d.physicalHeight - d.screenHeight * d.devicePixelRatio) > 1) {
      ctx.addIssue({
        code: 'custom',
        message: `physicalHeight (${d.physicalHeight}) ≠ screenHeight (${d.screenHeight}) × DPR (${d.devicePixelRatio}) = ${d.screenHeight * d.devicePixelRatio}`,
      })
    }
    // Safe area must not overflow the screen
    if (d.safeArea.top + d.safeArea.bottom >= d.screenHeight) {
      ctx.addIssue({
        code: 'custom',
        message: 'safeArea.top + safeArea.bottom must be less than screenHeight',
      })
    }
  })

export type DeviceSchemaType = z.infer<typeof DeviceSchema>

