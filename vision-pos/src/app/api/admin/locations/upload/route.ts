import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST - Upload logo file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File;
    const locationId = formData.get('locationId') as string;

    if (!file || !locationId) {
      return NextResponse.json(
        { success: false, error: 'File and location ID are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only JPEG, PNG, and WebP files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(file.name);
    const filename = `logo_${locationId}_${timestamp}${extension}`;
    const filepath = path.join(uploadDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Update location with logo path
    const logoPath = `/uploads/logos/${filename}`;
    await prisma.locations.update({
      where: { id: locationId },
      data: { 
        logo: logoPath,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: { logoPath },
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

// DELETE - Remove logo file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Update location to remove logo
    await prisma.locations.update({
      where: { id: locationId },
      data: { 
        logo: null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Logo removed successfully',
    });
  } catch (error) {
    console.error('Error removing logo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove logo' },
      { status: 500 }
    );
  }
}