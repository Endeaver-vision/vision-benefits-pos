import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await prisma.quotes.findUnique({
      where: { id: params.id },
      include: {
        customers: true
      }
    });

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Format the quote data for the frontend
    const formattedQuote = {
      ...quote,
      customerName: quote.customers 
        ? `${quote.customers.firstName} ${quote.customers.lastName}`.trim()
        : 'Unknown Customer'
    };

    return NextResponse.json(formattedQuote);

  } catch (error) {
    console.error('Error fetching quote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { 
      patientInfo,
      insuranceInfo,
      examServices,
      eyeglasses,
      contacts,
      subtotal,
      tax,
      discount,
      insuranceDiscount,
      total,
      patientResponsibility
    } = body;

    const updatedQuote = await prisma.quotes.update({
      where: { id: params.id },
      data: {
        patientInfo: patientInfo || {},
        insuranceInfo: insuranceInfo || {},
        examServices: examServices || [],
        eyeglasses: eyeglasses || [],
        contacts: contacts || [],
        subtotal: subtotal || 0,
        tax: tax || 0,
        discount: discount || 0,
        insuranceDiscount: insuranceDiscount || 0,
        total: total || 0,
        patientResponsibility: patientResponsibility || 0,
        lastActivityAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json(updatedQuote);

  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}