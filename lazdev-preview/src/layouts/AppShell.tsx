// src/layouts/AppShell.tsx
// Main layout container holding Top Toolbar, Left Sidebar, Canvas, and Global Overlays.

import React, { useState, useEffect } from 'react'
import { Toolbar } from './Toolbar'
import { Sidebar } from './Sidebar'
import { MainCanvas } from './MainCanvas'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { Toaster, toast } from 'sonner'
import { usePreviewStore } from '@/store/previewStore'
import { useSettingsStore } from '@/store/settingsStore'

export const AppShell: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { reloadAll } = usePreviewStore()
  const { theme } = useSettingsStore()

  // Apply theme class to <html> element
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
    }
  }, [theme])

  // Global keyboard shortcuts (Phase 1 core shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar: Ctrl+B or Cmd+B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setIsSidebarOpen((prev) => !prev)
        return
      }

      // Settings: Ctrl+, or Cmd+,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setIsSettingsOpen(true)
        return
      }

      // Add pane: Ctrl+N or Cmd+N
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        setIsSidebarOpen(true)
        toast.info('Select a device from the library to add', { duration: 1800 })
        return
      }

      // Reload all: Ctrl+Alt+R
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        reloadAll()
        toast.success('Reloading all preview panes', { duration: 1800 })
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [reloadAll])

  return (
    <div className="w-screen h-screen min-w-[960px] min-h-[600px] flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Toolbar */}
      <Toolbar
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAddDevice={() => setIsSidebarOpen(true)}
      />

      {/* Main Workspace: Sidebar + Canvas */}
      <div className="flex-1 flex w-full h-[calc(100vh-3rem)] overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <MainCanvas
          onOpenAddDevice={() => setIsSidebarOpen(true)}
        />
      </div>

      {/* Settings Dialog Modal */}
      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        theme={theme === 'light' ? 'light' : 'dark'}
        richColors
        closeButton
      />
    </div>
  )
}

