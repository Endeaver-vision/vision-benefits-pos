import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string
      email: string
      name: string
      role: string
      locationId: string
      locationName: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    locationId: string
    locationName: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    locationId?: string
    locationName?: string
  }
}