'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Check, Loader2 } from 'lucide-react'
import { useQuoteStore } from '@/store/quote-store'

interface Service {
  id: string
  name: string
  retailPrice: number
  category: string
  description?: string
  patientPays: number
  insurancePays: number
}

interface ExamServicesLayerProps {
  onNext: () => void
  onBack?: () => void
}

// Organized service categories matching the price list
const SERVICE_CATEGORIES = [
  { key: 'EXAM', label: 'Exam Services', description: 'Comprehensive eye examinations' },
  { key: 'EXAM_ADDON', label: 'Exam Add-ons', description: 'Diagnostic imaging and testing' },
  { key: 'CONTACT_LENS_FIT', label: 'Contact Lens Fitting', description: 'Fitting services for contact lenses' },
]

export default function ExamServicesLayer({ onNext, onBack }: ExamServicesLayerProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set())
  const { selectedCustomer } = useQuoteStore()

  useEffect(() => {
    fetchServices()
  }, [selectedCustomer])

  const fetchServices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCustomer?.id) {
        params.set('customerId', selectedCustomer.id)
      }
      const res = await fetch(`/api/pos/services?${params}`)
      const data = await res.json()
      if (data.success) {
        setServices(data.services)
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => {
      const next = new Set(prev)
      if (next.has(serviceId)) {
        next.delete(serviceId)
      } else {
        next.add(serviceId)
      }
      return next
    })
  }

  const getServicesByCategory = (categoryKey: string) => {
    if (categoryKey === 'EXAM_ADDON') {
      // Add-ons include DIAGNOSTIC and PROCEDURE that aren't contact lens fitting
      return services.filter(s =>
        s.category === 'DIAGNOSTIC' ||
        s.category === 'PROCEDURE' ||
        (s.category === 'EXAM' && !s.name.toLowerCase().includes('exam'))
      )
    }
    return services.filter(s => s.category === categoryKey)
  }

  const getSelectedTotal = () => {
    return services
      .filter(s => selectedServices.has(s.id))
      .reduce((sum, s) => sum + s.patientPays, 0)
  }

  const handleNext = () => {
    // Store selected services in quote store
    const selected = services.filter(s => selectedServices.has(s.id))
    console.log('Selected services:', selected)
    onNext()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Exam Services</h2>
        <p className="text-muted-foreground mt-1">Select the services for this visit</p>
      </div>

      {/* Service Categories */}
      {SERVICE_CATEGORIES.map(category => {
        const categoryServices = getServicesByCategory(category.key)
        if (categoryServices.length === 0) return null

        return (
          <Card key={category.key} className="bg-card/90 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{category.label}</CardTitle>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryServices.map(service => {
                  const isSelected = selectedServices.has(service.id)
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`
                        relative p-4 rounded-lg border-2 text-left transition-all duration-200
                        ${isSelected
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-border hover:border-primary/50 hover:bg-accent/50'
                        }
                      `}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <div className="chip-button p-1 rounded-full">
                            <Check className="h-4 w-4" />
                          </div>
                        </div>
                      )}
                      <div className="pr-8">
                        <div className="font-medium">{service.name}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="chip-button text-xs">
                            ${service.patientPays.toFixed(2)}
                          </Badge>
                          {service.insurancePays > 0 && (
                            <span className="text-xs text-green-600">
                              Ins covers ${service.insurancePays.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Summary */}
      <Card className="bg-card/90 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-muted-foreground">Selected Services:</span>
              <span className="ml-2 font-medium">{selectedServices.size}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Patient Total:</span>
              <span className="ml-2 text-xl font-bold">${getSelectedTotal().toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        )}
        <Button onClick={handleNext} className="chip-button ml-auto">
          Continue to Products
        </Button>
      </div>
    </div>
  )
}
