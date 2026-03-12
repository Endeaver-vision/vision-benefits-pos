'use client'

import { usePOSStore, MenuId } from '@/stores/pos-store'
import { cn } from '@/lib/utils'
import {
  Stethoscope,
  Eye,
  Layers,
  Sliders,
  Glasses,
  Disc,
  Plus,
  LayoutDashboard,
  X,
} from 'lucide-react'
import Link from 'next/link'

interface NavItem {
  id: MenuId
  label: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { id: 'exam', label: 'Exam', icon: Stethoscope },
  { id: 'lenses', label: 'Lenses', icon: Eye },
  { id: 'materials', label: 'Materials', icon: Layers },
  { id: 'addons', label: 'Add-Ons', icon: Sliders },
  { id: 'frames', label: 'Frames', icon: Glasses },
  { id: 'contacts', label: 'Contacts', icon: Disc },
]

/**
 * Left navigation sidebar with category buttons
 * Dark glass theme - blue accent, glass-morphism
 */
export default function NavigationColumn() {
  const { activeMenu, setActiveMenu, quote, addPair, setActivePair, removePair } = usePOSStore()

  // Determine which menus should show badges (have items)
  const getMenuItemCount = (menuId: MenuId): number => {
    if (!quote.lineItems) return 0
    const pairItems = quote.lineItems.filter(
      (item) => item.pairId === quote.activePairId
    )

    switch (menuId) {
      case 'exam':
        return pairItems.filter((item) => item.category === 'exam').length
      case 'lenses':
        return pairItems.filter((item) => item.category === 'lens_type').length
      case 'materials':
        return pairItems.filter(
          (item) =>
            item.category === 'lens_material' ||
            item.category === 'ar_coating' ||
            item.category === 'photochromic'
        ).length
      case 'addons':
        return pairItems.filter(
          (item) =>
            item.category === 'add_on' ||
            item.category === 'mount_fee'
        ).length
      case 'frames':
        return pairItems.filter((item) => item.category === 'frame').length
      case 'contacts':
        return pairItems.filter((item) => item.category === 'contact_lens').length
      default:
        return 0
    }
  }

  return (
    <div className="flex flex-col h-full glass-card border-r border-white/10">
      {/* Dashboard link */}
      <div className="p-4 border-b border-white/10">
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
      </div>

      {/* Category buttons - 2:1 width:height ratio with breathing room */}
      <div className="flex flex-col p-4 gap-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeMenu === item.id
          const itemCount = getMenuItemCount(item.id)
          const Icon = item.icon

          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={cn(
                'relative flex flex-col items-center justify-center',
                'w-full aspect-[2/1] rounded-lg',
                'transition-all duration-150',
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white/5 text-white/80 hover:bg-white/10'
              )}
              title={item.label}
            >
              <Icon className={cn(
                'h-6 w-6 mb-1',
                isActive ? 'text-white' : 'text-white/60'
              )} />
              <span className="text-xs font-semibold text-center">{item.label}</span>

              {itemCount > 0 && (
                <span
                  className={cn(
                    'absolute top-2 right-2',
                    'min-w-[18px] h-[18px] rounded-full',
                    'flex items-center justify-center',
                    'text-[10px] font-bold',
                    isActive
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-600 text-white'
                  )}
                >
                  {itemCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Pair selector and Add Pair */}
      <div className="p-4 border-t border-white/10 space-y-2">
        {(quote.pairs?.length ?? 0) > 0 && (
          <div className="flex flex-col gap-2">
            {(quote.pairs ?? []).map((pair) => {
              const isActive = pair.id === quote.activePairId
              const canDelete = (quote.pairs?.length ?? 0) > 1

              return (
                <div key={pair.id} className="relative group">
                  <button
                    onClick={() => setActivePair(pair.id)}
                    className={cn(
                      'w-full py-2.5 px-3 rounded-lg text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    )}
                  >
                    {pair.label || `Pair ${(quote.pairs ?? []).indexOf(pair) + 1}`}
                  </button>

                  {/* Delete button - shows on hover when deletable */}
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removePair(pair.id)
                      }}
                      className={cn(
                        'absolute -top-1 -right-1 w-5 h-5 rounded-full',
                        'flex items-center justify-center',
                        'bg-red-500 text-white opacity-0 group-hover:opacity-100',
                        'hover:bg-red-600 transition-all shadow-sm'
                      )}
                      title={`Delete ${pair.label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add Pair button - limit to 3 pairs */}
        {(quote.pairs?.length ?? 0) < 3 && (
          <button
            onClick={() => addPair()}
            className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Pair
          </button>
        )}
      </div>
    </div>
  )
}
