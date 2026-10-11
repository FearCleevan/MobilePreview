// src/layouts/MainCanvas.tsx
// Main preview canvas container. Shows empty state or current panes stage.
// Phase 3 replaces the stage placeholder with the full multi-pane interactive grid.

import React from 'react'
import { Plus, Smartphone, Layers } from 'lucide-react'
import { usePreviewStore } from '@/store/previewStore'
import { findPreset } from '@shared/device-registry'
import { useSettingsStore } from '@/store/settingsStore'

interface MainCanvasProps {
  onOpenAddDevice: () => void
}

export const MainCanvas: React.FC<MainCanvasProps> = ({ onOpenAddDevice }) => {
  const { panes, gridMode, removePane } = usePreviewStore()
  const { customDevices } = useSettingsStore()

  return (
    <main
      className="flex-1 h-[calc(100vh-3rem)] overflow-auto bg-[var(--bg-canvas)] relative flex flex-col items-center justify-center p-6 select-none"
      aria-label="Preview Canvas Stage"
    >
      {/* Canvas Meta Header */}
      <div className="absolute top-3 left-4 flex items-center gap-2 text-xs text-[var(--text-tertiary)] pointer-events-none z-10">
        <span className="flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-[var(--bg-surface)]/80 border border-[var(--border-subtle)] backdrop-blur">
          <Layers className="w-3 h-3 text-[var(--accent)]" />
          Grid: {gridMode}
        </span>
        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[var(--bg-surface)]/80 border border-[var(--border-subtle)] backdrop-blur">
          {panes.length} {panes.length === 1 ? 'pane' : 'panes'} active
        </span>
      </div>

      {panes.length === 0 ? (
        /* Empty State */
        <div className="max-w-md w-full text-center p-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 backdrop-blur shadow-2xl animate-in fade-in-50 duration-200">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-muted)] text-[var(--accent)] flex items-center justify-center mx-auto mb-4 border border-[var(--chip-border)]">
            <Smartphone className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
            No preview panes yet
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">
            Add a device from the library to preview your mobile application across multiple simulated device frames at once.
          </p>
          <button
            type="button"
            onClick={onOpenAddDevice}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium bg-[var(--accent)] text-[var(--text-inverted)] hover:bg-[var(--accent-hover)] transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Add a device to the canvas"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device</span>
          </button>
        </div>
      ) : (
        /* Active Panes Placeholder Stage (Phase 3 target) */
        <div className="w-full h-full flex flex-wrap items-center justify-center gap-6 overflow-auto py-8">
          {panes.map((pane, idx) => {
            const preset = findPreset(pane.deviceId, customDevices)
            return (
              <div
                key={pane.id}
                className="relative bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4 shadow-xl flex flex-col items-center justify-center transition-all hover:border-[var(--accent)] group"
                style={{
                  width: Math.min(320, (preset?.screenWidth ?? 390) * 0.4),
                  height: Math.min(620, (preset?.screenHeight ?? 844) * 0.4),
                }}
              >
                {/* Signature Viewport Readout Chip (pinned to top-right corner) */}
                <div className="viewport-chip -top-2.5 -right-2.5">
                  {preset?.screenWidth ?? 390} × {preset?.screenHeight ?? 844} @{preset?.devicePixelRatio ?? 3}x
                </div>

                <div className="text-center p-2">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    {preset?.name ?? pane.deviceId}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5 capitalize">
                    {pane.orientation} · {pane.zoomMultiplier * 100}%
                  </div>
                </div>

                <div className="mt-4 text-[11px] text-[var(--text-tertiary)] flex items-center gap-2">
                  <span>Pane #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removePane(pane.id)}
                    className="text-[var(--error)] hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove pane ${idx + 1}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

