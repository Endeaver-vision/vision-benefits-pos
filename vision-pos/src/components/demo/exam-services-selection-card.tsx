'use client';

import React, { useState } from 'react';
import { SelectionCard } from '@/components/ui/selection-card';
import { Eye, Activity, Brain, AlertCircle } from 'lucide-react';

// Quick demo showing how to integrate SelectionCard into exam services
export function ExamServicesWithSelectionCard() {
  const [selectedExam, setSelectedExam] = useState<string>('');

  const examOptions = [
    {
      id: 'routine',
      title: 'Routine Eye Exam',
      description: 'Complete vision and eye health examination',
      price: 150,
      priceLabel: 'with insurance: $25',
      icon: Eye,
      badge: { text: 'Most Common', variant: 'secondary' as const },
      benefits: [
        'Vision prescription update',
        'Eye health screening',
        'Glaucoma check',
        'Prescription review'
      ],
      tags: ['Annual checkup', 'Routine care', 'Insurance covered']
    },
    {
      id: 'medical',
      title: 'Medical Eye Exam',
      description: 'Comprehensive medical evaluation for eye conditions',
      price: 200,
      priceLabel: 'with insurance: $35',
      icon: Activity,
      benefits: [
        'Medical condition diagnosis',
        'Treatment planning',
        'Detailed imaging',
        'Specialist referral if needed'
      ],
      tags: ['Eye problems', 'Medical issues', 'Specialist care']
    },
    {
      id: 'specialty',
      title: 'Specialty Consultation',
      description: 'Specialized examination for complex eye conditions',
      price: 350,
      icon: Brain,
      badge: { text: 'Specialist', variant: 'default' as const },
      benefits: [
        'Expert consultation',
        'Advanced diagnostics',
        'Custom treatment plan',
        'Follow-up included'
      ],
      tags: ['Complex conditions', 'Expert care', 'Advanced treatment']
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      
      <div className="space-y-2">
        <h2 className="heading-card">Choose Your Exam Type</h2>
        <p className="text-neutral-600">
          Select the examination that best fits your needs and current eye health status.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-cards">
        {examOptions.map((exam) => (
          <SelectionCard
            key={exam.id}
            title={exam.title}
            description={exam.description}
            price={exam.price}
            priceLabel={exam.priceLabel}
            icon={exam.icon}
            badge={exam.badge}
            benefits={exam.benefits}
            tags={exam.tags}
            isSelected={selectedExam === exam.id}
            onSelect={() => setSelectedExam(exam.id)}
            variant="detailed"
          />
        ))}
      </div>
      
      {selectedExam && (
        <div className="p-4 bg-success-green/10 border border-success-green/20 rounded-brand-md">
          <div className="flex items-center space-x-2 text-success-green">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">
              Exam selected: {examOptions.find(e => e.id === selectedExam)?.title}
            </span>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default ExamServicesWithSelectionCard;