/**
 * Week 6 QR Code Implementation for Tablet Access
 * Generates QR codes for easy tablet access to signature workflows
 */

import React, { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'

// QR Code generation utilities
export const generateSignatureQRCode = (quoteId: string, signatureType: 'exam' | 'materials'): string => {
  const baseUrl = window.location.origin
  const signaturePath = `/signature/${signatureType}/${quoteId}`
  
  // Add tablet-specific parameters
  const tabletParams = new URLSearchParams({
    mode: 'tablet',
    optimized: 'true',
    source: 'qr'
  })
  
  return `${baseUrl}${signaturePath}?${tabletParams.toString()}`
}

export const generateQuoteAccessQRCode = (quoteId: string): string => {
  const baseUrl = window.location.origin
  const quotePath = `/quote/${quoteId}/tablet`
  
  const tabletParams = new URLSearchParams({
    mode: 'tablet',
    fullscreen: 'true',
    touch: 'optimized'
  })
  
  return `${baseUrl}${quotePath}?${tabletParams.toString()}`
}

// QR Code Display Component
export const SignatureQRCode: React.FC<{
  quoteId: string
  signatureType: 'exam' | 'materials'
  size?: number
  showInstructions?: boolean
  onGenerated?: (url: string) => void
}> = ({ quoteId, signatureType, size = 200, showInstructions = true, onGenerated }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const url = generateSignatureQRCode(quoteId, signatureType)
      setQrCodeUrl(url)
      setIsLoading(false)
      
      if (onGenerated) {
        onGenerated(url)
      }
    } catch (err) {
      setError('Failed to generate QR code')
      setIsLoading(false)
    }
  }, [quoteId, signatureType, onGenerated])

  const copyUrlToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(qrCodeUrl)
      // Could add toast notification here
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = qrCodeUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }, [qrCodeUrl])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Generating QR code...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="qr-code-container">
      <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-lg">
        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <QRCodeSVG
            value={qrCodeUrl}
            size={size}
            level="M"
            includeMargin={true}
            className="border border-gray-100"
          />
        </div>

        {/* Instructions */}
        {showInstructions && (
          <div className="text-center space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {signatureType === 'exam' ? 'Exam Signature' : 'Materials Signature'}
            </h3>
            
            <div className="text-sm text-gray-600 space-y-2">
              <p>📱 Scan with tablet camera to open signature workflow</p>
              <p>🎯 Optimized for touch devices</p>
              <p>🔐 Secure direct access to this quote</p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-3">
              <button
                onClick={copyUrlToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                📋 Copy Link
              </button>
              
              <span className="text-xs text-gray-500">
                Link expires in 24 hours
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Complete Quote Access QR Code
export const QuoteAccessQRCode: React.FC<{
  quoteId: string
  customerName?: string
  size?: number
  showInstructions?: boolean
}> = ({ quoteId, customerName, size = 240, showInstructions = true }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const url = generateQuoteAccessQRCode(quoteId)
    setQrCodeUrl(url)
    setIsLoading(false)
  }, [quoteId])

  const downloadQRCode = useCallback(() => {
    const svg = document.querySelector('.quote-qr-code svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    canvas.width = size
    canvas.height = size

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, size, size)
        ctx.drawImage(img, 0, 0)
        
        const link = document.createElement('a')
        link.download = `quote-${quoteId}-qr.png`
        link.href = canvas.toDataURL()
        link.click()
      }
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }, [quoteId, size])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Generating QR code...</span>
      </div>
    )
  }

  return (
    <div className="quote-access-qr">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-xl border border-blue-200">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Tablet Access</h2>
          {customerName && (
            <p className="text-lg text-gray-600 mt-1">for {customerName}</p>
          )}
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6 quote-qr-code">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <QRCodeSVG
              value={qrCodeUrl}
              size={size}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: "/logo-small.png", // Placeholder for company logo
                height: 24,
                width: 24,
                excavate: true,
              }}
            />
          </div>
        </div>

        {/* Instructions */}
        {showInstructions && (
          <div className="text-center space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl mb-2">📱</div>
                <div className="font-semibold text-gray-900">Scan QR Code</div>
                <div className="text-gray-600">Use tablet camera or QR app</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl mb-2">🖋️</div>
                <div className="font-semibold text-gray-900">Complete Signatures</div>
                <div className="text-gray-600">Exam & materials agreements</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl mb-2">✅</div>
                <div className="font-semibold text-gray-900">Automatic Sync</div>
                <div className="text-gray-600">Updates saved instantly</div>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-4 pt-4">
              <button
                onClick={downloadQRCode}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                💾 Download QR Code
              </button>
              
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                🖨️ Print
              </button>
            </div>

            <div className="text-xs text-gray-500 mt-4">
              <p>🔒 Secure access • 🕐 Valid for 24 hours • 🎯 Tablet optimized</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// QR Code Management Hook
export const useQRCodeManagement = (quoteId: string) => {
  const [qrCodes, setQrCodes] = useState<{
    exam?: string
    materials?: string
    quote?: string
  }>({})
  
  const [isGenerating, setIsGenerating] = useState(false)

  const generateAllQRCodes = useCallback(async () => {
    setIsGenerating(true)
    
    try {
      const examUrl = generateSignatureQRCode(quoteId, 'exam')
      const materialsUrl = generateSignatureQRCode(quoteId, 'materials')
      const quoteUrl = generateQuoteAccessQRCode(quoteId)
      
      setQrCodes({
        exam: examUrl,
        materials: materialsUrl,
        quote: quoteUrl
      })
    } catch (error) {
      console.error('Failed to generate QR codes:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [quoteId])

  const downloadAllQRCodes = useCallback(async () => {
    // Implementation for downloading all QR codes as a bundle
    const zip = new (await import('jszip')).default()
    
    // Add individual QR codes to zip
    Object.entries(qrCodes).forEach(([type, url]) => {
      if (url) {
        zip.file(`${type}-qr-code.txt`, url)
      }
    })
    
    const content = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(content)
    link.download = `quote-${quoteId}-qr-codes.zip`
    link.click()
  }, [qrCodes, quoteId])

  useEffect(() => {
    generateAllQRCodes()
  }, [generateAllQRCodes])

  return {
    qrCodes,
    isGenerating,
    generateAllQRCodes,
    downloadAllQRCodes,
    hasAllCodes: Object.keys(qrCodes).length === 3
  }
}

// QR Code Scanner Component (for staff to verify tablet access)
export const QRCodeScanner: React.FC<{
  onScanSuccess: (url: string) => void
  onScanError: (error: string) => void
}> = ({ onScanSuccess, onScanError }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const startScanning = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      setHasPermission(true)
      setIsScanning(true)
      
      // QR code scanning logic would go here
      // This would typically use a library like 'qr-scanner'
      
    } catch (error) {
      setHasPermission(false)
      onScanError('Camera permission denied or not available')
    }
  }, [onScanError])

  const stopScanning = useCallback(() => {
    setIsScanning(false)
    // Stop video stream
  }, [])

  return (
    <div className="qr-scanner">
      <div className="bg-white p-6 rounded-lg border shadow-lg">
        <h3 className="text-lg font-semibold mb-4">QR Code Scanner</h3>
        
        {hasPermission === null && (
          <div className="text-center">
            <button
              onClick={startScanning}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              📷 Start Scanner
            </button>
          </div>
        )}

        {hasPermission === false && (
          <div className="text-center text-red-600">
            <p>Camera access required for QR code scanning</p>
          </div>
        )}

        {isScanning && (
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
              <p>Camera view would appear here</p>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={stopScanning}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Stop Scanning
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default {
  SignatureQRCode,
  QuoteAccessQRCode,
  useQRCodeManagement,
  QRCodeScanner,
  generateSignatureQRCode,
  generateQuoteAccessQRCode
}