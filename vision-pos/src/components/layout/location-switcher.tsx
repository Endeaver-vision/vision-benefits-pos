'use client'

import { useState, useEffect, useCallback } from 'react'
// import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MapPin, ChevronDown, Check } from 'lucide-react'

interface Location {
  id: string
  name: string
  address?: string | null
  city?: string | null
}

const LOCATION_STORAGE_KEY = 'vision-pos-selected-location'

export function useSelectedLocation() {
  // const { data: session } = useSession()
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [validLocations, setValidLocations] = useState<Location[]>([])

  // Fetch valid locations from API
  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch('/api/locations')
      if (response.ok) {
        const data = await response.json()
        const locations = data.locations || data
        setValidLocations(locations)
        return locations
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    }
    return []
  }, [])

  useEffect(() => {
    async function initLocation() {
      // Fetch valid locations first
      const locations = await fetchLocations()

      // Check localStorage for previously selected location
      const stored = localStorage.getItem(LOCATION_STORAGE_KEY)
      let storedLocation: Location | null = null

      if (stored) {
        try {
          storedLocation = JSON.parse(stored)
        } catch {
          storedLocation = null
        }
      }

      // Validate stored location against actual locations from API
      if (storedLocation && locations.length > 0) {
        const isValid = locations.some((loc: Location) => loc.id === storedLocation?.id)
        if (isValid) {
          // Update name in case it changed
          const freshLocation = locations.find((loc: Location) => loc.id === storedLocation?.id)
          if (freshLocation) {
            setSelectedLocation(freshLocation)
            localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(freshLocation))
          }
          return
        } else {
          // Stored location is invalid (deleted/renamed), clear it
          localStorage.removeItem(LOCATION_STORAGE_KEY)
        }
      }

      // No valid stored location, use first available location
      if (locations.length > 0) {
        // Fall back to first location
        setSelectedLocation(locations[0])
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locations[0]))
      }
    }

    initLocation()
  }, [fetchLocations])

  const updateSelectedLocation = (location: Location) => {
    setSelectedLocation(location)
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location))
    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent('location-changed', { detail: location }))
  }

  return { selectedLocation, updateSelectedLocation, validLocations }
}

function LocationSwitcherContent() {
  // const { data: session } = useSession()
  const { selectedLocation, updateSelectedLocation, validLocations } = useSelectedLocation()

  const loading = validLocations.length === 0 && !selectedLocation
  const displayName = selectedLocation?.name || 'Select Location'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 min-w-[140px]" suppressHydrationWarning>
          <MapPin className="h-4 w-4" />
          <span className="truncate max-w-[120px]">{displayName}</span>
          <ChevronDown className="h-3 w-3 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Switch Location</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <DropdownMenuItem disabled>Loading locations...</DropdownMenuItem>
        ) : validLocations.length === 0 ? (
          <DropdownMenuItem disabled>No locations available</DropdownMenuItem>
        ) : (
          validLocations.map((location) => (
            <DropdownMenuItem
              key={location.id}
              onClick={() => updateSelectedLocation(location)}
              className="flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="font-medium">{location.name}</span>
                {location.city && (
                  <span className="text-xs text-muted-foreground">{location.city}</span>
                )}
              </div>
              {selectedLocation?.id === location.id && (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function LocationSwitcher() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Render placeholder while hydrating to avoid mismatch
  if (!isMounted) {
    return <Button variant="outline" size="sm" className="flex items-center gap-2 min-w-[140px]" disabled>
      <MapPin className="h-4 w-4" />
      <span className="truncate max-w-[120px]">Loading...</span>
    </Button>
  }

  return <LocationSwitcherContent />
}
