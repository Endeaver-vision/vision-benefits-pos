'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  FileText, 
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ImportResult {
  totalRows: number;
  imported: number;
  errors: number;
  errorDetails: string[];
}

export default function ImportExportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection and import
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setError(null);
      setImportResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/products/import-export', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setImportResult(data.results);
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (error) {
      console.error('Error importing file:', error);
      setError('Network error occurred during import');
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Download template
  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/products/import-export?type=template');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  // Export products
  const exportProducts = async () => {
    try {
      const response = await fetch('/api/admin/products/import-export?type=products');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting products:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import & Export Products</h1>
          <p className="text-gray-600">Bulk import products from CSV or export your current catalog</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Before importing:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Download the CSV template below</li>
                    <li>Fill in your product data following the template format</li>
                    <li>Ensure category IDs exist in your system</li>
                    <li>SKUs must be unique (if provided)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>

              <div className="space-y-2">
                <Label htmlFor="csvFile">Select CSV File to Import</Label>
                <input
                  ref={fileInputRef}
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileImport}
                  disabled={importing}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    file:cursor-pointer cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {importing && (
                <div className="flex items-center gap-2 text-blue-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Processing import...</span>
                </div>
              )}
            </div>

            {/* Import Results */}
            {importResult && (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Import Completed</span>
                  </div>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>Total rows processed: {importResult.totalRows}</p>
                    <p>Successfully imported: {importResult.imported}</p>
                    <p>Errors: {importResult.errors}</p>
                  </div>
                </div>

                {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">Import Errors</span>
                    </div>
                    <div className="text-sm text-red-700 space-y-1">
                      {importResult.errorDetails.slice(0, 5).map((error, index) => (
                        <p key={index}>• {error}</p>
                      ))}
                      {importResult.errorDetails.length > 5 && (
                        <p className="font-medium">... and {importResult.errorDetails.length - 5} more errors</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">Import Failed</span>
                </div>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-gray-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">Export includes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>All product information</li>
                    <li>Category names and pricing</li>
                    <li>Inventory totals and availability</li>
                    <li>Location availability counts</li>
                    <li>Insurance tier information</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={exportProducts}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export All Products to CSV
            </Button>

            <div className="text-sm text-gray-500">
              <p>The exported file will be downloaded to your device and can be opened in Excel or other spreadsheet applications.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Import Format & Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Required Fields:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li><code className="bg-gray-100 px-1 rounded">name</code> - Product name (required)</li>
                <li><code className="bg-gray-100 px-1 rounded">categoryId</code> - Valid category ID from your system (required)</li>
                <li><code className="bg-gray-100 px-1 rounded">basePrice</code> - Base price as decimal number (required)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Optional Fields:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li><code className="bg-gray-100 px-1 rounded">sku</code> - Product SKU (must be unique if provided)</li>
                <li><code className="bg-gray-100 px-1 rounded">manufacturer</code> - Manufacturer name</li>
                <li><code className="bg-gray-100 px-1 rounded">tierVsp</code>, <code className="bg-gray-100 px-1 rounded">tierEyemed</code>, <code className="bg-gray-100 px-1 rounded">tierSpectera</code> - Insurance tiers</li>
                <li><code className="bg-gray-100 px-1 rounded">active</code> - true/false for product status</li>
                <li><code className="bg-gray-100 px-1 rounded">description</code> - Product description</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Important Notes:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Use commas to separate fields</li>
                <li>Wrap text containing commas in double quotes</li>
                <li>Boolean fields accept: true/false, 1/0, TRUE/FALSE</li>
                <li>Price fields should use decimal notation (e.g., 99.99)</li>
                <li>Category IDs must exist in your system before import</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}