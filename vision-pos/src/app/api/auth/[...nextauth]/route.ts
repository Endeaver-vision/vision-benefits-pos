import NextAuth, { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import type { User, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        locationId: { label: 'Location', type: 'text' }
      },
      async authorize(credentials) {
        console.log('🔐 Login attempt:', { username: credentials?.username, hasPassword: !!credentials?.password })

        if (!credentials?.username || !credentials?.password) {
          throw new Error('Username and password are required')
        }

        try {
          // Find user by username
          const user = await prisma.user.findFirst({
            where: {
              username: credentials.username,
              active: true
            },
            include: {
              location: true
            }
          })

          console.log('👤 User found:', !!user, 'Has hash:', !!user?.passwordHash)

          if (!user || !user.passwordHash) {
            throw new Error('Invalid username or password')
          }

          // Verify password
          console.log('🔑 Verifying password...')
          const isValidPassword = await verifyPassword(credentials.password, user.passwordHash)
          console.log('✅ Password valid:', isValidPassword)

          if (!isValidPassword) {
            throw new Error('Invalid username or password')
          }

          // Check if location is provided and matches user's location
          if (credentials.locationId && user.locationId !== credentials.locationId) {
            throw new Error('Invalid location for this user')
          }

          console.log('🎉 Login successful for:', user.username)

          return {
            id: user.id,
            email: user.email || user.username, // Fall back to username if no email
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            locationId: user.locationId,
            locationName: user.location.name,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          throw error
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      // Add user info to JWT token
      if (user) {
        token.role = user.role
        token.locationId = user.locationId
        token.locationName = user.locationName
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Add user info to session
      if (token) {
        session.user.id = token.sub as string
        session.user.role = token.role as string
        session.user.locationId = token.locationId as string
        session.user.locationName = token.locationName as string
      }
      return session
    }
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
