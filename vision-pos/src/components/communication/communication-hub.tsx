import React from 'react'
import TemplateManagement from '@/components/communication/template-management'
import AutomationWorkflows from '@/components/communication/automation-workflows'
import MarketingCampaigns from '@/components/communication/marketing-campaigns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function CommunicationHub() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Communication Hub</h1>
        <p className="text-gray-600">Manage templates, automation workflows, and marketing campaigns</p>
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