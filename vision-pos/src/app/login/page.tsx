'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

interface Location {
  id: string
  name: string
  address: string
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [locationId, setLocationId] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [locations, setLocations] = useState<Location[]>([])
  const router = useRouter()

  // Fetch locations on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/locations')
        if (response.ok) {
          const result = await response.json()
          console.log('Locations API response:', result)
          setLocations(result.data || [])
        } else {
          console.error('Failed to fetch locations - Status:', response.status)
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error)
      }
    }

    fetchLocations()
  }, [])

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession()
      if (session) {
        router.push('/dashboard')
      }
    }

    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!email || !password || !locationId) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    try {
      const result = await signIn('credentials', {
        email,
        password,
        locationId,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid credentials. Please check your email, password, and location.')
      } else if (result?.ok) {
        // Successful login - redirect to dashboard
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Vision Benefits POS</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location ({locations.length} available)</Label>
              <Select value={locationId} onValueChange={setLocationId} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      Loading locations...
                    </SelectItem>
                  ) : (
                    locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} - {location.address}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Demo Credentials:</p>
            <p className="font-mono text-xs mt-1">
              admin@visioncare.com | Password123 | Any location
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}