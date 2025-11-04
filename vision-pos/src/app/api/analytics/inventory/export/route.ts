// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const startDate = searchParams.get('startDate') || format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const endDate = searchParams.get('endDate') || format(new Date(), 'yyyy-MM-dd');
    const locationId = searchParams.get('locationId');
    const categoryId = searchParams.get('categoryId');
    const supplierId = searchParams.get('supplierId');
    const lowStock = searchParams.get('lowStock') === 'true';

    const startDateTime = startOfDay(new Date(startDate));
    const endDateTime = endOfDay(new Date(endDate));

    // Build where clauses
    const inventoryWhere: any = {};
    const movementWhere: any = {
      createdAt: {
        gte: startDateTime,
        lte: endDateTime
      }
    };

    if (locationId) {
      inventoryWhere.locationId = locationId;
    }

    if (categoryId) {
      inventoryWhere.product = {
        categoryId: categoryId
      };
    }

    if (supplierId) {
      inventoryWhere.product = {
        ...inventoryWhere.product,
        suppliers: {
          some: {
            supplierId: supplierId,
            isPrimary: true
          }
        }
      };
    }

    if (lowStock) {
      inventoryWhere.availableStock = {
        lte: prisma.inventory.fields.reorderPoint
      };
    }

    // Get inventory records with analytics
    const inventoryItems = await prisma.inventory.findMany({
      where: inventoryWhere,
      include: {
        product: {
          include: {
            category: true,
            suppliers: {
              where: { isPrimary: true },
              include: {
                supplier: true
              }
            }
          }
        },
        location: true,
        movements: {
          where: movementWhere,
          include: {
            user: true
          }
        }
      },
      orderBy: {
        product: {
          name: 'asc'
        }
      }
    });

    // Calculate analytics for each item
    const csvData = inventoryItems.map(item => {
      const movements = item.movements;
      const sales = movements.filter(m => m.type === 'SALE');
      const totalSold = Math.abs(sales.reduce((sum, sale) => sum + sale.quantity, 0));
      const averageStock = (item.currentStock + item.reorderPoint) / 2;
      const daysBetween = Math.max((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24), 1);
      
      const turnoverRate = averageStock > 0 ? totalSold / averageStock : 0;
      const dailySalesRate = totalSold / daysBetween;
      const daysOfInventory = dailySalesRate > 0 ? item.availableStock / dailySalesRate : 999;
      
      const stockStatus = item.availableStock <= 0 ? 'OUT_OF_STOCK' :
                         item.availableStock <= item.reorderPoint ? 'LOW_STOCK' :
                         item.availableStock >= (item.maxStock || item.reorderQuantity * 3) ? 'OVERSTOCK' :
                         'NORMAL';

      const shouldReorder = item.availableStock <= item.reorderPoint;
      const urgentReorder = item.availableStock <= (item.reorderPoint * 0.5);
      const currentValue = item.currentStock * (item.costPrice || 0);
      const supplier = item.product.suppliers && item.product.suppliers.length > 0 ? 
                      item.product.suppliers[0].supplier.name : 'N/A';

      return {
        'Product Name': item.product.name,
        'SKU': item.product.sku || 'N/A',
        'Category': item.product.category.name,
        'Location': item.location.name,
        'Supplier': supplier,
        'Current Stock': item.currentStock,
        'Available Stock': item.availableStock,
        'Reserved Stock': item.reservedStock,
        'Reorder Point': item.reorderPoint,
        'Reorder Quantity': item.reorderQuantity,
        'Max Stock': item.maxStock || 'N/A',
        'Cost Price': item.costPrice ? `$${item.costPrice.toFixed(2)}` : 'N/A',
        'Current Value': `$${currentValue.toFixed(2)}`,
        'Stock Status': stockStatus,
        'Turnover Rate': turnoverRate.toFixed(2),
        'Days of Inventory': daysOfInventory === 999 ? 'Infinite' : Math.floor(daysOfInventory).toString(),
        'Total Sold (Period)': totalSold,
        'Daily Sales Rate': dailySalesRate.toFixed(2),
        'Should Reorder': shouldReorder ? 'Yes' : 'No',
        'Urgent Reorder': urgentReorder ? 'Yes' : 'No',
        'Last Restocked': item.lastRestocked ? format(new Date(item.lastRestocked), 'yyyy-MM-dd') : 'N/A',
        'Last Sold': item.lastSold ? format(new Date(item.lastSold), 'yyyy-MM-dd') : 'N/A'
      };
    });

    // Generate CSV
    if (csvData.length === 0) {
      return new NextResponse('No data available for export', { status: 404 });
    }

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="inventory-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv"`
      }
    });

  } catch (error) {
    console.error('Inventory analytics export error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to export inventory analytics',
        details: error.message 
      },
      { status: 500 }
    );
  }
}