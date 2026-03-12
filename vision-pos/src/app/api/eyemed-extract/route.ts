import { NextRequest, NextResponse } from 'next/server'

const EXTRACTION_PROMPT = `You are reading an EyeMed vision benefit authorization document.
Extract ALL benefit data and return ONLY a valid JSON object — no markdown, no explanation, just raw JSON.

Extract these exact fields (use null if not found):

{
  "patient_name": "string",
  "patient_dob": "string",
  "patient_age": number,
  "plan_name": "string",
  "member_id": "string",

  "exam_copay": number,
  "retinal_imaging_fee": number,

  "cl_fit_standard": number or null,
  "cl_fit_standard_type": "flat" or "discount",
  "cl_fit_standard_pct": number (0.0-1.0) or null,
  "cl_fit_premium": number or null,
  "cl_fit_premium_type": "flat" or "discount",
  "cl_fit_premium_pct": number (0.0-1.0, e.g. 0.10 for "10% off") or null,
  "cl_fit_premium_allowance": number (the dollar allowance before discount applies, e.g. 55) or null,

  "frame_allowance": number,
  "frame_overage_discount": number (e.g. 0.20 for 20% off),

  "contacts_allowance": number,
  "contacts_allowance_type": "disposable" or "conventional" or "both",
  "contacts_overage_pct": number (patient pays this % of overage, e.g. 1.0 = 100%),

  "lens_sv": number,
  "lens_bifocal": number,
  "lens_trifocal": number,

  "progressive_standard": number or null,
  "progressive_tier_1": number or null,
  "progressive_tier_2": number or null,
  "progressive_tier_3": number or null,
  "progressive_tier_4": number or null,
  "progressive_tier_4_type": "flat" or "copay_plus_overage",
  "progressive_tier_4_copay": number or null,
  "progressive_tier_4_allowance": number or null,
  "progressive_tier_4_overage_discount": number (e.g. 0.20) or null,
  "progressive_tier_5": number or null,

  "material_poly": number or null,
  "poly_free_under_18": true or false,
  "material_hi": number or null,
  "material_hi_type": "flat" or "discount",
  "material_hi_pct": number or null,
  "material_uhi": number or null,
  "material_uhi_type": "flat" or "discount",
  "material_uhi_pct": number or null,
  "material_trivex": number or null,
  "material_trivex_type": "flat" or "discount",
  "material_trivex_pct": number or null,

  "ar_standard": number or null,
  "ar_tier_1": number or null,
  "ar_tier_2": number or null,
  "ar_tier_3": number or null,
  "ar_premium_pct": number (0.0-1.0, e.g. 0.20 if plan says "20% off retail" for premium AR) or null,

  "photochromic": number or null,

  "polarized": number or null,
  "polarized_type": "flat" or "discount",
  "polarized_pct": number or null,

  "tint": number or null,
  "uv_included": true or false,
  "uv_coating": number or null,

  "addons_flat": number or null,
  "addons_type": "flat" or "discount",
  "addons_pct": number or null
}

For discount fields: if the plan says "20% off retail" set type="discount" and pct=0.20.
For flat copay fields: set the dollar amount directly.
For progressive Tier 4 that shows "$X copay + 20% off overage above $Y allowance": set type="copay_plus_overage".`

export async function POST(request: NextRequest) {
  try {
    const { pdfBase64 } = await request.json()

    if (!pdfBase64) {
      return NextResponse.json({ error: 'No PDF data provided' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdfBase64,
                },
              },
              {
                type: 'text',
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Claude API error:', errorText)
      return NextResponse.json({ error: `Claude API error: ${response.status}` }, { status: 500 })
    }

    const data = await response.json()

    // Log token usage
    const usage = data.usage
    console.log(`📊 Token Usage - Input: ${usage?.input_tokens}, Output: ${usage?.output_tokens}, Total: ${(usage?.input_tokens || 0) + (usage?.output_tokens || 0)}`)

    const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text ?? ''

    // Parse JSON — strip any accidental markdown fences
    const clean = text.replace(/```json|```/g, '').trim()
    const benefits = JSON.parse(clean)

    return NextResponse.json({ benefits, raw: clean, usage })
  } catch (error) {
    console.error('Extraction error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
