'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LayerNavigation } from '@/components/quote-builder/layer-navigation'
import { PricingSidebar } from '@/components/quote-builder/pricing-sidebar'
import { QuoteHeader } from '@/components/quote-builder/quote-header'
import ExamServicesLayer from '@/components/quote-builder/layers/exam-services-layer'
import EyeglassesLayer from '@/components/quote-builder/layers/eyeglasses-layer'
import { useQuoteStore, useQuoteSelectors } from '../../../store/quote-store'
import { LayerDefinition, LayerId } from '../../../types/quote-builder'
import { 
  User, 
  Glasses, 
  Contact
} from 'lucide-react'

// Layer definitions
const LAYERS: LayerDefinition[] = [
  {
    id: 'exam',
    name: 'Exam Services',
    icon: User,
    description: 'Eye exam and diagnostics'
  },
  {
    id: 'eyeglasses',
    name: 'Frame & Lenses',
    icon: Glasses,
    description: 'Frames, lenses, and enhancements'
  },
  {
    id: 'contacts',
    name: 'Contact Lenses',
    icon: Contact,
    description: 'Contact lens products and fittings'
  }
]

export default function NewQuotePage() {
  // Use Zustand store instead of local state
  const {
    currentLayer,
    completedLayers,
    setCurrentLayer
  } = useQuoteStore()
  
  const { canNavigateToLayer } = useQuoteSelectors()

  const handleLayerClick = (layerId: LayerId) => {
    if (canNavigateToLayer(layerId)) {
      setCurrentLayer(layerId)
    }
  }

  const renderLayerContent = () => {
    switch (currentLayer) {
      case 'exam':
        return <ExamServicesLayer 
          onNext={() => setCurrentLayer('eyeglasses')}
        />
      
      case 'eyeglasses':
        return <EyeglassesLayer 
          onNext={() => setCurrentLayer('contacts')}
          onBack={() => setCurrentLayer('exam')}
        />
      
      case 'contacts':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Contact Lenses</h2>
              <p className="text-muted-foreground">
                Select contact lens brands and configure parameters.
              </p>
            </div>
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-12 text-muted-foreground">
                  <Contact className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Contact lens selection interface will be implemented here</p>
                  <p className="text-sm mt-2">Coming in Week 4 implementation</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Quote Header */}
      <QuoteHeader />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6 min-h-[calc(100vh-200px)]">
          
          {/* Left Navigation Panel */}
          <div className="col-span-3">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Quote Builder</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <LayerNavigation
                  layers={LAYERS}
                  currentLayer={currentLayer}
                  completedLayers={completedLayers}
                  onLayerClick={handleLayerClick}
                  canNavigateToLayer={canNavigateToLayer}
                />
              </CardContent>
            </Card>
          </div>

          {/* Center Content Panel */}
          <div className="col-span-6">
            <div className="space-y-6">
              {renderLayerContent()}
            </div>
          </div>

          {/* Right Pricing Sidebar */}
          <div className="col-span-3">
            <PricingSidebar />
          </div>

        </div>
      </div>
    </div>
  )
}