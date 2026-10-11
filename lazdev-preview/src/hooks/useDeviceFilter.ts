// src/hooks/useDeviceFilter.ts
// Reusable hook for device filtering and sorting across sidebar and device library modal.

import { useState, useMemo } from 'react'
import type { DevicePreset, DeviceBrand, DeviceCategory } from '@shared/device-types'

export type SortOption = 'year-desc' | 'name-asc' | 'screen-asc' | 'screen-desc'

export interface DeviceFilterState {
  searchQuery: string
  selectedBrands: DeviceBrand[]
  selectedCategory: 'all' | DeviceCategory
  sortBy: SortOption
}

export function useDeviceFilter(devices: DevicePreset[]) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrands, setSelectedBrands] = useState<DeviceBrand[]>([])
  const [selectedCategory, setSelectedCategory] = useState<'all' | DeviceCategory>('all')
  const [sortBy, setSortBy] = useState<SortOption>('year-desc')

  const toggleBrand = (brand: DeviceBrand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedBrands([])
    setSelectedCategory('all')
    setSortBy('year-desc')
  }

  const filteredDevices = useMemo(() => {
    let result = devices.filter((d) => {
      // Search matching name, brand, tags, or release year
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = d.name.toLowerCase().includes(q)
        const matchesBrand = d.brand.toLowerCase().includes(q)
        const matchesTags = d.tags.some((t) => t.toLowerCase().includes(q))
        const matchesYear = d.releaseYear.toString().includes(q)
        if (!matchesName && !matchesBrand && !matchesTags && !matchesYear) {
          return false
        }
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

    // Sort order
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'year-desc':
          return b.releaseYear - a.releaseYear || a.name.localeCompare(b.name)
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'screen-asc':
          return a.screenWidth * a.screenHeight - b.screenWidth * b.screenHeight
        case 'screen-desc':
          return b.screenWidth * b.screenHeight - a.screenWidth * a.screenHeight
        default:
          return 0
      }
    })

    return result
  }, [devices, searchQuery, selectedBrands, selectedCategory, sortBy])

  return {
    searchQuery,
    setSearchQuery,
    selectedBrands,
    setSelectedBrands,
    toggleBrand,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    clearFilters,
    filteredDevices,
    totalCount: devices.length,
    filteredCount: filteredDevices.length,
  }
}

