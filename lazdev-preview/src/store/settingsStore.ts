// src/store/settingsStore.ts
// Persisted settings for the app: theme, bezel style, shortcuts, custom devices.
// Storage adapter: localStorage in browser dev mode; bridge.settings in Electron (B3).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { DevicePreset } from '@shared/device-types'

export type AppTheme = 'light' | 'dark' | 'system'
export type BezelStyle = 'realistic' | 'minimal'
export type AppMode = 'owner' | 'presentation'
export type FrameMode = 'on' | 'off' | 'auto'

export interface SettingsState {
  theme: AppTheme
  bezelStyle: BezelStyle
  appMode: AppMode
  frameMode: FrameMode
  customDevices: DevicePreset[]
  pinnedDeviceIds: string[]
  /** Last 5 recently used device IDs */
  recentDeviceIds: string[]
  shortcuts: Record<string, string>

  setTheme: (t: AppTheme) => void
  setBezelStyle: (s: BezelStyle) => void
  setAppMode: (m: AppMode) => void
  setFrameMode: (m: FrameMode) => void
  addCustomDevice: (d: DevicePreset) => void
  updateCustomDevice: (d: DevicePreset) => void
  removeCustomDevice: (id: string) => void
  pinDevice: (id: string) => void
  unpinDevice: (id: string) => void
  addRecentDevice: (id: string) => void
  setShortcut: (action: string, key: string) => void
}

/** Default keyboard shortcuts (revised to avoid Chromium/Electron conflicts) */
const DEFAULT_SHORTCUTS: Record<string, string> = {
  addPane: 'ctrl+n',
  reloadAll: 'ctrl+alt+r',
  snapshotActive: 'ctrl+shift+s',
  snapshotAll: 'ctrl+shift+a',
  toggleCompare: 'ctrl+alt+c',
  toggleSync: 'ctrl+alt+y',
  openSettings: 'ctrl+,',
  grid1x1: 'ctrl+alt+1',
  grid2x1: 'ctrl+alt+2',
  grid2x2: 'ctrl+alt+3',
  grid3x2: 'ctrl+alt+4',
  gridMasonry: 'ctrl+alt+5',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      bezelStyle: 'realistic',
      appMode: 'owner',
      frameMode: 'auto',
      customDevices: [],
      pinnedDeviceIds: [],
      recentDeviceIds: [],
      shortcuts: DEFAULT_SHORTCUTS,

      setTheme: (theme) => set({ theme }),
      setBezelStyle: (bezelStyle) => set({ bezelStyle }),
      setAppMode: (appMode) => set({ appMode }),
      setFrameMode: (frameMode) => set({ frameMode }),

      addCustomDevice: (d) =>
        set((s) => ({ customDevices: [...s.customDevices, d] })),

      updateCustomDevice: (d) =>
        set((s) => ({
          customDevices: s.customDevices.map((c) => (c.id === d.id ? d : c)),
        })),

      removeCustomDevice: (id) =>
        set((s) => ({
          customDevices: s.customDevices.filter((c) => c.id !== id),
          pinnedDeviceIds: s.pinnedDeviceIds.filter((pid) => pid !== id),
          recentDeviceIds: s.recentDeviceIds.filter((rid) => rid !== id),
        })),

      pinDevice: (id) =>
        set((s) =>
          s.pinnedDeviceIds.includes(id)
            ? s
            : { pinnedDeviceIds: [...s.pinnedDeviceIds, id] },
        ),

      unpinDevice: (id) =>
        set((s) => ({
          pinnedDeviceIds: s.pinnedDeviceIds.filter((pid) => pid !== id),
        })),

      addRecentDevice: (id) =>
        set((s) => {
          const filtered = s.recentDeviceIds.filter((rid) => rid !== id)
          return { recentDeviceIds: [id, ...filtered].slice(0, 5) }
        }),

      setShortcut: (action, key) =>
        set((s) => ({ shortcuts: { ...s.shortcuts, [action]: key } })),
    }),
    {
      name: 'lazdev-settings',
      storage: createJSONStorage(() => localStorage),
      // TODO (B3): In Electron mode, replace storage with bridge.settings adapter
    },
  ),
)

