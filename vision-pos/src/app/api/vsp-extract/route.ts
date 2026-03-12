import { NextRequest, NextResponse } from 'next/server'

const EXTRACTION_PROMPT = `You are reading a VSP (Vision Service Plan) insurance authorization document.
This could be either:
1. A "Patient Record Report" - contains member info, copays, and allowances
2. A "Lens Enhancement Charges" sheet - contains the matrix of lens copays by code

Extract ALL benefit data and return ONLY a valid JSON object — no markdown, no explanation, just raw JSON.

Extract these exact fields (use null if not found):

{
  "document_type": "patient_record" or "lens_enhancement" or "combined",

  "patient_name": "string",
  "patient_dob": "string",
  "patient_age": number,
  "plan_name": "string",
  "member_id": "string",
  "authorization_number": "string",
  "auth_date": "string",
  "expiration_date": "string",

  "exam_copay": number,
  "materials_copay": number,

  "frame_allowance_featured": number (Marchon/featured brand allowance),
  "frame_allowance_retail": number (other frames allowance),
  "frame_overage_discount": number (e.g., 0.20 for 20% off),

  "contact_allowance": number,
  "contact_fitting_copay": number or null,

  "lens_copays": {
    // PROGRESSIVE + MATERIAL MATRIX (two-letter codes)
    // First letter = Progressive tier: K=Standard, J=Comfort DRx, F=Comfort Max, O=Custom, N=Varilux X
    // Second letter = Material: A=CR-39, D=Poly, B=Trivex, H=1.67, J=1.74, P=Poly Plus

    // Single Vision materials (with _sv suffix)
    "KA_sv": number or null (SV + CR-39),
    "KD_sv": number or null (SV + Poly),
    "KB_sv": number or null (SV + Trivex),
    "KH_sv": number or null (SV + 1.67),
    "KJ_sv": number or null (SV + 1.74),

    // Standard Progressive (K tier)
    "KA": number or null (Standard Prog + CR-39),
    "KD": number or null (Standard Prog + Poly),
    "KB": number or null (Standard Prog + Trivex),
    "KH": number or null (Standard Prog + 1.67),
    "KJ": number or null (Standard Prog + 1.74),

    // Premium J tier (Varilux Comfort DRx)
    "JA": number or null,
    "JD": number or null,
    "JB": number or null,
    "JH": number or null,
    "JJ": number or null,

    // Premium F tier (Varilux Comfort Max)
    "FA": number or null,
    "FD": number or null,
    "FB": number or null,
    "FH": number or null,
    "FJ": number or null,

    // Custom O tier
    "OA": number or null,
    "OD": number or null,
    "OB": number or null,
    "OH": number or null,
    "OJ": number or null,

    // Custom N tier (Varilux X)
    "NA": number or null,
    "ND": number or null,
    "NB": number or null,
    "NH": number or null,
    "NJ": number or null,

    // AR Coatings (flat copays)
    "QM": number or null (Standard AR),
    "QT": number or null (Premium AR Tier 1),
    "QV": number or null (Premium AR Tier 2 - Crizal),

    // Enhancements (flat copays)
    "PR": number or null (Photochromic/Transitions),
    "LF": number or null (Blue Light Filter),
    "DA": number or null (Polarized),
    "MN": number or null (Tint),
    "TA": number or null (Tech Add-on),
    "SP": number or null (Edge Polish),
    "SW": number or null (Drill Mount/Rimless)
  }
}

EXTRACTION RULES:
1. "$XX copay" → extract number XX only
2. "Covered" / "No copay" / "$0" → 0
3. Look for tables with two-letter codes (KA, KD, JA, etc.)
4. The lens enhancement sheet has a grid - extract all visible copay amounts
5. Featured frame brands include: Marchon, Nike, Lacoste, Columbia, Dragon, Flexon, etc.
6. If you see both MF (multifocal) and SV (single vision) columns, extract both
7. For percentages like "20% off", return as decimal (0.20)`

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
        max_tokens: 3000,
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
    console.log(`📊 VSP Token Usage - Input: ${usage?.input_tokens}, Output: ${usage?.output_tokens}`)

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
