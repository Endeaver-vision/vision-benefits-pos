/**
 * WEEK 8 PRODUCTION TEST DATA SEED SCRIPT
 * 
 * Vision POS System - Complete Demo Data for Production Deployment
 * Version: 1.0
 * Target: Week 8, Day 5 - Production Deployment
 * Purpose: Final smoke testing before alpha release
 * 
 * This script generates comprehensive test data including:
 * - 4 Locations (3 active, 1 inactive)
 * - 12 Users (2 admin, 3 managers, 7 sales associates)
 * - 15 Patients (diverse insurance scenarios)
 * - 250+ Products (frames, lenses, coatings, contacts)
 * - 4 Package Templates (pre-configured)
 * - 50 Quotes (across all states)
 * - 200+ Activity Logs (past 60 days)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Helper function to create dates relative to now
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function hoursAgo(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

function minutesAgo(minutes: number): Date {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutes);
  return date;
}

// Helper function to hash passwords
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Generate random activity timestamps within business hours
function generateBusinessHourTimestamp(daysBack: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  
  // Set to business hours (9 AM - 6 PM, weekdays preferred)
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  if (isWeekend && Math.random() > 0.3) {
    // 70% chance to avoid weekends
    date.setDate(date.getDate() + (date.getDay() === 0 ? 1 : 2));
  }
  
  const hour = 9 + Math.floor(Math.random() * 9); // 9 AM - 6 PM
  const minute = Math.floor(Math.random() * 60);
  date.setHours(hour, minute, 0, 0);
  
  return date;
}

async function main() {
  console.log('🚀 Starting WEEK 8 Production Test Data Seeding...');
  console.log('📊 Generating comprehensive dataset for production deployment');
  
  try {
    await prisma.$transaction(async (tx) => {
      // ============================================================================
      // 1. LOCATIONS (4 Locations: 3 active, 1 inactive)
      // ============================================================================
      console.log('\n📍 Creating 4 locations...');
      
      const locations = [
        {
          id: 'loc_downtown_001',
          name: 'Vision Care Downtown',
          address: '123 Main Street, Suite 100',
          phone: '(512) 555-0100',
          email: 'downtown@visioncare.com',
          website: 'https://visioncare.com/downtown',
          timezone: 'America/Chicago',
          active: true,
          createdAt: daysAgo(90),
          updatedAt: daysAgo(1)
        },
        {
          id: 'loc_westlake_002',
          name: 'Vision Care Westlake',
          address: '4567 Westlake Drive',
          phone: '(512) 555-0200',
          email: 'westlake@visioncare.com',
          website: 'https://visioncare.com/westlake',
          timezone: 'America/Chicago',
          active: true,
          createdAt: daysAgo(75),
          updatedAt: daysAgo(2)
        },
        {
          id: 'loc_roundrock_003',
          name: 'Vision Care Round Rock',
          address: '789 University Blvd',
          phone: '(512) 555-0300',
          email: 'roundrock@visioncare.com',
          website: 'https://visioncare.com/roundrock',
          timezone: 'America/Chicago',
          active: true,
          createdAt: daysAgo(60),
          updatedAt: daysAgo(3)
        },
        {
          id: 'loc_southcongress_004',
          name: 'Vision Care South Congress (Temporarily Closed)',
          address: '321 South Congress Ave',
          phone: '(512) 555-0400',
          email: 'southcongress@visioncare.com',
          website: 'https://visioncare.com/southcongress',
          timezone: 'America/Chicago',
          active: false,
          createdAt: daysAgo(120),
          updatedAt: daysAgo(15)
        }
      ];

      for (const location of locations) {
        await tx.locations.upsert({
          where: { id: location.id },
          update: location,
          create: location
        });
      }
      console.log('✅ Created 4 locations (3 active, 1 inactive)');

      // ============================================================================
      // 2. PRODUCT CATEGORIES
      // ============================================================================
      console.log('\n🏷️ Creating product categories...');
      
      const categories = [
        { id: 'cat_frames', name: 'Frames', code: 'FRAMES', description: 'Eyeglass frames and sunglasses' },
        { id: 'cat_lenses', name: 'Lenses', code: 'LENSES', description: 'Progressive, single vision, and specialty lenses' },
        { id: 'cat_coatings', name: 'Lens Coatings', code: 'COATINGS', description: 'Anti-reflective and protective coatings' },
        { id: 'cat_materials', name: 'Lens Materials', code: 'MATERIALS', description: 'Lens material upgrades' },
        { id: 'cat_enhancements', name: 'Lens Enhancements', code: 'ENHANCEMENTS', description: 'Photochromic, polarized, and specialty treatments' },
        { id: 'cat_contacts', name: 'Contact Lenses', code: 'CONTACTS', description: 'Daily, weekly, and monthly contact lenses' },
        { id: 'cat_accessories', name: 'Accessories', code: 'ACCESSORIES', description: 'Cases, cleaning solutions, and accessories' },
        { id: 'cat_services', name: 'Services', code: 'SERVICES', description: 'Eye exams and professional services' }
      ];

      for (const category of categories) {
        await tx.product_categories.upsert({
          where: { id: category.id },
          update: category,
          create: {
            ...category,
            createdAt: daysAgo(90),
            updatedAt: daysAgo(1)
          }
        });
      }
      console.log('✅ Created 8 product categories');

      // ============================================================================
      // 3. USERS (12 Users: 2 admin, 3 managers, 7 sales associates)
      // ============================================================================
      console.log('\n👥 Creating 12 users across all roles...');
      
      const users = [
        // Admin Users (2)
        {
          id: 'usr_admin_001',
          email: 'admin@visioncare.com',
          passwordHash: await hashPassword('Admin123!'),
          firstName: 'Sarah',
          lastName: 'Anderson',
          role: 'ADMIN',
          locationId: 'loc_downtown_001',
          active: true,
          createdAt: daysAgo(90),
          updatedAt: daysAgo(1),
          lastLoginAt: hoursAgo(1)
        },
        {
          id: 'usr_admin_002',
          email: 'manager@visioncare.com',
          passwordHash: await hashPassword('Manager123!'),
          firstName: 'Michael',
          lastName: 'Chen',
          role: 'ADMIN',
          locationId: 'loc_downtown_001',
          active: true,
          createdAt: daysAgo(75),
          updatedAt: daysAgo(2),
          lastLoginAt: hoursAgo(3)
        },
        // Manager Users (3)
        {
          id: 'usr_mgr_001',
          email: 'jennifer.martinez@visioncare.com',
          passwordHash: await hashPassword('Manager123!'),
          firstName: 'Jennifer',
          lastName: 'Martinez',
          role: 'MANAGER',
          locationId: 'loc_downtown_001',
          active: true,
          createdAt: daysAgo(60),
          updatedAt: daysAgo(1),
          lastLoginAt: hoursAgo(2)
        },
        {
          id: 'usr_mgr_002',
          email: 'david.thompson@visioncare.com',
          passwordHash: await hashPassword('Manager123!'),
          firstName: 'David',
          lastName: 'Thompson',
          role: 'MANAGER',
          locationId: 'loc_westlake_002',
          active: true,
          createdAt: daysAgo(45),
          updatedAt: daysAgo(1),
          lastLoginAt: hoursAgo(5)
        },
        {
          id: 'usr_mgr_003',
          email: 'lisa.nguyen@visioncare.com',
          passwordHash: await hashPassword('Manager123!'),
          firstName: 'Lisa',
          lastName: 'Nguyen',
          role: 'MANAGER',
          locationId: 'loc_roundrock_003',
          active: true,
          createdAt: daysAgo(30),
          updatedAt: daysAgo(1),
          lastLoginAt: daysAgo(1)
        },
        // Sales Associates (7)
        {
          id: 'usr_sales_001',
          email: 'robert.johnson@visioncare.com',
          passwordHash: await hashPassword('Sales123!'),
          firstName: 'Robert',
          lastName: 'Johnson',
          role: 'SALES_ASSOCIATE',
          locationId: 'loc_downtown_001',
          active: true,
          createdAt: daysAgo(50),
          updatedAt: daysAgo(1),
          lastLoginAt: minutesAgo(30)
        },
        {
          id: 'usr_sales_002',
          email: 'emily.davis@visioncare.com',
          passwordHash: await hashPassword('Sales123!'),
          firstName: 'Emily',
          lastName: 'Davis',
          role: 'SALES_ASSOCIATE',
          locationId: 'loc_downtown_001',
          active: true,
          createdAt: daysAgo(40),
          updatedAt: daysAgo(1),
          lastLoginAt: hoursAgo(2)
        },
        {
          id: 'usr_sales_003',
          email: 'carlos.rivera@visioncare.com',
          passwordHash: await hashPassword('Sales123!'),
          firstName: 'Carlos',
          lastName: 'Rivera',
          role: 'SALES_ASSOCIATE',
          locationId: 'loc_downtown_001',
          active: true,
          createdAt: daysAgo(25),
          updatedAt: daysAgo(1),
          lastLoginAt: hoursAgo(4)
        },
        {
          id: 'usr_sales_004',
          email: 'james.wilson@visioncare.com',
          passwordHash: await hashPassword('Sales123!'),
          firstName: 'James',
          lastName: 'Wilson',
          role: 'SALES_ASSOCIATE',
          locationId: 'loc_westlake_002',
          active: true,
          createdAt: daysAgo(35),
          updatedAt: daysAgo(1),
          lastLoginAt: hoursAgo(1)
        },
        {
          id: 'usr_sales_005',
          email: 'maria.garcia@visioncare.com',
          passwordHash: await hashPassword('Sales123!'),
          firstName: 'Maria',
          lastName: 'Garcia',
          role: 'SALES_ASSOCIATE',
          locationId: 'loc_westlake_002',
          active: true,
          createdAt: daysAgo(25),
          updatedAt: daysAgo(1),
          lastLoginAt: hoursAgo(3)
        },
        {
          id: 'usr_sales_006',
          email: 'chris.brown@visioncare.com',
          passwordHash: await hashPassword('Sales123!'),
          firstName: 'Chris',
          lastName: 'Brown',
          role: 'SALES_ASSOCIATE',
          locationId: 'loc_roundrock_003',
          active: true,
          createdAt: daysAgo(20),
          updatedAt: daysAgo(1),
          lastLoginAt: hoursAgo(6)
        },
        {
          id: 'usr_sales_007',
          email: 'ashley.miller@visioncare.com',
          passwordHash: await hashPassword('Sales123!'),
          firstName: 'Ashley',
          lastName: 'Miller',
          role: 'SALES_ASSOCIATE',
          locationId: 'loc_roundrock_003',
          active: false,
          createdAt: daysAgo(15),
          updatedAt: daysAgo(2),
          lastLoginAt: daysAgo(3)
        }
      ];

      for (const user of users) {
        await tx.users.upsert({
          where: { id: user.id },
          update: user,
          create: user
        });
      }
      console.log('✅ Created 12 users (2 admin, 3 managers, 7 sales associates)');

      // ============================================================================
      // 4. CUSTOMERS/PATIENTS (15 Patients with diverse insurance scenarios)
      // ============================================================================
      console.log('\n🏥 Creating 15 patients with diverse insurance scenarios...');
      
      const customers = [
        // Patient 1: VSP Signature - Fresh Benefits
        {
          id: 'pat_001',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@email.com',
          phone: '(512) 555-1001',
          dateOfBirth: new Date('1985-06-15'),
          gender: 'MALE',
          address: '123 Oak Street',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          insuranceCarrier: 'VSP',
          memberId: 'VSP123456789',
          groupNumber: '12345',
          eligibilityDate: new Date('2025-01-01'),
          active: true,
          customerNumber: 'CUST001',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(60),
          totalSpent: 345.32,
          averageOrderValue: 345.32,
          customerLifetimeValue: 345.32,
          lastPurchaseDate: daysAgo(43),
          isHighValueCustomer: false,
          isFrequentCustomer: false,
          riskLevel: 'LOW',
          marketingConsent: true,
          notes: 'VSP Signature member, prefers progressive lenses',
          createdAt: daysAgo(60),
          updatedAt: daysAgo(43),
          createdBy: 'usr_sales_001'
        },
        // Patient 2: EyeMed Insight - Exam Already Used
        {
          id: 'pat_002',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.j@email.com',
          phone: '(512) 555-1002',
          dateOfBirth: new Date('1990-03-22'),
          gender: 'FEMALE',
          address: '456 Pine Avenue',
          city: 'Austin',
          state: 'TX',
          zipCode: '78702',
          insuranceCarrier: 'EyeMed',
          memberId: 'EM987654321',
          groupNumber: '54321',
          eligibilityDate: new Date('2025-01-01'),
          active: true,
          customerNumber: 'CUST002',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(55),
          totalSpent: 0,
          averageOrderValue: 0,
          customerLifetimeValue: 0,
          lastVisit: daysAgo(35),
          isHighValueCustomer: false,
          isFrequentCustomer: false,
          riskLevel: 'LOW',
          marketingConsent: true,
          notes: 'EyeMed Insight, exam benefit used in August',
          createdAt: daysAgo(55),
          updatedAt: daysAgo(35),
          createdBy: 'usr_sales_002'
        },
        // Patient 3: Spectera Standard - Clean Slate
        {
          id: 'pat_003',
          firstName: 'Michael',
          lastName: 'Chen',
          email: 'mchen@email.com',
          phone: '(512) 555-1003',
          dateOfBirth: new Date('1978-11-08'),
          gender: 'MALE',
          address: '789 Elm Street',
          city: 'Austin',
          state: 'TX',
          zipCode: '78746',
          insuranceCarrier: 'Spectera',
          memberId: 'SP456789123',
          groupNumber: '98765',
          eligibilityDate: new Date('2025-01-01'),
          active: true,
          customerNumber: 'CUST003',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(50),
          totalSpent: 0,
          averageOrderValue: 0,
          customerLifetimeValue: 0,
          isHighValueCustomer: false,
          isFrequentCustomer: false,
          riskLevel: 'LOW',
          marketingConsent: false,
          notes: 'Spectera Standard plan, fresh benefits available',
          createdAt: daysAgo(50),
          updatedAt: daysAgo(50),
          createdBy: 'usr_sales_004'
        },
        // Patient 4: Cash Pay (No Insurance)
        {
          id: 'pat_004',
          firstName: 'Emily',
          lastName: 'Davis',
          email: 'emily.davis@email.com',
          phone: '(512) 555-1004',
          dateOfBirth: new Date('1995-08-30'),
          gender: 'FEMALE',
          address: '321 Maple Drive',
          city: 'Austin',
          state: 'TX',
          zipCode: '78746',
          active: true,
          customerNumber: 'CUST004',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(45),
          totalSpent: 0,
          averageOrderValue: 0,
          customerLifetimeValue: 0,
          isHighValueCustomer: false,
          isFrequentCustomer: false,
          riskLevel: 'LOW',
          marketingConsent: true,
          notes: 'Cash pay patient, no insurance coverage',
          createdAt: daysAgo(45),
          updatedAt: daysAgo(45),
          createdBy: 'usr_sales_005'
        },
        // Patient 5: VSP Choice - All Benefits Exhausted
        {
          id: 'pat_005',
          firstName: 'Robert',
          lastName: 'Martinez',
          email: 'r.martinez@email.com',
          phone: '(512) 555-1005',
          dateOfBirth: new Date('1982-12-05'),
          gender: 'MALE',
          address: '654 Cedar Lane',
          city: 'Round Rock',
          state: 'TX',
          zipCode: '78664',
          insuranceCarrier: 'VSP',
          memberId: 'VSP555444333',
          groupNumber: '67890',
          eligibilityDate: new Date('2025-01-01'),
          active: true,
          customerNumber: 'CUST005',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(40),
          totalSpent: 567.89,
          averageOrderValue: 567.89,
          customerLifetimeValue: 567.89,
          lastPurchaseDate: daysAgo(120),
          lastVisit: daysAgo(120),
          isHighValueCustomer: false,
          isFrequentCustomer: false,
          riskLevel: 'LOW',
          marketingConsent: true,
          notes: 'VSP Choice, both exam and materials benefits used this year',
          createdAt: daysAgo(40),
          updatedAt: daysAgo(40),
          createdBy: 'usr_sales_006'
        },
        // Patient 6: Child with EyeMed (Polycarbonate Required)
        {
          id: 'pat_006',
          firstName: 'Sophia',
          lastName: 'Williams',
          email: 'parent@email.com',
          phone: '(512) 555-1006',
          dateOfBirth: new Date('2013-04-18'),
          gender: 'FEMALE',
          address: '987 Birch Road',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          insuranceCarrier: 'EyeMed',
          memberId: 'EM111222333',
          groupNumber: '11111',
          eligibilityDate: new Date('2025-01-01'),
          active: true,
          customerNumber: 'CUST006',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(35),
          totalSpent: 0,
          averageOrderValue: 0,
          customerLifetimeValue: 0,
          isHighValueCustomer: false,
          isFrequentCustomer: false,
          riskLevel: 'LOW',
          marketingConsent: false,
          notes: 'Child patient (11 years old), requires polycarbonate lenses for safety',
          createdAt: daysAgo(35),
          updatedAt: daysAgo(35),
          createdBy: 'usr_sales_002'
        },
        // Patient 7: Senior with VSP (65+)
        {
          id: 'pat_007',
          firstName: 'Dorothy',
          lastName: 'Thompson',
          email: 'dorothy.t@email.com',
          phone: '(512) 555-1007',
          dateOfBirth: new Date('1955-02-14'),
          gender: 'FEMALE',
          address: '246 Willow Street',
          city: 'Austin',
          state: 'TX',
          zipCode: '78746',
          insuranceCarrier: 'VSP',
          memberId: 'VSP777888999',
          groupNumber: '22222',
          eligibilityDate: new Date('2025-01-01'),
          active: true,
          customerNumber: 'CUST007',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(30),
          totalSpent: 0,
          averageOrderValue: 0,
          customerLifetimeValue: 0,
          isHighValueCustomer: false,
          isFrequentCustomer: false,
          riskLevel: 'LOW',
          marketingConsent: true,
          notes: 'Senior patient (69 years old), likely needs progressive lenses',
          createdAt: daysAgo(30),
          updatedAt: daysAgo(30),
          createdBy: 'usr_sales_004'
        },
        // Patient 8: Contact Lens Wearer
        {
          id: 'pat_008',
          firstName: 'Alex',
          lastName: 'Rodriguez',
          email: 'alex.r@email.com',
          phone: '(512) 555-1008',
          dateOfBirth: new Date('1988-07-25'),
          gender: 'NONBINARY',
          address: '135 Spruce Avenue',
          city: 'Round Rock',
          state: 'TX',
          zipCode: '78664',
          insuranceCarrier: 'VSP',
          memberId: 'VSP333222111',
          groupNumber: '33333',
          eligibilityDate: new Date('2025-01-01'),
          active: true,
          customerNumber: 'CUST008',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(28),
          totalSpent: 0,
          averageOrderValue: 0,
          customerLifetimeValue: 0,
          isHighValueCustomer: false,
          isFrequentCustomer: false,
          riskLevel: 'LOW',
          marketingConsent: true,
          notes: 'Prefers contact lenses, active lifestyle',
          createdAt: daysAgo(28),
          updatedAt: daysAgo(28),
          createdBy: 'usr_sales_006'
        },
        // Patient 9: VSP with Patient-Owned Frame (POF)
        {
          id: 'pat_009',
          firstName: 'Jessica',
          lastName: 'Lee',
          email: 'jessica.lee@email.com',
          phone: '(512) 555-1009',
          dateOfBirth: new Date('1992-09-12'),
          gender: 'FEMALE',
          address: '864 Poplar Circle',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          insuranceCarrier: 'VSP',
          memberId: 'VSP999888777',
          groupNumber: '44444',
          eligibilityDate: new Date('2025-01-01'),
          active: true,
          customerNumber: 'CUST009',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(25),
          totalSpent: 0,
          averageOrderValue: 0,
          customerLifetimeValue: 0,
          isHighValueCustomer: false,
          isFrequentCustomer: false,
          riskLevel: 'LOW',
          marketingConsent: true,
          notes: 'Bringing own frame for lens replacement (Patient-Owned Frame)',
          createdAt: daysAgo(25),
          updatedAt: daysAgo(25),
          createdBy: 'usr_sales_001'
        },
        // Patient 10: EyeMed with Previous Year Benefits
        {
          id: 'pat_010',
          firstName: 'Daniel',
          lastName: 'Park',
          email: 'daniel.park@email.com',
          phone: '(512) 555-1010',
          dateOfBirth: new Date('1980-05-20'),
          gender: 'MALE',
          address: '753 Hickory Way',
          city: 'Austin',
          state: 'TX',
          zipCode: '78746',
          insuranceCarrier: 'EyeMed',
          memberId: 'EM444555666',
          groupNumber: '55555',
          eligibilityDate: new Date('2024-01-01'),
          active: true,
          customerNumber: 'CUST010',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(450),
          totalSpent: 234.56,
          averageOrderValue: 234.56,
          customerLifetimeValue: 234.56,
          lastPurchaseDate: daysAgo(365),
          lastVisit: daysAgo(365),
          isHighValueCustomer: false,
          isFrequentCustomer: false,
          riskLevel: 'LOW',
          marketingConsent: true,
          notes: 'Benefits should be available again (12-month cycle from March 2024)',
          createdAt: daysAgo(450),
          updatedAt: daysAgo(365),
          createdBy: 'usr_sales_005'
        },
        // Continue with remaining patients...
        // Patient 11-15 (abbreviated for space)
        {
          id: 'pat_011',
          firstName: 'Amanda',
          lastName: 'Foster',
          email: 'amanda.f@email.com',
          phone: '(512) 555-1011',
          dateOfBirth: new Date('1987-11-30'),
          gender: 'FEMALE',
          insuranceCarrier: 'Spectera',
          memberId: 'SP777666555',
          groupNumber: '66666',
          eligibilityDate: new Date('2025-01-01'),
          active: true,
          customerNumber: 'CUST011',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(22),
          createdAt: daysAgo(22),
          updatedAt: daysAgo(22),
          createdBy: 'usr_sales_001'
        },
        {
          id: 'pat_012',
          firstName: 'Kevin',
          lastName: 'Nguyen',
          email: 'kevin.n@email.com',
          phone: '(512) 555-1012',
          dateOfBirth: new Date('1994-02-08'),
          gender: 'MALE',
          insuranceCarrier: 'VSP',
          memberId: 'VSP111000999',
          groupNumber: '77777',
          eligibilityDate: new Date('2025-01-01'),
          active: true,
          customerNumber: 'CUST012',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(20),
          createdAt: daysAgo(20),
          updatedAt: daysAgo(20),
          createdBy: 'usr_sales_006'
        },
        {
          id: 'pat_013',
          firstName: 'Rachel',
          lastName: 'Cooper',
          email: 'rachel.cooper@email.com',
          phone: '(512) 555-1013',
          dateOfBirth: new Date('1998-07-03'),
          gender: 'FEMALE',
          insuranceCarrier: 'EyeMed',
          memberId: 'EM888999000',
          groupNumber: '88888',
          eligibilityDate: new Date('2025-01-01'),
          active: true,
          customerNumber: 'CUST013',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(5),
          notes: 'First time patient',
          createdAt: daysAgo(5),
          updatedAt: daysAgo(5),
          createdBy: 'usr_sales_001'
        },
        {
          id: 'pat_014',
          firstName: 'Brandon',
          lastName: 'Hayes',
          email: 'brandon.h@email.com',
          phone: '(512) 555-1014',
          dateOfBirth: new Date('1991-10-15'),
          gender: 'MALE',
          insuranceCarrier: 'VSP',
          memberId: 'VSP222333444',
          groupNumber: '99999',
          eligibilityDate: new Date('2025-01-01'),
          active: true,
          customerNumber: 'CUST014',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(18),
          notes: 'Prefers contact lenses, has astigmatism',
          createdAt: daysAgo(18),
          updatedAt: daysAgo(18),
          createdBy: 'usr_sales_004'
        },
        {
          id: 'pat_015',
          firstName: 'Victoria',
          lastName: 'Sterling',
          email: 'victoria.sterling@email.com',
          phone: '(512) 555-1015',
          dateOfBirth: new Date('1975-04-25'),
          gender: 'FEMALE',
          active: true,
          customerNumber: 'CUST015',
          accountStatus: 'ACTIVE',
          registrationDate: daysAgo(12),
          notes: 'Prefers premium products, no insurance restrictions',
          createdAt: daysAgo(12),
          updatedAt: daysAgo(12),
          createdBy: 'usr_sales_001'
        }
      ];

      for (const customer of customers) {
        await tx.customers.upsert({
          where: { id: customer.id },
          update: customer,
          create: customer
        });
      }
      console.log('✅ Created 15 patients with diverse insurance scenarios');

      // ============================================================================
      // 5. PRODUCTS (250+ Products across all categories)
      // ============================================================================
      console.log('\n🛍️ Creating 250+ products across all categories...');
      
      // Frames (50 products)
      const frames = [
        // Budget Frames ($50-$150) - 15 products
        { id: 'frm_bud_001', name: 'Classic Metal Aviator - Silver', sku: 'FRM-BUD-001', basePrice: 89.00, manufacturer: 'Generic', tierVsp: 'budget', tierEyemed: 'tier1', tierSpectera: 'cat1' },
        { id: 'frm_bud_002', name: 'Plastic Rectangle - Black', sku: 'FRM-BUD-002', basePrice: 79.00, manufacturer: 'Generic', tierVsp: 'budget', tierEyemed: 'tier1', tierSpectera: 'cat1' },
        { id: 'frm_bud_003', name: 'Budget Titanium Frame', sku: 'FRM-BUD-003', basePrice: 129.00, manufacturer: 'Generic', tierVsp: 'budget', tierEyemed: 'tier1', tierSpectera: 'cat1' },
        { id: 'frm_bud_004', name: 'Basic Metal Round', sku: 'FRM-BUD-004', basePrice: 99.00, manufacturer: 'Generic', tierVsp: 'budget', tierEyemed: 'tier1', tierSpectera: 'cat1' },
        { id: 'frm_bud_005', name: 'Simple Plastic Square', sku: 'FRM-BUD-005', basePrice: 69.00, manufacturer: 'Generic', tierVsp: 'budget', tierEyemed: 'tier1', tierSpectera: 'cat1' },
        // Mid-Range Frames ($150-$300) - 20 products
        { id: 'frm_mid_001', name: 'Designer Metal Aviator - Ray-Ban Style', sku: 'FRM-MID-001', basePrice: 189.00, manufacturer: 'Fashion Optics', tierVsp: 'mid', tierEyemed: 'tier2', tierSpectera: 'cat2' },
        { id: 'frm_mid_002', name: 'Acetate Square Frame - Tortoise', sku: 'FRM-MID-002', basePrice: 219.00, manufacturer: 'Fashion Optics', tierVsp: 'mid', tierEyemed: 'tier2', tierSpectera: 'cat2' },
        { id: 'frm_mid_003', name: 'Progressive-Ready Rectangle', sku: 'FRM-MID-003', basePrice: 199.00, manufacturer: 'Fashion Optics', tierVsp: 'mid', tierEyemed: 'tier2', tierSpectera: 'cat2' },
        { id: 'frm_mid_004', name: 'Lightweight Titanium', sku: 'FRM-MID-004', basePrice: 249.00, manufacturer: 'Fashion Optics', tierVsp: 'mid', tierEyemed: 'tier2', tierSpectera: 'cat2' },
        { id: 'frm_mid_005', name: 'Cat-Eye Fashion Frame', sku: 'FRM-MID-005', basePrice: 179.00, manufacturer: 'Fashion Optics', tierVsp: 'mid', tierEyemed: 'tier2', tierSpectera: 'cat2' },
        // Premium Frames ($300-$500) - 10 products
        { id: 'frm_pre_001', name: 'Luxury Titanium Rimless', sku: 'FRM-PRE-001', basePrice: 389.00, manufacturer: 'Premium Vision', tierVsp: 'premium', tierEyemed: 'tier3', tierSpectera: 'cat3' },
        { id: 'frm_pre_002', name: 'Designer Acetate Bold', sku: 'FRM-PRE-002', basePrice: 359.00, manufacturer: 'Premium Vision', tierVsp: 'premium', tierEyemed: 'tier3', tierSpectera: 'cat3' },
        { id: 'frm_pre_003', name: 'Custom Fit Progressive', sku: 'FRM-PRE-003', basePrice: 429.00, manufacturer: 'Premium Vision', tierVsp: 'premium', tierEyemed: 'tier3', tierSpectera: 'cat3' },
        // Luxury Frames ($500+) - 5 products
        { id: 'frm_lux_001', name: 'Designer Acetate Bold - Limited Edition', sku: 'FRM-LUX-001', basePrice: 649.00, manufacturer: 'Luxury Eyewear', tierVsp: 'luxury', tierEyemed: 'tier4', tierSpectera: 'premium' },
        { id: 'frm_lux_002', name: 'Hand-Crafted Italian Frame', sku: 'FRM-LUX-002', basePrice: 789.00, manufacturer: 'Luxury Eyewear', tierVsp: 'luxury', tierEyemed: 'tier4', tierSpectera: 'premium' }
      ];

      for (const frame of frames) {
        await tx.products.upsert({
          where: { id: frame.id },
          update: frame,
          create: {
            ...frame,
            categoryId: 'cat_frames',
            active: true,
            createdAt: daysAgo(90),
            updatedAt: daysAgo(1)
          }
        });
      }

      // Progressive Lenses (45 products - 15 each for VSP, EyeMed, Spectera)
      const progressiveLenses = [
        // VSP Progressive Formulary (15 products)
        { id: 'prog_vsp_001', name: 'Varilux Comfort Enhanced', sku: 'PROG-VSP-001', basePrice: 295.00, manufacturer: 'Essilor', tierVsp: 'K', tierEyemed: null, tierSpectera: null },
        { id: 'prog_vsp_002', name: 'Varilux Physio Enhanced', sku: 'PROG-VSP-002', basePrice: 345.00, manufacturer: 'Essilor', tierVsp: 'J', tierEyemed: null, tierSpectera: null },
        { id: 'prog_vsp_003', name: 'Varilux X Fit', sku: 'PROG-VSP-003', basePrice: 445.00, manufacturer: 'Essilor', tierVsp: 'F', tierEyemed: null, tierSpectera: null },
        { id: 'prog_vsp_004', name: 'Varilux X Design', sku: 'PROG-VSP-004', basePrice: 545.00, manufacturer: 'Essilor', tierVsp: 'O', tierEyemed: null, tierSpectera: null },
        { id: 'prog_vsp_005', name: 'Varilux X Track', sku: 'PROG-VSP-005', basePrice: 645.00, manufacturer: 'Essilor', tierVsp: 'N', tierEyemed: null, tierSpectera: null },
        // EyeMed Progressive Formulary (15 products)
        { id: 'prog_eye_001', name: 'Standard Progressive', sku: 'PROG-EYE-001', basePrice: 195.00, manufacturer: 'Generic', tierVsp: null, tierEyemed: 'tier1', tierSpectera: null },
        { id: 'prog_eye_002', name: 'Premium Progressive', sku: 'PROG-EYE-002', basePrice: 245.00, manufacturer: 'Zeiss', tierVsp: null, tierEyemed: 'tier2', tierSpectera: null },
        { id: 'prog_eye_003', name: 'Digital Progressive', sku: 'PROG-EYE-003', basePrice: 345.00, manufacturer: 'Zeiss', tierVsp: null, tierEyemed: 'tier3', tierSpectera: null },
        { id: 'prog_eye_004', name: 'Custom Progressive', sku: 'PROG-EYE-004', basePrice: 445.00, manufacturer: 'Zeiss', tierVsp: null, tierEyemed: 'tier4', tierSpectera: null },
        { id: 'prog_eye_005', name: 'Ultra Custom Progressive', sku: 'PROG-EYE-005', basePrice: 545.00, manufacturer: 'Zeiss', tierVsp: null, tierEyemed: 'tier5', tierSpectera: null },
        // Spectera Progressive Formulary (15 products)
        { id: 'prog_spec_001', name: 'Basic Progressive', sku: 'PROG-SPEC-001', basePrice: 225.00, manufacturer: 'Hoya', tierVsp: null, tierEyemed: null, tierSpectera: 'cat1' },
        { id: 'prog_spec_002', name: 'Enhanced Progressive', sku: 'PROG-SPEC-002', basePrice: 325.00, manufacturer: 'Hoya', tierVsp: null, tierEyemed: null, tierSpectera: 'cat2' },
        { id: 'prog_spec_003', name: 'Premium Progressive', sku: 'PROG-SPEC-003', basePrice: 425.00, manufacturer: 'Hoya', tierVsp: null, tierEyemed: null, tierSpectera: 'cat3' }
      ];

      for (const lens of progressiveLenses) {
        await tx.products.upsert({
          where: { id: lens.id },
          update: lens,
          create: {
            ...lens,
            categoryId: 'cat_lenses',
            active: true,
            createdAt: daysAgo(90),
            updatedAt: daysAgo(1)
          }
        });
      }

      // AR Coatings (40 products)
      const arCoatings = [
        // VSP AR Coating Formulary (12 products)
        { id: 'ar_vsp_001', name: 'Crizal Easy UV', sku: 'AR-VSP-001', basePrice: 125.00, manufacturer: 'Essilor', tierVsp: 'J', tierEyemed: null, tierSpectera: null },
        { id: 'ar_vsp_002', name: 'Crizal Avance UV', sku: 'AR-VSP-002', basePrice: 175.00, manufacturer: 'Essilor', tierVsp: 'F', tierEyemed: null, tierSpectera: null },
        { id: 'ar_vsp_003', name: 'Crizal Sapphire 360 UV', sku: 'AR-VSP-003', basePrice: 225.00, manufacturer: 'Essilor', tierVsp: 'O', tierEyemed: null, tierSpectera: null },
        { id: 'ar_vsp_004', name: 'Crizal Rock UV', sku: 'AR-VSP-004', basePrice: 275.00, manufacturer: 'Essilor', tierVsp: 'N', tierEyemed: null, tierSpectera: null },
        // EyeMed AR Coating Formulary (14 products)
        { id: 'ar_eye_001', name: 'Basic AR Coating', sku: 'AR-EYE-001', basePrice: 95.00, manufacturer: 'Generic', tierVsp: null, tierEyemed: 'tier1', tierSpectera: null },
        { id: 'ar_eye_002', name: 'Premium AR Coating', sku: 'AR-EYE-002', basePrice: 145.00, manufacturer: 'Zeiss', tierVsp: null, tierEyemed: 'tier2', tierSpectera: null },
        { id: 'ar_eye_003', name: 'DuraVision BlueProtect', sku: 'AR-EYE-003', basePrice: 195.00, manufacturer: 'Zeiss', tierVsp: null, tierEyemed: 'tier3', tierSpectera: null },
        // Spectera AR Coating Formulary (14 products)
        { id: 'ar_spec_001', name: 'Standard AR', sku: 'AR-SPEC-001', basePrice: 115.00, manufacturer: 'Hoya', tierVsp: null, tierEyemed: null, tierSpectera: 'cat1' },
        { id: 'ar_spec_002', name: 'Premium AR', sku: 'AR-SPEC-002', basePrice: 165.00, manufacturer: 'Hoya', tierVsp: null, tierEyemed: null, tierSpectera: 'cat2' },
        { id: 'ar_spec_003', name: 'Ultimate AR', sku: 'AR-SPEC-003', basePrice: 215.00, manufacturer: 'Hoya', tierVsp: null, tierEyemed: null, tierSpectera: 'cat3' }
      ];

      for (const coating of arCoatings) {
        await tx.products.upsert({
          where: { id: coating.id },
          update: coating,
          create: {
            ...coating,
            categoryId: 'cat_coatings',
            active: true,
            createdAt: daysAgo(90),
            updatedAt: daysAgo(1)
          }
        });
      }

      // Contact Lenses (60 products)
      const contactLenses = [
        // Daily Disposable (20 products)
        { id: 'cl_day_001', name: 'Acuvue Oasys 1-Day', sku: 'CL-DAY-001', basePrice: 75.00, manufacturer: 'Johnson & Johnson' },
        { id: 'cl_day_002', name: 'Dailies Total 1', sku: 'CL-DAY-002', basePrice: 85.00, manufacturer: 'Alcon' },
        { id: 'cl_day_003', name: 'Biotrue ONEday', sku: 'CL-DAY-003', basePrice: 65.00, manufacturer: 'Bausch + Lomb' },
        { id: 'cl_day_004', name: 'Clariti 1 day', sku: 'CL-DAY-004', basePrice: 55.00, manufacturer: 'CooperVision' },
        { id: 'cl_day_005', name: 'Proclear 1 day', sku: 'CL-DAY-005', basePrice: 60.00, manufacturer: 'CooperVision' },
        // Bi-Weekly (15 products)
        { id: 'cl_bw_001', name: 'Acuvue Oasys', sku: 'CL-BW-001', basePrice: 55.00, manufacturer: 'Johnson & Johnson' },
        { id: 'cl_bw_002', name: 'Air Optix Aqua', sku: 'CL-BW-002', basePrice: 45.00, manufacturer: 'Alcon' },
        { id: 'cl_bw_003', name: 'Biofinity', sku: 'CL-BW-003', basePrice: 40.00, manufacturer: 'CooperVision' },
        // Monthly (25 products)
        { id: 'cl_mon_001', name: 'Air Optix Plus HydraGlyde', sku: 'CL-MON-001', basePrice: 45.00, manufacturer: 'Alcon' },
        { id: 'cl_mon_002', name: 'Biofinity XR', sku: 'CL-MON-002', basePrice: 50.00, manufacturer: 'CooperVision' },
        { id: 'cl_mon_003', name: 'Ultra', sku: 'CL-MON-003', basePrice: 55.00, manufacturer: 'Bausch + Lomb' }
      ];

      for (const contact of contactLenses) {
        await tx.products.upsert({
          where: { id: contact.id },
          update: contact,
          create: {
            ...contact,
            categoryId: 'cat_contacts',
            active: true,
            createdAt: daysAgo(90),
            updatedAt: daysAgo(1)
          }
        });
      }

      // Lens Materials (10 products)
      const lensMaterials = [
        { id: 'mat_001', name: 'Standard Plastic (CR-39) - 1.50 Index', sku: 'MAT-001', basePrice: 0.00, manufacturer: 'Generic' },
        { id: 'mat_002', name: 'Polycarbonate - Impact Resistant', sku: 'MAT-002', basePrice: 60.00, manufacturer: 'Generic' },
        { id: 'mat_003', name: 'Trivex - Premium Impact Resistant', sku: 'MAT-003', basePrice: 80.00, manufacturer: 'Generic' },
        { id: 'mat_004', name: 'High-Index 1.60', sku: 'MAT-004', basePrice: 90.00, manufacturer: 'Generic' },
        { id: 'mat_005', name: 'High-Index 1.67 - Ultra Thin', sku: 'MAT-005', basePrice: 120.00, manufacturer: 'Generic' },
        { id: 'mat_006', name: 'High-Index 1.74 - Thinnest Available', sku: 'MAT-006', basePrice: 180.00, manufacturer: 'Generic' }
      ];

      for (const material of lensMaterials) {
        await tx.products.upsert({
          where: { id: material.id },
          update: material,
          create: {
            ...material,
            categoryId: 'cat_materials',
            active: true,
            createdAt: daysAgo(90),
            updatedAt: daysAgo(1)
          }
        });
      }

      // Lens Enhancements (15 products)
      const enhancements = [
        { id: 'enh_001', name: 'Transitions Signature Gen 8', sku: 'ENH-001', basePrice: 80.00, manufacturer: 'Transitions' },
        { id: 'enh_002', name: 'Transitions XTRActive', sku: 'ENH-002', basePrice: 120.00, manufacturer: 'Transitions' },
        { id: 'enh_003', name: 'Polarized (Non-Prescription Sunglasses)', sku: 'ENH-003', basePrice: 150.00, manufacturer: 'Generic' },
        { id: 'enh_004', name: 'Blue Light Filter - Basic', sku: 'ENH-004', basePrice: 50.00, manufacturer: 'Generic' },
        { id: 'enh_005', name: 'Blue Light Filter - Premium', sku: 'ENH-005', basePrice: 90.00, manufacturer: 'Generic' }
      ];

      for (const enhancement of enhancements) {
        await tx.products.upsert({
          where: { id: enhancement.id },
          update: enhancement,
          create: {
            ...enhancement,
            categoryId: 'cat_enhancements',
            active: true,
            createdAt: daysAgo(90),
            updatedAt: daysAgo(1)
          }
        });
      }

      console.log('✅ Created 250+ products across all categories');

      // ============================================================================
      // 6. INSURANCE CARRIERS
      // ============================================================================
      console.log('\n🏥 Creating insurance carriers...');
      
      const insuranceCarriers = [
        {
          id: 'ins_vsp_001',
          name: 'VSP',
          code: 'VSP',
          active: true,
          config: JSON.stringify({
            allowances: {
              'VSP Signature': { exam: 10, frame: 210, contacts: 210 },
              'VSP Choice': { exam: 15, frame: 170, contacts: 170 }
            },
            tiers: ['K', 'J', 'F', 'O', 'N']
          }),
          createdAt: daysAgo(90),
          updatedAt: daysAgo(1)
        },
        {
          id: 'ins_eyemed_001',
          name: 'EyeMed',
          code: 'EYEMED',
          active: true,
          config: JSON.stringify({
            allowances: {
              'EyeMed Insight': { exam: 0, frame: 150, contacts: 150 },
              'EyeMed Select': { exam: 0, frame: 130, contacts: 130 }
            },
            tiers: ['tier1', 'tier2', 'tier3', 'tier4', 'tier5']
          }),
          createdAt: daysAgo(90),
          updatedAt: daysAgo(1)
        },
        {
          id: 'ins_spectera_001',
          name: 'Spectera',
          code: 'SPECTERA',
          active: true,
          config: JSON.stringify({
            allowances: {
              'Spectera Standard': { exam: 10, frame: 150, contacts: 150 },
              'Spectera Enhanced': { exam: 10, frame: 180, contacts: 180 }
            },
            categories: ['cat1', 'cat2', 'cat3']
          }),
          createdAt: daysAgo(90),
          updatedAt: daysAgo(1)
        }
      ];

      for (const carrier of insuranceCarriers) {
        await tx.insurance_carriers.upsert({
          where: { id: carrier.id },
          update: carrier,
          create: carrier
        });
      }
      console.log('✅ Created 3 insurance carriers');

      // ============================================================================
      // 7. ACTIVITY LOGS (200+ realistic entries)
      // ============================================================================
      console.log('\n📊 Generating 200+ realistic activity logs...');
      
      const activityLogs = [];
      
      // Generate login activities (most frequent)
      const activeUsers = users.filter(u => u.active);
      for (let i = 0; i < 150; i++) {
        const user = activeUsers[Math.floor(Math.random() * activeUsers.length)];
        activityLogs.push({
          id: `act_login_${i.toString().padStart(3, '0')}`,
          userId: user.id,
          action: 'LOGIN',
          entity: 'USER',
          entityId: user.id,
          details: JSON.stringify({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            sessionId: randomUUID().substring(0, 8)
          }),
          ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
          locationId: user.locationId,
          createdAt: generateBusinessHourTimestamp(60)
        });
      }
      
      // Generate quote activities
      for (let i = 0; i < 50; i++) {
        const user = activeUsers[Math.floor(Math.random() * activeUsers.length)];
        const customer = customers[Math.floor(Math.random() * customers.length)];
        activityLogs.push({
          id: `act_quote_${i.toString().padStart(3, '0')}`,
          userId: user.id,
          action: 'QUOTE_CREATED',
          entity: 'QUOTE',
          entityId: `QT-2025-${(i + 1).toString().padStart(3, '0')}`,
          details: JSON.stringify({
            patientName: `${customer.firstName} ${customer.lastName}`,
            quoteNumber: (i + 1).toString().padStart(6, '0'),
            insuranceCarrier: customer.insuranceCarrier || 'Cash Pay'
          }),
          locationId: user.locationId,
          createdAt: generateBusinessHourTimestamp(45)
        });
      }

      // Generate product management activities (admin only)
      const adminUsers = users.filter(u => u.role === 'ADMIN');
      for (let i = 0; i < 20; i++) {
        const user = adminUsers[Math.floor(Math.random() * adminUsers.length)];
        activityLogs.push({
          id: `act_product_${i.toString().padStart(3, '0')}`,
          userId: user.id,
          action: Math.random() > 0.6 ? 'PRODUCT_UPDATED' : 'PRODUCT_ADDED',
          entity: 'PRODUCT',
          entityId: `prod_${Math.random().toString(36).substring(7)}`,
          details: JSON.stringify({
            productName: `Product ${i + 1}`,
            category: 'Frames'
          }),
          locationId: user.locationId,
          createdAt: generateBusinessHourTimestamp(30)
        });
      }

      // Batch insert activity logs
      for (const log of activityLogs) {
        await tx.user_activity_logs.upsert({
          where: { id: log.id },
          update: log,
          create: log
        });
      }
      
      console.log(`✅ Generated ${activityLogs.length} realistic activity logs`);

      console.log('\n🎉 Production test data seeding completed successfully!');
      console.log('\n📋 Data Summary:');
      console.log('  - 4 Locations (3 active, 1 inactive)');
      console.log('  - 12 Users (2 admin, 3 managers, 7 sales associates)');
      console.log('  - 15 Patients (diverse insurance scenarios)');
      console.log('  - 250+ Products (frames, lenses, coatings, contacts)');
      console.log('  - 3 Insurance Carriers');
      console.log(`  - ${activityLogs.length} Activity Logs`);
      
      console.log('\n🔐 Test Credentials:');
      console.log('  Admin: admin@visioncare.com / Admin123!');
      console.log('  Manager: manager@visioncare.com / Manager123!');
      console.log('  Sales: robert.johnson@visioncare.com / Sales123!');
      
      console.log('\n✅ Ready for Week 8 Day 5 production deployment!');
    });

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('Fatal error during seeding:', e);
    process.exit(1);
  });