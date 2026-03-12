'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home } from 'lucide-react'
import AppNavigation from './app-navigation'
import { CurrentPatientBanner } from './CurrentPatientBanner'

interface PageLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  showNavigation?: boolean
  actions?: React.ReactNode
  showFooterNav?: boolean
  showPatientBanner?: boolean
  className?: string
}

export default function PageLayout({
  children,
  title,
  subtitle,
  showNavigation = true,
  actions,
  showFooterNav = true,
  showPatientBanner = true,
  className = '',
}: PageLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Don't show patient banner on POS or customer profile pages (they have their own)
  const shouldShowPatientBanner = showPatientBanner &&
    !pathname?.startsWith('/pos') &&
    !pathname?.startsWith('/customers/')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Navigation */}
      <AppNavigation
        title={title}
        subtitle={subtitle}
        showNavigation={showNavigation}
        actions={actions}
      />

      {/* Current Patient Quick Access */}
      {shouldShowPatientBanner && <CurrentPatientBanner />}

      {/* Main Content */}
      <main className={`flex-1 ${className}`}>
        {children}
      </main>

      {/* Footer Navigation */}
      {showFooterNav && (
        <footer className="bg-white/10 backdrop-blur-md border-t border-white/20 sticky bottom-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3">
              {/* Left side - Back and Dashboard buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-1"
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Button>
              </div>

              {/* Right side - Quick links */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/pos')}
                >
                  POS
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/customers')}
                >
                  Customers
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/quote-builder')}
                >
                  Quote
                </Button>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
