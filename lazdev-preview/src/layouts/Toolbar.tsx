// src/layouts/Toolbar.tsx
// Top window toolbar with project status pill, grid mode, frame mode, and action triggers.

import React from 'react'
import {
  PanelLeft,
  RotateCw,
  Plus,
  Settings,
  Camera,
  LayoutGrid,
  Smartphone,
  Eye,
  Check,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { usePreviewStore, type GridMode, type FrameMode } from '@/store/previewStore'
import { useProjectStore } from '@/store/projectStore'
import { toast } from 'sonner'

interface ToolbarProps {
  onToggleSidebar: () => void
  isSidebarOpen: boolean
  onOpenSettings: () => void
  onOpenAddDevice: () => void
}

const GRID_OPTIONS: Array<{ value: GridMode; label: string }> = [
  { value: '1x1', label: '1 × 1 (Single)' },
  { value: '2x1', label: '2 × 1 (Side-by-side)' },
  { value: '2x2', label: '2 × 2 (Four Quad)' },
  { value: '3x2', label: '3 × 2 (Six Panes)' },
  { value: 'masonry', label: 'Masonry (Auto)' },
]

const FRAME_OPTIONS: Array<{ value: FrameMode; label: string; desc: string }> = [
  { value: 'auto', label: 'Auto', desc: 'Hidden when zoomed out' },
  { value: 'on', label: 'On', desc: 'Always show device frame' },
  { value: 'off', label: 'Off', desc: 'Border-only minimal mode' },
]

export const Toolbar: React.FC<ToolbarProps> = ({
  onToggleSidebar,
  isSidebarOpen,
  onOpenSettings,
  onOpenAddDevice,
}) => {
  const { gridMode, setGridMode, frameMode, setFrameMode, reloadAll } = usePreviewStore()
  const { session } = useProjectStore()

  const handleReloadAll = () => {
    reloadAll()
    toast.success('Reloading all preview panes', {
      duration: 2000,
    })
  }

  const formatFramework = (fw?: string) => {
    if (fw === 'react-native') return 'React Native'
    if (fw === 'expo') return 'Expo (RN)'
    if (fw === 'flutter') return 'Flutter'
    if (fw === 'dart') return 'Dart (web)'
    if (fw === 'web') return 'Web'
    return 'Custom'
  }

  return (
    <header className="h-12 w-full bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex items-center justify-between px-3 shrink-0 select-none z-30">
      {/* Left: Sidebar toggle, Branding, Project status pill */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`p-1.5 rounded transition-colors ${
            isSidebarOpen
              ? 'text-[var(--text-primary)] bg-[var(--bg-elevated)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
          aria-label={isSidebarOpen ? 'Collapse device library' : 'Expand device library'}
          title="Toggle Device Library (Ctrl+B)"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-[var(--accent)]" />
            LazDev Preview
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
            v1.0
          </span>
        </div>

        {/* Project Status Pill (Dot + Text label, never color alone) */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              session?.status === 'connected'
                ? 'bg-[var(--success)] shadow-[0_0_8px_rgba(62,207,142,0.5)]'
                : 'bg-[var(--warning)]'
            }`}
          />
          <span className="text-[var(--text-secondary)]">
            {session ? (
              <>
                <strong className="text-[var(--text-primary)] font-medium">Connected</strong>
                <span className="mx-1 text-[var(--text-tertiary)]">·</span>
                <span>{formatFramework(session.framework)}</span>
              </>
            ) : (
              'No Project Connected'
            )}
          </span>
        </div>
      </div>

      {/* Right: Controls & Actions */}
      <div className="flex items-center gap-1.5">
        {/* + Add Pane */}
        <button
          type="button"
          onClick={onOpenAddDevice}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[var(--accent)] text-[var(--text-inverted)] hover:bg-[var(--accent-hover)] transition-colors shadow-sm"
          aria-label="Add device preview pane"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Pane</span>
        </button>

        <div className="h-4 w-px bg-[var(--border-subtle)] mx-1" />

        {/* Reload All */}
        <button
          type="button"
          onClick={handleReloadAll}
          className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          aria-label="Reload all panes"
          title="Reload All Panes (Ctrl+Alt+R)"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Frame Mode Dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              aria-label="Select device frame mode"
              title="Frame Mode (On / Off / Auto)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="capitalize">{frameMode}</span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[160px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md p-1 shadow-xl z-50 animate-in fade-in-0 text-xs"
              align="end"
            >
              <DropdownMenu.Label className="px-2 py-1.5 text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Device Frame
              </DropdownMenu.Label>
              {FRAME_OPTIONS.map((opt) => (
                <DropdownMenu.Item
                  key={opt.value}
                  onClick={() => setFrameMode(opt.value)}
                  className="flex items-center justify-between px-2 py-1.5 rounded text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--accent)] cursor-pointer outline-none"
                >
                  <div>
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">{opt.desc}</div>
                  </div>
                  {frameMode === opt.value && <Check className="w-3.5 h-3.5 text-[var(--accent)] ml-2" />}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Grid Mode Dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              aria-label="Select preview grid layout"
              title="Grid Mode"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{gridMode}</span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[150px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md p-1 shadow-xl z-50 animate-in fade-in-0 text-xs"
              align="end"
            >
              <DropdownMenu.Label className="px-2 py-1.5 text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Grid Layout
              </DropdownMenu.Label>
              {GRID_OPTIONS.map((opt) => (
                <DropdownMenu.Item
                  key={opt.value}
                  onClick={() => setGridMode(opt.value)}
                  className="flex items-center justify-between px-2 py-1.5 rounded text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--accent)] cursor-pointer outline-none"
                >
                  <span>{opt.label}</span>
                  {gridMode === opt.value && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Snapshot All (disabled until Phase 9) */}
        <button
          type="button"
          disabled
          className="p-1.5 rounded text-[var(--text-tertiary)] opacity-50 cursor-not-allowed"
          aria-label="Snapshot all panes (available in Phase 9)"
          title="Snapshot All (Phase 9)"
        >
          <Camera className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-[var(--border-subtle)] mx-0.5" />

        {/* Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          aria-label="Open application settings"
          title="Settings (Ctrl+,)"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}

