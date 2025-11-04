export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Vision Benefits POS</h1>
        <p className="text-gray-600 mb-6">Welcome to the Vision Benefits Point of Sale System</p>
        
        <div className="space-y-3">
          <a 
            href="/login" 
            className="block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Login to System
          </a>
          <a 
            href="/basic" 
            className="block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Basic Test Page
          </a>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>Development Server Running</p>
          <p>Simple static page without authentication</p>
        </div>
      </div>
    </div>
  )
}
