'use client';

import React, { useState } from 'react';
import { SelectionCard } from '@/components/ui/selection-card';
import { 
  Eye, 
  Glasses, 
  Shield, 
  Zap,
  Star,
  Monitor,
  Sun
} from 'lucide-react';

// Demo component to showcase the new SelectionCard with Master Plan styling
export function SelectionCardDemo() {
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedLens, setSelectedLens] = useState<string>('');
  const [selectedFrame, setSelectedFrame] = useState<string>('');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      
      {/* Demo Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-brand-purple">
          SelectionCard Component Demo
        </h1>
        <p className="text-neutral-600">
          Master Plan Design System Implementation - Phase 1.2
        </p>
      </div>
      
      {/* Exam Services Demo */}
      <section className="space-y-4">
        <h2 className="heading-section">EXAM SERVICES</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-cards">
          
          <SelectionCard
            title="Comprehensive Exam"
            description="Complete eye health evaluation with vision testing"
            price={120}
            priceLabel="includes dilation"
            icon={Eye}
            badge={{ text: "Most Popular", variant: "secondary" }}
            benefits={[
              "Complete eye health check",
              "Vision prescription update",
              "Glaucoma screening",
              "Retinal examination"
            ]}
            tags={["Annual checkup", "New patients", "Insurance covered"]}
            isSelected={selectedExam === 'comprehensive'}
            onSelect={() => setSelectedExam('comprehensive')}
            variant="detailed"
          />
          
          <SelectionCard
            title="Contact Lens Exam"
            description="Specialized fitting and evaluation for contact lens wear"
            price={80}
            originalPrice={100}
            icon={Eye}
            benefits={[
              "Contact lens fitting",
              "Trial lens provided",
              "Follow-up included"
            ]}
            tags={["Contact wearers", "First-time users"]}
            isSelected={selectedExam === 'contact'}
            onSelect={() => setSelectedExam('contact')}
            variant="detailed"
          />
          
          <SelectionCard
            title="Basic Screening"
            description="Quick vision check and basic eye health assessment"
            price={60}
            icon={Eye}
            tags={["Quick check", "Reading glasses"]}
            isSelected={selectedExam === 'basic'}
            onSelect={() => setSelectedExam('basic')}
            variant="default"
          />
          
        </div>
      </section>
      
      {/* Lens Type Demo */}
      <section className="space-y-4">
        <h2 className="heading-section">LENS TYPES</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-cards">
          
          <SelectionCard
            title="Progressive Lenses"
            description="Seamless vision correction for all distances without visible lines"
            price={275}
            priceLabel="starting at"
            icon={Glasses}
            badge={{ text: "Premium", variant: "default" }}
            benefits={[
              "No visible lines",
              "Natural vision transition",
              "Multiple prescriptions in one lens",
              "Modern appearance"
            ]}
            features={["Anti-reflective coating", "UV protection", "Scratch resistant"]}
            tags={["Presbyopia", "Professional", "Active lifestyle"]}
            isSelected={selectedLens === 'progressive'}
            onSelect={() => setSelectedLens('progressive')}
            variant="detailed"
          />
          
          <SelectionCard
            title="Single Vision"
            description="Clear vision correction for one distance - near or far"
            price={99}
            icon={Monitor}
            benefits={[
              "Most affordable option",
              "Wide field of vision",
              "Quick adaptation",
              "Minimal distortion"
            ]}
            tags={["Reading", "Distance", "Computer work"]}
            isSelected={selectedLens === 'single'}
            onSelect={() => setSelectedLens('single')}
            variant="detailed"
          />
          
        </div>
      </section>
      
      {/* Frame Style Demo - Compact Variant */}
      <section className="space-y-4">
        <h2 className="heading-section">FRAME STYLES</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-cards">
          
          <SelectionCard
            title="Designer"
            price={180}
            icon={Star}
            badge={{ text: "Premium" }}
            isSelected={selectedFrame === 'designer'}
            onSelect={() => setSelectedFrame('designer')}
            variant="compact"
          />
          
          <SelectionCard
            title="Value"
            price={89}
            icon={Glasses}
            isSelected={selectedFrame === 'value'}
            onSelect={() => setSelectedFrame('value')}
            variant="compact"
          />
          
          <SelectionCard
            title="Sports"
            price={145}
            icon={Shield}
            badge={{ text: "Durable" }}
            isSelected={selectedFrame === 'sports'}
            onSelect={() => setSelectedFrame('sports')}
            variant="compact"
          />
          
          <SelectionCard
            title="Reading"
            price={69}
            icon={Monitor}
            isSelected={selectedFrame === 'reading'}
            onSelect={() => setSelectedFrame('reading')}
            variant="compact"
          />
          
        </div>
      </section>
      
      {/* Interactive States Demo */}
      <section className="space-y-4">
        <h2 className="heading-section">INTERACTIVE STATES</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-cards">
          
          <SelectionCard
            title="Default State"
            description="Hover me to see the purple accent"
            price={99}
            icon={Zap}
            onSelect={() => {}}
          />
          
          <SelectionCard
            title="Selected State"
            description="Purple background with white text"
            price={120}
            icon={Star}
            isSelected={true}
            onSelect={() => {}}
          />
          
          <SelectionCard
            title="Disabled State"
            description="Grayed out and non-interactive"
            price={150}
            icon={Shield}
            isDisabled={true}
            onSelect={() => {}}
          />
          
          <SelectionCard
            title="Loading State"
            description="Shows loading indicator"
            price={99}
            icon={Sun}
            isLoading={true}
            onSelect={() => {}}
          />
          
        </div>
      </section>
      
      {/* Color Palette Demo */}
      <section className="space-y-4">
        <h2 className="heading-section">MASTER PLAN COLOR PALETTE</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          
          <div className="p-4 rounded-brand-md bg-brand-purple text-white text-center">
            <div className="font-semibold">Primary Purple</div>
            <div className="text-sm opacity-90">#5B4ECC</div>
          </div>
          
          <div className="p-4 rounded-brand-md bg-brand-teal text-white text-center">
            <div className="font-semibold">Accent Teal</div>
            <div className="text-sm opacity-90">#06B6D4</div>
          </div>
          
          <div className="p-4 rounded-brand-md bg-success text-white text-center">
            <div className="font-semibold">Success Green</div>
            <div className="text-sm opacity-90">#10B981</div>
          </div>
          
          <div className="p-4 rounded-brand-md bg-warning text-white text-center">
            <div className="font-semibold">Warning Amber</div>
            <div className="text-sm opacity-90">#F59E0B</div>
          </div>
          
          <div className="p-4 rounded-brand-md bg-danger text-white text-center">
            <div className="font-semibold">Danger Red</div>
            <div className="text-sm opacity-90">#EF4444</div>
          </div>
          
        </div>
      </section>
      
    </div>
  );
}

export default SelectionCardDemo;