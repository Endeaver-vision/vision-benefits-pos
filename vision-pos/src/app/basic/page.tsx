export default function BasicTestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Basic Test - Server Working ✅
        </h1>
        <p className="text-gray-600 mb-6">
          This is a simple test page without authentication.
        </p>
        <div className="space-y-4">
          <a 
            href="/login" 
            className="block bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Go to Login Page
          </a>
          <a 
            href="/api/health" 
            target="_blank"
            className="block bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition-colors"
          >
            API Health Check
          </a>
          <a 
            href="/api/locations" 
            target="_blank"
            className="block bg-purple-500 text-white px-6 py-2 rounded hover:bg-purple-600 transition-colors"
          >
            Locations API
          </a>
        </div>
        <div className="mt-6 text-sm text-gray-500">
          <p>If you can see this page, the server is working correctly.</p>
          <p>The client-side error is likely in the authentication setup.</p>
        </div>
      </div>
    </div>
  )
}