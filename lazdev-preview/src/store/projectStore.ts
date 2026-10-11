// src/store/projectStore.ts
// State for the active project session and dev server status.

import { create } from 'zustand'
import type { Framework } from '@shared/ipc-types'

export type DevServerStatus = 'idle' | 'starting' | 'connected' | 'unreachable' | 'stopped' | 'error'

export interface ProjectSession {
  id: string
  framework: Framework
  name: string
  rootPath: string
  devServerUrl?: string
  status: DevServerStatus
  detectedAt: string
  trusted: boolean
}

interface ProjectState {
  session: ProjectSession | null
  devServerStatus: DevServerStatus
  devServerLogs: string[]

  setSession: (session: ProjectSession | null) => void
  setDevServerStatus: (status: DevServerStatus) => void
  appendLog: (line: string) => void
  clearLogs: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  session: null,
  devServerStatus: 'idle',
  devServerLogs: [],

  setSession: (session) => set({ session }),
  setDevServerStatus: (status) => set({ devServerStatus: status }),
  appendLog: (line) =>
    set((s) => ({
      devServerLogs: [...s.devServerLogs.slice(-4999), line],
    })),
  clearLogs: () => set({ devServerLogs: [] }),
}))

