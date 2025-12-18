'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'

interface PricePlanStats {
  totalProducts: number
  pricedProducts: number
  needsPricingCount: number
  coveredProducts: number  // Products with $0 copay
  carriers: string[]
}

interface PricePlanStatusProps {
  customerId: string
  customerName?: string
  className?: string
  compact?: boolean
}

export function PricePlanStatus({
  customerId,
  customerName,
  className = '',
  compact = false
}: PricePlanStatusProps) {
  const [stats, setStats] = useState<PricePlanStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(!compact)
  const [regenerating, setRegenerating] = useState(false)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${customerId}/price-plan?stats=true`)
      const data = await response.json()

      if (data.success && data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch price plan stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (customerId) {
      fetchStats()
    }
  }, [customerId])

  const handleRegenerate = async () => {
    try {
      setRegenerating(true)
      const response = await fetch(`/api/customers/${customerId}/price-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' })
      })

      if (response.ok) {
        await fetchStats()
      }
    } catch (error) {
      console.error('Failed to regenerate price plan:', error)
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className={`p-3 bg-white/5 rounded-lg border border-white/10 animate-pulse ${className}`}>
        <div className="h-4 w-32 bg-white/20 rounded mb-2" />
        <div className="h-3 w-48 bg-white/10 rounded" />
      </div>
    )
  }

  // No price plan yet
  if (!stats || stats.totalProducts === 0) {
    return (
      <div className={`p-3 bg-amber-500/10 rounded-lg border border-amber-400/30 ${className}`}>
        <div className="flex items-center gap-2 text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">No Price Plan</span>
        </div>
        <p className="text-xs text-amber-200/70 mt-1">
          Scan an insurance document to generate pricing
        </p>
      </div>
    )
  }

  const coveragePercent = Math.round((stats.pricedProducts / stats.totalProducts) * 100)
  const isFullyCovered = stats.needsPricingCount === 0

  // Compact mode for sidebar
  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`w-full p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-left ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Price Plan</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={isFullyCovered
              ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/50'
              : 'bg-amber-500/30 text-amber-300 border-amber-400/50'
            }>
              {coveragePercent}%
            </Badge>
            <ChevronDown className="h-4 w-4 text-white/50" />
          </div>
        </div>
      </button>
    )
  }

  return (
    <Card className={`bg-white/5 border-white/10 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-400" />
            Price Plan Status
          </CardTitle>
          {compact && (
            <button onClick={() => setExpanded(false)} className="text-white/50 hover:text-white">
              <ChevronUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Coverage Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-white/70">Product Coverage</span>
            <span className={isFullyCovered ? 'text-emerald-400' : 'text-amber-400'}>
              {stats.pricedProducts} / {stats.totalProducts}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${isFullyCovered ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <div className="text-lg font-bold text-emerald-400">{stats.coveredProducts}</div>
            <div className="text-xs text-white/50">Covered</div>
          </div>
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <div className="text-lg font-bold text-blue-400">{stats.pricedProducts - stats.coveredProducts}</div>
            <div className="text-xs text-white/50">Priced</div>
          </div>
          <div className={`p-2 rounded-lg ${stats.needsPricingCount > 0 ? 'bg-amber-500/10' : 'bg-white/5'}`}>
            <div className={`text-lg font-bold ${stats.needsPricingCount > 0 ? 'text-amber-400' : 'text-white/30'}`}>
              {stats.needsPricingCount}
            </div>
            <div className="text-xs text-white/50">Needs Price</div>
          </div>
        </div>

        {/* Carriers */}
        {stats.carriers.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/50">Carriers:</span>
            {stats.carriers.map(carrier => (
              <Badge
                key={carrier}
                className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs"
              >
                {carrier}
              </Badge>
            ))}
          </div>
        )}

        {/* Status Badge */}
        {isFullyCovered ? (
          <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-lg">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-emerald-300">All products have pricing</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-amber-300">
              {stats.needsPricingCount} products need manual pricing
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex-1 text-xs h-8"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          <Link href={`/customers/${customerId}/insurance`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
