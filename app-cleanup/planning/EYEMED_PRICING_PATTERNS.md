# EyeMed Pricing Format Library

## Based on analysis of 44 EyeMed authorization documents (comprehensive scan complete)

---

## PLAN TYPES

### Type 1: Tiered + Simple Copays
Plans with full progressive/AR tier structure, all values are simple dollar copays.
- **Examples**: Orlando Health (Insight 201 T4P FF 360), Humana VCP State of Florida
- **Characteristics**:
  - Progressive tiers 1-4 (or 1-5) all have `$X copay` values
  - AR tiers 1-3 all have copay values
  - No formulas in any field

### Type 2: Tiered + Formula (CRITICAL)
Plans with tiered structure where SOME tiers use formulas instead of simple copays.
- **Examples**: Angela Clayton (Access 101 FF 360), Daniel Foster (HCA), Joseph Hernandez (Osceola County), Steven Zhang (Siemens)
- **Characteristics**:
  - Tiers 1-3 often simple copays
  - **Tier 4 uses formula**: `$X copay; 20% off retail price less $120 allowance`
  - AR Tier 3 often uses discount: `20% off retail price`
  - May have formulas on Contact Lens Fit Premium

### Type 3: Simplified Tier Structure
Plans with only Standard/Premium progressive tiers (no Tier 1-4).
- **Examples**: Ecolab Active, TeamCare, Aetna Material Schedule
- **Characteristics**:
  - Only "Progressive - Standard" and "Progressive - Premium"
  - No numbered tiers
  - Both may have same copay value

### Type 4: Discount-Only
Plans with no tier structure, everything is percentage discounts.
- **Examples**: Gerri Bishop (Anthem), Thomas Chadwick (GEHA)
- **Characteristics**:
  - No progressive tiers listed
  - All values are `X% off retail price`
  - No copay structure

### Type 5: Package-Based
Plans that bundle frame + lens + options into one package benefit.
- **Examples**: Joana Black (Humana Medicare 703)
- **Characteristics**:
  - No individual lens/AR tiers
  - Single line: `Frame, Lens and Lens Options Package`
  - Uses allowance-based formula

### Type 6: Declining Balance (Partial)
Plans with shared balance pools for certain services but standard copays for others.
- **Examples**: Stephen Glass (Humana VCP State of Florida), Cruzbel Blanco (CIGNA)
- **Characteristics**:
  - "Declining Balance Packages" section
  - Shared balance for CL + Fit/Follow-up
  - Values like `85% of amount over remaining balance`
  - Still has tiered progressive copays

### Type 7: Pure Declining Balance (NEW)
Plans where EVERYTHING draws from shared pools - no individual copays.
- **Examples**: James Grant (HealthSpring Medicare, Cigna Central FL)
- **Characteristics**:
  - Multiple balance pools (e.g., $200 CL + $200 Frame/Lens)
  - ALL values are `X% of amount over remaining balance`
  - NO copays, NO tiers
  - Just Standard vs Premium distinction
  - Requires tracking remaining balance across services

### Type 8: Discount + Simplified (NEW)
Plans with discount pricing and only Standard/Premium tiers (no numbered tiers).
- **Examples**: Annette Narvaez (GEHA Select Wrap)
- **Characteristics**:
  - Frame: `40% off retail price` (no allowance formula)
  - Progressive: Standard ($X) + Premium (20% off)
  - AR: Standard ($X) + Premium (20% off)
  - Transaction requirement for full discount
  - Contacts: may have NO coverage (`100% of retail price`)

### Type 9: Tiered + Declining HYBRID (NEW)
Plans with tiered copays for lenses/AR but declining balance ONLY for contacts.
- **Examples**: Maya Koziatek (FEDVIP HIGH)
- **Characteristics**:
  - Full progressive tiers (1-4) with copays
  - Full AR tiers (1-3) with copays
  - Standard copays for materials (poly, photochromic)
  - BUT contacts use declining balance: `15% of amount over remaining balance`
  - Contact allowance pool: `$200`, `$250`, etc.
  - Best of both worlds - tiered precision for lenses, flexibility for contacts
  - **Tier 4 can be remarkably low**: $20 copay (lowest found)
  - Frame allowance can be high: up to $300

---

## VALUE FORMAT PATTERNS

### Pattern 1: Simple Copay
```
$X copay
$X
```
- **Regex**: `^\$(\d+(?:\.\d{2})?)\s*(?:copay)?$`
- **Examples**: `$10 copay`, `$25`, `$185 copay`, `$0 copay`
- **Calculation**: Patient pays exactly $X

### Pattern 2: Zero Copay (Fully Covered)
```
$0 copay
$0
```
- **Regex**: `^\$0\s*(?:copay)?$`
- **Examples**: `$0 copay` (Polycarbonate under 19)
- **Calculation**: Insurance covers 100%

### Pattern 3: Percent Discount
```
X% off retail price
```
- **Regex**: `^(\d+)%\s+off\s+retail\s+price$`
- **Examples**: `20% off retail price`, `35% off retail price`
- **Calculation**: `patient_pays = retail_price * (1 - X/100)`

### Pattern 4: Formula with Allowance (THE PROBLEM CASE)
```
$X copay; Y% off retail price less $Z allowance
$X; Y% off retail price less $Z allowance
```
- **Regex**: `^\$(\d+)(?:\s*copay)?;\s*(\d+)%\s+off\s+retail\s+price\s+less\s+\$(\d+)\s+allowance$`
- **Examples**:
  - `$25 copay; 20% off retail price less $120 allowance` (Angela's Tier 4)
  - `$15 copay; 20% off retail price less $120 allowance` (Joseph's Tier 4)
  - `$85 copay; 20% off retail price less $120 allowance` (Daniel's Tier 4)
  - `$90; 20% off retail price less $120 allowance` (Zachary - no "copay" word)
- **Calculation**:
  ```
  discounted_price = retail_price * (1 - Y/100)
  patient_pays = copay + max(0, discounted_price - allowance)
  ```
- **CRITICAL**: Must extract ALL THREE values (copay, discount%, allowance)

### Pattern 5: Copay + Percent Off Balance Over Allowance
```
$X copay; Y% off balance over $Z allowance
```
- **Regex**: `^\$(\d+)\s*copay;\s*(\d+)%\s+off\s+balance\s+over\s+\$(\d+)\s+allowance$`
- **Examples**:
  - `$0 copay; 20% off balance over $200 allowance` (Frame)
  - `$0 copay; 15% off balance over $150 allowance` (Contacts Conventional)
- **Calculation**:
  ```
  if retail_price <= allowance:
    patient_pays = copay
  else:
    overage = retail_price - allowance
    patient_pays = copay + overage * (1 - Y/100)
  ```

### Pattern 6: 100% of Balance Over Allowance
```
$X copay; 100% of balance over $Z allowance
```
- **Regex**: `^\$(\d+)\s*copay;\s*100%\s+of\s+balance\s+over\s+\$(\d+)\s+allowance$`
- **Examples**: `$0 copay; 100% of balance over $200 allowance` (Contacts Disposable)
- **Calculation**:
  ```
  patient_pays = copay + max(0, retail_price - allowance)
  ```

### Pattern 7: Up to Amount
```
Up to $X
```
- **Regex**: `^Up\s+to\s+\$(\d+)$`
- **Examples**: `Up to $39` (Retinal Imaging), `Up to $40` (Fit and Follow-up Standard)
- **Calculation**: Insurance pays up to $X, patient pays any overage

### Pattern 8: Percent of Amount Over Balance
```
X% of amount over remaining balance
```
- **Regex**: `^(\d+)%\s+of\s+amount\s+over\s+remaining\s+balance$`
- **Examples**: `85% of amount over remaining balance`, `100% of amount over remaining balance`
- **Calculation**: Uses declining balance pool

### Pattern 9: Copay Percent Up to Allowance
```
X% Copay up to $Y Allowance
```
- **Regex**: `^(\d+)%\s+Copay\s+up\s+to\s+\$([0-9,]+)\s+Allowance$`
- **Examples**: `25% Copay up to $1,000 Allowance` (Low Vision Aids)
- **Calculation**: Patient pays X% of cost, insurance max $Y

### Pattern 10: Wholesale Conversion
```
Balance over $X to $Y Retail, equal to $Z Wholesale
```
- **Regex**: Complex wholesale pricing pattern
- **Examples**: `Balance over $250 to $375 Retail, equal to $125 Wholesale`
- **Calculation**: Converts retail overage to wholesale amount

### Pattern 11: 100% of Retail (No Coverage)
```
100% of retail price
```
- **Regex**: `^100%\s+of\s+retail\s+price$`
- **Examples**: `100% of retail price` (Contacts Disposable on discount plans)
- **Calculation**: Patient pays full retail - NO insurance benefit

### Pattern 12: Copay + Percent Off Less Allowance (Fit/Follow-up)
```
$X copay; Y% off retail price less $Z allowance
```
- Same as Pattern 4 but appears on Contact Lens Fit Premium
- **Examples**: `$40 copay; 10% off retail price less $55 allowance`

### Pattern 13: Applied to Remaining Balance (NEW)
```
$X applied to remaining balance
X% of retail price applied to remaining balance
```
- **Regex**: `^\$(\d+)\s+applied\s+to\s+remaining\s+balance$` or `^(\d+)%\s+of\s+retail\s+price\s+applied\s+to\s+remaining\s+balance$`
- **Examples**:
  - `$40 applied to remaining balance` (Fit Standard on declining plans)
  - `90% of retail price applied to remaining balance` (Fit Premium)
  - `85% of retail price applied to remaining balance` (Contacts Conventional)
  - `100% of retail price applied to remaining balance` (Contacts Disposable)
- **Calculation**: Deducts from declining balance pool

### Pattern 14: Percent of Amount Over Remaining Balance
```
X% of amount over remaining balance
```
- **Regex**: `^(\d+)%\s+of\s+amount\s+over\s+remaining\s+balance$`
- **Examples**: `80%`, `85%`, `90%`, `100%` variants
- **Calculation**: Patient pays X% of overage beyond remaining balance
- Used in Pure Declining Balance plans for ALL services

### Pattern 15: Simple Dollar Without "copay" (NEW)
```
$X
```
- **Regex**: `^\$(\d+(?:\.\d{2})?)$`
- **Examples**: `$45`, `$57`, `$68`, `$100`, `$185`
- **Note**: Same as Pattern 1 but without "copay" word - common for AR tiers

---

## SERVICE CATEGORIES

### Exam Services
- Exam: Usually `$0 copay` or `$10 copay`
- Retinal Imaging: Usually `Up to $39`
- Low Vision Supp Testing/Exam: `$0 copay` (when present)

### Contact Lens Fit and Follow-Up
- Standard: Usually `Up to $40` or `$0 copay` or `$40` or `$40 copay`
- Premium: Usually `10% off retail price` OR formula like `$0 copay; 10% off retail price less $40 allowance`

### Frame
- Most common: `$0 copay; 20% off balance over $XXX allowance`
- Allowance values vary: $150, $200, $230, $250
- Discount plans: `35% off retail price`
- Wholesale: `Balance over $250 to $375 Retail, equal to $125 Wholesale`

### Basic Lenses (SV/BF/TF/Lenticular)
- Usually same copay for all: `$10 copay`, `$15 copay`, `$20 copay`
- Lenticular sometimes: `20% off retail price`

### Progressive Lenses
- **Standard**: `$X copay` (usually same as SV/BF/TF) or `$0 copay`
- **Premium Tier 1**: `$X copay` (if tiered) or `$0 copay`
- **Premium Tier 2**: `$X copay`
- **Premium Tier 3**: `$X copay`
- **Premium Tier 4**: Often FORMULA: `$X copay; 20% off retail price less $120 allowance`
- **Premium (no tiers)**: `$X copay` or `20% off retail price`

### AR Coatings
- **Standard**: `$35-$45 copay` or `$45`
- **Premium Tier 1**: `$47-$57 copay`
- **Premium Tier 2**: `$58-$68 copay` or `$85`
- **Premium Tier 3**: `$85-$100 copay` (simple) OR `20% off retail price` (discount)
- **Premium (no tiers)**: `20% off retail price`
- **Note**: AR Tier 3 can be either simple copay OR discount - must detect which!

### Materials
- **Polycarbonate (age 19+)**: `$20-$40` copay
- **Polycarbonate (under 19)**: Usually `$0 copay` (FREE for children)
- **Photochromic/Transitions**: `$65-$88 copay` or `$0 copay` or `$75`
- Note: Age-based conditions are common!

### Other Lens Options
- Scratch Coating: `$0-$15`
- Tint: `$0-$15`
- UV Treatment: `$0-$15`
- Polarized: `$66-$75 copay` (when explicitly listed)
- Mid Index: `$55`
- High Index: `$95`
- Edge Polish: `$14`
- Oversize Lens: `$0 copay` or `$14`
- **All Other Lens Options**: Usually `20% off retail price`

### Contact Lenses
- **Conventional**: `$0 copay; 15% off balance over $XXX allowance`
- **Disposable**: `$0 copay; 100% of balance over $XXX allowance`
- **Medically Necessary**: `$0 copay`
- Allowance values: $100, $120, $150, $200, $250

### Package (Medicare plans)
- **Frame, Lens and Lens Options Package**: `$0 copay; 20% off balance over $450 allowance`

### Other
- **Low Vision Aids**: `25% Copay up to $1,000 Allowance`
- **Additional Glasses Allowance**: `40% off retail price less $100 allowance`

---

## FIELD NAME VARIATIONS

The same field may appear with different labels:

| Standard Name | Variations |
|--------------|------------|
| Fit and Follow-up - Standard | Contact Lens Fit and Follow Standard |
| Fit and Follow-up - Premium | Contact Lens Fit and Follow Premium |
| Anti Reflective Coating - Standard | Anti Reflective Coating |
| Anti Reflective Coating - Premium | Anti Reflective Coating - Premium Tier 1/2/3 |
| Progressive - Standard | Progressive Standard |
| Progressive - Premium Tier 1 | Progressive Premium Tier 1 |
| Progressive - Premium | Progressive - Premium (no tier number, same as Tier 4 formula) |
| All Other Lens Options | All other Lens Options |
| Bifocal | Bifocal - Blended (separate entry, usually 20% off) |
| Frame | Frame - Retail |
| Polycarbonate - Standard | Polycarbonate - Standard (no age split in some plans) |
| Contacts - Medically Necessary | Contacts - Therapeutic (Medically Necessary) |
| Additional Glasses Allowance | Additional Glasses Allowance (second pair discount) |
| Contacts - Conventional | Contacts - Conventional Soft |
| Contacts - Disposable | Contacts - Disposable Soft |

### Additional Lens Option Fields (NEW)
- `Glass` - $0 copay
- `Oversize Lens` - $0 copay or $14
- `Prism` - $0 copay
- `Edge Polish` - $14
- `Mid Index` - $55
- `High Index` - $95

---

## AGE-BASED CONDITIONS

Some values have age conditions embedded:
- `Polycarbonate - Standard - age 19 and over`: `$20` or `$40`
- `Polycarbonate - Standard - under age 19`: `$0 copay`

These MUST be parsed and the patient's age considered during pricing.

---

## EXTRACTION REQUIREMENTS

### For Each Value, Extract:
1. **Field name** (e.g., "Progressive - Premium Tier 4")
2. **Value type** (simple_copay, percent_discount, formula, etc.)
3. **Components**:
   - `copay`: Dollar amount (if present)
   - `discount_percent`: Percentage (if present)
   - `allowance`: Dollar amount (if present)
   - `age_condition`: "under_19", "19_and_over", or null

### Example Extraction for Angela's Auth:
```json
{
  "progressiveTier4": {
    "raw": "$25 copay; 20% off retail price less $120 allowance",
    "type": "formula_with_allowance",
    "copay": 25,
    "discountPercent": 20,
    "allowance": 120
  }
}
```

---

## CALCULATION PRIORITY

When calculating patient price:

1. If formula type → apply full formula
2. If simple copay → patient pays copay
3. If percent discount → apply discount to retail
4. If no value/null → fall back to "All Other Lens Options" (usually 20% off)
5. If no "All Other" → use 80% of retail as default

---

## ADDITIONAL PATTERNS DISCOVERED

### Transaction-Based Discounts
Some plans require items to be purchased together:
- "Frame, Lens, and lens options must be purchased in the same transaction to receive the full discount. If purchased separately, members receive 20% off retail price."

### Variable Discount Percentages
Not all plans use 20% - some use:
- `30% off retail price` (EyeMed Healthy Individual)
- `35% off retail price` (Aetna Material Schedule for frames)

### Field Name Variations (Additional)
- `Lenticular Single Vision` vs `Lenticular`
- Plans may list AR tiers without "Premium" prefix

### Generous Plans (Nearly Everything Free)
Some plans like Paramount Actives have extensive $0 copays:
- Progressive Standard/Premium: $0
- AR Standard: $0
- Polycarbonate: $0
- Photochromic: $0
- Tint/UV/Scratch: $0

---

## DOCUMENTS ANALYZED (44 total)

| Document | Patient | Plan | Type |
|----------|---------|------|------|
| AP_eyemed.pdf | Amanda Pinto | Humana VCP | Tiered+Simple |
| SS_eyemed.pdf | Steven Soto | Orlando Health | Tiered+Simple |
| GB_eyemed.pdf | Gerri Bishop | Anthem | Discount-Only |
| EA_eyemed.pdf | Estefany Carpintero | CIGNA | Tiered+Mixed |
| JB_Benefits.pdf | Jean Bidegare | FEDVIP | Tiered+Formula |
| TC_Benefits-Eyemed.pdf | Thomas Chadwick | GEHA | Discount-Only |
| LA_Eyemed-Benefits.pdf | Lisa Amos | BCBSMA | Tiered+Formula |
| AC_Benefits.pdf | Angela Clayton | Access 101 | Tiered+Formula |
| DF_Benefits-Eyemed.pdf | Daniel Foster | HCA | Tiered+Formula |
| JZ_eyemed.pdf | Zachary Jones | Humana Vision Plus | Tiered+Formula |
| KL_eyemed1.pdf | Kaleb Lamug | TeamCare | Simplified Tier |
| SG_eyemed.pdf | Stephen Glass | Humana VCP Florida | Tiered+Simple+Declining |
| RK_eyemed1.pdf | Robert Kerstetter | Aetna Material | Discount-Only |
| DA_Eyemed-Benefits.pdf | Doris Abadia-Fortis | Orlando Health | Tiered+Simple |
| EF-eyemed.pdf | Joshua Cruz | Orlando Health | Tiered+Simple |
| JH_Eyemed.pdf | Joseph Hernandez | Osceola County | Tiered+Formula |
| ES_Eyemed-Benefits.pdf | Elizabeth Sookram | Orlando Health | Tiered+Simple |
| eyemed-ins.pdf | Chucky Carusotto | Ecolab | Simplified+Special |
| BlackJ_EyeMed.pdf | Joana Black | Humana Medicare | Package-Based |
| ZhangS_VisionMember-Benefits.pdf | Steven Zhang | Siemens Energy | Tiered+Formula |
| CM_Benefits.pdf | Cynthia McBride | FEDVIP Standard | Tiered+Formula+Declining |
| YK_eyemed.pdf | Yuen Mei Kwan | Paramount Actives | Simplified+Generous |
| ER-eyemed.pdf | Eva Reis | EyeMed Healthy Individual | Discount-Only (30%) |
| DD-INS.pdf | Daniel DaSilveira | Access 101 Anthem | Tiered+Formula |
| SL_eyemed.pdf | Syliana Laurent | Marriott (Select 301) | Tiered+Formula |
| AH_Benefits.pdf | Andrew Hess | Humana Vision Plus | Tiered+Formula (no "copay" word) |
| AN_Benefits.pdf | Annette Narvaez | GEHA Select Wrap | Discount+Simplified |
| CB_Benefits.pdf | Cruzbel Blanco | CIGNA C1 PPO | Tiered+Formula+Declining |
| CC_Benefits.pdf | Clifford Clayton | Southeastern Freight | Simplified+Formula |
| JG_Benefits.pdf | James Grant | HealthSpring Medicare | **Pure Declining Balance** |
| JL_Benefits.pdf | Jean Lubin | Home Depot | Tiered+Formula |
| JW_Benefits.pdf | Joyce Williams Robinson | Humana Vision Plan | Tiered+Formula |
| MB_Benefits.pdf | Matthew Bakker | Humana Vision Plan | Tiered+Formula |
| VB_Benefits.pdf | Valmiki Boodram | Orlando Health | **Tiered+Simple (NO formulas!)** |
| EA_Benefits.pdf | Ethan Adams | Aetna 601 FF | Tiered+Formula |
| eyemed-2025-lm.pdf | Lorene Mingione | EyeMed 2025 | **Tiered+Simple (Tier 4=$190, AR3=$85)** |
| eyemed2025-cs.pdf | Courtney Sternick | HCA | Tiered+Formula |
| JA_eyemed-cl-fitting.pdf | Johnnie Alexander | Humana Medicare 694 | Package-Based |
| KW_Benefits.pdf | Karen Worden | Bank of America Retirees | Tiered+Formula (ALL basics $0) |
| MK_Benefits.pdf | Maya Koziatek | FEDVIP HIGH | **Tiered+Declining HYBRID** (Tier 4=$20!) |
| NL_Benefits.pdf | Nancy Laliberte | HealthSpring Medicare | Pure Declining Balance |
| SB_Benefits.pdf | Santiago Blanco Carreno | CIGNA C1 PPO | Tiered+Formula+Declining |
| SL_Benefits.pdf | Savanna Lawson | CIGNA C1 PPO | Tiered+Formula+Declining |
| TH_Benefits.pdf | Timothy Harcus | Orlando Health | **Tiered+Simple (Tier 4=$185, AR3=$100)** |
| YK_Benefits.pdf | Yuen Mei Kwan | Paramount Actives | Simplified+Generous (most $0) |

---

## CRITICAL PARSING RULES

1. **Semicolon is the delimiter** between copay and formula components
2. **"copay" word is optional** - `$90; 20% off...` is same as `$90 copay; 20% off...`
3. **Allowance values vary** - don't hardcode $120, parse from document
4. **Age conditions** must be detected and stored
5. **"All Other Lens Options"** is the fallback for unmapped products
6. **Package-based plans** have no individual tier pricing
7. **Declining balance** requires tracking remaining balance across services

---

## REGEX PATTERNS FOR EXTRACTION

```javascript
const PATTERNS = {
  // Pattern 4: Formula with allowance (THE CRITICAL ONE)
  formulaWithAllowance: /^\$(\d+(?:\.\d{2})?)\s*(?:copay)?;\s*(\d+)%\s+off\s+retail\s+price\s+less\s+\$(\d+)\s+allowance$/i,

  // Pattern 5: Copay + percent off balance over allowance
  copayPlusBalanceOver: /^\$(\d+(?:\.\d{2})?)\s*copay;\s*(\d+)%\s+off\s+balance\s+over\s+\$(\d+)\s+allowance$/i,

  // Pattern 6: 100% of balance over allowance
  fullBalanceOver: /^\$(\d+(?:\.\d{2})?)\s*copay;\s*100%\s+of\s+balance\s+over\s+\$(\d+)\s+allowance$/i,

  // Pattern 1: Simple copay (with or without "copay" word)
  simpleCopay: /^\$(\d+(?:\.\d{2})?)\s*(?:copay)?$/i,

  // Pattern 3: Percent discount
  percentOff: /^(\d+)%\s+off\s+retail\s+price$/i,

  // Pattern 7: Up to amount
  upTo: /^Up\s+to\s+\$(\d+)$/i,

  // Pattern 8: Percent of remaining balance (for pure declining balance plans)
  percentOfRemaining: /^(\d+)%\s+of\s+amount\s+over\s+remaining\s+balance$/i,

  // Pattern 9: Percent copay up to allowance
  percentCopayUpTo: /^(\d+)%\s+Copay\s+up\s+to\s+\$([0-9,]+)\s+Allowance$/i,

  // Pattern 11: 100% of retail (NO coverage)
  fullRetail: /^100%\s+of\s+retail\s+price$/i,

  // Pattern 13: Applied to remaining balance
  appliedToBalance: /^\$(\d+)\s+applied\s+to\s+remaining\s+balance$/i,
  percentAppliedToBalance: /^(\d+)%\s+of\s+retail\s+price\s+applied\s+to\s+remaining\s+balance$/i,
};
```

---

## KEY DISCOVERIES FROM COMPREHENSIVE SCAN

### 1. Tier 4 Can Be Formula OR Simple Copay
- **With formula**: `$25 copay; 20% off retail price less $120 allowance` (Angela Clayton, Daniel DaSilveira, etc.)
- **Simple copay**: `$185 copay` (Valmiki Boodram), `$190 copay` (Lorene Mingione), `$20 copay` (Maya Koziatek)
- **Value range discovered**: $20 (lowest) to $190 (highest) when simple copay
- **CRITICAL**: Extraction must detect which format is used, not assume formula

### 2. "copay" Word Is Optional
- `$90; 20% off retail price less $120 allowance` = valid formula (Andrew Hess)
- `$45` = same as `$45 copay` (common for AR tiers)

### 3. Variable Allowance Amounts
Don't hardcode $120 - allowances vary:
- $120 (most common for Progressive Tier 4)
- $55 (Fit and Follow-up Premium)
- $40 (Fit and Follow-up Premium in some plans)
- $130, $150, $180, $200, $250 (Frame allowances)

### 4. Frame Allowance Variations
- Most common: `$0 copay; 20% off balance over $XXX allowance`
- Discount-only: `40% off retail price` (no allowance at all)
- Pure declining: `80% of amount over remaining balance`

### 5. Plans Without Age-Split Polycarbonate
Some plans have: `Polycarbonate - Standard $40` (no age condition)
Must detect presence/absence of age split

### 6. Bifocal - Blended Is Separate
Some plans list `Bifocal - Blended` separately with `20% off retail price`

### 7. Pure Declining Balance Plans
Entire plan uses `X% of amount over remaining balance` for everything:
- No copays
- No tier copays
- Just Standard vs Premium
- Requires balance tracking

### 8. NO Coverage Indicator
`100% of retail price` = NO insurance coverage (patient pays full retail)

### 9. AR Tier 3 Can Be Simple Copay (NEW)
Previously assumed AR Tier 3 always uses `20% off retail price`, but discovered:
- **Simple copay examples**: `$85 copay` (Lorene Mingione), `$100 copay` (Timothy Harcus)
- **Discount examples**: `20% off retail price` (Angela Clayton, Daniel Foster)
- **CRITICAL**: Must check value format, not assume discount

### 10. Frame Allowance Range (NEW)
Frame allowances vary widely:
- **Lowest**: $100 (some basic plans)
- **Common**: $150, $200, $230
- **Highest discovered**: $300 (Maya Koziatek - FEDVIP HIGH)

### 11. Tiered+Declining HYBRID Plans (NEW)
Some plans mix both systems:
- Tiered copays for Progressive and AR (Tiers 1-4, 1-3)
- Standard copays for materials (poly, photochromic)
- BUT declining balance ONLY for contacts
- Requires detecting which system applies to which service category

### 12. Additional Glasses Allowance Field (NEW)
Some plans have an extra field for second pair:
- `Additional Glasses Allowance: 40% off retail price less $100 allowance`
- This is SEPARATE from the primary frame allowance
- Formula format, not simple copay
