/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');
    const locationId = searchParams.get('locationId');
    const active = searchParams.get('active');
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (categoryId && categoryId !== 'ALL') {
      where.categoryId = categoryId;
    }

    if (active !== null && active !== undefined && active !== 'ALL') {
      where.active = active === 'true';
    }

    if (priceMin || priceMax) {
      where.basePrice = {};
      if (priceMin) {
        where.basePrice.gte = parseFloat(priceMin);
      }
      if (priceMax) {
        where.basePrice.lte = parseFloat(priceMax);
      }
    }

    // Location filter requires joining through product_locations
    let locationFilter = {};
    if (locationId && locationId !== 'ALL') {
      locationFilter = {
        product_locations: {
          some: {
            locationId: locationId,
            available: true
          }
        }
      };
      Object.assign(where, locationFilter);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with relations
    const [products, totalCount] = await Promise.all([
      prisma.products.findMany({
        where,
        include: {
          product_categories: true,
          product_locations: {
            include: {
              locations: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          inventory: {
            include: {
              locations: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              inventory: true,
              product_locations: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limit
      }),
      prisma.products.count({ where })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Format products with computed fields
    const formattedProducts = products.map((product: any) => {
      const totalInventory = product.inventory.reduce(
        (sum: number, inv: any) => sum + inv.currentStock, 
        0
      );
      
      const availableLocations = product.product_locations.filter(
        (pl: any) => pl.available
      ).length;

      return {
        ...product,
        totalInventory,
        availableLocations,
        inventoryStatus: totalInventory > 0 ? 'In Stock' : 'Out of Stock',
        categoryName: product.product_categories?.name || 'Uncategorized'
      };
    });

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'stats') {
      // Get product statistics
      const [
        totalProducts,
        activeProducts,
        categories,
        outOfStock,
        lowStock
      ] = await Promise.all([
        prisma.products.count(),
        prisma.products.count({ where: { active: true } }),
        prisma.product_categories.count({ where: { active: true } }),
        prisma.inventory.count({ where: { currentStock: 0 } }),
        prisma.inventory.count({ 
          where: { 
            currentStock: { lte: 10 } // Assuming low stock is <= 10
          } 
        })
      ]);

      return NextResponse.json({
        totalProducts,
        activeProducts,
        inactiveProducts: totalProducts - activeProducts,
        totalCategories: categories,
        outOfStock,
        lowStock
      });
    }

    if (body.action === 'bulk') {
      // Handle bulk operations
      const { productIds, operation, data } = body;

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return NextResponse.json(
          { error: 'Product IDs are required for bulk operations' },
          { status: 400 }
        );
      }

      let result;
      switch (operation) {
        case 'activate':
          result = await prisma.products.updateMany({
            where: { id: { in: productIds } },
            data: { active: true, updatedAt: new Date() }
          });
          break;
        
        case 'deactivate':
          result = await prisma.products.updateMany({
            where: { id: { in: productIds } },
            data: { active: false, updatedAt: new Date() }
          });
          break;
        
        case 'delete':
          result = await prisma.products.deleteMany({
            where: { id: { in: productIds } }
          });
          break;
        
        case 'updatePrice':
          if (!data.basePrice) {
            return NextResponse.json(
              { error: 'Base price is required for price update' },
              { status: 400 }
            );
          }
          result = await prisma.products.updateMany({
            where: { id: { in: productIds } },
            data: { 
              basePrice: parseFloat(data.basePrice),
              updatedAt: new Date() 
            }
          });
          break;
        
        case 'updateCategory':
          if (!data.categoryId) {
            return NextResponse.json(
              { error: 'Category ID is required for category update' },
              { status: 400 }
            );
          }
          result = await prisma.products.updateMany({
            where: { id: { in: productIds } },
            data: { 
              categoryId: data.categoryId,
              updatedAt: new Date() 
            }
          });
          break;
        
        default:
          return NextResponse.json(
            { error: 'Invalid bulk operation' },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        affectedRows: result.count,
        operation
      });
    }

    // Create new product
    const {
      name,
      sku,
      categoryId,
      manufacturer,
      basePrice,
      tierVsp,
      tierEyemed,
      tierSpectera,
      active = true,
      locations = [],
      inventory = []
    } = body;

    // Validate required fields
    if (!name || !categoryId || basePrice === undefined) {
      return NextResponse.json(
        { error: 'Name, category, and base price are required' },
        { status: 400 }
      );
    }

    // Create product with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the product
      const newProduct = await tx.products.create({
        data: {
          id: `product_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          name,
          sku: sku || null,
          categoryId,
          manufacturer: manufacturer || null,
          basePrice: parseFloat(basePrice),
          tierVsp: tierVsp || null,
          tierEyemed: tierEyemed || null,
          tierSpectera: tierSpectera || null,
          active,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create location associations
      if (locations && locations.length > 0) {
        const locationData = locations.map((loc: any) => ({
          id: `prodloc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          productId: newProduct.id,
          locationId: loc.locationId,
          priceOverride: loc.priceOverride ? parseFloat(loc.priceOverride) : null,
          available: loc.available !== false,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await tx.product_locations.createMany({
          data: locationData
        });
      }

      // Create inventory records
      if (inventory && inventory.length > 0) {
        const inventoryData = inventory.map((inv: any) => ({
          id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          productId: newProduct.id,
          locationId: inv.locationId,
          currentStock: inv.currentStock || 0,
          reservedStock: 0,
          availableStock: inv.currentStock || 0,
          reorderPoint: inv.reorderPoint || 5,
          reorderQuantity: inv.reorderQuantity || 20,
          maxStock: inv.maxStock || null,
          costPrice: inv.costPrice ? parseFloat(inv.costPrice) : null,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await tx.inventory.createMany({
          data: inventoryData
        });
      }

      return newProduct;
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}