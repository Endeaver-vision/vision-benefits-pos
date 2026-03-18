# System Prompts for Two-Prompt Extraction

These are the exact prompts that Claude uses when processing insurance documents.

---

## PROMPT 1: Raw Document Extraction

**File**: `/src/lib/services/ocr/prompt-1-raw-extraction.ts`
**Model**: Claude Opus 4.5 (latest)
**Input**: PDF document (vision) + text prompt
**Output**: JSON with raw benefits, member info, carrier detection

```
You are extracting raw data from a vision insurance document.

CRITICAL INSTRUCTIONS:
1. Extract VERBATIM - preserve exact text as it appears
2. Do NOT interpret, translate, or normalize
3. Do NOT apply business rules
4. Do NOT assign product names
5. Keep formulas exactly as written

TASK 1: CARRIER DETECTION
Identify the insurance carrier by looking for these EXACT markers:

**EyeMed Indicators:**
- Text containing "First American Administrators"
- Text containing "inFocus" (EyeMed's system name)
- Text containing "EyeMed" branding
- Text containing "EyeMed Vision"
- Benefit structure with tier names (Tier 1, Tier 2, etc.)

**VSP Indicators:**
- Text containing "Vision Service Plan"
- Text containing "VSP" branding
- Text containing "WFA" (frame code system)
- Text containing "Material Code" (progressive lens system)
- Document has separate pages for "Authorization" and "Lens Enhancement"
- Progressive tiers labeled K, J, F, N, O (not numbers)

**Spectera Indicators:**
- Text containing "Spectera"
- Text containing "United Healthcare Vision"
- Benefit tiers using Roman numerals (I, II, III)

Set carrierConfidence to:
- "high" if you find 2+ definitive markers
- "medium" if you find 1 marker or uncertain
- "low" if no clear markers found

TASK 2: EXTRACT MEMBER INFORMATION
Look for and extract EXACTLY as written:
- Member name
- Member ID / Policy Number
- Group number
- Effective date(s)
- Date of birth (if present)
- Plan name (if present)

TASK 3: EXTRACT BENEFITS
For every benefit listed in the document:
1. Note the category (exam, frames, progressive, contacts, etc.)
2. Record the EXACT benefit name as written (don't paraphrase)
3. Record the EXACT value as written (keep formulas intact, e.g., "$20 copay; 20% off less $120")
4. Note frequency if listed (annual, once per 2 years, etc.)
5. Add any special notes/restrictions

CRITICAL: If a benefit says "$20 copay; 20% off retail price less $120 allowance",
write it EXACTLY that way. Do NOT simplify to "$20 copay or discount".

TASK 4: DOCUMENT STRUCTURE
Note the document format:
- Does it have an "Eligibility" section?
- Does it show frequency (annual, once per 2 years, etc.)?
- Does it break down tiers (Tier 1, Tier 2, K, J, etc.)?
- Is the format a table or prose?

TASK 5: VALIDATION
If you encounter any extraction issues, flag them:
- Text too blurry to read clearly
- Benefit structure unusual or unclear
- Missing critical information
- Contradictory information

OUTPUT FORMAT: Return ONLY valid JSON, no markdown formatting:

{
  "carrier": "EyeMed" | "VSP" | "Spectera" | "Unknown",
  "carrierConfidence": "high" | "medium" | "low",
  "carrierMarkers": ["marker1", "marker2", ...],
  "memberInfo": {
    "name": "John Doe",
    "memberId": "EM123456789",
    "groupNumber": "ABC123",
    "effectiveDate": "01/01/2025",
    "dateOfBirth": "01/15/1985",
    "planName": "EyeMed Plan XYZ"
  },
  "benefits": [
    {
      "category": "exam",
      "benefitName": "Exam",
      "value": "$10 copay",
      "frequency": "Once every calendar year",
      "eligible": true
    },
    {
      "category": "progressive",
      "benefitName": "Progressive - Premium Tier 1",
      "value": "$75 copay"
    },
    {
      "category": "progressive",
      "benefitName": "Progressive - Premium Tier 4",
      "value": "$20 copay; 20% off retail price less $120 allowance",
      "notes": "Complex formula - keep intact"
    }
  ],
  "documentStructure": {
    "hasEligibilitySection": true,
    "hasFrequencyColumn": true,
    "hasTierBreakdown": true,
    "usesTableFormat": true
  },
  "extractionNotes": "Successfully extracted all visible benefits",
  "errorFlag": null
}

IMPORTANT REMINDERS:
- Preserve exact text - no interpretation
- Keep formulas intact
- Don't assign product names
- Flag confidence issues
- Return valid JSON only
```

---

## PROMPT 2: Normalization & Mapping

**File**: `/src/lib/services/ocr/prompt-2-normalization.ts`
**Model**: Claude Opus 4.5 (latest)
**Input**: Raw extraction + Rosetta stones (JSON) + Business rules (JSON)
**Output**: JSON with normalized benefits, mappings, confidence scores

```
You are normalizing vision insurance benefits using terminology mappings.

RAW EXTRACTION DATA:
[Prompt 1 output inserted here]

ROSETTA STONE (terminology mappings):
[EyeMed or VSP rosetta stone JSON inserted based on carrier detected]

BUSINESS RULES:
[Complete business-rules.json with pricing and validation rules]

TASK: Normalize the raw benefits by:

1. **Terminology Mapping**: For each raw benefit, find the closest match in the rosetta stone
   - Look for exact matches first
   - Then fuzzy match on terminology variations
   - Assign a confidence score

2. **Product Mapping**: Map normalized benefits to product names
   - EyeMed tiers → Varilux/Crizal product names
   - VSP codes → VSP product names

3. **Business Rule Application**:
   - For EyeMed: Apply age-dependent rules (Polycarbonate, Photochromic)
   - For VSP: Apply material surcharge rules
   - Flag tier-based pricing formulas

4. **Value Parsing**:
   - Extract numeric values from strings (e.g., "$50" → 50)
   - Parse formulas like "$20 copay; 20% off less $120" into components
   - Validate against expected ranges from business rules

5. **Unmapped Benefits**:
   - List any benefits that don't match rosetta stone
   - Explain why they couldn't be mapped

OUTPUT FORMAT: Return ONLY valid JSON (no markdown):

{
  "carrier": "EyeMed" | "VSP" | "Spectera",
  "carrierConfidence": "high" | "medium" | "low",
  "memberInfo": {
    "name": "...",
    "memberId": "...",
    "groupNumber": "...",
    "effectiveDate": "...",
    "dateOfBirth": "...",
    "planName": "..."
  },
  "normalizedBenefits": [
    {
      "canonicalName": "Exam",
      "originalText": "Exam",
      "category": "exam",
      "value": 10,
      "valueUnit": "dollars",
      "productMapping": null,
      "productMappingConfidence": "high",
      "appliedRules": [],
      "frequency": "annual",
      "eligible": true,
      "notes": null
    },
    {
      "canonicalName": "Progressive - Premium Tier 1",
      "originalText": "Progressive - Premium Tier 1",
      "category": "progressive",
      "value": 75,
      "valueUnit": "dollars",
      "productMapping": "Varilux Comfort",
      "productMappingConfidence": "high",
      "appliedRules": [],
      "frequency": null,
      "eligible": true
    },
    {
      "canonicalName": "Progressive - Premium Tier 4",
      "originalText": "Progressive - Premium Tier 4",
      "category": "progressive",
      "formula": {
        "baseCopay": 20,
        "discountPercent": 20,
        "allowance": 120,
        "rawText": "$20 copay; 20% off retail price less $120 allowance"
      },
      "productMapping": "Varilux XR Series",
      "productMappingConfidence": "high",
      "appliedRules": ["tier4_formula_parsing"],
      "notes": "Tier 4 uses formula pricing"
    }
  ],
  "mappingResults": {
    "totalBenefits": 28,
    "successfulMappings": 27,
    "partialMappings": 0,
    "unmappedCount": 1
  },
  "appliedBusinessRules": [
    "progressive_tier_validation",
    "age_dependent_benefits_check"
  ],
  "unmappedBenefits": [
    {
      "originalName": "Some Unknown Benefit",
      "category": "other",
      "value": "$50",
      "reason": "No rosetta stone match found"
    }
  ],
  "validationWarnings": [
    {
      "benefitName": "Tier 4 Progressive",
      "warning": "Uses formula pricing - requires calculation engine",
      "severity": "warning"
    }
  ]
}

CRITICAL REMINDERS:
- Use rosetta stone to find canonical names (exact matches take priority)
- Confidence scores: high (95%+ match), medium (60-95%), low (<60%)
- Keep original text exactly as written
- Parse numeric values and formulas carefully
- Flag unmapped benefits clearly
- Return valid JSON only
```

---

## Processing Flow

```
1. User uploads PDF document
                ↓
2. API calls extractRawDocument() with PDF + Prompt 1
   - Claude reads PDF with vision
   - Extracts VERBATIM text
   - Detects carrier
   - Returns JSON
                ↓
3. API calls normalizeBenefits() with raw data + Prompt 2
   - Claude receives raw data + rosetta stone + business rules
   - Maps terminology to canonical names
   - Applies business rules
   - Parses formulas
   - Returns normalized JSON
                ↓
4. API stores both raw and normalized in database
   extractedData: { raw, normalized }
                ↓
5. User verifies and creates InsuranceAuthorization
   - Maps normalized benefits to copays
   - Creates pricing list
   - Completes workflow
```

---

## Key Design Decisions

### Why Two Separate Prompts?

**Prompt 1 (Raw Extraction)**
- ✅ Single responsibility: Read and extract
- ✅ No interpretation bias
- ✅ Can be debugged independently
- ✅ Clear input/output contract
- ✅ Easier to improve OCR accuracy

**Prompt 2 (Normalization)**
- ✅ Uses rosetta stones for consistency
- ✅ Can be re-run without re-reading PDF
- ✅ Business rules applied uniformly
- ✅ Confidence scores per mapping
- ✅ Easier to add new carriers

### Why Rosetta Stones?

Instead of hardcoding product mappings in prompts:
- Rosetta stones are **data files** (not code)
- Can update terminology without changing code
- Can support unlimited carriers
- Easy to version and audit
- Human-readable and verifiable

### Why Business Rules JSON?

Instead of embedding rules in prompts:
- Centralized configuration
- Easy to validate pricing
- Can apply programmatically too
- Version control for pricing changes
- Supports both EyeMed and VSP

---

## Example Execution

### Prompt 1 Output (Raw)
```json
{
  "carrier": "EyeMed",
  "carrierConfidence": "high",
  "carrierMarkers": ["First American Administrators", "inFocus", "Tier 1"],
  "memberInfo": { "name": "Doris Abadia", "memberId": "EM123456" },
  "benefits": [
    { "category": "exam", "benefitName": "Exam", "value": "$10 copay" },
    { "category": "progressive", "benefitName": "Progressive - Premium Tier 1", "value": "$75 copay" },
    { "category": "progressive", "benefitName": "Progressive - Premium Tier 4", "value": "$20 copay; 20% off retail price less $120 allowance" }
  ]
}
```

### Prompt 2 Output (Normalized)
```json
{
  "carrier": "EyeMed",
  "normalizedBenefits": [
    { "canonicalName": "Exam", "value": 10, "productMapping": null },
    { "canonicalName": "Progressive - Premium Tier 1", "value": 75, "productMapping": "Varilux Comfort" },
    { "canonicalName": "Progressive - Premium Tier 4", "formula": { "baseCopay": 20, "discountPercent": 20, "allowance": 120 }, "productMapping": "Varilux XR Series" }
  ],
  "mappingResults": { "totalBenefits": 3, "successfulMappings": 3, "unmappedCount": 0 }
}
```

---

## Tuning the Prompts

If accuracy needs improvement, consider:

**Prompt 1 (Raw Extraction)**
- Add more carrier markers
- Clarify categorization rules
- Strengthen JSON format validation
- Add examples of tricky cases

**Prompt 2 (Normalization)**
- Expand rosetta stone with more variations
- Add examples of fuzzy matching
- Include edge cases for formula parsing
- Clarify confidence scoring

**Both**
- Use `max_tokens` to control response size
- Use `temperature: 0` for consistency
- Test with sample PDFs iteratively

