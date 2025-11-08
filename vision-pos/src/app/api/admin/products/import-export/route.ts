import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CSV Export
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'products';

    if (type === 'template') {
      // Return CSV template
      const template = [
        'name,sku,categoryId,manufacturer,basePrice,tierVsp,tierEyemed,tierSpectera,active,description',
        'Example Product,EX-001,category_id,Example Manufacturer,99.99,TIER_1,TIER_2,TIER_1,true,Example product description'
      ].join('\n');

      return new NextResponse(template, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="product_template.csv"'
        }
      });
    }

    if (type === 'products') {
      // Export all products
      const products = await prisma.products.findMany({
        include: {
          product_categories: true,
          product_locations: {
            include: {
              locations: true
            }
          },
          inventory: {
            include: {
              locations: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      // Convert to CSV
      const headers = [
        'id',
        'name', 
        'sku',
        'categoryName',
        'manufacturer',
        'basePrice',
        'tierVsp',
        'tierEyemed', 
        'tierSpectera',
        'active',
        'totalInventory',
        'availableLocations',
        'createdAt'
      ];

      const csvData = products.map(product => [
        product.id,
        `"${product.name}"`,
        product.sku || '',
        `"${product.product_categories?.name || 'Uncategorized'}"`,
        `"${product.manufacturer || ''}"`,
        product.basePrice,
        product.tierVsp || '',
        product.tierEyemed || '',
        product.tierSpectera || '',
        product.active,
        product.inventory.reduce((sum, inv) => sum + inv.currentStock, 0),
        product.product_locations.filter(pl => pl.available).length,
        product.createdAt.toISOString()
      ].join(','));

      const csv = [headers.join(','), ...csvData].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="products_export_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });

  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// CSV Import
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    // Read and parse CSV
    const csvText = await file.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must contain header and at least one data row' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    // Validate required headers
    const requiredHeaders = ['name', 'categoryId', 'basePrice'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return NextResponse.json({ 
        error: `Missing required headers: ${missingHeaders.join(', ')}` 
      }, { status: 400 });
    }

    // Process each row
    const results = {
      imported: 0,
      errors: [] as string[],
      skipped: 0
    };

    // Get all categories for validation
    const categories = await prisma.product_categories.findMany();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const row = dataRows[i];
        const values = parseCSVRow(row);
        
        if (values.length !== headers.length) {
          results.errors.push(`Row ${i + 2}: Column count mismatch`);
          continue;
        }

        // Create row object
        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index];
        });

        // Validate required fields
        if (!rowData.name?.trim()) {
          results.errors.push(`Row ${i + 2}: Product name is required`);
          continue;
        }

        if (!rowData.categoryId?.trim()) {
          results.errors.push(`Row ${i + 2}: Category ID is required`);
          continue;
        }

        if (!categoryMap.has(rowData.categoryId)) {
          results.errors.push(`Row ${i + 2}: Invalid category ID '${rowData.categoryId}'`);
          continue;
        }

        const basePrice = parseFloat(rowData.basePrice);
        if (isNaN(basePrice) || basePrice <= 0) {
          results.errors.push(`Row ${i + 2}: Base price must be a positive number`);
          continue;
        }

        // Check if SKU already exists (if provided)
        if (rowData.sku?.trim()) {
          const existingSku = await prisma.products.findUnique({
            where: { sku: rowData.sku.trim() }
          });
          
          if (existingSku) {
            results.errors.push(`Row ${i + 2}: SKU '${rowData.sku}' already exists`);
            continue;
          }
        }

        // Create product
        const productData = {
          id: `product_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          name: rowData.name.trim(),
          sku: rowData.sku?.trim() || null,
          categoryId: rowData.categoryId.trim(),
          manufacturer: rowData.manufacturer?.trim() || null,
          basePrice: basePrice,
          tierVsp: rowData.tierVsp?.trim() || null,
          tierEyemed: rowData.tierEyemed?.trim() || null,
          tierSpectera: rowData.tierSpectera?.trim() || null,
          active: rowData.active === 'true' || rowData.active === '1' || rowData.active === 'TRUE',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await prisma.products.create({
          data: productData
        });

        results.imported++;

      } catch (error) {
        console.error(`Error processing row ${i + 2}:`, error);
        results.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        totalRows: dataRows.length,
        imported: results.imported,
        errors: results.errors.length,
        errorDetails: results.errors.slice(0, 10) // Limit error details to first 10
      }
    });

  } catch (error) {
    console.error('Error importing CSV:', error);
    return NextResponse.json({ 
      error: 'Import failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to parse CSV row with proper quote handling
function parseCSVRow(row: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;
  let i = 0;

  while (i < row.length) {
    const char = row[i];
    
    if (char === '"') {
      if (insideQuotes && row[i + 1] === '"') {
        // Escaped quote
        currentValue += '"';
        i += 2;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
        i++;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      values.push(currentValue.trim());
      currentValue = '';
      i++;
    } else {
      currentValue += char;
      i++;
    }
  }
  
  // Add the last value
  values.push(currentValue.trim());
  
  return values;
}