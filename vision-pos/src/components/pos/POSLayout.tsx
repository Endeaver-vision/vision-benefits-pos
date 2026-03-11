'use client'

import { ReactNode } from 'react'

interface POSLayoutProps {
  patientBanner: ReactNode
  navigation: ReactNode
  productArea: ReactNode
  orderSummary: ReactNode
  actions: ReactNode
}

/**
 * 4-column iPad-optimized POS layout
 * Chick-fil-A style layout with dark glass theme
 *
 * Target Ratios (matching Chick-fil-A):
 * - Navigation: ~12% (w-28 = 112px)
 * - Product Grid: ~48% (flex-1)
 * - Order Summary: ~28% (w-72 = 288px)
 * - Actions: ~12% (w-28 = 112px)
 *
 * Structure:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                        PATIENT BANNER (full width)                   │
 * ├────────────┬────────────────────────────┬──────────────┬────────────┤
 * │  CATEGORY  │       PRODUCT GRID         │ORDER SUMMARY │  ACTION    │
 * │  SIDEBAR   │    (image tiles + nums)    │ (clean list) │  BUTTONS   │
 * │   ~12%     │          ~48%              │    ~28%      │   ~12%     │
 * └────────────┴────────────────────────────┴──────────────┴────────────┘
 */
export default function POSLayout({
  patientBanner,
  navigation,
  productArea,
  orderSummary,
  actions,
}: POSLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[#030712] via-[#0c1929] to-[#1e3a5f] overflow-hidden">
      {/* Patient Banner - Persistent top header */}
      <div className="flex-shrink-0 glass-card border-b border-white/10">
        {patientBanner}
      </div>

      {/* Main 4-column content area - Chick-fil-A ratios using flex */}
      {/* Target ratios: 14% sidebar, 46% product, 32% order, 8% actions */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Navigation Sidebar ~14% */}
        <div className="flex-[14] min-w-[100px] overflow-y-auto">
          {navigation}
        </div>

        {/* Column 2: Product Area ~46% */}
        <div className="flex-[46] min-w-[260px] overflow-y-auto p-3">
          {productArea}
        </div>

        {/* Column 3: Order Summary ~32% */}
        <div className="flex-[32] min-w-[280px] glass-card border-l border-white/10 overflow-y-auto">
          {orderSummary}
        </div>

        {/* Column 4: Actions ~8% */}
        <div className="flex-[8] min-w-[85px] glass-card border-l border-white/10 overflow-y-auto">
          {actions}
        </div>
      </div>
    </div>
  )
}
