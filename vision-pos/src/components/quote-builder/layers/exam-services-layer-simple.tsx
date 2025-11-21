'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { useQuoteStore } from '@/store/quote-store'

interface ExamServicesLayerProps {
  onNext?: () => void
  onBack?: () => void
}

export default function ExamServicesLayer({ onNext, onBack }: ExamServicesLayerProps) {
  const { quote, updateExam, resetQuote } = useQuoteStore()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  
  // Initialize from store - use useMemo to avoid recreating the initial state
  const initialServices = quote.exam.selectedServices || []
  
  // State for selections - initialize from store once
  const [mainExam, setMainExam] = useState<'routine' | 'medical' | null>(() => {
    if (initialServices.includes('comprehensive-exam')) return 'routine'
    if (initialServices.includes('medical-exam')) return 'medical'
    return null
  })
  const [contactLensExam, setContactLensExam] = useState(() => initialServices.includes('contact-lens-fitting'))
  const [screenings, setScreenings] = useState<string[]>(() => {
    const screeningIds = ['visual-field-testing', 'color-vision', 'glaucoma-screening']
    return initialServices.filter(s => screeningIds.includes(s))
  })
  const [diagnostics, setDiagnostics] = useState<string[]>(() => {
    const diagnosticIds = ['oct-scan', 'retinal-imaging', 'corneal-topography']
    return initialServices.filter(s => diagnosticIds.includes(s))
  })
  const [specialty, setSpecialty] = useState<string[]>(() => {
    const specialtyIds = ['dry-eye-eval', 'ipl-treatment', 'ortho-k-consult']
    return initialServices.filter(s => specialtyIds.includes(s))
  })

  // Update store whenever selections change
  const handleMainExamChange = (exam: 'routine' | 'medical') => {
    setMainExam(exam)
    const allServices = [
      ...(exam === 'routine' ? ['comprehensive-exam'] : []),
      ...(exam === 'medical' ? ['medical-exam'] : []),
      ...(contactLensExam ? ['contact-lens-fitting'] : []),
      ...screenings,
      ...diagnostics,
      ...specialty
    ]
    updateExam({ selectedServices: allServices })
  }

  const handleContactLensChange = (checked: boolean) => {
    setContactLensExam(checked)
    const allServices = [
      ...(mainExam === 'routine' ? ['comprehensive-exam'] : []),
      ...(mainExam === 'medical' ? ['medical-exam'] : []),
      ...(checked ? ['contact-lens-fitting'] : []),
      ...screenings,
      ...diagnostics,
      ...specialty
    ]
    updateExam({ selectedServices: allServices })
  }

  const handleScreeningToggle = (id: string) => {
    const newScreenings = screenings.includes(id) 
      ? screenings.filter(s => s !== id) 
      : [...screenings, id]
    setScreenings(newScreenings)
    const allServices = [
      ...(mainExam === 'routine' ? ['comprehensive-exam'] : []),
      ...(mainExam === 'medical' ? ['medical-exam'] : []),
      ...(contactLensExam ? ['contact-lens-fitting'] : []),
      ...newScreenings,
      ...diagnostics,
      ...specialty
    ]
    updateExam({ selectedServices: allServices })
  }

  const handleDiagnosticToggle = (id: string) => {
    const newDiagnostics = diagnostics.includes(id)
      ? diagnostics.filter(d => d !== id)
      : [...diagnostics, id]
    setDiagnostics(newDiagnostics)
    const allServices = [
      ...(mainExam === 'routine' ? ['comprehensive-exam'] : []),
      ...(mainExam === 'medical' ? ['medical-exam'] : []),
      ...(contactLensExam ? ['contact-lens-fitting'] : []),
      ...screenings,
      ...newDiagnostics,
      ...specialty
    ]
    updateExam({ selectedServices: allServices })
  }

  const handleSpecialtyToggle = (id: string) => {
    const newSpecialty = specialty.includes(id)
      ? specialty.filter(s => s !== id)
      : [...specialty, id]
    setSpecialty(newSpecialty)
    const allServices = [
      ...(mainExam === 'routine' ? ['comprehensive-exam'] : []),
      ...(mainExam === 'medical' ? ['medical-exam'] : []),
      ...(contactLensExam ? ['contact-lens-fitting'] : []),
      ...screenings,
      ...diagnostics,
      ...newSpecialty
    ]
    updateExam({ selectedServices: allServices })
  }

  // Real pricing based on the store's service pricing
  const mainExams = [
    { id: 'routine', name: 'Routine Eye Exam', price: 275.00, serviceId: 'comprehensive-exam' },
    { id: 'medical', name: 'Medical Eye Exam', price: 275.00, serviceId: 'medical-exam' }
  ]

  const contactExam = { id: 'contact-lens', name: 'Contact Lens Exam', price: 125.00, serviceId: 'contact-lens-fitting' }

  const screeningOptions = [
    { id: 'visual-field-testing', name: 'Visual Field Screening', price: 95.00 },
    { id: 'color-vision', name: 'Color Vision Test', price: 35.00 },
    { id: 'glaucoma-screening', name: 'Glaucoma Screening', price: 95.00 }
  ]

  const diagnosticOptions = [
    { id: 'oct-scan', name: 'OCT Scan', price: 145.00 },
    { id: 'retinal-imaging', name: 'Fundus Photography', price: 85.00 },
    { id: 'corneal-topography', name: 'Corneal Topography', price: 95.00 }
  ]

  const specialtyOptions = [
    { id: 'dry-eye-eval', name: 'Dry Eye Evaluation', price: 95.00 },
    { id: 'ipl-treatment', name: 'IPL Treatment', price: 200.00 },
    { id: 'ortho-k-consult', name: 'Ortho-K Consultation', price: 150.00 }
  ]



  const calculateTotal = () => {
    let total = 0
    
    // Main exam
    const mainExamOption = mainExams.find(e => e.id === mainExam)
    if (mainExamOption) total += mainExamOption.price
    
    // Contact lens exam
    if (contactLensExam) total += contactExam.price
    
    // Screenings
    screenings.forEach(id => {
      const screening = screeningOptions.find(s => s.id === id)
      if (screening) total += screening.price
    })
    
    // Diagnostics
    diagnostics.forEach(id => {
      const diagnostic = diagnosticOptions.find(d => d.id === id)
      if (diagnostic) total += diagnostic.price
    })
    
    // Specialty
    specialty.forEach(id => {
      const spec = specialtyOptions.find(s => s.id === id)
      if (spec) total += spec.price
    })
    
    return total
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  return (
    <div className="space-y-6">
      {/* Reset Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowResetConfirm(true)}
          variant="outline"
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          Reset Quote
        </Button>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <p className="font-semibold">Are you sure you want to reset this quote?</p>
              <p className="text-sm text-gray-600">All selections will be cleared and cannot be recovered.</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowResetConfirm(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    resetQuote()
                    setShowResetConfirm(false)
                  }}
                  variant="destructive"
                  size="sm"
                >
                  Yes, Reset Quote
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Exam Type - Mutually Exclusive */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Main Exam Type (Choose One)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mainExams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => handleMainExamChange(exam.id as 'routine' | 'medical')}
                className={`relative p-6 rounded-lg border-2 transition-all text-left ${
                  mainExam === exam.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {mainExam === exam.id && (
                  <div className="absolute top-3 right-3">
                    <div className="bg-blue-500 rounded-full p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
                <div className="text-xl font-semibold mb-2">{exam.name}</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPrice(exam.price)}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Lens Exam - Optional Add-on */}
      {mainExam && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Lens Exam (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => handleContactLensChange(!contactLensExam)}
              className={`w-full p-6 rounded-lg border-2 transition-all text-left ${
                contactLensExam
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold mb-2">{contactExam.name}</div>
                  <div className="text-sm text-gray-600">Required for contact lens fitting</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatPrice(contactExam.price)}
                  </div>
                  {contactLensExam && (
                    <div className="bg-blue-500 rounded-full p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          </CardContent>
        </Card>
      )}

      {/* Screening Options */}
      {mainExam && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Screening Options (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {screeningOptions.map((screening) => (
                <button
                  key={screening.id}
                  onClick={() => handleScreeningToggle(screening.id)}
                  className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                    screenings.includes(screening.id)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {screenings.includes(screening.id) && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-green-500 rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="text-lg font-semibold mb-2">{screening.name}</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatPrice(screening.price)}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnostic Tests */}
      {mainExam && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Diagnostic Tests (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {diagnosticOptions.map((diagnostic) => (
                <button
                  key={diagnostic.id}
                  onClick={() => handleDiagnosticToggle(diagnostic.id)}
                  className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                    diagnostics.includes(diagnostic.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {diagnostics.includes(diagnostic.id) && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-purple-500 rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="text-lg font-semibold mb-2">{diagnostic.name}</div>
                  <div className="text-xl font-bold text-purple-600">
                    {formatPrice(diagnostic.price)}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Specialty Care */}
      {mainExam && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Specialty Care (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {specialtyOptions.map((spec) => (
                <button
                  key={spec.id}
                  onClick={() => handleSpecialtyToggle(spec.id)}
                  className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                    specialty.includes(spec.id)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {specialty.includes(spec.id) && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-orange-500 rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="text-lg font-semibold mb-2">{spec.name}</div>
                  <div className="text-xl font-bold text-orange-600">
                    {formatPrice(spec.price)}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total and Navigation */}
      {mainExam && (
        <Card className="bg-gray-50 border-2 border-gray-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Exam Services Total</div>
                <div className="text-3xl font-bold">{formatPrice(calculateTotal())}</div>
              </div>
              <div className="flex gap-3">
                {onBack && (
                  <Button
                    onClick={onBack}
                    variant="outline"
                    size="lg"
                  >
                    Back
                  </Button>
                )}
                {onNext && mainExam && (
                  <Button
                    onClick={onNext}
                    size="lg"
                  >
                    Continue to Eyeglasses
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
