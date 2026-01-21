'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronDown,
  ChevronUp,
  Shield,
  DollarSign,
  Eye,
  Glasses,
  Contact,
  Loader2,
  Wallet,
  AlertTriangle,
} from 'lucide-react'

interface CopayInfo {
  exam: number | null
  materials: number | null
  frameAllowance: number | null
  contactAllowance: number | null
  contactFitting: number | null
}

interface TierCopay {
  code: string
  description: string
  copay: number | null
}

interface DecliningBalanceInfo {
  totalAllowance: number | null
  appliesTo: string[]
  overageDiscounts: {
    frameLensPackage: number
    contactsConventional: number
    contactsDisposable: number
  }
  eitherOrRestriction: boolean
}

interface InsuranceSummaryData {
  carrier: string
  planName: string
  copays: CopayInfo
  tierCopays: TierCopay[]
  expirationDate: string | null
  benefitStructure: 'COPAY_ALLOWANCE' | 'DECLINING_BALANCE'
  decliningBalance?: DecliningBalanceInfo
}

interface InsuranceSummaryProps {
  customerId: string
  className?: string
}

export function InsuranceSummary({ customerId, className = '' }: InsuranceSummaryProps) {
  const [summary, setSummary] = useState<InsuranceSummaryData | null>(null)
  const [hasInsurance, setHasInsurance] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/customers/${customerId}/insurance-summary`)
        const data = await response.json()

        if (data.success) {
          setHasInsurance(data.hasInsurance)
          setSummary(data.summary)
        }
      } catch (error) {
        console.error('Failed to fetch insurance summary:', error)
      } finally {
        setLoading(false)
      }
    }

    if (customerId) {
      fetchSummary()
    }
  }, [customerId])

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <Card className={`bg-white/5 border-white/10 ${className}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-2 text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading insurance...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasInsurance || !summary) {
    return (
      <Card className={`bg-white/5 border-white/10 ${className}`}>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-white/50">
            <Shield className="h-4 w-4" />
            <span className="text-sm">No insurance on file</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group tier copays by category
  const progressiveTiers = summary.tierCopays.filter(t =>
    t.code.match(/^(NA|OA|FA|JA|KA|tier_|I{1,3}V?$)/)
  )
  const arTiers = summary.tierCopays.filter(t =>
    t.code.match(/^(Q[MTV]|ar_)/)
  )
  const materialTiers = summary.tierCopays.filter(t =>
    t.code.match(/^(A[DBHJ]|poly|trivex|hi\d+)/)
  )
  const otherTiers = summary.tierCopays.filter(t =>
    !progressiveTiers.includes(t) && !arTiers.includes(t) && !materialTiers.includes(t)
  )

  return (
    <Card className={`bg-white/5 border-white/10 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <span className="text-white">Insurance Benefits</span>
          </div>
          <Badge
            className={`text-xs ${
              summary.carrier === 'VSP'
                ? 'bg-blue-500/20 text-blue-300 border-blue-400/50'
                : summary.carrier === 'EyeMed'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                : 'bg-purple-500/20 text-purple-300 border-purple-400/50'
            }`}
          >
            {summary.carrier}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Plan Name */}
        <div className="text-xs text-white/60">{summary.planName}</div>

        {/* Declining Balance Banner */}
        {summary.benefitStructure === 'DECLINING_BALANCE' && summary.decliningBalance && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/50">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-amber-400" />
              <span className="text-amber-300 font-semibold text-sm">Declining Balance Plan</span>
            </div>
            <div className="text-3xl font-bold text-amber-400 mb-1">
              {formatCurrency(summary.decliningBalance.totalAllowance)}
            </div>
            <div className="text-xs text-white/60 space-y-1">
              <div>Unified allowance for frames, lenses, options & contacts</div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <span className="text-amber-400/80">
                  {summary.decliningBalance.eitherOrRestriction
                    ? 'Glasses OR Contacts (not both)'
                    : 'Can use for glasses AND contacts'}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/10 text-xs text-white/50 space-y-0.5">
              <div>Frame/Lens overage: {summary.decliningBalance.overageDiscounts.frameLensPackage}% off</div>
              <div>Contact overage: {summary.decliningBalance.overageDiscounts.contactsConventional}% off conventional</div>
            </div>
          </div>
        )}

        {/* Main Copays - Only for COPAY_ALLOWANCE plans */}
        {summary.benefitStructure !== 'DECLINING_BALANCE' && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
              <Eye className="h-3.5 w-3.5 text-blue-400" />
              <div>
                <div className="text-white/60 text-xs">Exam</div>
                <div className="text-white font-medium">{formatCurrency(summary.copays.exam)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              <div>
                <div className="text-white/60 text-xs">Materials</div>
                <div className="text-white font-medium">{formatCurrency(summary.copays.materials)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
              <Glasses className="h-3.5 w-3.5 text-amber-400" />
              <div>
                <div className="text-white/60 text-xs">Frame Allowance</div>
                <div className="text-white font-medium">{formatCurrency(summary.copays.frameAllowance)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
              <Contact className="h-3.5 w-3.5 text-purple-400" />
              <div>
                <div className="text-white/60 text-xs">Contact Allowance</div>
                <div className="text-white font-medium">{formatCurrency(summary.copays.contactAllowance)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Exam Copay for Declining Balance (still show exam copay separately) */}
        {summary.benefitStructure === 'DECLINING_BALANCE' && (
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded text-sm">
            <Eye className="h-3.5 w-3.5 text-blue-400" />
            <div>
              <div className="text-white/60 text-xs">Exam Copay</div>
              <div className="text-white font-medium">{formatCurrency(summary.copays.exam)}</div>
            </div>
          </div>
        )}

        {/* CL Fitting */}
        {summary.copays.contactFitting !== null && (
          <div className="flex items-center justify-between p-2 bg-white/5 rounded text-sm">
            <span className="text-white/60">CL Fitting Copay</span>
            <span className="text-white font-medium">{formatCurrency(summary.copays.contactFitting)}</span>
          </div>
        )}

        {/* Expiration */}
        {summary.expirationDate && (
          <div className="text-xs text-white/40 text-center">
            Expires: {new Date(summary.expirationDate).toLocaleDateString()}
          </div>
        )}

        {/* Details Button - Only for copay-based plans */}
        {summary.benefitStructure !== 'DECLINING_BALANCE' && summary.tierCopays.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full text-xs text-white/60 hover:text-white hover:bg-white/10"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide Tier Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show Tier Details ({summary.tierCopays.length})
                </>
              )}
            </Button>

            {/* Expanded Tier Details */}
            {expanded && (
              <div className="space-y-3 pt-2 border-t border-white/10">
                {/* Progressive Lenses - show product names */}
                {progressiveTiers.length > 0 && (
                  <div>
                    <div className="text-xs text-white/50 mb-1 font-medium">Progressive Lenses</div>
                    <div className="grid grid-cols-1 gap-1">
                      {progressiveTiers.map(tier => (
                        <div
                          key={tier.code}
                          className="flex items-center justify-between p-1.5 bg-white/5 rounded text-xs"
                        >
                          <span className="text-white/70 truncate mr-2">{tier.description}</span>
                          <span className="text-white font-medium whitespace-nowrap">{formatCurrency(tier.copay)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AR Coatings - show product names */}
                {arTiers.length > 0 && (
                  <div>
                    <div className="text-xs text-white/50 mb-1 font-medium">AR Coatings</div>
                    <div className="grid grid-cols-1 gap-1">
                      {arTiers.map(tier => (
                        <div
                          key={tier.code}
                          className="flex items-center justify-between p-1.5 bg-white/5 rounded text-xs"
                        >
                          <span className="text-white/70 truncate mr-2">{tier.description}</span>
                          <span className="text-white font-medium whitespace-nowrap">{formatCurrency(tier.copay)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Material Tiers */}
                {materialTiers.length > 0 && (
                  <div>
                    <div className="text-xs text-white/50 mb-1 font-medium">Materials</div>
                    <div className="grid grid-cols-2 gap-1">
                      {materialTiers.map(tier => (
                        <div
                          key={tier.code}
                          className="flex items-center justify-between p-1.5 bg-white/5 rounded text-xs"
                        >
                          <span className="text-white/70">{tier.description}</span>
                          <span className="text-white font-medium">{formatCurrency(tier.copay)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Tiers */}
                {otherTiers.length > 0 && (
                  <div>
                    <div className="text-xs text-white/50 mb-1 font-medium">Enhancements</div>
                    <div className="grid grid-cols-2 gap-1">
                      {otherTiers.map(tier => (
                        <div
                          key={tier.code}
                          className="flex items-center justify-between p-1.5 bg-white/5 rounded text-xs"
                        >
                          <span className="text-white/70">{tier.description}</span>
                          <span className="text-white font-medium">{formatCurrency(tier.copay)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
