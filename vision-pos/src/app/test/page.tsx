export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Vision POS Test Page
        </h1>
        <p className="text-gray-600 mb-6">
          If you can see this, the server is working correctly.
        </p>
        <div className="space-y-4">
          <a 
            href="/login" 
            className="block bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Go to Login
          </a>
          <a 
            href="/dashboard" 
            className="block bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition-colors"
          >
            Go to Dashboard
          </a>
          <a 
            href="/api/health" 
            target="_blank"
            className="block bg-purple-500 text-white px-6 py-2 rounded hover:bg-purple-600 transition-colors"
          >
            Check API Health
          </a>
        </div>
      </div>
    </div>
  )
}