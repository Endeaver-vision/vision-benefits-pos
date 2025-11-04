import { withAuth } from 'next-auth/middleware'

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req) {
    // Add any additional middleware logic here
    console.log('Middleware executed for:', req.nextUrl.pathname)
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

// Protect these routes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/pos/:path*',
    '/customers/:path*',
    '/inventory/:path*',
    '/reports/:path*',
    '/admin/:path*'
  ]
}