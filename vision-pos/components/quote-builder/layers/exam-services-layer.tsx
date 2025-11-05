'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, Eye, Activity, Brain, AlertCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ExamService {
  id: string
  name: string
  description: string
  price: number
  duration: number
  required?: boolean
  category: 'comprehensive' | 'diagnostic' | 'specialty'
  insuranceCovered?: boolean
  copay?: number
}

interface ExamServicesLayerProps {
  onNext: () => void
  onBack?: () => void
}

const examServices: ExamService[] = [
  // Comprehensive Eye Exams
  {
    id: 'routine-exam',
    name: 'Routine Eye Exam',
    description: 'Complete vision and eye health examination',
    price: 150,
    duration: 60,
    category: 'comprehensive',
    insuranceCovered: true,
    copay: 25
  },
  {
    id: 'medical-exam',
    name: 'Medical Eye Exam',
    description: 'Comprehensive medical evaluation for eye conditions',
    price: 200,
    duration: 90,
    category: 'comprehensive',
    insuranceCovered: true,
    copay: 35
  },
  {
    id: 'contact-fitting',
    name: 'Contact Lens Fitting',
    description: 'Specialized fitting for contact lens wearers',
    price: 75,
    duration: 30,
    category: 'comprehensive',
    insuranceCovered: false
  },
  
  // Diagnostic Services
  {
    id: 'optomap',
    name: 'Optomap Retinal Imaging',
    description: 'Wide-field retinal photography for early disease detection',
    price: 45,
    duration: 15,
    category: 'diagnostic',
    insuranceCovered: false
  },
  {
    id: 'oct-scan',
    name: 'iWellness OCT Scan',
    description: 'Optical coherence tomography for detailed retinal analysis',
    price: 65,
    duration: 20,
    category: 'diagnostic',
    insuranceCovered: true,
    copay: 15
  },
  {
    id: 'visual-field',
    name: 'Visual Field Testing',
    description: 'Comprehensive peripheral vision assessment',
    price: 85,
    duration: 30,
    category: 'diagnostic',
    insuranceCovered: true,
    copay: 20
  },
  
  // Specialty Exams
  {
    id: 'glaucoma-testing',
    name: 'Glaucoma Testing',
    description: 'Comprehensive glaucoma screening and monitoring',
    price: 120,
    duration: 45,
    category: 'specialty',
    insuranceCovered: true,
    copay: 30
  },
  {
    id: 'dry-eye-evaluation',
    name: 'Dry Eye Evaluation',
    description: 'Specialized testing for dry eye syndrome',
    price: 95,
    duration: 35,
    category: 'specialty',
    insuranceCovered: false
  },
  {
    id: 'diabetic-eye-care',
    name: 'Diabetic Eye Care',
    description: 'Specialized diabetic retinopathy screening',
    price: 110,
    duration: 40,
    category: 'specialty',
    insuranceCovered: true,
    copay: 25
  }
]

const appointmentSlots = [
  { time: '9:00 AM', available: true },
  { time: '10:30 AM', available: true },
  { time: '12:00 PM', available: false },
  { time: '1:30 PM', available: true },
  { time: '3:00 PM', available: true },
  { time: '4:30 PM', available: false }
]

const providers = [
  { id: 'dr-smith', name: 'Dr. Sarah Smith, OD', specialty: 'General Optometry' },
  { id: 'dr-johnson', name: 'Dr. Michael Johnson, OD', specialty: 'Contact Lenses' },
  { id: 'dr-brown', name: 'Dr. Emily Brown, MD', specialty: 'Medical Eye Care' }
]

export default function ExamServicesLayer({ onNext, onBack }: ExamServicesLayerProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>(['routine-exam'])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [showScheduling, setShowScheduling] = useState(false)

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => {
      // Ensure at least one comprehensive exam is selected
      if (serviceId === 'routine-exam' || serviceId === 'medical-exam') {
        // If deselecting a comprehensive exam, ensure another one is selected
        if (prev.includes(serviceId)) {
          const otherComprehensiveSelected = prev.some(id => 
            (id === 'routine-exam' || id === 'medical-exam') && id !== serviceId
          )
          if (!otherComprehensiveSelected) {
            return prev // Don't allow deselection if it's the only comprehensive exam
          }
        }
      }
      
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId)
      } else {
        return [...prev, serviceId]
      }
    })
  }

  const getSelectedServicesData = () => {
    return examServices.filter(service => selectedServices.includes(service.id))
  }

  const calculateTotal = () => {
    const services = getSelectedServicesData()
    const subtotal = services.reduce((sum, service) => sum + service.price, 0)
    const insuranceDiscount = services.reduce((sum, service) => {
      return sum + (service.insuranceCovered ? (service.price - (service.copay || 0)) : 0)
    }, 0)
    const patientResponsibility = subtotal - insuranceDiscount
    
    return { subtotal, insuranceDiscount, patientResponsibility }
  }

  const getTotalDuration = () => {
    return getSelectedServicesData().reduce((sum, service) => sum + service.duration, 0)
  }

  const canProceed = () => {
    const hasComprehensiveExam = selectedServices.some(id => 
      examServices.find(service => service.id === id)?.category === 'comprehensive'
    )
    return hasComprehensiveExam && (!showScheduling || (selectedDate && selectedTime && selectedProvider))
  }

  const handleNext = () => {
    if (canProceed()) {
      // Here you would typically save the exam services selection to your state management
      console.log('Selected exam services:', {
        services: getSelectedServicesData(),
        appointment: showScheduling ? {
          date: selectedDate,
          time: selectedTime,
          provider: selectedProvider,
          duration: getTotalDuration()
        } : null,
        totals: calculateTotal()
      })
      onNext()
    }
  }

  const { subtotal, insuranceDiscount, patientResponsibility } = calculateTotal()

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Exam Services</h2>
        <p className="text-gray-600 mt-2">Select the eye exam services you need</p>
      </div>

      {/* Service Categories */}
      <div className="grid gap-6">
        {/* Comprehensive Eye Exams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Comprehensive Eye Exams
              <Badge variant="secondary">Required</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {examServices.filter(service => service.category === 'comprehensive').map(service => (
              <div key={service.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                <Checkbox
                  id={service.id}
                  checked={selectedServices.includes(service.id)}
                  onCheckedChange={() => handleServiceToggle(service.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor={service.id} className="font-medium cursor-pointer">
                      {service.name}
                    </label>
                    <div className="flex items-center gap-2">
                      <Badge variant={service.insuranceCovered ? "default" : "secondary"}>
                        {service.insuranceCovered ? `$${service.copay} copay` : `$${service.price}`}
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {service.duration}min
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Diagnostic Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Diagnostic Services
              <Badge variant="outline">Optional</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {examServices.filter(service => service.category === 'diagnostic').map(service => (
              <div key={service.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                <Checkbox
                  id={service.id}
                  checked={selectedServices.includes(service.id)}
                  onCheckedChange={() => handleServiceToggle(service.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor={service.id} className="font-medium cursor-pointer">
                      {service.name}
                    </label>
                    <div className="flex items-center gap-2">
                      <Badge variant={service.insuranceCovered ? "default" : "secondary"}>
                        {service.insuranceCovered ? `$${service.copay} copay` : `$${service.price}`}
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {service.duration}min
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Specialty Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Specialty Services
              <Badge variant="outline">As Needed</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {examServices.filter(service => service.category === 'specialty').map(service => (
              <div key={service.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                <Checkbox
                  id={service.id}
                  checked={selectedServices.includes(service.id)}
                  onCheckedChange={() => handleServiceToggle(service.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor={service.id} className="font-medium cursor-pointer">
                      {service.name}
                    </label>
                    <div className="flex items-center gap-2">
                      <Badge variant={service.insuranceCovered ? "default" : "secondary"}>
                        {service.insuranceCovered ? `$${service.copay} copay` : `$${service.price}`}
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {service.duration}min
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Appointment Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Schedule Your Appointment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="schedule-now"
              checked={showScheduling}
              onCheckedChange={(checked) => setShowScheduling(checked === true)}
            />
            <label htmlFor="schedule-now" className="font-medium cursor-pointer">
              Schedule appointment now
            </label>
          </div>

          {showScheduling && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Date</label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-03-15">Today - March 15</SelectItem>
                    <SelectItem value="2024-03-16">Tomorrow - March 16</SelectItem>
                    <SelectItem value="2024-03-18">Monday - March 18</SelectItem>
                    <SelectItem value="2024-03-19">Tuesday - March 19</SelectItem>
                    <SelectItem value="2024-03-20">Wednesday - March 20</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select Time</label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose time" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentSlots.map(slot => (
                      <SelectItem 
                        key={slot.time} 
                        value={slot.time}
                        disabled={!slot.available}
                      >
                        {slot.time} {!slot.available && '(Unavailable)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select Provider</label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map(provider => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div>
                          <div className="font-medium">{provider.name}</div>
                          <div className="text-sm text-gray-500">{provider.specialty}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Services Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Selected Services ({getSelectedServicesData().length})</span>
              <span className="font-medium">{getTotalDuration()} minutes total</span>
            </div>
            
            <Separator />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal}</span>
              </div>
              {insuranceDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Insurance Coverage:</span>
                  <span>-${insuranceDiscount}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Your Responsibility:</span>
                <span>${patientResponsibility}</span>
              </div>
            </div>

            {!selectedServices.some(id => 
              examServices.find(service => service.id === id)?.category === 'comprehensive'
            ) && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">At least one comprehensive eye exam is required</span>
              </div>
            )}
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
        <Button 
          onClick={handleNext}
          disabled={!canProceed()}
          className="ml-auto"
        >
          Continue to Products
        </Button>
      </div>
    </div>
  )
}