/**
 * API Authorization Utilities
 *
 * Provides helper functions for:
 * - Checking user authentication status
 * - Enforcing role-based access control
 * - Resolving effective location context
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { NextResponse } from 'next/server'

export type AllowedRole = 'ADMIN' | 'MANAGER' | 'SALES_ASSOCIATE'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: AllowedRole
  locationId: string
  locationName: string
}

export interface AuthResult {
  authorized: boolean
  user?: AuthUser
  error?: string
  response?: NextResponse
}

/**
 * Check if user is authenticated and has one of the allowed roles
 * Optionally checks location access for MANAGER role
 */
export async function requireAuth(
  allowedRoles: AllowedRole[],
  targetLocationId?: string
): Promise<AuthResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      authorized: false,
      error: 'Not authenticated',
      response: NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
  }

  const userRole = session.user.role as AllowedRole

  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      error: 'Insufficient permissions',
      response: NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
  }

  // MANAGER can only access their own location
  if (userRole === 'MANAGER' && targetLocationId && targetLocationId !== session.user.locationId) {
    return {
      authorized: false,
      error: 'Cannot access other locations',
      response: NextResponse.json(
        { success: false, error: 'Cannot access other locations' },
        { status: 403 }
      )
    }
  }

  return {
    authorized: true,
    user: {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.name || '',
      role: userRole,
      locationId: session.user.locationId,
      locationName: session.user.locationName,
    }
  }
}

/**
 * Get effective location ID based on user role and requested location
 * - ADMIN can specify any location via query param
 * - MANAGER and SALES_ASSOCIATE always use their own location
 */
export function getEffectiveLocationId(
  userRole: string,
  userLocationId: string,
  requestedLocationId?: string | null
): string {
  // Only ADMIN can specify a different location
  if (userRole === 'ADMIN' && requestedLocationId) {
    return requestedLocationId
  }
  // Everyone else uses their own location
  return userLocationId
}

/**
 * Get session without auth check (returns null if not authenticated)
 */
export async function getSession() {
  return getServerSession(authOptions)
}

/**
 * Quick auth check - returns user or null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.name || '',
    role: session.user.role as AllowedRole,
    locationId: session.user.locationId,
    locationName: session.user.locationName,
  }
}

/**
 * Check if user can manage a specific location
 */
export function canManageLocation(
  userRole: AllowedRole,
  userLocationId: string,
  targetLocationId: string
): boolean {
  if (userRole === 'ADMIN') return true
  if (userRole === 'MANAGER' && userLocationId === targetLocationId) return true
  return false
}

/**
 * Check if user can create users with a specific role
 */
export function canCreateUserWithRole(
  userRole: AllowedRole,
  targetRole: AllowedRole
): boolean {
  if (userRole === 'ADMIN') return true
  if (userRole === 'MANAGER' && targetRole === 'SALES_ASSOCIATE') return true
  return false
}
