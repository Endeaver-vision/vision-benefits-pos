import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const userCreateSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['ADMIN', 'MANAGER', 'SALES_ASSOCIATE', 'TECHNICIAN']),
  locationId: z.string(),
  password: z.string().min(6).optional(),
});

const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'SALES_ASSOCIATE', 'TECHNICIAN']).optional(),
  locationId: z.string().optional(),
  active: z.boolean().optional(),
});

const bulkActionSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'resetPassword', 'delete']),
  userIds: z.array(z.string()),
});

// Helper function to log user activity
async function logActivity(userId: string, action: string, entityId?: string, details?: Record<string, unknown>) {
  try {
    await prisma.user_activity_logs.create({
      data: {
        userId,
        action,
        entity: 'USER',
        entityId,
        details: details ? JSON.stringify(details) : null,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to log user activity:', error);
  }
}

// GET - List users with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const locationId = searchParams.get('locationId');
    const active = searchParams.get('active');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (active !== null && active !== undefined) {
      where.active = active === 'true';
    }

    const [users, totalUsers] = await Promise.all([
      prisma.users.findMany({
        where,
        include: {
          locations: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              quotes: true,
              transactions: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.users.count({ where }),
    ]);

    // Get user statistics
    const stats = await prisma.users.aggregate({
      _count: {
        id: true,
      },
      where: {
        active: true,
      },
    });

    const roleDistribution = await prisma.users.groupBy({
      by: ['role'],
      _count: {
        id: true,
      },
    });

    const locationDistribution = await prisma.users.groupBy({
      by: ['locationId'],
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        users: users.map(user => ({
          ...user,
          passwordHash: undefined, // Never return password hash
        })),
        pagination: {
          total: totalUsers,
          page,
          limit,
          pages: Math.ceil(totalUsers / limit),
        },
        stats: {
          total: totalUsers,
          active: stats._count.id,
          roles: roleDistribution,
          locations: locationDistribution,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create new user or bulk actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a bulk action
    if (body.action && body.userIds) {
      return handleBulkAction(body);
    }

    // Single user creation
    const validatedData = userCreateSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password if provided, otherwise generate a temporary one
    const password = validatedData.password || Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.users.create({
      data: {
        ...validatedData,
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        locations: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log activity
    await logActivity(newUser.id, 'USER_CREATED', newUser.id, {
      email: validatedData.email,
      role: validatedData.role,
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...newUser,
          passwordHash: undefined,
        },
        temporaryPassword: validatedData.password ? undefined : password,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// Handle bulk actions
async function handleBulkAction(body: Record<string, unknown>) {
  try {
    const { action, userIds } = bulkActionSchema.parse(body);

    let results = [];

    switch (action) {
      case 'activate':
        await prisma.users.updateMany({
          where: { id: { in: userIds } },
          data: { active: true, updatedAt: new Date() },
        });
        results = userIds.map(id => ({ id, success: true, message: 'Activated' }));
        break;

      case 'deactivate':
        await prisma.users.updateMany({
          where: { id: { in: userIds } },
          data: { active: false, updatedAt: new Date() },
        });
        results = userIds.map(id => ({ id, success: true, message: 'Deactivated' }));
        break;

      case 'resetPassword':
        for (const userId of userIds) {
          const newPassword = Math.random().toString(36).slice(-8);
          const passwordHash = await bcrypt.hash(newPassword, 12);
          
          await prisma.users.update({
            where: { id: userId },
            data: {
              passwordHash,
              updatedAt: new Date(),
            },
          });

          await logActivity(userId, 'PASSWORD_RESET', userId);
          
          results.push({
            id: userId,
            success: true,
            message: 'Password reset',
            newPassword,
          });
        }
        break;

      case 'delete':
        // Only allow deletion of inactive users with no recent activity
        const usersToDelete = await prisma.users.findMany({
          where: {
            id: { in: userIds },
            active: false,
          },
          include: {
            _count: {
              select: {
                quotes: true,
                transactions: true,
              },
            },
          },
        });

        for (const user of usersToDelete) {
          if (user._count.quotes === 0 && user._count.transactions === 0) {
            await prisma.users.delete({
              where: { id: user.id },
            });
            results.push({
              id: user.id,
              success: true,
              message: 'Deleted',
            });
          } else {
            results.push({
              id: user.id,
              success: false,
              message: 'Cannot delete user with existing quotes or transactions',
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

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = userUpdateSchema.parse(body);

    // Check if email is being changed and if it already exists
    if (validatedData.email) {
      const existingUser = await prisma.users.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json(
          { success: false, error: 'User with this email already exists' },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      include: {
        locations: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log activity
    await logActivity(userId, 'USER_UPDATED', userId, validatedData);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...updatedUser,
          passwordHash: undefined,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}