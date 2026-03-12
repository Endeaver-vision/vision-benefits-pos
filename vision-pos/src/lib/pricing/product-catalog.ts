/**
 * Product Catalog - Single source of truth for all lens products and their pricing
 * Organized by category with tier mappings for each carrier (EyeMed, VSP, Spectera, Cash)
 *
 * This is carrier-agnostic - each product has tier info for all carriers
 * Usage: Filter by carrier when generating price lists
 */

export interface Product {
  id: string;
  name: string;
  category: string;
  wholesale: number;
  retail: number;
  vspTier?: string;
  eyemedTier?: string | number;
  specteraTier?: string | number;
  cashOnly: boolean;
  note?: string;
  backsideUV?: boolean; // For AR coatings: triggers $15 surcharge on EyeMed
  freeUnder18?: boolean; // For materials like polycarbonate
  freeUnder19?: boolean; // For photochromics
}

// ============================================================================
// LENS TYPES (Single Vision, Progressive, etc)
// ============================================================================
export const LENS_TYPES: Product[] = [
  {
    id: "sv",
    name: "Single Vision",
    category: "lens_type",
    wholesale: 26.67,
    retail: 80.0,
    vspTier: "Standard",
    eyemedTier: "Standard",
    specteraTier: "Standard",
    cashOnly: false,
  },
  {
    id: "eyezen",
    name: "Eyezen",
    category: "lens_type",
    wholesale: 43.33,
    retail: 130.0,
    vspTier: "K (Standard)",
    eyemedTier: "Tier 1",
    specteraTier: "Tier I",
    cashOnly: false,
    note: "Essilor Anti-Fatigue SV",
  },
  {
    id: "stellest",
    name: "Stellest",
    category: "lens_type",
    wholesale: 166.67,
    retail: 500.0,
    vspTier: "Non-Formulary",
    eyemedTier: "Non-Formulary",
    specteraTier: "Non-Formulary",
    cashOnly: true,
    note: "Myopia control lens for children",
  },
  {
    id: "sequal",
    name: "Sequal",
    category: "lens_type",
    wholesale: 66.67,
    retail: 200.0,
    vspTier: "J (Premium)",
    eyemedTier: "Tier 2",
    specteraTier: "Tier II",
    cashOnly: false,
    note: "Entry-level progressive",
  },
  {
    id: "bifocal",
    name: "FT Bifocal",
    category: "lens_type",
    wholesale: 60.67,
    retail: 182.0,
    vspTier: "Standard",
    eyemedTier: "Standard",
    specteraTier: "Standard",
    cashOnly: false,
    note: "Flat Top 28 (D28)",
  },
  {
    id: "trifocal",
    name: "FT Trifocal",
    category: "lens_type",
    wholesale: 45.0,
    retail: 135.0,
    vspTier: "Standard",
    eyemedTier: "Standard",
    specteraTier: "Standard",
    cashOnly: false,
    note: "Flat Top 35 (D35)",
  },
  {
    id: "comfortDRx",
    name: "Varilux Comfort DRx",
    category: "lens_type",
    wholesale: 93.33,
    retail: 280.0,
    vspTier: "J (Premium)",
    eyemedTier: "Tier 3",
    specteraTier: "Tier II",
    cashOnly: false,
    note: "Mid-tier progressive",
  },
  {
    id: "comfortMax",
    name: "Varilux Comfort Max",
    category: "lens_type",
    wholesale: 131.33,
    retail: 394.0,
    vspTier: "F (Premium Adv)",
    eyemedTier: "Tier 4",
    specteraTier: "Tier III",
    cashOnly: false,
    note: "Premium progressive",
  },
  {
    id: "variluxX",
    name: "Varilux X",
    category: "lens_type",
    wholesale: 200.0,
    retail: 600.0,
    vspTier: "O (Custom L1)",
    eyemedTier: "Tier 5",
    specteraTier: "Tier V",
    cashOnly: false,
    note: "Varilux X Design Technology",
  },
  {
    id: "neurolens_sv",
    name: "Neurolens SV",
    category: "lens_type",
    wholesale: 133.33,
    retail: 400.0,
    vspTier: "Non-Formulary",
    eyemedTier: "Non-Formulary",
    specteraTier: "Non-Formulary",
    cashOnly: true,
    note: "Cash pay only - no vision plans",
  },
  {
    id: "neurolens_pal",
    name: "Neurolens Progressive",
    category: "lens_type",
    wholesale: 233.33,
    retail: 700.0,
    vspTier: "Non-Formulary",
    eyemedTier: "Non-Formulary",
    specteraTier: "Non-Formulary",
    cashOnly: true,
    note: "Cash pay only - no vision plans",
  },
];

// ============================================================================
// LENS MATERIALS (Polycarbonate, High Index, etc)
// ============================================================================
export const LENS_MATERIALS: Product[] = [
  {
    id: "cr39",
    name: "CR-39 (Standard)",
    category: "lens_material",
    wholesale: 0.0,
    retail: 0.0,
    vspTier: "Base",
    eyemedTier: "Base",
    specteraTier: "Base",
    cashOnly: false,
    note: "Standard base material",
  },
  {
    id: "poly",
    name: "Polycarbonate",
    category: "lens_material",
    wholesale: 21.67,
    retail: 65.0,
    vspTier: "B Modifier",
    eyemedTier: "Material",
    specteraTier: "Material",
    cashOnly: false,
    freeUnder18: true,
    note: "Add to base lens; FREE under 18",
  },
  {
    id: "trivex",
    name: "Trivex",
    category: "lens_material",
    wholesale: 25.0,
    retail: 75.0,
    vspTier: "T Modifier",
    eyemedTier: "Material",
    specteraTier: "Material",
    cashOnly: false,
    note: "Add to base lens",
  },
  {
    id: "hiIndex167",
    name: "1.67 High Index",
    category: "lens_material",
    wholesale: 43.33,
    retail: 130.0,
    vspTier: "H Modifier",
    eyemedTier: "Material",
    specteraTier: "Material",
    cashOnly: false,
    note: "Add to base lens",
  },
  {
    id: "ultraHi172",
    name: "1.72 Ultra High Index",
    category: "lens_material",
    wholesale: 50.0,
    retail: 150.0,
    vspTier: "Non-Standard",
    eyemedTier: "Material",
    specteraTier: "80% Billed",
    cashOnly: false,
    note: "Premium material",
  },
];

// ============================================================================
// AR COATINGS (Crizal, Neurolens, etc)
// ============================================================================
export const AR_COATINGS: Product[] = [
  {
    id: "none",
    name: "No AR Coating",
    category: "ar_coating",
    wholesale: 0.0,
    retail: 0.0,
    vspTier: "N/A",
    eyemedTier: "N/A",
    specteraTier: "N/A",
    cashOnly: false,
  },
  {
    id: "crizalEZPro",
    name: "Crizal EZ Pro",
    category: "ar_coating",
    wholesale: 44.4,
    retail: 111.0,
    vspTier: "C (Mid)",
    eyemedTier: "Tier 2",
    specteraTier: "Tier III",
    cashOnly: false,
    backsideUV: true,
    note: "Mid-tier AR",
  },
  {
    id: "crizalRock",
    name: "Crizal Rock",
    category: "ar_coating",
    wholesale: 63.2,
    retail: 158.0,
    vspTier: "D (Premium)",
    eyemedTier: "Tier 3",
    specteraTier: "Tier IV",
    cashOnly: false,
    backsideUV: true,
    note: "Premium AR",
  },
  {
    id: "crizalSapphire",
    name: "Crizal Sapphire HR",
    category: "ar_coating",
    wholesale: 74.8,
    retail: 187.0,
    vspTier: "D (Premium)",
    eyemedTier: "Tier 3",
    specteraTier: "Tier IV",
    cashOnly: false,
    backsideUV: true,
    note: "Crizal Sapphire HR",
  },
  {
    id: "crizalSunShield",
    name: "Crizal SunShield",
    category: "ar_coating",
    wholesale: 54.0,
    retail: 135.0,
    vspTier: "C (Mid)",
    eyemedTier: "Tier 2",
    specteraTier: "Tier III",
    cashOnly: false,
    backsideUV: true,
    note: "Sun AR coating",
  },
  {
    id: "neurolens_premium",
    name: "Neurolens Premium",
    category: "ar_coating",
    wholesale: 72.0,
    retail: 180.0,
    vspTier: "Non-Formulary",
    eyemedTier: "Non-Formulary",
    specteraTier: "Non-Formulary",
    cashOnly: true,
    note: "Cash pay only - no vision plans",
  },
  {
    id: "neurolens_blue",
    name: "Neurolens Blue",
    category: "ar_coating",
    wholesale: 72.0,
    retail: 180.0,
    vspTier: "Non-Formulary",
    eyemedTier: "Non-Formulary",
    specteraTier: "Non-Formulary",
    cashOnly: true,
    note: "Cash pay only - no vision plans",
  },
];

// ============================================================================
// PHOTOCHROMICS (Transitions)
// ============================================================================
export const PHOTOCHROMICS: Product[] = [
  {
    id: "none",
    name: "No Photochromic",
    category: "photochromic",
    wholesale: 0.0,
    retail: 0.0,
    vspTier: "N/A",
    eyemedTier: "N/A",
    specteraTier: "N/A",
    cashOnly: false,
  },
  {
    id: "genS",
    name: "Transitions Gen S",
    category: "photochromic",
    wholesale: 64.0,
    retail: 160.0,
    vspTier: "PR Code",
    eyemedTier: "Photochromic",
    specteraTier: "Photochromic",
    cashOnly: false,
    freeUnder19: true,
    note: "Transitions GEN S",
  },
  {
    id: "xtraActive",
    name: "Transitions XtrActive",
    category: "photochromic",
    wholesale: 64.0,
    retail: 160.0,
    vspTier: "PR Code",
    eyemedTier: "Photochromic",
    specteraTier: "Photochromic",
    cashOnly: false,
    freeUnder19: true,
    note: "XTRActive New Generation",
  },
];

// ============================================================================
// ADD-ONS (Tint, Polarized, Prism, etc)
// ============================================================================
export const ADD_ONS: Product[] = [
  {
    id: "uv",
    name: "UV Treatment",
    category: "add_on",
    wholesale: 0.0,
    retail: 16.0,
    vspTier: "SV Code",
    eyemedTier: "Add-On",
    specteraTier: "Add-On",
    cashOnly: false,
    note: "UV Protection - $16 copay typical",
  },
  {
    id: "tint",
    name: "Tint",
    category: "add_on",
    wholesale: 10.0,
    retail: 30.0,
    vspTier: "Tint Code",
    eyemedTier: "Tint Copay",
    specteraTier: "Tint Copay",
    cashOnly: false,
    note: "Solid/Gradient tint",
  },
  {
    id: "polarized",
    name: "Polarized",
    category: "add_on",
    wholesale: 72.0,
    retail: 180.0,
    vspTier: "LB/LC Code",
    eyemedTier: "Polarized",
    specteraTier: "80% Billed",
    cashOnly: false,
    note: "Polarized lenses",
  },
  {
    id: "mirror",
    name: "Mirror",
    category: "add_on",
    wholesale: 23.3,
    retail: 55.0,
    vspTier: "Mirror Code",
    eyemedTier: "Add-On",
    specteraTier: "80% Billed",
    cashOnly: false,
    note: "Mirror Solid/Gradient",
  },
  {
    id: "essBlue",
    name: "Essential Blue",
    category: "add_on",
    wholesale: 13.33,
    retail: 40.0,
    vspTier: "Blue Light",
    eyemedTier: "Add-On",
    specteraTier: "Add-On",
    cashOnly: false,
    note: "Essential Blue Series",
  },
  {
    id: "oversize",
    name: "Oversize Lenses",
    category: "add_on",
    wholesale: 10.0,
    retail: 30.0,
    vspTier: "OU Code",
    eyemedTier: "Add-On",
    specteraTier: "80% Billed",
    cashOnly: false,
    note: "61mm+ frames",
  },
  {
    id: "prism",
    name: "Prism (per D)",
    category: "add_on",
    wholesale: 5.0,
    retail: 15.0,
    vspTier: "Prism Code",
    eyemedTier: "Add-On",
    specteraTier: "80% Billed",
    cashOnly: false,
    note: "Rx prism correction",
  },
  {
    id: "rollPolish",
    name: "Roll & Polish",
    category: "add_on",
    wholesale: 10.0,
    retail: 30.0,
    vspTier: "Edge Code",
    eyemedTier: "Add-On",
    specteraTier: "Edge Coating",
    cashOnly: false,
    note: "Edge polish for rimless",
  },
];

// ============================================================================
// MOUNT FEES (Full Rim, Rimless, Semi-Rimless)
// ============================================================================
export const MOUNT_FEES: Product[] = [
  {
    id: "fullRim",
    name: "Full Rim",
    category: "mount_fee",
    wholesale: 0.0,
    retail: 0.0,
    vspTier: "Included",
    eyemedTier: "Included",
    specteraTier: "Included",
    cashOnly: false,
    note: "Standard mount",
  },
  {
    id: "semiRimless",
    name: "Semi-Rimless",
    category: "mount_fee",
    wholesale: 11.67,
    retail: 35.0,
    vspTier: "SU Code",
    eyemedTier: "Mount Fee",
    specteraTier: "Polished Edges",
    cashOnly: false,
    note: "Grooved mount",
  },
  {
    id: "rimless",
    name: "Rimless",
    category: "mount_fee",
    wholesale: 15.0,
    retail: 45.0,
    vspTier: "SW Code",
    eyemedTier: "Mount Fee",
    specteraTier: "Polished Edges",
    cashOnly: false,
    note: "Drill mount",
  },
];

// ============================================================================
// COMPLETE CATALOG - All products organized by category
// ============================================================================
export const PRODUCT_CATALOG = {
  lensTypes: LENS_TYPES,
  lensMaterials: LENS_MATERIALS,
  arCoatings: AR_COATINGS,
  photochromics: PHOTOCHROMICS,
  addOns: ADD_ONS,
  mountFees: MOUNT_FEES,
} as const;

// ============================================================================
// UTILITY: Get all products flattened
// ============================================================================
export function getAllProducts(): Product[] {
  return [
    ...LENS_TYPES,
    ...LENS_MATERIALS,
    ...AR_COATINGS,
    ...PHOTOCHROMICS,
    ...ADD_ONS,
    ...MOUNT_FEES,
  ];
}

// ============================================================================
// UTILITY: Get products for a specific carrier
// ============================================================================
export function getProductsByCarrier(carrier: "EYEMED" | "VSP" | "SPECTERA" | "CASH"): Product[] {
  if (carrier === "CASH") {
    // Cash/retail shows all products (no tier filtering)
    return getAllProducts();
  }

  const tierMap = {
    EYEMED: "eyemedTier",
    VSP: "vspTier",
    SPECTERA: "specteraTier",
  } as const;

  const tierKey = tierMap[carrier];
  return getAllProducts().filter(p => {
    const tier = p[tierKey as keyof Product];
    return tier && tier !== "N/A" && tier !== "Non-Formulary";
  });
}

// ============================================================================
// UTILITY: Find product by ID
// ============================================================================
export function getProductById(id: string): Product | undefined {
  return getAllProducts().find(p => p.id === id);
}
