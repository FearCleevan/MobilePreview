// src/App.tsx
// Root application component mounting AppShell and initializing frontend mock session.

import React, { useEffect } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { useProjectStore } from '@/store/projectStore'
import { mockProjectSession } from '@/mocks/mockProject'

export const App: React.FC = () => {
  const { session, setSession } = useProjectStore()

  useEffect(() => {
    // Populate mock session for frontend preview mode
    if (!session) {
      setSession(mockProjectSession)
    }
  }, [session, setSession])

  return <AppShell />
}

export default App

