'use client';

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import TemplateManagement from '@/components/communication/template-management'
import AutomationWorkflows from '@/components/communication/automation-workflows'
import MarketingCampaigns from '@/components/communication/marketing-campaigns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function CommunicationHub() {
  const router = useRouter()
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.push('/dashboard')}
          className="text-neutral-600 hover:text-brand-purple"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="h-6 w-px bg-neutral-300" />
        <div>
          <h1 className="text-3xl font-bold">Communication Hub</h1>
          <p className="text-gray-600">Manage templates, automation workflows, and marketing campaigns</p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates">
          <TemplateManagement />
        </TabsContent>
        
        <TabsContent value="automation">
          <AutomationWorkflows />
        </TabsContent>
        
        <TabsContent value="campaigns">
          <MarketingCampaigns />
        </TabsContent>
      </Tabs>
    </div>
  )
}