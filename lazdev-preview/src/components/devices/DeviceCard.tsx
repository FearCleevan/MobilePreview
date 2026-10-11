// src/components/devices/DeviceCard.tsx
// Device card displaying silhouette thumbnail, technical specifications, and add/swap actions.

import React from 'react'
import { Plus, Star, Check } from 'lucide-react'
import type { DevicePreset } from '@shared/device-types'
import { formatDimensions } from '@/lib/preview-utils'
import { DevicePickerPopover } from './DevicePickerPopover'
import { useSettingsStore } from '@/store/settingsStore'

interface DeviceCardProps {
  device: DevicePreset
  isSelected: boolean
  onToggleSelect: () => void
  onAdd: () => void
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  isSelected,
  onToggleSelect,
  onAdd,
}) => {
  const { pinnedDeviceIds, pinDevice, unpinDevice } = useSettingsStore()
  const isPinned = pinnedDeviceIds.includes(device.id)

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isPinned) {
      unpinDevice(device.id)
    } else {
      pinDevice(device.id)
    }
  }

  // Format notch badge label
  const notchLabel =
    device.notchType === 'dynamic_island'
      ? 'Dynamic Island'
      : device.notchType === 'notch'
      ? 'Notch'
      : device.notchType.includes('punch_hole')
      ? 'Punch Hole'
      : device.notchType === 'teardrop'
      ? 'Teardrop'
      : 'Full Screen'

  // Approximate aspect ratio for silhouette
  const aspectRatio = device.screenWidth / device.screenHeight
  const thumbHeight = 72
  const thumbWidth = Math.round(thumbHeight * Math.max(0.45, Math.min(0.85, aspectRatio)))

  return (
    <div
      onClick={onToggleSelect}
      className={`group relative flex flex-col justify-between p-3.5 rounded-xl border bg-[var(--bg-surface)] transition-all cursor-pointer select-none ${
        isSelected
          ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-md bg-[var(--accent-muted)]'
          : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-lg'
      }`}
    >
      {/* Top row: Checkbox, Brand, Pin Star */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Multi-select Checkbox */}
          <div
            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--text-inverted)]'
                : 'border-[var(--border-strong)] bg-[var(--bg-elevated)] group-hover:border-[var(--accent)]'
            }`}
          >
            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
          </div>

          <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">
            {device.brand} · {device.releaseYear}
          </span>
        </div>

        {/* Pin Star */}
        <button
          type="button"
          onClick={handleTogglePin}
          className={`p-1 rounded hover:bg-[var(--bg-overlay)] transition-colors ${
            isPinned
              ? 'text-[var(--warning)]'
              : 'text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100'
          }`}
          aria-label={isPinned ? `Unpin ${device.name}` : `Pin ${device.name}`}
        >
          <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-[var(--warning)]' : ''}`} />
        </button>
      </div>

      {/* Middle: Silhouette Thumbnail & Core Specs */}
      <div className="flex items-center gap-3 my-2">
        {/* CSS Silhouette Thumbnail (Phase 2 preview; Phase 4 upgrades to real SVG bezels) */}
        <div
          className="relative bg-[var(--bg-canvas)] border-2 border-[var(--border-strong)] flex items-center justify-center shadow-inner shrink-0 overflow-hidden"
          style={{
            width: `${thumbWidth}px`,
            height: `${thumbHeight}px`,
            borderRadius: `${Math.max(4, Math.min(10, Math.round(device.cornerRadius * 0.18)))}px`,
          }}
          title={`${device.name} silhouette`}
        >
          {/* Dynamic Island pill representation */}
          {device.notchType === 'dynamic_island' && (
            <div className="absolute top-1.5 w-4 h-1.5 bg-[var(--bezel-dark)] rounded-full border border-white/10" />
          )}
          {/* Notch representation */}
          {device.notchType === 'notch' && (
            <div className="absolute top-0 w-5 h-2 bg-[var(--bezel-dark)] rounded-b border-b border-x border-white/10" />
          )}
          {/* Punch hole representation */}
          {device.notchType.includes('punch_hole') && (
            <div className="absolute top-1.5 w-1.5 h-1.5 bg-[var(--bezel-dark)] rounded-full border border-white/10" />
          )}
          {/* Home button for classic */}
          {device.frameSvgId === 'iphone-classic' && (
            <div className="absolute bottom-1 w-3 h-3 rounded-full border border-white/20" />
          )}
          {/* Home indicator bar for modern devices */}
          {device.hasHomeIndicator && (
            <div className="absolute bottom-1 w-5 h-0.5 bg-white/30 rounded-full" />
          )}
        </div>

        {/* Specs breakdown */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-semibold text-xs text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
            {device.name}
          </div>

          <div className="font-mono text-[11px] text-[var(--text-secondary)]">
            {formatDimensions(device)}
          </div>

          <div className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5 flex-wrap">
            <span>{device.diagonalInches}"</span>
            <span>·</span>
            <span>{device.ppi} ppi</span>
          </div>

          <div className="pt-0.5">
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              {notchLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Actions: Add + Swap into Popover */}
      <div
        className="flex items-center gap-1.5 pt-2.5 mt-1 border-t border-[var(--border-subtle)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onAdd}
          className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[var(--accent)] text-[var(--text-inverted)] hover:bg-[var(--accent-hover)] transition-colors shadow-sm"
          aria-label={`Add ${device.name} to canvas`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>

        <DevicePickerPopover device={device} />
      </div>
    </div>
  )
}

