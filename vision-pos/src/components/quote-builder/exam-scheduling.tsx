'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone,
  CheckCircle,
  Info
} from 'lucide-react';
import { useQuoteStore } from '@/store/quote-store';

interface TimeSlot {
  time: string;
  available: boolean;
  duration: number;
  provider: string;
}

interface AvailableDay {
  date: string;
  dayOfWeek: string;
  slots: TimeSlot[];
}

// Mock scheduling data - would come from appointment API
const getAvailableSlots = (totalDuration: number): AvailableDay[] => {
  const today = new Date();
  const days: AvailableDay[] = [];
  
  for (let i = 1; i <= 14; i++) { // Next 2 weeks
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    // Skip Sundays
    if (date.getDay() === 0) continue;
    
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateString = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    const slots: TimeSlot[] = [];
    const isWeekend = date.getDay() === 6;
    const startHour = 9;
    const endHour = isWeekend ? 14 : 17; // Saturday hours: 9-2, Weekdays: 9-5
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (const minutes of ['00', '30']) {
        const timeSlot = new Date(date);
        timeSlot.setHours(hour, parseInt(minutes));
        
        // Mock availability - some slots randomly unavailable
        const isAvailable = Math.random() > 0.3;
        
        // Check if slot has enough time (no appointments after 4:30 on weekdays, 1:30 on Saturday)
        const endTime = new Date(timeSlot);
        endTime.setMinutes(endTime.getMinutes() + totalDuration);
        const maxEndHour = isWeekend ? 14 : 17;
        const canFit = endTime.getHours() < maxEndHour || 
                      (endTime.getHours() === maxEndHour && endTime.getMinutes() === 0);
        
        if (canFit) {
          slots.push({
            time: timeSlot.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }),
            available: isAvailable,
            duration: totalDuration,
            provider: hour < 13 ? 'Dr. Johnson' : 'Dr. Smith'
          });
        }
      }
    }
    
    days.push({
      date: dateString,
      dayOfWeek,
      slots
    });
  }
  
  return days;
};

interface ExamSchedulingProps {
  className?: string;
  examDuration: number;
}

export function ExamScheduling({ className, examDuration }: ExamSchedulingProps) {
  const { quote } = useQuoteStore();
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string; provider: string } | null>(null);
  const [showScheduling, setShowScheduling] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);

  const availableDays = getAvailableSlots(examDuration);
  
  const handleSlotSelect = (date: string, slot: TimeSlot) => {
    if (slot.available) {
      setSelectedSlot({
        date,
        time: slot.time,
        provider: slot.provider
      });
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedSlot) return;
    
    setIsBooking(true);
    
    // Mock API call to book appointment
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsBooking(false);
    setBookingComplete(true);
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      setBookingComplete(false);
      setShowScheduling(false);
      setSelectedSlot(null);
    }, 3000);
  };

  const getAvailableSlotsCount = () => {
    return availableDays.reduce((count, day) => {
      return count + day.slots.filter(slot => slot.available).length;
    }, 0);
  };

  if (bookingComplete) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Appointment Scheduled!</h3>
              <p className="text-sm text-green-700 mt-1">
                Your {examDuration}-minute appointment has been scheduled for{' '}
                <span className="font-medium">{selectedSlot?.date} at {selectedSlot?.time}</span>{' '}
                with {selectedSlot?.provider}.
              </p>
              <p className="text-xs text-green-600 mt-2">
                A confirmation email will be sent to {quote.patient.email || 'the email on file'}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!showScheduling) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-grow space-y-3">
              <div>
                <h4 className="font-medium text-blue-900">
                  Schedule Your Appointment
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  Your selected services will take approximately{' '}
                  <span className="font-medium">{examDuration} minutes</span>.{' '}
                  We have <span className="font-medium">{getAvailableSlotsCount()} available slots</span>{' '}
                  in the next 2 weeks.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={() => setShowScheduling(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View Available Times
                </Button>
                <Button variant="outline" size="sm" className="text-blue-700 border-blue-300">
                  <Phone className="h-4 w-4 mr-2" />
                  Call to Schedule
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Schedule Appointment</h3>
            <p className="text-sm text-muted-foreground">
              {examDuration}-minute appointment • {getAvailableSlotsCount()} slots available
            </p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowScheduling(false)}
        >
          Cancel
        </Button>
      </div>

      {/* Selected Slot Summary */}
      {selectedSlot && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Selected:</strong> {selectedSlot.date} at {selectedSlot.time} with {selectedSlot.provider}
          </AlertDescription>
        </Alert>
      )}

      {/* Available Days */}
      <div className="grid gap-4">
        {availableDays.slice(0, 7).map((day) => { // Show first week
          const availableSlots = day.slots.filter(slot => slot.available);
          
          if (availableSlots.length === 0) return null;
          
          return (
            <Card key={day.date}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>{day.dayOfWeek}</span>
                    <span className="text-sm text-muted-foreground">{day.date}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {availableSlots.length} available
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {day.slots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={selectedSlot?.date === day.date && selectedSlot?.time === slot.time ? "default" : "outline"}
                    size="sm"
                    disabled={!slot.available}
                    onClick={() => handleSlotSelect(day.date, slot)}
                    className={`text-xs h-auto py-2 px-2 ${
                      !slot.available ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{slot.time}</span>
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        {slot.provider.replace('Dr. ', '')}
                      </div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Booking Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Main Office - 123 Vision Street</span>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowScheduling(false)}
          >
            Skip for Now
          </Button>
          <Button 
            onClick={handleBookAppointment}
            disabled={!selectedSlot || isBooking}
            size="sm"
          >
            {isBooking ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                Booking...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Book Appointment
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Information Note */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Please note:</strong> Appointment times are held for 10 minutes. 
          Cancellations require 24-hour notice. If you need to reschedule, 
          please call our office at (555) 123-4567.
        </AlertDescription>
      </Alert>
    </div>
  );
}