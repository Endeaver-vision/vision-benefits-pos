/**
 * Haiku Pricing Service
 * Uses Claude Haiku to extract insurance benefits and build price lists
 */

import Anthropic from "@anthropic-ai/sdk";
import { EYEMED_PRICING_PROMPT } from "@/lib/prompts/eyemed-pricing-prompt";

interface ExtractedBenefits {
  examCopay: number;
  contactLensExamCopay?: number;
  singleVisionCopay: number;
  bifocalCopay: number;
  trifocalCopay: number;
  lenticularCopay: number;
  progressiveStandardCopay: number;
  progressiveTier1Copay?: number;
  progressiveTier2Copay?: number;
  progressiveTier3Copay?: number;
  progressiveTier4Copay?: number;
  progressiveTier5Copay?: number;
  arStandardCopay: number;
  arTier1Copay?: number;
  arTier2Copay?: number;
  arTier3Copay?: number;
  photochromicCopay?: number;
  polycarbonateUnder19Copay: number;
  polycarbonate19PlusCopay: number;
  highIndexCopay?: number;
  frameAllowance: number;
  frameOverageDiscount: string;
  contactLensAllowance?: number;
  scratchCoatingCopay?: number;
  tintCopay?: number;
  uvTreatmentCopay?: number;
  polarizedCopay?: number;
  oversizeLensCopay?: number;
  allOtherLensOptionsCopay: string | number;
  notes?: string;
}

interface PricedProduct {
  productName: string;
  category: string;
  tier: string;
  copay?: number;
  copayAge18?: number;
  copayAge19?: number;
  rulesApplied: string[];
  notes: string;
}

export interface HaikuPricingResult {
  extractedBenefits: ExtractedBenefits;
  pricedProducts: PricedProduct[];
  pricingNotes: string;
}

/**
 * Process an insurance document with Haiku to extract benefits and build price list
 * @param pdfPath - File path to PDF document
 * @param carrier - Insurance carrier (currently "EYEMED")
 * @returns Extracted benefits and priced products
 */
export async function processInsuranceWithHaiku(
  pdfPath: string,
  carrier: "EYEMED" | "VSP" | "SPECTERA" = "EYEMED"
): Promise<HaikuPricingResult> {
  const client = new Anthropic();
  const fs = await import("fs");

  // Select appropriate prompt based on carrier
  let prompt = EYEMED_PRICING_PROMPT;
  if (carrier === "VSP" || carrier === "SPECTERA") {
    throw new Error(`Pricing prompt for ${carrier} not yet implemented`);
  }

  // Read PDF file
  const pdfBuffer = fs.readFileSync(pdfPath);

  // Call Claude with the prompt and PDF file
  const modelName = process.env.EXTRACTION_MODEL || "claude-haiku-4-5-20251001";
  const message = await client.messages.create({
    model: modelName,
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBuffer.toString("base64"),
            },
          },
        ],
      },
    ],
  });

  // Extract the response text
  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Log response text to file for debugging
  console.log(`[Haiku Service] Raw response length: ${responseText.length}`);
  if (responseText.length > 15000) {
    console.log(`[Haiku Service] Response is very long (${responseText.length} chars), may be truncated in logs`);
  }

  // Parse the JSON response
  let result: HaikuPricingResult;
  try {
    // Remove markdown backticks if present
    let cleanText = responseText.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7); // Remove ```json
    }
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3); // Remove ```
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.substring(0, cleanText.length - 3); // Remove trailing ```
    }
    cleanText = cleanText.trim();

    console.log(`[Haiku Service] Cleaned text length: ${cleanText.length}`);

    // Find the first opening brace
    const startIdx = cleanText.indexOf("{");
    if (startIdx === -1) {
      throw new Error("No JSON object found in response");
    }

    // Find matching closing brace by counting braces and handling strings
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let endIdx = -1;

    for (let i = startIdx; i < cleanText.length; i++) {
      const char = cleanText[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{") {
          braceCount++;
        } else if (char === "}") {
          braceCount--;
          if (braceCount === 0) {
            endIdx = i;
            break;
          }
        }
      }
    }

    if (endIdx === -1) {
      console.error("[Haiku Service] Could not find matching closing brace");
      console.error("[Haiku Service] Cleaned text around start:", cleanText.substring(startIdx, Math.min(startIdx + 500, cleanText.length)));
      console.error("[Haiku Service] Cleaned text end (last 300 chars):", cleanText.substring(Math.max(0, cleanText.length - 300)));
      throw new Error("Could not find matching closing brace in JSON");
    }

    let jsonStr = cleanText.substring(startIdx, endIdx + 1);

    // Try to fix trailing commas in the JSON
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");

    console.log(`[Haiku Service] Extracted JSON length: ${jsonStr.length}`);
    result = JSON.parse(jsonStr) as HaikuPricingResult;
    console.log("[Haiku Service] Successfully parsed JSON");
  } catch (error) {
    console.error("[Haiku Service] Failed to parse response");
    console.error("[Haiku Service] Response text length:", responseText.length);
    console.error("[Haiku Service] Response text (start):", responseText.substring(0, 500));
    console.error("[Haiku Service] Response text (end):", responseText.substring(Math.max(0, responseText.length - 500)));
    throw new Error(
      `Failed to parse pricing result from Haiku: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return result;
}

/**
 * Validate that extracted benefits have required fields
 */
export function validateExtractedBenefits(
  benefits: ExtractedBenefits
): string[] {
  const errors: string[] = [];

  if (benefits.examCopay === undefined || benefits.examCopay === null) {
    errors.push("Missing examCopay");
  }
  if (benefits.singleVisionCopay === undefined) {
    errors.push("Missing singleVisionCopay");
  }
  if (benefits.frameAllowance === undefined) {
    errors.push("Missing frameAllowance");
  }

  return errors;
}

/**
 * Validate that priced products have required fields
 */
export function validatePricedProducts(products: PricedProduct[]): string[] {
  const errors: string[] = [];

  if (!Array.isArray(products) || products.length === 0) {
    errors.push("No priced products found");
    return errors;
  }

  products.forEach((product, index) => {
    if (!product.productName) {
      errors.push(`Product ${index}: Missing productName`);
    }
    if (!product.category) {
      errors.push(`Product ${index}: Missing category`);
    }
    if (!product.tier) {
      errors.push(`Product ${index}: Missing tier`);
    }
    if (product.copay === undefined && !product.notes.includes("age")) {
      errors.push(`Product ${index} (${product.productName}): Missing copay`);
    }
    if (!Array.isArray(product.rulesApplied)) {
      errors.push(
        `Product ${index} (${product.productName}): Missing rulesApplied array`
      );
    }
  });

  return errors;
}
