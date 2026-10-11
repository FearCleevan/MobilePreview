// src/store/previewStore.ts
// Central state for the preview grid: panes, grid mode, frame mode.

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface Pane {
  id: string
  deviceId: string
  orientation: 'portrait' | 'landscape'
  zoomMultiplier: number   // 0.25–2.0
  url: string
  showBezel: boolean
  showSafeArea: boolean
  pinned: boolean
  syncGroup: 1 | 2 | 3 | null
}

export type GridMode = '1x1' | '2x1' | '2x2' | '3x2' | 'masonry'
export type FrameMode = 'on' | 'off' | 'auto'

export interface PreviewState {
  panes: Pane[]
  gridMode: GridMode
  activePaneId: string | null
  frameMode: FrameMode
  /** Incremented by reloadAll; components watch this to trigger reloads */
  reloadToken: number

  addPane: (deviceId: string, url?: string) => void
  removePane: (id: string) => void
  duplicatePane: (id: string) => void
  swapPanes: (a: string, b: string) => void
  reorderPanes: (from: number, to: number) => void
  updatePane: (id: string, patch: Partial<Pane>) => void
  setActivePane: (id: string | null) => void
  setGridMode: (m: GridMode) => void
  setFrameMode: (m: FrameMode) => void
  /** Reload all non-pinned panes */
  reloadAll: () => void
}

export const usePreviewStore = create<PreviewState>((set) => ({
  panes: [],
  gridMode: '2x2',
  activePaneId: null,
  frameMode: 'auto',
  reloadToken: 0,

  addPane: (deviceId, url = '') =>
    set((s) => ({
      panes: [
        ...s.panes,
        {
          id: uuidv4(),
          deviceId,
          orientation: 'portrait',
          zoomMultiplier: 1,
          url,
          showBezel: true,
          showSafeArea: false,
          pinned: false,
          syncGroup: null,
        },
      ],
    })),

  removePane: (id) =>
    set((s) => ({
      panes: s.panes.filter((p) => p.id !== id),
      activePaneId: s.activePaneId === id ? null : s.activePaneId,
    })),

  duplicatePane: (id) =>
    set((s) => {
      const pane = s.panes.find((p) => p.id === id)
      if (!pane) return s
      const duplicate: Pane = { ...pane, id: uuidv4(), pinned: false }
      const idx = s.panes.indexOf(pane)
      const next = [...s.panes]
      next.splice(idx + 1, 0, duplicate)
      return { panes: next }
    }),

  swapPanes: (a, b) =>
    set((s) => {
      const panes = [...s.panes]
      const ai = panes.findIndex((p) => p.id === a)
      const bi = panes.findIndex((p) => p.id === b)
      if (ai === -1 || bi === -1) return s
      ;[panes[ai], panes[bi]] = [panes[bi], panes[ai]]
      return { panes }
    }),

  reorderPanes: (from, to) =>
    set((s) => {
      const panes = [...s.panes]
      const [moved] = panes.splice(from, 1)
      panes.splice(to, 0, moved)
      return { panes }
    }),

  updatePane: (id, patch) =>
    set((s) => ({
      panes: s.panes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),

  setActivePane: (id) => set({ activePaneId: id }),
  setGridMode: (m) => set({ gridMode: m }),
  setFrameMode: (m) => set({ frameMode: m }),

  reloadAll: () => set((s) => ({ reloadToken: s.reloadToken + 1 })),
}))

