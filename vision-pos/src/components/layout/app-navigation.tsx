'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Home,
  User,
  Settings,
  Users,
  MapPin,
  LogOut,
  ChevronDown
} from 'lucide-react'

interface AppNavigationProps {
  title?: string
  subtitle?: string
  showNavigation?: boolean
  actions?: React.ReactNode
}

export default function AppNavigation({
  title,
  subtitle,
  showNavigation = true,
  actions,
}: AppNavigationProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const user = session?.user
  const userRole = user?.role as string | undefined
  const canAccessAdmin = userRole === 'ADMIN' || userRole === 'MANAGER'

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          {/* Left side - Back button, Dashboard button, and title */}
          <div className="flex items-center gap-2">
            {/* Navigation buttons - always show both Back and Dashboard */}
            {showNavigation && (
              <>
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
              </>
            )}

            {/* Title */}
            {title && (
              <div className={showNavigation ? "border-l border-white/20 pl-4 ml-2" : ""}>
                <h1 className="text-lg font-semibold text-white">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-white/70">{subtitle}</p>
                )}
              </div>
            )}
          </div>

          {/* Right side - Actions, location, user */}
          <div className="flex items-center gap-4">
            {/* Custom actions */}
            {actions}

            {/* Location indicator */}
            {user?.locationName && (
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {user.locationName}
              </Badge>
            )}

            {/* User menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user.name}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-xs font-normal text-white/70">{user.email}</span>
                      <Badge variant="secondary" className="mt-1 w-fit text-xs">
                        {userRole}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {canAccessAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => router.push('/admin/users')}>
                        <Users className="h-4 w-4 mr-2" />
                        Manage Users
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/admin/locations')}>
                        <MapPin className="h-4 w-4 mr-2" />
                        Manage Locations
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/pos/admin')}>
                        <Settings className="h-4 w-4 mr-2" />
                        POS Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-red-400"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/login')}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
