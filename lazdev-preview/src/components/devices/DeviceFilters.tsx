// src/components/devices/DeviceFilters.tsx
// Filter controls: search, brand chips, category selector, and sort options.

import React from 'react'
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import type { DeviceBrand, DeviceCategory } from '@shared/device-types'
import type { SortOption } from '@/hooks/useDeviceFilter'

interface DeviceFiltersProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  selectedBrands: DeviceBrand[]
  onToggleBrand: (brand: DeviceBrand) => void
  onClearBrands: () => void
  selectedCategory: 'all' | DeviceCategory
  onCategoryChange: (cat: 'all' | DeviceCategory) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  onResetAll: () => void
  totalCount: number
  filteredCount: number
}

const BRANDS: DeviceBrand[] = ['Apple', 'Samsung', 'Google', 'Custom']

const CATEGORIES: Array<{ id: 'all' | DeviceCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'phone', label: 'Phones' },
  { id: 'tablet', label: 'Tablets' },
  { id: 'foldable', label: 'Foldables' },
]

const SORT_OPTIONS: Array<{ id: SortOption; label: string }> = [
  { id: 'year-desc', label: 'Release Year (Newest)' },
  { id: 'name-asc', label: 'Name (A → Z)' },
  { id: 'screen-asc', label: 'Screen Size (Smallest)' },
  { id: 'screen-desc', label: 'Screen Size (Largest)' },
]

export const DeviceFilters: React.FC<DeviceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedBrands,
  onToggleBrand,
  onClearBrands,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  onResetAll,
  totalCount,
  filteredCount,
}) => {
  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedBrands.length > 0 ||
    selectedCategory !== 'all' ||
    sortBy !== 'year-desc'

  return (
    <div className="space-y-3.5 text-xs">
      {/* Top Bar: Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            data-selectable
            placeholder="Search by device name, brand, or tag..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded px-3 py-1.5 pl-8 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none transition-colors"
            aria-label="Search device presets"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              aria-label="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 shrink-0 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded px-2.5 py-1">
          <ArrowUpDown className="w-3 h-3 text-[var(--text-tertiary)]" />
          <span className="text-[11px] text-[var(--text-secondary)] font-medium">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer pr-1"
            aria-label="Sort devices"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-[var(--bg-elevated)]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row: Brand Chips + Category Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[var(--border-subtle)]">
        {/* Brand Multi-Select Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-[var(--text-tertiary)] uppercase font-semibold tracking-wider mr-1">
            Brand:
          </span>
          {BRANDS.map((brand) => {
            const active = selectedBrands.includes(brand)
            return (
              <button
                key={brand}
                type="button"
                onClick={() => onToggleBrand(brand)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[var(--accent)] text-[var(--text-inverted)] shadow-sm'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-default)]'
                }`}
                aria-pressed={active}
                aria-label={`Filter by ${brand}`}
              >
                {brand}
              </button>
            )
          })}

          {selectedBrands.length > 0 && (
            <button
              type="button"
              onClick={onClearBrands}
              className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline ml-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex rounded-md bg-[var(--bg-elevated)] p-0.5 border border-[var(--border-subtle)]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={`px-2.5 py-0.5 text-xs font-medium rounded transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              aria-label={`Filter category ${cat.label}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Status readout */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
        <span>
          Showing <strong className="text-[var(--text-secondary)]">{filteredCount}</strong> of{' '}
          {totalCount} devices
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={onResetAll}
            className="flex items-center gap-1 text-[var(--accent)] hover:underline"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>
    </div>
  )
}

