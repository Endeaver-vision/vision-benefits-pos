# WEEK 8 PRODUCTION TEST DATA

## Overview
This comprehensive seed script generates production-ready test data for the Vision POS system according to the WEEK_8_PRODUCTION_TEST_DATA_SPEC.md requirements.

## Data Generated

### 🏢 **4 Locations**
- **3 Active Locations:**
  - Vision Care Downtown (Austin, TX) - Full insurance acceptance
  - Vision Care Westlake (Austin, TX) - VSP + EyeMed only
  - Vision Care Round Rock (Round Rock, TX) - VSP only
- **1 Inactive Location:**
  - Vision Care South Congress - Temporarily closed for renovation

### 👥 **12 Users**
- **2 Admin Users:**
  - Super Admin: `admin@visioncare.com` / `Admin123!`
  - Multi-location Manager: `manager@visioncare.com` / `Manager123!`
- **3 Location Managers:**
  - Downtown, Westlake, Round Rock managers
- **7 Sales Associates:**
  - 3 at Downtown, 2 at Westlake, 2 at Round Rock
  - 1 inactive associate (Ashley Miller - left company)

### 🏥 **15 Patients**
Diverse insurance scenarios:
- **6 VSP Patients:** Various plan types (Signature, Choice)
- **4 EyeMed Patients:** Different benefit utilization
- **2 Spectera Patients:** Standard and Enhanced plans
- **2 Cash Pay Patients:** No insurance coverage
- **1 Child Patient:** Requires polycarbonate lenses (safety)

### 🛍️ **250+ Products**
- **50 Frames:** Budget ($50-150), Mid-range ($150-300), Premium ($300-500), Luxury ($500+)
- **45 Progressive Lenses:** VSP, EyeMed, and Spectera formularies
- **40 AR Coatings:** All carrier tiers with accurate copays
- **60 Contact Lenses:** Daily, bi-weekly, monthly (including toric/multifocal)
- **10 Lens Materials:** CR-39 to 1.74 high-index
- **15 Lens Enhancements:** Transitions, polarized, blue light filters

### 🏥 **3 Insurance Carriers**
- **VSP:** Complete formulary with K/J/F/O/N tiers
- **EyeMed:** 5-tier progressive system
- **Spectera:** 3-category classification

### 📊 **200+ Activity Logs**
Realistic business activity:
- 150 login activities (business hours, weekday peaks)
- 50 quote creation activities
- 20 product management activities (admin only)

## Usage

### 1. Run Production Seed
```bash
npm run db:seed:production
```

### 2. Validate Data
```bash
npm run db:validate:production
```

### 3. View Data
```bash
npm run db:studio
```

## Test Credentials

### Admin Access
```
Email: admin@visioncare.com
Password: Admin123!
Role: Super Admin
Access: All locations, all permissions
```

### Manager Access
```
Email: manager@visioncare.com
Password: Manager123!
Role: Admin (Multi-location)
Access: Downtown & Westlake locations
```

### Sales Associate Access
```
Email: robert.johnson@visioncare.com
Password: Sales123!
Role: Sales Associate
Location: Downtown
Notes: Top performer, best for demos
```

## Features Tested

### ✅ **Complete Quote Lifecycle**
- All 7 quote states (BUILDING → COMPLETED)
- Insurance calculations for all 3 carriers
- Package template application
- Patient-owned frame workflows

### ✅ **Analytics Dashboard**
With this data, analytics will show:
- Total Revenue: ~$35,000 (60 days)
- Average Quote Value: ~$550
- Conversion Rate: 40%
- Top Location: Downtown (60% of sales)
- Top Sales Associate: Robert Johnson

### ✅ **User Management**
- All role types and permissions
- Active/inactive user handling
- Location-specific access controls
- Password reset capabilities

### ✅ **Product Management**
- Complete product catalog with insurance tiers
- Inventory tracking
- Supplier relationships
- Category organization

### ✅ **Insurance Integration**
- Real-time benefit calculations
- Copay determinations
- Formulary compliance
- Out-of-network scenarios

## Data Integrity

### ✅ **Idempotent Operations**
- Script can be run multiple times safely
- Uses `upsert` operations to prevent duplicates
- Preserves existing data relationships

### ✅ **Realistic Patterns**
- Business hours activity distribution
- Weekday-focused patterns
- Natural user behavior simulation
- Proper date/time relationships

### ✅ **Complete Relationships**
- All foreign keys properly linked
- No orphaned records
- Referential integrity maintained
- Proper cascading deletes

## Production Deployment Checklist

### Before Deployment
- [ ] Run seed script: `npm run db:seed:production`
- [ ] Validate data: `npm run db:validate:production`
- [ ] Verify all test accounts work
- [ ] Check analytics dashboard displays correctly
- [ ] Test quote creation workflow
- [ ] Verify insurance calculations
- [ ] Test product management features

### After Deployment
- [ ] Run smoke tests on production
- [ ] Verify all 4 locations accessible
- [ ] Create first real quote
- [ ] Test package application
- [ ] Confirm pricing calculations
- [ ] Check analytics accuracy
- [ ] Test mobile responsiveness

## Troubleshooting

### Common Issues

**1. "Property 'user_activity_logs' does not exist"**
- Run `npx prisma generate` to refresh client
- Ensure latest schema is applied

**2. "Foreign key constraint failed"**
- Check that all referenced IDs exist
- Run validation script to identify orphaned records

**3. "Password hash error"**
- Ensure bcryptjs is installed: `npm install bcryptjs`
- Check that passwords meet minimum requirements

### Debug Commands
```bash
# Check database schema
npx prisma db pull

# Generate fresh client
npx prisma generate

# View database in browser
npm run db:studio

# Check for missing tables
npx prisma db push
```

## Success Criteria

**✅ System is ready for production when:**
1. All 250+ products load without errors
2. All 12 users can log in successfully
3. Analytics dashboard shows meaningful data
4. New quotes can be created for any patient
5. Pricing calculations are accurate (spot-check)
6. Package templates apply correctly
7. All CRUD operations work smoothly
8. Quote state transitions function properly
9. Staff can complete full quote lifecycle
10. No console errors in production build

## Next Steps

1. **Beta Testing Setup:** Use this data for staff training
2. **Customer Demos:** Show real scenarios to stakeholders
3. **Performance Testing:** Stress test with this baseline
4. **Feature Validation:** Test edge cases with diverse data
5. **Alpha Release:** Deploy with confidence to pilot customers

---

**🎯 This dataset enables comprehensive testing of all Vision POS features before alpha release!**