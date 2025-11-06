'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Mail, 
  Send, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Plus,
  Eye,
  Paperclip,
  RefreshCw,
  Clock
} from 'lucide-react'

interface EmailResult {
  success: boolean
  message?: string
  messageId?: string
  provider?: string
  error?: string
  details?: string
}

interface EmailModalProps {
  quoteId: string
  quoteNumber: string
  customerName: string
  customerEmail: string
  onEmailSent?: (result: EmailResult) => void
  trigger?: React.ReactNode
}

interface EmailLog {
  id: string
  recipientEmail: string
  subject: string
  status: 'SENT' | 'FAILED' | 'PENDING' | 'BOUNCED'
  provider?: string
  errorMessage?: string
  retryCount: number
  sentAt: string
}

export function EmailModal({
  quoteId,
  quoteNumber,
  customerName,
  customerEmail,
  onEmailSent,
  trigger
}: EmailModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('compose')
  
  // Form state
  const [recipientEmail, setRecipientEmail] = useState(customerEmail)
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [bccEmails, setBccEmails] = useState<string[]>([])
  const [subject, setSubject] = useState(`Your Vision Quote #${quoteNumber}`)
  const [customMessage, setCustomMessage] = useState('')
  const [includeAttachment, setIncludeAttachment] = useState(true)
  
  // UI state
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<EmailResult | null>(null)
  const [emailHistory, setEmailHistory] = useState<EmailLog[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load email history when modal opens
  const loadEmailHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/quotes/${quoteId}/email`)
      if (response.ok) {
        const data = await response.json()
        setEmailHistory(data.emailHistory || [])
      }
    } catch (error) {
      console.error('Failed to load email history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }, [quoteId])

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      loadEmailHistory()
    }
  }, [isOpen, activeTab, loadEmailHistory])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate recipient email
    if (!recipientEmail.trim()) {
      newErrors.recipientEmail = 'Recipient email is required'
    } else if (!isValidEmail(recipientEmail)) {
      newErrors.recipientEmail = 'Invalid email address'
    }

    // Validate CC emails
    const invalidCC = ccEmails.filter(email => email.trim() && !isValidEmail(email))
    if (invalidCC.length > 0) {
      newErrors.ccEmails = `Invalid CC emails: ${invalidCC.join(', ')}`
    }

    // Validate BCC emails
    const invalidBCC = bccEmails.filter(email => email.trim() && !isValidEmail(email))
    if (invalidBCC.length > 0) {
      newErrors.bccEmails = `Invalid BCC emails: ${invalidBCC.join(', ')}`
    }

    // Validate subject
    if (!subject.trim()) {
      newErrors.subject = 'Subject is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSendEmail = async () => {
    if (!validateForm()) {
      return
    }

    setIsSending(true)
    setSendResult(null)

    try {
      const response = await fetch(`/api/quotes/${quoteId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          cc: ccEmails.filter(email => email.trim()),
          bcc: bccEmails.filter(email => email.trim()),
          subject,
          customMessage,
          includeAttachment
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSendResult({
          success: true,
          message: result.message,
          messageId: result.messageId,
          provider: result.provider
        })
        onEmailSent?.(result)
        
        // Refresh email history
        if (activeTab === 'history') {
          loadEmailHistory()
        }
      } else {
        setSendResult({
          success: false,
          error: result.error,
          details: result.details
        })
      }
    } catch (error) {
      setSendResult({
        success: false,
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsSending(false)
    }
  }

  const addEmailToList = (emailList: string[], setEmailList: (emails: string[]) => void, email: string) => {
    if (email.trim() && isValidEmail(email) && !emailList.includes(email)) {
      setEmailList([...emailList, email])
    }
  }

  const removeEmailFromList = (emailList: string[], setEmailList: (emails: string[]) => void, index: number) => {
    setEmailList(emailList.filter((_, i) => i !== index))
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const resetForm = () => {
    setRecipientEmail(customerEmail)
    setCcEmails([])
    setBccEmails([])
    setSubject(`Your Vision Quote #${quoteNumber}`)
    setCustomMessage('')
    setIncludeAttachment(true)
    setErrors({})
    setSendResult(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Badge className="bg-green-100 text-green-800">Sent</Badge>
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'BOUNCED':
        return <Badge className="bg-orange-100 text-orange-800">Bounced</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full">
            <Mail className="h-4 w-4 mr-2" />
            Email Quote
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Quote #{quoteNumber}
          </DialogTitle>
          <DialogDescription>
            Send professional quote to {customerName} ({customerEmail})
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Compose Tab */}
          <TabsContent value="compose" className="space-y-4">
            {sendResult && (
              <Alert className={sendResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-center gap-2">
                  {sendResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={sendResult.success ? 'text-green-800' : 'text-red-800'}>
                    {sendResult.success ? sendResult.message : `Error: ${sendResult.error}`}
                    {sendResult.details && (
                      <div className="text-sm mt-1 opacity-75">
                        {sendResult.details}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recipient Email */}
              <div className="space-y-2">
                <Label htmlFor="recipientEmail">To *</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className={errors.recipientEmail ? 'border-red-500' : ''}
                />
                {errors.recipientEmail && (
                  <p className="text-sm text-red-500">{errors.recipientEmail}</p>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                  className={errors.subject ? 'border-red-500' : ''}
                />
                {errors.subject && (
                  <p className="text-sm text-red-500">{errors.subject}</p>
                )}
              </div>
            </div>

            {/* CC Emails */}
            <div className="space-y-2">
              <Label>CC (Optional)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {ccEmails.map((email, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {email}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeEmailFromList(ccEmails, setCcEmails, index)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add CC email"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const email = e.currentTarget.value
                      addEmailToList(ccEmails, setCcEmails, email)
                      e.currentTarget.value = ''
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement
                    addEmailToList(ccEmails, setCcEmails, input.value)
                    input.value = ''
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.ccEmails && (
                <p className="text-sm text-red-500">{errors.ccEmails}</p>
              )}
            </div>

            {/* BCC Emails */}
            <div className="space-y-2">
              <Label>BCC (Optional)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {bccEmails.map((email, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {email}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeEmailFromList(bccEmails, setBccEmails, index)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add BCC email"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const email = e.currentTarget.value
                      addEmailToList(bccEmails, setBccEmails, email)
                      e.currentTarget.value = ''
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement
                    addEmailToList(bccEmails, setBccEmails, input.value)
                    input.value = ''
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.bccEmails && (
                <p className="text-sm text-red-500">{errors.bccEmails}</p>
              )}
            </div>

            {/* Custom Message */}
            <div className="space-y-2">
              <Label htmlFor="customMessage">Custom Message (Optional)</Label>
              <Textarea
                id="customMessage"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal message to include with the quote..."
                rows={3}
              />
            </div>

            {/* Attachment Option */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeAttachment"
                checked={includeAttachment}
                onChange={(e) => setIncludeAttachment(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="includeAttachment" className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Include PDF quote attachment
              </Label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Reset Form
                </Button>
                <Button variant="outline" onClick={() => setActiveTab('preview')}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
              
              <Button 
                onClick={handleSendEmail} 
                disabled={isSending}
                className="min-w-32"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Email Preview</CardTitle>
                <CardDescription>
                  Preview how your email will appear to the recipient
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="space-y-2 text-sm">
                    <div><strong>To:</strong> {recipientEmail}</div>
                    {ccEmails.length > 0 && (
                      <div><strong>CC:</strong> {ccEmails.join(', ')}</div>
                    )}
                    {bccEmails.length > 0 && (
                      <div><strong>BCC:</strong> {bccEmails.join(', ')}</div>
                    )}
                    <div><strong>Subject:</strong> {subject}</div>
                    {includeAttachment && (
                      <div className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        <span>Quote_{quoteNumber}.pdf</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 bg-white min-h-48">
                  <div className="space-y-3">
                    <p>Hello {customerName},</p>
                    <p>Thank you for visiting our practice! We&apos;ve prepared your personalized vision quote and wanted to share the details with you.</p>
                    
                    {customMessage && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
                        <p className="italic">{customMessage}</p>
                      </div>
                    )}
                    
                    <p>Please find your complete quote details in the attached PDF. If you have any questions or would like to schedule an appointment, please don&apos;t hesitate to reach out.</p>
                    
                    <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                      <p><strong>Vision Benefits POS</strong></p>
                      <p>Your trusted vision care partner</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Email History</h3>
              <Button variant="outline" size="sm" onClick={loadEmailHistory} disabled={loadingHistory}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading email history...
              </div>
            ) : emailHistory.length > 0 ? (
              <div className="space-y-3">
                {emailHistory.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="font-medium">{log.subject}</div>
                          <div className="text-sm text-muted-foreground">
                            To: {log.recipientEmail}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(log.sentAt).toLocaleString()}
                            {log.provider && (
                              <Badge variant="outline" className="text-xs">
                                {log.provider}
                              </Badge>
                            )}
                          </div>
                          {log.errorMessage && (
                            <div className="text-sm text-red-600 mt-1">
                              Error: {log.errorMessage}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(log.status)}
                          {log.retryCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Retry {log.retryCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No emails sent for this quote yet.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}