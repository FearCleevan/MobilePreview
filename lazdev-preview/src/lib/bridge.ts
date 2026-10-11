// src/lib/bridge.ts
// The single integration seam between components and Electron IPC.
// Components call bridge.*, never window.laz or ipcRenderer directly.
// In browser dev mode (no window.laz), a mock bridge is used so every
// frontend feature works without the Electron backend.
//
// The mock bridge is the frontend's "simulations" — no real IPC is made.
// Backend wiring replaces the mock in each integration phase.

import type { LazBridge } from '@shared/ipc-types'

export const isElectron = typeof window !== 'undefined' && !!window.laz

function createMockBridge(): LazBridge {
  const noop = async () => ({ ok: true as const, data: undefined as never })
  const noopVoid = async () => ({ ok: true as const, data: undefined })
  const noSub = () => () => {}

  return {
    panes: {
      attach: noop,
      detach: noopVoid,
      reload: noopVoid,
      navigate: noopVoid,
      emulate: noopVoid,
      devtools: noopVoid,
      syncSet: noopVoid,
      onEvent: noSub,
    },
    projects: {
      pick: async () => ({ ok: true, data: null }),
      detect: noop,
      trust: noopVoid,
      connect: noop,
      disconnect: noopVoid,
      action: noopVoid,
      onLog: noSub,
    },
    devices: {
      list: async () => ({ ok: true, data: [] }),
      upsertCustom: noopVoid,
      deleteCustom: noopVoid,
    },
    emulators: {
      listAvds: async () => ({ ok: true, data: [] }),
      start: noop,
      stop: noopVoid,
      status: async () => ({ ok: true, data: { online: false } }),
      screenshot: noop,
    },
    shots: {
      pane: noop,
      save: noopVoid,
      recStart: noopVoid,
      recChunk: noopVoid,
      recStop: noopVoid,
    },
    files: {
      watch: noopVoid,
      unwatch: noopVoid,
      onChanged: noSub,
    },
    settings: {
      get: async () => ({ ok: true, data: {} }),
      set: noopVoid,
      export: noopVoid,
      import: noopVoid,
      clearCache: noopVoid,
      onChanged: noSub,
    },
  }
}

/**
 * The bridge instance. Always use this — never `window.laz` directly.
 * In Electron: backed by the contextBridge preload.
 * In browser dev: backed by the mock (above).
 */
export const bridge: LazBridge = (typeof window !== 'undefined' ? window.laz : undefined) ?? createMockBridge()

/**
 * Returns 'electron' in Electron, 'browser' in dev mode.
 */
export function usePreviewHostMode(): 'electron' | 'browser' {
  return isElectron ? 'electron' : 'browser'
}

