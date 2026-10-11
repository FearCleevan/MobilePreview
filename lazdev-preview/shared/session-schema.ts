// shared/session-schema.ts
// Zod schema for .lazpreview session files and stored sessions.
// Used by: frontend sessionFile.ts, backend persistence.ts.

import { z } from 'zod'

export const SessionPaneSchema = z.object({
  deviceId: z.string(),
  orientation: z.enum(['portrait', 'landscape']),
  zoomMultiplier: z.number().min(0.25).max(2.0),
  url: z.string().url().optional(),
  showBezel: z.boolean().optional().default(true),
  showSafeArea: z.boolean().optional().default(false),
  pinned: z.boolean().optional().default(false),
  syncGroup: z.union([z.literal(1), z.literal(2), z.literal(3), z.null()]).optional().default(null),
})

export const SessionFileSchema = z.object({
  version: z.literal(1),
  projectName: z.string(),
  createdAt: z.string().datetime(),
  gridMode: z.enum(['1x1', '2x1', '2x2', '3x2', 'masonry']),
  panes: z.array(SessionPaneSchema).min(1),
})

export type SessionFile = z.infer<typeof SessionFileSchema>
export type SessionPane = z.infer<typeof SessionPaneSchema>

