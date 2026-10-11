// src/mocks/mockPanes.ts
// Mock panes for frontend development. All deviceIds must exist in shared/device-registry.ts.
// Typed as Pane[] to prevent drift from the store type.

import type { Pane } from '@/store/previewStore'

export const mockPanes: Pane[] = [
  {
    id: 'p1',
    deviceId: 'iphone-15-pro-max',
    orientation: 'portrait',
    zoomMultiplier: 1,
    url: 'http://localhost:8081',
    showBezel: true,
    showSafeArea: false,
    pinned: false,
    syncGroup: null,
  },
  {
    id: 'p2',
    deviceId: 'galaxy-s24-ultra',
    orientation: 'portrait',
    zoomMultiplier: 0.9,
    url: 'http://localhost:8081',
    showBezel: true,
    showSafeArea: false,
    pinned: false,
    syncGroup: null,
  },
  {
    id: 'p3',
    deviceId: 'iphone-12',
    orientation: 'landscape',
    zoomMultiplier: 0.8,
    url: 'http://localhost:8081',
    showBezel: true,
    showSafeArea: false,
    pinned: false,
    syncGroup: null,
  },
  {
    id: 'p4',
    deviceId: 'ipad-pro-11',
    orientation: 'portrait',
    zoomMultiplier: 0.6,
    url: 'http://localhost:8081',
    showBezel: true,
    showSafeArea: false,
    pinned: false,
    syncGroup: null,
  },
]

