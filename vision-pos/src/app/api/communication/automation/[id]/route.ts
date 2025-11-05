import { NextRequest, NextResponse } from 'next/server'
import { AutomationTrigger } from '@/types/communication'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const updates = await request.json()

    // In a real implementation, this would update the trigger in the database
    // For now, we'll simulate the update
    const updatedTrigger: Partial<AutomationTrigger> = {
      id,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: updatedTrigger,
      message: 'Automation trigger updated successfully'
    })
  } catch (error) {
    console.error('Error updating automation trigger:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update automation trigger'
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Mock trigger data - in a real app, this would come from a database
    const trigger: AutomationTrigger = {
      id,
      name: 'Sample Trigger',
      description: 'Sample automation trigger',
      type: 'customer_created',
      active: true,
      conditions: [
        {
          field: 'customerType',
          operator: 'equals',
          value: 'new',
          label: 'Customer Type'
        }
      ],
      actions: [
        {
          type: 'send_template',
          config: {
            templateId: '1',
            delay: 0
          }
        }
      ],
      stats: {
        totalTriggered: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        lastTriggered: undefined
      },
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: trigger
    })
  } catch (error) {
    console.error('Error fetching automation trigger:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch automation trigger'
      },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    // In a real implementation, this would delete the trigger from the database
    // For now, we'll simulate the deletion
    
    return NextResponse.json({
      success: true,
      message: 'Automation trigger deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting automation trigger:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete automation trigger'
      },
      { status: 500 }
    )
  }
}