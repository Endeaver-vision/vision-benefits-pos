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
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        try {
          // Find user by email
          const user = await prisma.users.findUnique({
            where: { 
              email: credentials.email,
              active: true 
            },
            include: {
              locations: true
            }
          })

          if (!user || !user.passwordHash) {
            throw new Error('Invalid email or password')
          }

          // Verify password
          const isValidPassword = await verifyPassword(credentials.password, user.passwordHash)
          
          if (!isValidPassword) {
            throw new Error('Invalid email or password')
          }

          // Location is stored in user profile, not required at login
          // This enables multi-business platform architecture
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            locationId: user.locationId,
            locationName: user.locations?.name || 'Default Location',
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
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }