'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, DollarSign, Package, FileText, Clock } from 'lucide-react'
import PageLayout from '@/components/layout/page-layout'

interface Transaction {
  id: string
  createdAt: string
  total: number
  status: string
  items: {
    id: string
    productName: string
    quantity: number
    unitPrice: number
    total: number
  }[]
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  totalSpent: number
  transactions?: Transaction[]
}

export default function CustomerHistoryPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string
  
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCustomerHistory = async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}`)
        const result = await response.json()
        
        if (result.success) {
          setCustomer(result.data)
        } else {
          setError(result.error || 'Failed to load customer history')
        }
      } catch (err) {
        setError('An error occurred while loading customer history')
        console.error('Fetch customer history error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (customerId) {
      fetchCustomerHistory()
    }
  }, [customerId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-600">Completed</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-600">Pending</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-destructive mb-2">Error</h3>
              <p className="text-muted-foreground mb-4">{error || 'Customer not found'}</p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const transactions = customer.transactions || []

  return (
    <PageLayout
      title="Customer History"
      subtitle={`${customer.firstName} ${customer.lastName} - Purchase history and activity`}
    >
      <div className="container mx-auto p-6 space-y-6">

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">{formatCurrency(customer.totalSpent || 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-3 rounded-full">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Order</p>
                <p className="text-2xl font-bold">
                  {transactions.length > 0 
                    ? formatCurrency((customer.totalSpent || 0) / transactions.length)
                    : '$0.00'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">{formatDate(transaction.createdAt)}</p>
                          <p className="text-sm text-muted-foreground">Order #{transaction.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(transaction.status)}
                        <p className="text-xl font-bold mt-1">{formatCurrency(transaction.total)}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground">Items:</p>
                      {transaction.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center py-2 border-t">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{item.productName}</span>
                            <Badge variant="outline">Qty: {item.quantity}</Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(item.total)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(item.unitPrice)} each
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </PageLayout>
  )
}
