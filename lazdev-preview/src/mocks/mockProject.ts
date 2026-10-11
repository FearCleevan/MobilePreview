// src/mocks/mockProject.ts
// Mock project session for frontend development (frontend phases 0–11).
// Backend wiring replaces this with real project detection in B5/B6.

import type { ProjectSession } from '@/store/projectStore'

export const mockProjectSession: ProjectSession = {
  id: 'sess-mock-1',
  framework: 'expo',
  name: 'brisk-mobile',
  rootPath: 'C:\\dev\\brisk-mobile',
  devServerUrl: 'http://localhost:8081',
  status: 'connected',
  detectedAt: '2026-10-01T10:00:00Z',
  trusted: true,
}

