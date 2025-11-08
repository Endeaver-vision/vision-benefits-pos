import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'categories') {
      const categories = await prisma.product_categories.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              products: true
            }
          }
        }
      });

      return NextResponse.json(categories);
    }

    if (type === 'locations') {
      const locations = await prisma.locations.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          timezone: true
        }
      });

      return NextResponse.json(locations);
    }

    return NextResponse.json(
      { error: 'Invalid type parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error fetching reference data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}