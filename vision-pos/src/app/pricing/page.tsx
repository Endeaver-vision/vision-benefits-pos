'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Search, Download, Upload, Edit2, Save, X, Plus, Package, Glasses, Eye, Stethoscope } from 'lucide-react'
import PageLayout from '@/components/layout/page-layout'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface LensProduct {
  id: string
  name: string
  sku: string
  category: string
  wholesaleCost: number | null
  retailPrice: number
  multiplier: number
  manufacturer: string | null
  isActive: boolean
}

interface Frame {
  id: string
  manufacturer: string
  brand: string
  collection: string | null
  model: string
  color: string
  colorCode: string | null
  eyeSize: number | null
  bridge: number | null
  temple: number | null
  sku: string
  wholesaleCost: number | null
  retailPrice: number
  stockQuantity: number
  isActive: boolean
}

interface ContactLens {
  id: string
  manufacturer: string
  lensName: string
  boxSize: number
  wholesaleCost: number | null
  retailPrice: number
  isAstigmatism: boolean
  isMultifocal: boolean
  isDaily: boolean
  isWeekly: boolean
  isMonthly: boolean
  isActive: boolean
}

interface ServicePrice {
  id: string
  name: string
  sku: string
  category: string
  retailPrice: number
  isActive: boolean
}

const formatCurrency = (value: number | null) => {
  if (value === null) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

// CSV Export helper
function exportToCSV<T extends Record<string, unknown>>(data: T[], filename: string, columns: { key: keyof T; header: string }[]) {
  const headers = columns.map(c => c.header).join(',')
  const rows = data.map(row =>
    columns.map(c => {
      const value = row[c.key]
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value ?? ''
    }).join(',')
  )
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// CSV Import helper
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const data: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    data.push(row)
  }

  return data
}

// Lenses Tab Component
function LensesTab() {
  const [lenses, setLenses] = useState<LensProduct[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<LensProduct>>({})

  const fetchLenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        category,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      const res = await fetch(`/api/pricing/lenses?${params}`)
      const data = await res.json()
      setLenses(data.data || [])
      setPagination(data.pagination || pagination)
    } catch (error) {
      console.error('Error fetching lenses:', error)
    } finally {
      setLoading(false)
    }
  }, [search, category, pagination.page, pagination.limit])

  useEffect(() => {
    fetchLenses()
  }, [fetchLenses])

  const handleEdit = (lens: LensProduct) => {
    setEditingId(lens.id)
    setEditValues({ wholesaleCost: lens.wholesaleCost, retailPrice: lens.retailPrice, multiplier: lens.multiplier })
  }

  const handleSave = async (id: string) => {
    try {
      await fetch('/api/pricing/lenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editValues }),
      })
      setEditingId(null)
      fetchLenses()
    } catch (error) {
      console.error('Error saving lens:', error)
    }
  }

  const handleExport = () => {
    exportToCSV(lenses, 'lenses-pricing.csv', [
      { key: 'name', header: 'Name' },
      { key: 'sku', header: 'SKU' },
      { key: 'category', header: 'Category' },
      { key: 'wholesaleCost', header: 'Wholesale Cost' },
      { key: 'retailPrice', header: 'Retail Price' },
      { key: 'multiplier', header: 'Multiplier' },
      { key: 'manufacturer', header: 'Manufacturer' },
    ])
  }

  const handleImport = async (file: File) => {
    const text = await file.text()
    const data = parseCSV(text)
    try {
      const res = await fetch('/api/pricing/lenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importData: data }),
      })
      const result = await res.json()
      alert(`Import complete: ${result.results?.updated || 0} updated, ${result.results?.errors || 0} errors`)
      fetchLenses()
    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="SINGLE_VISION">Single Vision</SelectItem>
            <SelectItem value="PROGRESSIVE">Progressive</SelectItem>
            <SelectItem value="BIFOCAL">Bifocal</SelectItem>
            <SelectItem value="COATING">Coating</SelectItem>
            <SelectItem value="ADDON">Add-on</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <label>
          <Button variant="outline" asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </span>
          </Button>
          <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
        </label>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Wholesale</TableHead>
              <TableHead className="text-right">Retail</TableHead>
              <TableHead className="text-right">Multiplier</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : lenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">No lenses found</TableCell>
              </TableRow>
            ) : (
              lenses.map((lens) => (
                <TableRow key={lens.id}>
                  <TableCell className="font-medium">{lens.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{lens.sku}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{lens.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === lens.id ? (
                      <Input
                        type="number"
                        value={editValues.wholesaleCost || ''}
                        onChange={(e) => setEditValues({ ...editValues, wholesaleCost: parseFloat(e.target.value) || null })}
                        className="w-24 text-right"
                      />
                    ) : (
                      formatCurrency(lens.wholesaleCost)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === lens.id ? (
                      <Input
                        type="number"
                        value={editValues.retailPrice || ''}
                        onChange={(e) => setEditValues({ ...editValues, retailPrice: parseFloat(e.target.value) })}
                        className="w-24 text-right"
                      />
                    ) : (
                      formatCurrency(lens.retailPrice)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === lens.id ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={editValues.multiplier || ''}
                        onChange={(e) => setEditValues({ ...editValues, multiplier: parseFloat(e.target.value) })}
                        className="w-20 text-right"
                      />
                    ) : (
                      lens.multiplier?.toFixed(1) || '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === lens.id ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleSave(lens.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(lens)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Frames Tab Component
function FramesTab() {
  const [frames, setFrames] = useState<Frame[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('all')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<Frame>>({})

  const fetchFrames = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        brand,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      const res = await fetch(`/api/pricing/frames?${params}`)
      const data = await res.json()
      setFrames(data.data || [])
      setBrands(data.brands || [])
      setPagination(data.pagination || pagination)
    } catch (error) {
      console.error('Error fetching frames:', error)
    } finally {
      setLoading(false)
    }
  }, [search, brand, pagination.page, pagination.limit])

  useEffect(() => {
    fetchFrames()
  }, [fetchFrames])

  const handleEdit = (frame: Frame) => {
    setEditingId(frame.id)
    setEditValues({ wholesaleCost: frame.wholesaleCost, retailPrice: frame.retailPrice, stockQuantity: frame.stockQuantity })
  }

  const handleSave = async (id: string) => {
    try {
      await fetch('/api/pricing/frames', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editValues }),
      })
      setEditingId(null)
      fetchFrames()
    } catch (error) {
      console.error('Error saving frame:', error)
    }
  }

  const handleExport = () => {
    exportToCSV(frames, 'frames-pricing.csv', [
      { key: 'brand', header: 'Brand' },
      { key: 'model', header: 'Model' },
      { key: 'color', header: 'Color' },
      { key: 'sku', header: 'SKU' },
      { key: 'wholesaleCost', header: 'Wholesale Cost' },
      { key: 'retailPrice', header: 'Retail Price' },
      { key: 'stockQuantity', header: 'Stock' },
    ])
  }

  const handleImport = async (file: File) => {
    const text = await file.text()
    const data = parseCSV(text)
    try {
      const res = await fetch('/api/pricing/frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importData: data }),
      })
      const result = await res.json()
      alert(`Import complete: ${result.results?.updated || 0} updated, ${result.results?.errors || 0} errors`)
      fetchFrames()
    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search frames..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map(b => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <label>
          <Button variant="outline" asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </span>
          </Button>
          <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
        </label>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand / Model</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Wholesale</TableHead>
              <TableHead className="text-right">Retail</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : frames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">No frames found</TableCell>
              </TableRow>
            ) : (
              frames.map((frame) => (
                <TableRow key={frame.id}>
                  <TableCell>
                    <div className="font-medium">{frame.brand}</div>
                    <div className="text-sm text-muted-foreground">{frame.model}</div>
                  </TableCell>
                  <TableCell>{frame.color}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {frame.eyeSize && frame.bridge && frame.temple
                      ? `${frame.eyeSize}-${frame.bridge}-${frame.temple}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === frame.id ? (
                      <Input
                        type="number"
                        value={editValues.wholesaleCost || ''}
                        onChange={(e) => setEditValues({ ...editValues, wholesaleCost: parseFloat(e.target.value) || null })}
                        className="w-24 text-right"
                      />
                    ) : (
                      formatCurrency(frame.wholesaleCost)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === frame.id ? (
                      <Input
                        type="number"
                        value={editValues.retailPrice || ''}
                        onChange={(e) => setEditValues({ ...editValues, retailPrice: parseFloat(e.target.value) })}
                        className="w-24 text-right"
                      />
                    ) : (
                      formatCurrency(frame.retailPrice)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === frame.id ? (
                      <Input
                        type="number"
                        value={editValues.stockQuantity || 0}
                        onChange={(e) => setEditValues({ ...editValues, stockQuantity: parseInt(e.target.value) || 0 })}
                        className="w-20 text-right"
                      />
                    ) : (
                      <Badge variant={frame.stockQuantity > 0 ? 'default' : 'destructive'}>
                        {frame.stockQuantity}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === frame.id ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleSave(frame.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(frame)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Contacts Tab Component
function ContactsTab() {
  const [contacts, setContacts] = useState<ContactLens[]>([])
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [manufacturer, setManufacturer] = useState('all')
  const [lensType, setLensType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<ContactLens>>({})

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        manufacturer,
        lensType,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      const res = await fetch(`/api/pricing/contacts?${params}`)
      const data = await res.json()
      setContacts(data.data || [])
      setManufacturers(data.manufacturers || [])
      setPagination(data.pagination || pagination)
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }, [search, manufacturer, lensType, pagination.page, pagination.limit])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const handleEdit = (contact: ContactLens) => {
    setEditingId(contact.id)
    setEditValues({ wholesaleCost: contact.wholesaleCost, retailPrice: contact.retailPrice })
  }

  const handleSave = async (id: string) => {
    try {
      await fetch('/api/pricing/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editValues }),
      })
      setEditingId(null)
      fetchContacts()
    } catch (error) {
      console.error('Error saving contact:', error)
    }
  }

  const handleExport = () => {
    exportToCSV(contacts, 'contacts-pricing.csv', [
      { key: 'manufacturer', header: 'Manufacturer' },
      { key: 'lensName', header: 'Lens Name' },
      { key: 'boxSize', header: 'Box Size' },
      { key: 'wholesaleCost', header: 'Wholesale Cost' },
      { key: 'retailPrice', header: 'Retail Price' },
    ])
  }

  const handleImport = async (file: File) => {
    const text = await file.text()
    const data = parseCSV(text)
    try {
      const res = await fetch('/api/pricing/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importData: data }),
      })
      const result = await res.json()
      alert(`Import complete: ${result.results?.updated || 0} updated, ${result.results?.errors || 0} errors`)
      fetchContacts()
    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed')
    }
  }

  const getLensTypeBadges = (contact: ContactLens) => {
    const badges = []
    if (contact.isDaily) badges.push('Daily')
    if (contact.isWeekly) badges.push('Weekly')
    if (contact.isMonthly) badges.push('Monthly')
    if (contact.isAstigmatism) badges.push('Toric')
    if (contact.isMultifocal) badges.push('Multifocal')
    return badges
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contact lenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={manufacturer} onValueChange={setManufacturer}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Manufacturer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Manufacturers</SelectItem>
            {manufacturers.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={lensType} onValueChange={setLensType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Lens Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="toric">Toric</SelectItem>
            <SelectItem value="multifocal">Multifocal</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <label>
          <Button variant="outline" asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </span>
          </Button>
          <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
        </label>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Lens Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Box Size</TableHead>
              <TableHead className="text-right">Wholesale</TableHead>
              <TableHead className="text-right">Retail</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">No contact lenses found</TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.manufacturer}</TableCell>
                  <TableCell>{contact.lensName}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {getLensTypeBadges(contact).map(badge => (
                        <Badge key={badge} variant="outline" className="text-xs">{badge}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{contact.boxSize}</TableCell>
                  <TableCell className="text-right">
                    {editingId === contact.id ? (
                      <Input
                        type="number"
                        value={editValues.wholesaleCost || ''}
                        onChange={(e) => setEditValues({ ...editValues, wholesaleCost: parseFloat(e.target.value) || null })}
                        className="w-24 text-right"
                      />
                    ) : (
                      formatCurrency(contact.wholesaleCost)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === contact.id ? (
                      <Input
                        type="number"
                        value={editValues.retailPrice || ''}
                        onChange={(e) => setEditValues({ ...editValues, retailPrice: parseFloat(e.target.value) })}
                        className="w-24 text-right"
                      />
                    ) : (
                      formatCurrency(contact.retailPrice)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === contact.id ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleSave(contact.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(contact)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Services Tab Component
function ServicesTab() {
  const [services, setServices] = useState<ServicePrice[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<ServicePrice>>({})

  const fetchServices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        category,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      const res = await fetch(`/api/pricing/services?${params}`)
      const data = await res.json()
      setServices(data.data || [])
      setPagination(data.pagination || pagination)
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }, [search, category, pagination.page, pagination.limit])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const handleEdit = (service: ServicePrice) => {
    setEditingId(service.id)
    setEditValues({ retailPrice: service.retailPrice })
  }

  const handleSave = async (id: string) => {
    try {
      await fetch('/api/pricing/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editValues }),
      })
      setEditingId(null)
      fetchServices()
    } catch (error) {
      console.error('Error saving service:', error)
    }
  }

  const handleExport = () => {
    exportToCSV(services, 'services-pricing.csv', [
      { key: 'name', header: 'Name' },
      { key: 'sku', header: 'SKU' },
      { key: 'category', header: 'Category' },
      { key: 'retailPrice', header: 'Retail Price' },
    ])
  }

  const handleImport = async (file: File) => {
    const text = await file.text()
    const data = parseCSV(text)
    try {
      const res = await fetch('/api/pricing/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importData: data }),
      })
      const result = await res.json()
      alert(`Import complete: ${result.results?.updated || 0} updated, ${result.results?.errors || 0} errors`)
      fetchServices()
    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="EXAM">Exam</SelectItem>
            <SelectItem value="DIAGNOSTIC">Diagnostic</SelectItem>
            <SelectItem value="PROCEDURE">Procedure</SelectItem>
            <SelectItem value="CONTACT_LENS_FIT">Contact Lens Fit</SelectItem>
            <SelectItem value="SPECTACLE_SERVICE">Spectacle Service</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <label>
          <Button variant="outline" asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </span>
          </Button>
          <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
        </label>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Retail Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">No services found</TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{service.sku}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{service.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === service.id ? (
                      <Input
                        type="number"
                        value={editValues.retailPrice || ''}
                        onChange={(e) => setEditValues({ ...editValues, retailPrice: parseFloat(e.target.value) })}
                        className="w-24 text-right"
                      />
                    ) : (
                      formatCurrency(service.retailPrice)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === service.id ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleSave(service.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(service)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Main Page Component
export default function PricingPage() {
  const [stats, setStats] = useState({ lenses: 0, frames: 0, contacts: 0, services: 0 })

  useEffect(() => {
    async function fetchStats() {
      try {
        const [lensRes, frameRes, contactRes, serviceRes] = await Promise.all([
          fetch('/api/pricing/lenses?limit=1'),
          fetch('/api/pricing/frames?limit=1'),
          fetch('/api/pricing/contacts?limit=1'),
          fetch('/api/pricing/services?limit=1'),
        ])
        const [lensData, frameData, contactData, serviceData] = await Promise.all([
          lensRes.json(),
          frameRes.json(),
          contactRes.json(),
          serviceRes.json(),
        ])
        setStats({
          lenses: lensData.pagination?.total || 0,
          frames: frameData.pagination?.total || 0,
          contacts: contactData.pagination?.total || 0,
          services: serviceData.pagination?.total || 0,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }
    fetchStats()
  }, [])

  return (
    <PageLayout
      title="Price Management"
      subtitle="Manage pricing for all products and services"
    >
      <div className="container mx-auto p-6 space-y-6">

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lenses</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frames</CardTitle>
            <Glasses className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.frames.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contact Lenses</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contacts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.services.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">services</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lenses">Lenses</TabsTrigger>
          <TabsTrigger value="frames">Frames</TabsTrigger>
          <TabsTrigger value="contacts">Contact Lenses</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>
        <TabsContent value="lenses">
          <Card>
            <CardHeader>
              <CardTitle>Lens Products</CardTitle>
              <CardDescription>Manage lens pricing including single vision, progressives, and add-ons</CardDescription>
            </CardHeader>
            <CardContent>
              <LensesTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="frames">
          <Card>
            <CardHeader>
              <CardTitle>Frame Inventory</CardTitle>
              <CardDescription>Manage frame pricing and stock levels</CardDescription>
            </CardHeader>
            <CardContent>
              <FramesTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contact Lenses</CardTitle>
              <CardDescription>Manage contact lens pricing by manufacturer and type</CardDescription>
            </CardHeader>
            <CardContent>
              <ContactsTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
              <CardDescription>Manage pricing for exams, diagnostics, and procedures</CardDescription>
            </CardHeader>
            <CardContent>
              <ServicesTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </PageLayout>
  )
}
