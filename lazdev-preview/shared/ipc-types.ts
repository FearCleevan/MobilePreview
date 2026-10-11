// shared/ipc-types.ts
// IPC contract types shared between Electron main and the renderer bridge.
// Result<T> is the envelope every invoke call returns — never throw across IPC.

import type { DevicePreset, Orientation } from './device-types'

// ─── Result envelope ──────────────────────────────────────────────────────────
export type ErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'NOT_TRUSTED'
  | 'UNSUPPORTED_PLATFORM'
  | 'NO_WEB_TARGET'
  | 'SPAWN_FAILED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'INTERNAL'

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } }

// ─── Pane ─────────────────────────────────────────────────────────────────────
export interface PaneAttach {
  paneId: string
  deviceId: string
  orientation: Orientation
  webContentsId: number
}

export interface SyncSet {
  paneId: string
  group: 1 | 2 | 3 | null
  clickSync: boolean
}

export type PaneEventType =
  | 'load-start'
  | 'load-stop'
  | 'load-fail'
  | 'console'
  | 'popup-blocked'
  | 'dom-ready'
  | 'crashed'
  | 'shortcut'

export interface PaneEvent {
  paneId: string
  type: PaneEventType
  // load-fail
  code?: number
  desc?: string
  url?: string
  // console
  level?: number
  message?: string
  line?: number
  source?: string
  // crashed
  reason?: string
  // shortcut
  accelerator?: string
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export type Framework = 'react-native' | 'expo' | 'flutter' | 'dart' | 'web' | 'unknown'

export interface DetectionResult {
  framework: Framework
  rootPath: string
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun'
  devScript?: string
  suggestedPort?: number
  hasWebTarget: boolean
  webTargetNote?: string
  name?: string
  scripts?: Record<string, string>
}

// ─── LazBridge (window.laz interface) ─────────────────────────────────────────
// This interface is implemented by the preload script and mocked in browser dev mode.
export interface LazBridge {
  panes: {
    attach: (cfg: PaneAttach) => Promise<Result<{ attached: true }>>
    detach: (id: string) => Promise<Result<void>>
    reload: (id: string) => Promise<Result<void>>
    navigate: (id: string, url: string) => Promise<Result<void>>
    emulate: (id: string, deviceId: string, orientation: Orientation) => Promise<Result<void>>
    devtools: (id: string) => Promise<Result<void>>
    syncSet: (cfg: SyncSet) => Promise<Result<void>>
    onEvent: (cb: (e: PaneEvent) => void) => () => void
  }
  projects: {
    pick: () => Promise<Result<{ rootPath: string } | null>>
    detect: (opts: { rootPath: string; force?: boolean }) => Promise<Result<DetectionResult & { projectId: string }>>
    trust: (projectId: string) => Promise<Result<void>>
    connect: (projectId: string) => Promise<Result<{ url: string; port: number; status: string }>>
    disconnect: (projectId: string) => Promise<Result<void>>
    action: (projectId: string, action: 'reload' | 'hot-reload' | 'hot-restart') => Promise<Result<void>>
    onLog: (cb: (log: { projectId: string; line: string }) => void) => () => void
  }
  devices: {
    list: () => Promise<Result<Array<DevicePreset & { isCustom: boolean }>>>
    upsertCustom: (device: DevicePreset) => Promise<Result<void>>
    deleteCustom: (id: string) => Promise<Result<void>>
  }
  emulators: {
    listAvds: () => Promise<Result<string[]>>
    start: (avdName: string) => Promise<Result<{ serial: string }>>
    stop: (avdName: string) => Promise<Result<void>>
    status: (avdName: string) => Promise<Result<{ online: boolean; serial?: string }>>
    screenshot: (serial: string) => Promise<Result<Uint8Array>>
  }
  shots: {
    pane: (paneId: string) => Promise<Result<Uint8Array>>
    save: (bytes: Uint8Array, name: string, ext: 'png' | 'zip' | 'webm' | 'lazpreview') => Promise<Result<void>>
    recStart: (paneId: string, fps: 15 | 24 | 30) => Promise<Result<void>>
    recChunk: (chunk: Uint8Array) => Promise<Result<void>>
    recStop: () => Promise<Result<void>>
  }
  files: {
    watch: (projectId: string, rootPath: string) => Promise<Result<void>>
    unwatch: (projectId: string) => Promise<Result<void>>
    onChanged: (cb: (e: { projectId: string; changes: Array<{ path: string; kind: string }> }) => void) => () => void
  }
  settings: {
    get: () => Promise<Result<unknown>>
    set: (patch: unknown) => Promise<Result<void>>
    export: () => Promise<Result<void>>
    import: () => Promise<Result<void>>
    clearCache: () => Promise<Result<void>>
    onChanged: (cb: (settings: unknown) => void) => () => void
  }
}

// Augment the global Window interface so TypeScript knows about window.laz
declare global {
  interface Window {
    laz?: LazBridge
  }
}

