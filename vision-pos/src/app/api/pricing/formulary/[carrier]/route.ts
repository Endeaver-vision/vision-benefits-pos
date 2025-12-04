import { NextRequest, NextResponse } from 'next/server';
import { getFormularyByCarrier } from '@/lib/services/formulary-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ carrier: string }> }
) {
  try {
    const { carrier } = await params;

    if (!carrier) {
      return NextResponse.json(
        { error: 'Carrier is required' },
        { status: 400 }
      );
    }

    // Normalize carrier name
    const normalizedCarrier = carrier.toUpperCase() === 'EYEMED'
      ? 'EyeMed'
      : carrier.charAt(0).toUpperCase() + carrier.slice(1).toLowerCase();

    const formulary = await getFormularyByCarrier(normalizedCarrier);

    return NextResponse.json({
      success: true,
      carrier: normalizedCarrier,
      data: formulary,
    });
  } catch (error) {
    console.error('Formulary fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch formulary data' },
      { status: 500 }
    );
  }
}
