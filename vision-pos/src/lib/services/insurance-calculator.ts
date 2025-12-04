/**
 * Insurance Calculation Engine
 * Handles all insurance-related pricing, eligibility, and benefit calculations
 */

export interface InsuranceBenefit {
  carrier: string;
  planYear: number;
  
  // Exam
  examCopay: number;
  examCovered: boolean;
  examFrequency: number;
  lastExamDate?: Date;
  nextExamDate?: Date;
  
  // Materials
  materialsCopay: number;
  materialsFrequency: number;
  lastMaterialsDate?: Date;
  nextMaterialsDate?: Date;
  
  // Allowances
  frameAllowance: number;
  frameAllowanceUsed: number;
  frameAllowanceRemaining: number;
  lensAllowance: number;
  lensAllowanceUsed: number;
  lensAllowanceRemaining: number;
  contactAllowance: number;
  contactAllowanceUsed: number;
  contactAllowanceRemaining: number;
  contactFittingCopay: number;
  contactFrequency: number;
  lastContactsDate?: Date;
  nextContactsDate?: Date;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  tierCode?: string;
}

export interface TierDiscount {
  carrier: string;
  tierCode: string;
  discountPercent: number;
  copayAmount?: number;
}

export interface PricingBreakdown {
  retailPrice: number;
  tierDiscount: number;
  tierDiscountPercent: number;
  insurancePrice: number;
  allowanceApplied: number;
  copayAmount: number;
  patientResponsibility: number;
  insuranceSavings: number;
  isFullyCovered: boolean;
}

export interface EligibilityResult {
  isEligible: boolean;
  reason?: string;
  nextEligibleDate?: Date;
  daysUntilEligible?: number;
}

/**
 * Tier-based discount mappings for each insurance carrier
 */
const TIER_DISCOUNTS: Record<string, Record<string, number>> = {
  VSP: {
    K: 0.30, // 30% discount
    J: 0.40, // 40% discount
    F: 0.50, // 50% discount
    O: 0.60, // 60% discount
    N: 0.70, // 70% discount
  },
  EyeMed: {
    tier_1: 0.20,
    tier_2: 0.30,
    tier_3: 0.40,
    tier_4: 0.50,
    tier_5: 0.60,
  },
  Spectera: {
    I: 0.20,
    II: 0.30,
    III: 0.40,
    IV: 0.50,
    V: 0.60,
  },
};

export class InsuranceCalculator {
  /**
   * Calculate tier-based discount for a product
   */
  static calculateTierDiscount(
    product: Product,
    carrier: string,
    tierCode?: string
  ): number {
    if (!tierCode || !TIER_DISCOUNTS[carrier]) return 0;
    
    const discountPercent = TIER_DISCOUNTS[carrier][tierCode] || 0;
    return product.basePrice * discountPercent;
  }

  /**
   * Calculate complete pricing breakdown with insurance
   */
  static calculatePricing(
    product: Product,
    benefit: InsuranceBenefit,
    tierCode?: string
  ): PricingBreakdown {
    const retailPrice = product.basePrice;
    
    // Apply tier discount
    const tierDiscount = this.calculateTierDiscount(product, benefit.carrier, tierCode);
    const tierDiscountPercent = tierCode && TIER_DISCOUNTS[benefit.carrier]?.[tierCode] 
      ? TIER_DISCOUNTS[benefit.carrier][tierCode] * 100 
      : 0;
    const insurancePrice = retailPrice - tierDiscount;
    
    // Determine category and allowance
    let allowanceApplied = 0;
    let copayAmount = 0;
    
    if (product.category === 'FRAMES') {
      allowanceApplied = Math.min(insurancePrice, benefit.frameAllowanceRemaining);
      copayAmount = benefit.materialsCopay;
    } else if (product.category === 'LENSES') {
      allowanceApplied = Math.min(insurancePrice, benefit.lensAllowanceRemaining);
      copayAmount = benefit.materialsCopay;
    } else if (product.category === 'CONTACTS') {
      allowanceApplied = Math.min(insurancePrice, benefit.contactAllowanceRemaining);
      copayAmount = benefit.contactFittingCopay;
    } else if (product.category === 'EXAM') {
      copayAmount = benefit.examCopay;
      allowanceApplied = benefit.examCovered ? insurancePrice : 0;
    }
    
    // Calculate patient responsibility
    const priceAfterAllowance = insurancePrice - allowanceApplied;
    const patientResponsibility = Math.max(0, priceAfterAllowance + copayAmount);
    
    const insuranceSavings = retailPrice - patientResponsibility;
    const isFullyCovered = patientResponsibility === 0;
    
    return {
      retailPrice,
      tierDiscount,
      tierDiscountPercent,
      insurancePrice,
      allowanceApplied,
      copayAmount,
      patientResponsibility,
      insuranceSavings,
      isFullyCovered,
    };
  }

  /**
   * Check eligibility for a specific service type
   */
  static checkEligibility(
    serviceType: 'EXAM' | 'MATERIALS' | 'CONTACTS',
    benefit: InsuranceBenefit
  ): EligibilityResult {
    const now = new Date();
    
    let lastDate: Date | undefined;
    let frequency: number;
    
    switch (serviceType) {
      case 'EXAM':
        lastDate = benefit.lastExamDate;
        frequency = benefit.examFrequency;
        break;
      case 'MATERIALS':
        lastDate = benefit.lastMaterialsDate;
        frequency = benefit.materialsFrequency;
        break;
      case 'CONTACTS':
        lastDate = benefit.lastContactsDate;
        frequency = benefit.contactFrequency;
        break;
    }
    
    // If no last date, patient is eligible
    if (!lastDate) {
      return { isEligible: true };
    }
    
    // Calculate next eligible date
    const nextEligibleDate = new Date(lastDate);
    nextEligibleDate.setMonth(nextEligibleDate.getMonth() + frequency);
    
    const isEligible = now >= nextEligibleDate;
    const daysUntilEligible = isEligible 
      ? 0 
      : Math.ceil((nextEligibleDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      isEligible,
      reason: isEligible ? undefined : `Last used ${this.formatDate(lastDate)}. Next eligible ${this.formatDate(nextEligibleDate)}`,
      nextEligibleDate: isEligible ? undefined : nextEligibleDate,
      daysUntilEligible: isEligible ? undefined : daysUntilEligible,
    };
  }

  /**
   * Calculate remaining allowances
   */
  static getRemainingAllowances(benefit: InsuranceBenefit) {
    return {
      frames: benefit.frameAllowanceRemaining,
      lenses: benefit.lensAllowanceRemaining,
      contacts: benefit.contactAllowanceRemaining,
      totalRemaining: 
        benefit.frameAllowanceRemaining + 
        benefit.lensAllowanceRemaining + 
        benefit.contactAllowanceRemaining,
    };
  }

  /**
   * Calculate benefit usage percentage
   */
  static calculateUsagePercent(benefit: InsuranceBenefit, category: 'FRAMES' | 'LENSES' | 'CONTACTS'): number {
    let total: number;
    let used: number;
    
    switch (category) {
      case 'FRAMES':
        total = benefit.frameAllowance;
        used = benefit.frameAllowanceUsed;
        break;
      case 'LENSES':
        total = benefit.lensAllowance;
        used = benefit.lensAllowanceUsed;
        break;
      case 'CONTACTS':
        total = benefit.contactAllowance;
        used = benefit.contactAllowanceUsed;
        break;
    }
    
    return total > 0 ? (used / total) * 100 : 0;
  }

  /**
   * Get tier discount percentage for display
   */
  static getTierDiscountPercent(carrier: string, tierCode: string): number {
    return (TIER_DISCOUNTS[carrier]?.[tierCode] || 0) * 100;
  }

  /**
   * Format date for display
   */
  private static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Check if benefit plan is active
   */
  static isPlanActive(benefit: InsuranceBenefit): boolean {
    const now = new Date();
    const expiration = new Date(benefit.nextMaterialsDate || now);
    return now < expiration;
  }
}

export default InsuranceCalculator;
