'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Glasses, Eye } from 'lucide-react'
import { useQuotePricingContext, MaterialsBenefitType } from '@/contexts/quote-pricing-context'

/**
 * MaterialsConflictBanner
 *
 * This banner is shown when a quote contains BOTH eyeglasses materials AND contact lens materials.
 *
 * Key principle: Most vision plans require choosing between:
 * - Frame allowance (for glasses)
 * - Contact lens allowance (for contacts)
 *
 * The user CANNOT use both allowances in the same benefit period.
 *
 * IMPORTANT: Services (eye exams, contact lens fittings) are NEVER affected by this rule.
 * Services always use insurance copays regardless of which materials benefit is chosen.
 */
export function MaterialsConflictBanner() {
  const {
    authorization,
    materialsConflict,
    switchMaterialsBenefit
  } = useQuotePricingContext()

  // Don't render if no conflict
  if (!materialsConflict.hasConflict) {
    return null
  }

  const frameAllowance = authorization?.frameAllowance ?? 0
  const contactAllowance = authorization?.contactAllowance ?? 0

  const handleSwitch = (type: MaterialsBenefitType) => {
    if (type) {
      switchMaterialsBenefit(type)
    }
  }

  return (
    <Card className="border-amber-500/50 bg-amber-500/10">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-200 mb-1">
              Materials Benefit Conflict
            </h3>
            <p className="text-sm text-white/80 mb-3">
              This quote contains both eyeglasses and contact lens materials.
              {authorization?.carrier && ` ${authorization.carrier} `}
              requires choosing which benefit to use for the materials allowance.
              <strong className="text-white"> Services (exams, fittings) are not affected</strong> and will always use insurance.
            </p>

            <div className="flex gap-3">
              <Button
                variant={materialsConflict.activeBenefit === 'glasses' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSwitch('glasses')}
                className={
                  materialsConflict.activeBenefit === 'glasses'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'border-white/30 text-white hover:bg-white/10'
                }
              >
                <Glasses className="h-4 w-4 mr-2" />
                Eyeglasses (${frameAllowance} allowance)
              </Button>
              <Button
                variant={materialsConflict.activeBenefit === 'contacts' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSwitch('contacts')}
                className={
                  materialsConflict.activeBenefit === 'contacts'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'border-white/30 text-white hover:bg-white/10'
                }
              >
                <Eye className="h-4 w-4 mr-2" />
                Contact Lenses (${contactAllowance} allowance)
              </Button>
            </div>

            <p className="text-xs text-white/50 mt-3">
              {materialsConflict.activeBenefit === 'glasses'
                ? 'Contact lenses will be priced at retail (no insurance allowance).'
                : 'Eyeglasses will be priced at retail (no insurance allowance).'}
              {' '}The {materialsConflict.firstAddedType === materialsConflict.activeBenefit ? 'first added' : 'switched'} benefit gets the allowance.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
