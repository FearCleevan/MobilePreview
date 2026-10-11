// src/components/devices/DeviceLibrary.tsx
// Comprehensive device browser modal with search, multi-brand filtering, sorting, and multi-select addition.

import React, { useState, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Smartphone, Plus, CheckSquare, Square } from 'lucide-react'
import { DEVICE_PRESETS } from '@shared/device-registry'
import type { DevicePreset } from '@shared/device-types'
import { useDeviceFilter } from '@/hooks/useDeviceFilter'
import { DeviceFilters } from './DeviceFilters'
import { DeviceCard } from './DeviceCard'
import { usePreviewStore } from '@/store/previewStore'
import { useSettingsStore } from '@/store/settingsStore'
import { toast } from 'sonner'

interface DeviceLibraryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DeviceLibrary: React.FC<DeviceLibraryProps> = ({ open, onOpenChange }) => {
  const { customDevices, addRecentDevice } = useSettingsStore()
  const { addPane } = usePreviewStore()

  // Combined presets pool
  const allDevices = useMemo(() => {
    return [...DEVICE_PRESETS, ...customDevices]
  }, [customDevices])

  // Filter & sorting hook
  const {
    searchQuery,
    setSearchQuery,
    selectedBrands,
    toggleBrand,
    setSelectedBrands,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    clearFilters,
    filteredDevices,
    totalCount,
    filteredCount,
  } = useDeviceFilter(allDevices)

  // Multi-selection state
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])

  const toggleSelectDevice = (id: string) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    )
  }

  const handleSelectAllVisible = () => {
    if (selectedDeviceIds.length === filteredDevices.length) {
      setSelectedDeviceIds([])
    } else {
      setSelectedDeviceIds(filteredDevices.map((d) => d.id))
    }
  }

  const handleAddSingle = (device: DevicePreset) => {
    addPane(device.id)
    addRecentDevice(device.id)
    toast.success(`Added ${device.name}`, {
      description: `${device.screenWidth}×${device.screenHeight} @${device.devicePixelRatio}x`,
      duration: 2000,
    })
  }

  const handleAddSelected = () => {
    if (selectedDeviceIds.length === 0) return

    selectedDeviceIds.forEach((id) => {
      addPane(id)
      addRecentDevice(id)
    })

    toast.success(`Added ${selectedDeviceIds.length} device panes`, {
      duration: 2200,
    })

    setSelectedDeviceIds([])
    onOpenChange(false)
  }

  const isAllVisibleSelected =
    filteredDevices.length > 0 && selectedDeviceIds.length === filteredDevices.length

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-in fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-5xl h-[88vh] max-h-[820px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden focus:outline-none"
          aria-describedby="device-library-description"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] border border-[var(--chip-border)] flex items-center justify-center text-[var(--accent)]">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <Dialog.Title className="text-base font-semibold text-[var(--text-primary)]">
                  Device Library
                </Dialog.Title>
                <p id="device-library-description" className="text-xs text-[var(--text-secondary)]">
                  Select phone, tablet, and foldable presets to preview your project.
                </p>
              </div>
            </div>

            <Dialog.Close
              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              aria-label="Close device library"
            >
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          {/* Filter Bar */}
          <div className="px-6 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/40 shrink-0">
            <DeviceFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedBrands={selectedBrands}
              onToggleBrand={toggleBrand}
              onClearBrands={() => setSelectedBrands([])}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onResetAll={clearFilters}
              totalCount={totalCount}
              filteredCount={filteredCount}
            />
          </div>

          {/* Device Grid Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-canvas)]">
            {filteredDevices.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-tertiary)] mb-3">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-1">
                  No matching devices
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                  No devices match '{searchQuery}'. Try clearing your search term, switching categories, or resetting active brand filters.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-[var(--accent)] text-[var(--text-inverted)] hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDevices.map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    isSelected={selectedDeviceIds.includes(device.id)}
                    onToggleSelect={() => toggleSelectDevice(device.id)}
                    onAdd={() => handleAddSingle(device)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer Bar: Multi-Select Actions */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0 text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {isAllVisibleSelected ? (
                  <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>
                  {isAllVisibleSelected ? 'Deselect All' : 'Select All Visible'} ({filteredDevices.length})
                </span>
              </button>

              {selectedDeviceIds.length > 0 && (
                <span className="text-[var(--accent)] font-medium">
                  {selectedDeviceIds.length} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Dialog.Close
                className="px-3.5 py-1.5 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Cancel
              </Dialog.Close>

              <button
                type="button"
                disabled={selectedDeviceIds.length === 0}
                onClick={handleAddSelected}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md font-medium transition-colors shadow-sm ${
                  selectedDeviceIds.length > 0
                    ? 'bg-[var(--accent)] text-[var(--text-inverted)] hover:bg-[var(--accent-hover)] cursor-pointer'
                    : 'bg-[var(--border-default)] text-[var(--text-tertiary)] opacity-50 cursor-not-allowed'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {selectedDeviceIds.length > 0
                    ? `Add ${selectedDeviceIds.length} Panes`
                    : 'Add Selected'}
                </span>
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

