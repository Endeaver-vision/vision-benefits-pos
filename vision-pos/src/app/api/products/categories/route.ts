import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.productCategory.findMany({
      where: {
        active: true,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    })

    return NextResponse.json({
      categories,
      count: categories.length,
    })
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
