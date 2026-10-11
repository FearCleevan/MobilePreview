// src/layouts/Sidebar.tsx
// Left device library drawer with search, brand filtering, categories, pinned & recent presets.

import React, { useState, useMemo } from 'react'
import {
  Search,
  Star,
  Clock,
  Smartphone,
  Tablet,
  FolderSync,
  Plus,
  X,
} from 'lucide-react'
import { DEVICE_PRESETS } from '@shared/device-registry'
import type { DevicePreset, DeviceBrand, DeviceCategory } from '@shared/device-types'
import { useSettingsStore } from '@/store/settingsStore'
import { usePreviewStore } from '@/store/previewStore'
import { formatDimensions } from '@/lib/preview-utils'
import { toast } from 'sonner'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const BRANDS: Array<{ id: DeviceBrand; label: string }> = [
  { id: 'Apple', label: 'Apple' },
  { id: 'Samsung', label: 'Samsung' },
  { id: 'Google', label: 'Google' },
  { id: 'Custom', label: 'Custom' },
]

const CATEGORIES: Array<{ id: 'all' | DeviceCategory; label: string; icon: React.ElementType }> = [
  { id: 'all', label: 'All', icon: Smartphone },
  { id: 'phone', label: 'Phones', icon: Smartphone },
  { id: 'tablet', label: 'Tablets', icon: Tablet },
  { id: 'foldable', label: 'Foldables', icon: FolderSync },
]

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrands, setSelectedBrands] = useState<DeviceBrand[]>([])
  const [selectedCategory, setSelectedCategory] = useState<'all' | DeviceCategory>('all')

  const { customDevices, pinnedDeviceIds, recentDeviceIds, pinDevice, unpinDevice, addRecentDevice } =
    useSettingsStore()
  const { addPane } = usePreviewStore()

  // Combined device pool
  const allDevices: DevicePreset[] = useMemo(() => {
    return [...DEVICE_PRESETS, ...customDevices]
  }, [customDevices])

  // Multi-brand toggle
  const toggleBrand = (brand: DeviceBrand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )
  }

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return allDevices.filter((d) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = d.name.toLowerCase().includes(q)
        const matchesTags = d.tags.some((t) => t.toLowerCase().includes(q))
        const matchesBrand = d.brand.toLowerCase().includes(q)
        if (!matchesName && !matchesTags && !matchesBrand) return false
      }
      // Brand filter (multi-select)
      if (selectedBrands.length > 0 && !selectedBrands.includes(d.brand)) {
        return false
      }
      // Category filter
      if (selectedCategory !== 'all' && d.category !== selectedCategory) {
        return false
      }
      return true
    })
  }, [allDevices, searchQuery, selectedBrands, selectedCategory])

  // Pinned & Recent lists
  const pinnedDevices = useMemo(() => {
    return allDevices.filter((d) => pinnedDeviceIds.includes(d.id))
  }, [allDevices, pinnedDeviceIds])

  const recentDevices = useMemo(() => {
    return recentDeviceIds
      .map((id) => allDevices.find((d) => d.id === id))
      .filter((d): d is DevicePreset => !!d)
  }, [allDevices, recentDeviceIds])

  const handleAddDevice = (device: DevicePreset) => {
    addPane(device.id)
    addRecentDevice(device.id)
    toast.success(`Added ${device.name}`, {
      description: `${device.screenWidth}×${device.screenHeight} @${device.devicePixelRatio}x`,
      duration: 2000,
    })
  }

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (pinnedDeviceIds.includes(id)) {
      unpinDevice(id)
    } else {
      pinDevice(id)
    }
  }

  if (!isOpen) return null

  return (
    <aside
      className="w-72 h-[calc(100vh-3rem)] bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col shrink-0 select-none z-20 text-xs overflow-hidden animate-in slide-in-from-left-2 duration-150"
      aria-label="Device Library Sidebar"
    >
      {/* Header & Search */}
      <div className="p-3 border-b border-[var(--border-subtle)] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[var(--text-primary)] text-sm tracking-tight">
            Device Library
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            data-selectable
            placeholder="Search devices or specs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded px-2.5 py-1.5 pl-8 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none transition-colors"
            aria-label="Search devices by name or tags"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              aria-label="Clear search query"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Brand Filter Chips (Multi-select) */}
        <div>
          <div className="text-[10px] uppercase font-medium text-[var(--text-tertiary)] tracking-wider mb-1.5">
            Brands
          </div>
          <div className="flex flex-wrap gap-1">
            {BRANDS.map((brand) => {
              const active = selectedBrands.includes(brand.id)
              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => toggleBrand(brand.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-[var(--accent)] text-[var(--text-inverted)]'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-default)]'
                  }`}
                  aria-pressed={active}
                  aria-label={`Filter by ${brand.label}`}
                >
                  {brand.label}
                </button>
              )
            })}
            {selectedBrands.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedBrands([])}
                className="px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Category Toggles */}
        <div className="flex rounded bg-[var(--bg-elevated)] p-0.5 border border-[var(--border-subtle)]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors text-center ${
                selectedCategory === cat.id
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              aria-label={`Category ${cat.label}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Device Lists */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
        {/* Pinned Presets Section (if any) */}
        {pinnedDevices.length > 0 && !searchQuery && (
          <div className="p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5 px-1">
              <Star className="w-3 h-3 text-[var(--warning)] fill-[var(--warning)]" />
              Pinned Devices
            </div>
            <div className="space-y-1">
              {pinnedDevices.map((device) => (
                <DeviceListItem
                  key={`pinned-${device.id}`}
                  device={device}
                  isPinned={true}
                  onAdd={() => handleAddDevice(device)}
                  onTogglePin={(e) => togglePin(e, device.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Presets Section (if any) */}
        {recentDevices.length > 0 && !searchQuery && (
          <div className="p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5 px-1">
              <Clock className="w-3 h-3 text-[var(--accent)]" />
              Recent Devices
            </div>
            <div className="space-y-1">
              {recentDevices.map((device) => (
                <DeviceListItem
                  key={`recent-${device.id}`}
                  device={device}
                  isPinned={pinnedDeviceIds.includes(device.id)}
                  onAdd={() => handleAddDevice(device)}
                  onTogglePin={(e) => togglePin(e, device.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Devices Section */}
        <div className="p-2.5">
          <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5 px-1">
            <span>All Devices ({filteredDevices.length})</span>
          </div>

          {filteredDevices.length === 0 ? (
            <div className="p-4 text-center text-[var(--text-secondary)]">
              <p className="font-medium text-xs">No devices found</p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                No devices match '{searchQuery}'. Clear filters or check spelling.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredDevices.map((device) => (
                <DeviceListItem
                  key={device.id}
                  device={device}
                  isPinned={pinnedDeviceIds.includes(device.id)}
                  onAdd={() => handleAddDevice(device)}
                  onTogglePin={(e) => togglePin(e, device.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

interface DeviceListItemProps {
  device: DevicePreset
  isPinned: boolean
  onAdd: () => void
  onTogglePin: (e: React.MouseEvent) => void
}

const DeviceListItem: React.FC<DeviceListItemProps> = ({
  device,
  isPinned,
  onAdd,
  onTogglePin,
}) => {
  return (
    <div
      onClick={onAdd}
      className="group flex items-center justify-between p-2 rounded hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors border border-transparent hover:border-[var(--border-subtle)]"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onAdd()
        }
      }}
      aria-label={`Add ${device.name} (${formatDimensions(device)})`}
    >
      <div className="min-w-0 pr-2">
        <div className="font-medium text-[var(--text-primary)] truncate text-xs group-hover:text-[var(--accent)] transition-colors">
          {device.name}
        </div>
        <div className="text-[10px] text-[var(--text-secondary)] font-mono truncate">
          {formatDimensions(device)}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onTogglePin}
          className={`p-1 rounded hover:bg-[var(--bg-overlay)] transition-colors ${
            isPinned
              ? 'text-[var(--warning)]'
              : 'text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100'
          }`}
          aria-label={isPinned ? `Unpin ${device.name}` : `Pin ${device.name}`}
          title={isPinned ? 'Unpin device' : 'Pin device'}
        >
          <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-[var(--warning)]' : ''}`} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAdd()
          }}
          className="p-1 rounded bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-[var(--text-inverted)] transition-colors"
          aria-label={`Add ${device.name} to canvas`}
          title="Add pane"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

