// src/components/devices/DevicePickerPopover.tsx
// Popover menu enabling single-click swapping of an existing canvas pane's device model.

import React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { ArrowLeftRight, Check, ChevronDown } from 'lucide-react'
import type { DevicePreset } from '@shared/device-types'
import { usePreviewStore } from '@/store/previewStore'
import { findPreset } from '@shared/device-registry'
import { useSettingsStore } from '@/store/settingsStore'
import { toast } from 'sonner'

interface DevicePickerPopoverProps {
  device: DevicePreset
}

export const DevicePickerPopover: React.FC<DevicePickerPopoverProps> = ({ device }) => {
  const { panes, updatePane } = usePreviewStore()
  const { customDevices, addRecentDevice } = useSettingsStore()

  const handleSwap = (paneId: string, paneIndex: number) => {
    updatePane(paneId, { deviceId: device.id })
    addRecentDevice(device.id)

    const notchLabel =
      device.notchType === 'dynamic_island'
        ? 'Dynamic Island'
        : device.notchType === 'notch'
        ? 'Notch'
        : device.notchType.includes('punch_hole')
        ? 'Punch Hole'
        : 'Bezel'

    toast.success(`Pane ${paneIndex + 1} → ${device.name}`, {
      description: `${device.screenWidth}×${device.screenHeight} (${notchLabel})`,
      duration: 2500,
    })
  }

  const hasPanes = panes.length > 0

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={!hasPanes}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors ${
            hasPanes
              ? 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] hover:border-[var(--border-strong)]'
              : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-40 cursor-not-allowed'
          }`}
          aria-label={hasPanes ? `Swap ${device.name} into an active pane` : 'No active panes to swap'}
          title={hasPanes ? 'Swap into active pane' : 'Add a pane first to use Swap'}
        >
          <ArrowLeftRight className="w-3 h-3" />
          <span>Swap into</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="w-56 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md p-1.5 shadow-2xl z-50 text-xs animate-in fade-in-0 zoom-in-95"
          sideOffset={4}
          align="end"
        >
          <div className="px-2 py-1 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-subtle)] mb-1">
            Swap into Pane
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {panes.map((pane, idx) => {
              const currentPreset = findPreset(pane.deviceId, customDevices)
              const isCurrentDevice = pane.deviceId === device.id

              return (
                <button
                  key={pane.id}
                  type="button"
                  onClick={() => handleSwap(pane.id, idx)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                    isCurrentDevice
                      ? 'bg-[var(--accent-muted)] text-[var(--accent)] font-medium'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
                  }`}
                >
                  <div className="truncate pr-1">
                    <span className="font-mono text-[10px] text-[var(--text-tertiary)] mr-1.5">
                      #{idx + 1}
                    </span>
                    <span className="text-xs">{currentPreset?.name ?? pane.deviceId}</span>
                    <span className="block text-[10px] text-[var(--text-secondary)] capitalize font-mono">
                      {pane.orientation}
                    </span>
                  </div>
                  {isCurrentDevice && <Check className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" />}
                </button>
              )
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

