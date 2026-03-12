/**
 * POST /api/documents/[id]/process-haiku
 *
 * Process insurance document using Claude Haiku to extract benefits and build price list
 *
 * Haiku Extraction Pipeline:
 * 1. Retrieve document from database
 * 2. Extract text from PDF file
 * 3. Send to Haiku with comprehensive EyeMed pricing prompt
 * 4. Parse returned benefits and priced products
 * 5. Save results to database
 */

import { NextRequest, NextResponse } from "next/server";
import { processInsuranceWithHaiku } from "@/lib/services/haiku-pricing-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id } = await params;

    // Import prisma here to avoid circular dependency
    const { prisma } = await import("@/lib/prisma");

    // Get the document
    const document = await prisma.insuranceDocument.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Check if already processing
    if (
      document.ocrStatus === "processing" ||
      document.gptStatus === "processing"
    ) {
      return NextResponse.json(
        { success: false, error: "Document is already being processed" },
        { status: 409 }
      );
    }

    // Mark as processing
    await prisma.insuranceDocument.update({
      where: { id },
      data: {
        gptStatus: "processing",
        extractedData: null,
      },
    });

    // Verify PDF file exists
    console.log(`[Haiku Processing] Processing: ${document.fileName}`);

    const fs = await import("fs");
    if (!fs.existsSync(document.filePath)) {
      throw new Error(`PDF file not found at ${document.filePath}`);
    }

    // Detect carrier from filename
    const carrier = detectCarrier(document.fileName);
    console.log(`[Haiku Processing] Detected carrier: ${carrier}`);

    if (carrier !== "EYEMED") {
      return NextResponse.json(
        {
          success: false,
          error: `Haiku processing only supports EYEMED currently. Detected: ${carrier}`,
        },
        { status: 400 }
      );
    }

    // Process with Haiku - pass PDF file path
    console.log("[Haiku Processing] Sending to Claude Haiku...");
    const result = await processInsuranceWithHaiku(document.filePath, carrier);

    console.log(
      `[Haiku Processing] Received ${result.pricedProducts.length} priced products`
    );

    // Save to database
    await prisma.insuranceDocument.update({
      where: { id },
      data: {
        gptStatus: "completed",
        gptProcessedAt: new Date(),
        carrier,
        extractedData: result.extractedBenefits as any,
      },
    });

    // Also save/update authorization record
    let authId = document.authorizationId;

    if (!authId) {
      // Create new authorization
      const auth = await prisma.insuranceAuthorization.create({
        data: {
          customerId: document.customerId,
          documentId: id,
          carrier,
          planName:
            (result.extractedBenefits as any).planName || "Unknown Plan",
          isActive: true,
          copays: result.extractedBenefits as any,
          examCopay: (result.extractedBenefits as any).examCopay,
          materialsCopay: 0, // EyeMed doesn't have materials copay
          frameAllowance: (result.extractedBenefits as any).frameAllowance || 0,
          authDate: new Date(),
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });
      authId = auth.id;
    } else {
      // Update existing authorization
      await prisma.insuranceAuthorization.update({
        where: { id: authId },
        data: {
          copays: result.extractedBenefits as any,
          examCopay: (result.extractedBenefits as any).examCopay,
          frameAllowance: (result.extractedBenefits as any).frameAllowance || 0,
        },
      });
    }

    // Save priced products
    for (const product of result.pricedProducts) {
      await prisma.pricedProduct.upsert({
        where: {
          authorizationId_productName: {
            authorizationId: authId,
            productName: product.productName,
          },
        },
        create: {
          authorizationId: authId,
          productName: product.productName,
          category: product.category,
          tier: product.tier,
          copay: product.copay || 0,
          rulesApplied: product.rulesApplied,
          notes: product.notes,
        },
        update: {
          copay: product.copay || 0,
          rulesApplied: product.rulesApplied,
          notes: product.notes,
        },
      });
    }

    console.log(
      `[Haiku Processing] Complete. Processed in ${Date.now() - startTime}ms`
    );

    return NextResponse.json({
      success: true,
      documentId: id,
      authorizationId: authId,
      carrier,
      benefitsExtracted: Object.keys(result.extractedBenefits).length,
      productsPreiced: result.pricedProducts.length,
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[Haiku Processing] Error:", error);

    const { id } = await params;
    const { prisma } = await import("@/lib/prisma");

    // Mark as failed
    await prisma.insuranceDocument.update({
      where: { id },
      data: {
        gptStatus: "failed",
        gptError: error instanceof Error ? error.message : String(error),
      },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error during processing",
        processingTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * Detect insurance carrier from filename
 */
function detectCarrier(fileName: string): "EYEMED" | "VSP" | "SPECTERA" {
  const lowerFileName = fileName.toLowerCase();

  if (lowerFileName.includes("eyemed") || lowerFileName.includes("eye-med")) {
    return "EYEMED";
  }

  if (lowerFileName.includes("vsp") || lowerFileName.includes("vision-service")) {
    return "VSP";
  }

  if (lowerFileName.includes("spectera")) {
    return "SPECTERA";
  }

  // Default to EyeMed
  return "EYEMED";
}
