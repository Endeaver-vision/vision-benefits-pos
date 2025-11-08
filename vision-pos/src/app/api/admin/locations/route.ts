import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const locationCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  taxRate: z.number().min(0).max(1).optional(),
  timezone: z.string().optional(),
});

const locationUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  taxRate: z.number().min(0).max(1).optional(),
  timezone: z.string().optional(),
  active: z.boolean().optional(),
});

const bulkActionSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'delete']),
  locationIds: z.array(z.string()),
});

// Helper function to log activity (to be implemented when auth is added)
// async function logActivity(userId: string, action: string, entityId?: string, details?: Record<string, unknown>) {
//   try {
//     await prisma.user_activity_logs.create({
//       data: {
//         id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//         userId,
//         action,
//         entity: 'LOCATION',
//         entityId,
//         details: details ? JSON.stringify(details) : null,
//         createdAt: new Date(),
//       },
//     });
//   } catch (error) {
//     console.error('Failed to log activity:', error);
//   }
// }

// GET - List locations with filtering and statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const active = searchParams.get('active');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (active !== null && active !== undefined) {
      where.active = active === 'true';
    }

    const [locations, totalLocations] = await Promise.all([
      prisma.locations.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              quotes: true,
              transactions: true,
              inventory: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.locations.count({ where }),
    ]);

    // Get location statistics
    const stats = await prisma.locations.aggregate({
      _count: {
        id: true,
      },
      where: {
        active: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        locations,
        pagination: {
          total: totalLocations,
          page,
          limit,
          pages: Math.ceil(totalLocations / limit),
        },
        stats: {
          total: totalLocations,
          active: stats._count.id,
          inactive: totalLocations - stats._count.id,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

// POST - Create new location or bulk actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a bulk action
    if (body.action && body.locationIds) {
      return handleBulkAction(body);
    }

    // Single location creation
    const validatedData = locationCreateSchema.parse(body);

    // Check if location name already exists
    const existingLocation = await prisma.locations.findUnique({
      where: { name: validatedData.name },
    });

    if (existingLocation) {
      return NextResponse.json(
        { success: false, error: 'Location with this name already exists' },
        { status: 400 }
      );
    }

    const newLocation = await prisma.locations.create({
      data: {
        name: validatedData.name,
        address: validatedData.address,
        id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        phone: validatedData.phone || null,
        timezone: validatedData.timezone || 'America/Los_Angeles',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            users: true,
            quotes: true,
            transactions: true,
            inventory: true,
          },
        },
      },
    });

    // Log activity - need userId from session/auth
    // await logActivity('current_user_id', 'LOCATION_CREATED', newLocation.id, {
    //   name: validatedData.name,
    // });

    return NextResponse.json({
      success: true,
      data: { location: newLocation },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create location' },
      { status: 500 }
    );
  }
}

// Handle bulk actions
async function handleBulkAction(body: Record<string, unknown>) {
  try {
    const { action, locationIds } = bulkActionSchema.parse(body);

    let results = [];

    switch (action) {
      case 'activate':
        await prisma.locations.updateMany({
          where: { id: { in: locationIds } },
          data: { active: true, updatedAt: new Date() },
        });
        results = locationIds.map(id => ({ id, success: true, message: 'Activated' }));
        break;

      case 'deactivate':
        await prisma.locations.updateMany({
          where: { id: { in: locationIds } },
          data: { active: false, updatedAt: new Date() },
        });
        results = locationIds.map(id => ({ id, success: true, message: 'Deactivated' }));
        break;

      case 'delete':
        // Only allow deletion of inactive locations with no users or transactions
        const locationsToDelete = await prisma.locations.findMany({
          where: {
            id: { in: locationIds },
            active: false,
          },
          include: {
            _count: {
              select: {
                users: true,
                quotes: true,
                transactions: true,
                inventory: true,
              },
            },
          },
        });

        for (const location of locationsToDelete) {
          const hasData = location._count.users > 0 || 
                         location._count.quotes > 0 || 
                         location._count.transactions > 0 ||
                         location._count.inventory > 0;

          if (!hasData) {
            await prisma.locations.delete({
              where: { id: location.id },
            });
            results.push({
              id: location.id,
              success: true,
              message: 'Deleted',
            });
          } else {
            results.push({
              id: location.id,
              success: false,
              message: 'Cannot delete location with existing data',
            });
          }
        }
        break;

      default:
        throw new Error('Invalid bulk action');
    }

    return NextResponse.json({
      success: true,
      data: { results },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in bulk action:', error);
    return NextResponse.json(
      { success: false, error: 'Bulk action failed' },
      { status: 500 }
    );
  }
}

// PUT - Update location
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('id');

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = locationUpdateSchema.parse(body);

    // Check if name is being changed and if it already exists
    if (validatedData.name) {
      const existingLocation = await prisma.locations.findUnique({
        where: { name: validatedData.name },
      });

      if (existingLocation && existingLocation.id !== locationId) {
        return NextResponse.json(
          { success: false, error: 'Location with this name already exists' },
          { status: 400 }
        );
      }
    }

    const updatedLocation = await prisma.locations.update({
      where: { id: locationId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.address && { address: validatedData.address }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone || null }),
        ...(validatedData.timezone && { timezone: validatedData.timezone }),
        ...(validatedData.active !== undefined && { active: validatedData.active }),
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            users: true,
            quotes: true,
            transactions: true,
            inventory: true,
          },
        },
      },
    });

    // Log activity
    // await logActivity('current_user_id', 'LOCATION_UPDATED', locationId, validatedData);

    return NextResponse.json({
      success: true,
      data: { location: updatedLocation },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    );
  }
}