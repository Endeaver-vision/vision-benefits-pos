'use client'

import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import { LayerDefinition, LayerId, LayerStatus } from '../../types/quote-builder'

interface LayerNavigationProps {
  layers: LayerDefinition[]
  currentLayer: LayerId
  completedLayers: Set<LayerId>
  onLayerClick: (layerId: LayerId) => void
  canNavigateToLayer: (layerId: LayerId) => boolean
}

export function LayerNavigation({
  layers,
  currentLayer,
  completedLayers,
  onLayerClick,
  canNavigateToLayer
}: LayerNavigationProps) {
  
  const getLayerStatus = (layerId: LayerId): LayerStatus => {
    if (completedLayers.has(layerId)) return 'completed'
    if (layerId === currentLayer) return 'active'
    if (canNavigateToLayer(layerId)) return 'available'
    return 'locked'
  }

  return (
    <nav className="space-y-1">
      {layers.map((layer, index) => {
        const status = getLayerStatus(layer.id)
        const Icon = layer.icon
        
        return (
          <button
            key={layer.id}
            onClick={() => onLayerClick(layer.id)}
            disabled={status === 'locked'}
            className={`
              w-full flex items-center p-4 text-left transition-colors border-l-4 rounded-r-md
              ${status === 'active' 
                ? 'bg-primary/10 border-primary text-primary font-medium' 
                : status === 'completed'
                ? 'bg-green-50 border-green-500 text-green-700 hover:bg-green-100'
                : status === 'available'
                ? 'border-transparent hover:bg-muted text-foreground'
                : 'border-transparent text-muted-foreground cursor-not-allowed opacity-50'
              }
            `}
          >
            <Icon className={`h-5 w-5 mr-3 ${
              status === 'completed' ? 'text-green-600' : ''
            }`} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{index + 1}. {layer.name}</span>
                {status === 'completed' && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                    ✓
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {layer.description}
              </p>
            </div>
            {status === 'available' && layer.id !== currentLayer && (
              <ChevronRight className="h-4 w-4 ml-2 text-muted-foreground" />
            )}
          </button>
        )
      })}
    </nav>
  )
}