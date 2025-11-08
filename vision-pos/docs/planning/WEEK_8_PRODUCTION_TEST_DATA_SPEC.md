# WEEK 8 PRODUCTION TEST DATA SPECIFICATION
**Vision POS System - Complete Demo Data Requirements**  
**Version:** 1.0  
**Target:** Week 8, Day 5 - Production Deployment  
**Purpose:** Final smoke testing before alpha release

---

## 📋 EXECUTIVE SUMMARY

### Why This Data Set?
At the end of Week 8, we have a **complete, production-ready system** including:
- ✅ Complete quote lifecycle (7 states)
- ✅ Full 3-layer quote builder
- ✅ Package templates
- ✅ Analytics dashboard
- ✅ Admin product/user management
- ✅ Real-time pricing for all 3 carriers

This comprehensive test data set enables:
1. **Complete smoke testing** of all features
2. **Analytics validation** with realistic historical data
3. **Staff training** with representative scenarios
4. **Alpha testing** with diverse use cases
5. **Demo presentations** to stakeholders

### Data Volume Summary
- **4 Locations** (3 active, 1 inactive)
- **12 Users** (2 admin, 3 managers, 7 sales associates)
- **250+ Products** (frames, lenses, coatings, contacts)
- **15 Patients** (diverse insurance scenarios)
- **50 Quotes** (across all states and types)
- **200+ Activity Logs** (past 60 days)
- **4 Package Templates** (pre-configured)

---

## 🎯 PRODUCTION DEPLOYMENT REQUIREMENTS

### Critical Success Factors
This data must enable testing of:
- [ ] Complete quote lifecycle (BUILDING → COMPLETED)
- [ ] All 3 insurance carriers with accurate pricing
- [ ] Package template application
- [ ] Analytics dashboard with meaningful data
- [ ] User activity tracking and reporting
- [ ] Location-specific settings and branding
- [ ] Product management (add, edit, bulk operations)
- [ ] Quote state transitions and validations
- [ ] Edge cases (expired quotes, cancellations, out-of-network)

---

## 📍 1. LOCATIONS (4 Locations)

### Location 1: Flagship Downtown Practice
```json
{
  "location_id": "loc_downtown_001",
  "name": "Vision Care Downtown",
  "address": "123 Main Street, Suite 100",
  "city": "Austin",
  "state": "TX",
  "zip": "78701",
  "phone": "(512) 555-0100",
  "email": "downtown@visioncare.com",
  "timezone": "America/Chicago",
  "tax_rate": 0.0825,
  "accepts_vsp": true,
  "accepts_eyemed": true,
  "accepts_spectera": true,
  "branding_color": "#2563EB",
  "logo_url": null,
  "is_active": true,
  "hours": {
    "monday": "9:00 AM - 6:00 PM",
    "tuesday": "9:00 AM - 6:00 PM",
    "wednesday": "9:00 AM - 6:00 PM",
    "thursday": "9:00 AM - 6:00 PM",
    "friday": "9:00 AM - 6:00 PM",
    "saturday": "10:00 AM - 4:00 PM",
    "sunday": "Closed"
  },
  "created_at": "90 days ago"
}
```

**Testing Purpose:** Primary location with full insurance acceptance, highest transaction volume

---

### Location 2: Suburban Family Practice
```json
{
  "location_id": "loc_westlake_002",
  "name": "Vision Care Westlake",
  "address": "4567 Westlake Drive",
  "city": "Austin",
  "state": "TX",
  "zip": "78746",
  "phone": "(512) 555-0200",
  "email": "westlake@visioncare.com",
  "timezone": "America/Chicago",
  "tax_rate": 0.0825,
  "accepts_vsp": true,
  "accepts_eyemed": true,
  "accepts_spectera": false,
  "branding_color": "#059669",
  "logo_url": null,
  "is_active": true,
  "hours": {
    "monday": "8:00 AM - 5:00 PM",
    "tuesday": "8:00 AM - 5:00 PM",
    "wednesday": "8:00 AM - 5:00 PM",
    "thursday": "8:00 AM - 5:00 PM",
    "friday": "8:00 AM - 5:00 PM",
    "saturday": "9:00 AM - 2:00 PM",
    "sunday": "Closed"
  },
  "created_at": "75 days ago"
}
```

**Testing Purpose:** Tests partial insurance acceptance (no Spectera), different hours

---

### Location 3: Small Satellite Office
```json
{
  "location_id": "loc_roundrock_003",
  "name": "Vision Care Round Rock",
  "address": "789 University Blvd",
  "city": "Round Rock",
  "state": "TX",
  "zip": "78664",
  "phone": "(512) 555-0300",
  "email": "roundrock@visioncare.com",
  "timezone": "America/Chicago",
  "tax_rate": 0.0825,
  "accepts_vsp": true,
  "accepts_eyemed": false,
  "accepts_spectera": false,
  "branding_color": "#DC2626",
  "logo_url": null,
  "is_active": true,
  "hours": {
    "monday": "10:00 AM - 6:00 PM",
    "tuesday": "Closed",
    "wednesday": "10:00 AM - 6:00 PM",
    "thursday": "Closed",
    "friday": "10:00 AM - 6:00 PM",
    "saturday": "9:00 AM - 1:00 PM",
    "sunday": "Closed"
  },
  "created_at": "60 days ago"
}
```

**Testing Purpose:** VSP-only location, limited hours, smaller operation

---

### Location 4: Temporarily Closed Location
```json
{
  "location_id": "loc_southcongress_004",
  "name": "Vision Care South Congress (Temporarily Closed)",
  "address": "321 South Congress Ave",
  "city": "Austin",
  "state": "TX",
  "zip": "78704",
  "phone": "(512) 555-0400",
  "email": "southcongress@visioncare.com",
  "timezone": "America/Chicago",
  "tax_rate": 0.0825,
  "accepts_vsp": true,
  "accepts_eyemed": true,
  "accepts_spectera": true,
  "branding_color": "#9333EA",
  "logo_url": null,
  "is_active": false,
  "deactivated_at": "15 days ago",
  "deactivation_reason": "Temporary closure for renovation",
  "created_at": "120 days ago"
}
```

**Testing Purpose:** Tests inactive location handling, filtering, historical data

---

## 👥 2. USERS (12 Users Across All Roles)

### Admin Users (2)

#### Super Admin
```json
{
  "user_id": "usr_admin_001",
  "email": "admin@visioncare.com",
  "password": "Admin123!",
  "first_name": "Sarah",
  "last_name": "Anderson",
  "role": "ADMIN",
  "location_id": "loc_downtown_001",
  "can_access_all_locations": true,
  "permissions": [
    "manage_users",
    "manage_locations",
    "manage_products",
    "view_all_analytics",
    "manage_system_settings",
    "bulk_operations"
  ],
  "is_active": true,
  "created_at": "90 days ago",
  "last_login": "1 hour ago"
}
```

**Testing Purpose:** Full system access, all permissions, multi-location

---

#### Multi-Location Manager
```json
{
  "user_id": "usr_admin_002",
  "email": "manager@visioncare.com",
  "password": "Manager123!",
  "first_name": "Michael",
  "last_name": "Chen",
  "role": "ADMIN",
  "location_id": "loc_downtown_001",
  "can_access_all_locations": false,
  "accessible_location_ids": ["loc_downtown_001", "loc_westlake_002"],
  "permissions": [
    "manage_users",
    "manage_products",
    "view_analytics",
    "manage_location_settings"
  ],
  "is_active": true,
  "created_at": "75 days ago",
  "last_login": "3 hours ago"
}
```

**Testing Purpose:** Limited admin access, multi-location but not all

---

### Manager Users (3)

#### Downtown Manager
```json
{
  "user_id": "usr_mgr_001",
  "email": "jennifer.martinez@visioncare.com",
  "password": "Manager123!",
  "first_name": "Jennifer",
  "last_name": "Martinez",
  "role": "MANAGER",
  "location_id": "loc_downtown_001",
  "permissions": [
    "create_quotes",
    "approve_discounts",
    "view_location_analytics",
    "manage_location_staff"
  ],
  "is_active": true,
  "created_at": "60 days ago",
  "last_login": "2 hours ago"
}
```

---

#### Westlake Manager
```json
{
  "user_id": "usr_mgr_002",
  "email": "david.thompson@visioncare.com",
  "password": "Manager123!",
  "first_name": "David",
  "last_name": "Thompson",
  "role": "MANAGER",
  "location_id": "loc_westlake_002",
  "permissions": [
    "create_quotes",
    "approve_discounts",
    "view_location_analytics",
    "manage_location_staff"
  ],
  "is_active": true,
  "created_at": "45 days ago",
  "last_login": "5 hours ago"
}
```

---

#### Round Rock Manager
```json
{
  "user_id": "usr_mgr_003",
  "email": "lisa.nguyen@visioncare.com",
  "password": "Manager123!",
  "first_name": "Lisa",
  "last_name": "Nguyen",
  "role": "MANAGER",
  "location_id": "loc_roundrock_003",
  "permissions": [
    "create_quotes",
    "approve_discounts",
    "view_location_analytics",
    "manage_location_staff"
  ],
  "is_active": true,
  "created_at": "30 days ago",
  "last_login": "1 day ago"
}
```

---

### Sales Associates (7)

#### Downtown Associates (3)
```json
{
  "user_id": "usr_sales_001",
  "email": "robert.johnson@visioncare.com",
  "password": "Sales123!",
  "first_name": "Robert",
  "last_name": "Johnson",
  "role": "SALES_ASSOCIATE",
  "location_id": "loc_downtown_001",
  "permissions": ["create_quotes", "manage_own_quotes"],
  "is_active": true,
  "created_at": "50 days ago",
  "last_login": "30 minutes ago",
  "notes": "Top performer, specializes in progressive lens sales"
}
```

```json
{
  "user_id": "usr_sales_002",
  "email": "emily.davis@visioncare.com",
  "password": "Sales123!",
  "first_name": "Emily",
  "last_name": "Davis",
  "role": "SALES_ASSOCIATE",
  "location_id": "loc_downtown_001",
  "permissions": ["create_quotes", "manage_own_quotes"],
  "is_active": true,
  "created_at": "40 days ago",
  "last_login": "2 hours ago",
  "notes": "Excellent with contact lens fittings"
}
```

```json
{
  "user_id": "usr_sales_003",
  "email": "carlos.rivera@visioncare.com",
  "password": "Sales123!",
  "first_name": "Carlos",
  "last_name": "Rivera",
  "role": "SALES_ASSOCIATE",
  "location_id": "loc_downtown_001",
  "permissions": ["create_quotes", "manage_own_quotes"],
  "is_active": true,
  "created_at": "25 days ago",
  "last_login": "4 hours ago",
  "notes": "New hire, training period"
}
```

---

#### Westlake Associates (2)
```json
{
  "user_id": "usr_sales_004",
  "email": "james.wilson@visioncare.com",
  "password": "Sales123!",
  "first_name": "James",
  "last_name": "Wilson",
  "role": "SALES_ASSOCIATE",
  "location_id": "loc_westlake_002",
  "permissions": ["create_quotes", "manage_own_quotes"],
  "is_active": true,
  "created_at": "35 days ago",
  "last_login": "1 hour ago"
}
```

```json
{
  "user_id": "usr_sales_005",
  "email": "maria.garcia@visioncare.com",
  "password": "Sales123!",
  "first_name": "Maria",
  "last_name": "Garcia",
  "role": "SALES_ASSOCIATE",
  "location_id": "loc_westlake_002",
  "permissions": ["create_quotes", "manage_own_quotes"],
  "is_active": true,
  "created_at": "25 days ago",
  "last_login": "3 hours ago"
}
```

---

#### Round Rock Associates (2)
```json
{
  "user_id": "usr_sales_006",
  "email": "chris.brown@visioncare.com",
  "password": "Sales123!",
  "first_name": "Chris",
  "last_name": "Brown",
  "role": "SALES_ASSOCIATE",
  "location_id": "loc_roundrock_003",
  "permissions": ["create_quotes", "manage_own_quotes"],
  "is_active": true,
  "created_at": "20 days ago",
  "last_login": "6 hours ago"
}
```

```json
{
  "user_id": "usr_sales_007",
  "email": "ashley.miller@visioncare.com",
  "password": "Sales123!",
  "first_name": "Ashley",
  "last_name": "Miller",
  "role": "SALES_ASSOCIATE",
  "location_id": "loc_roundrock_003",
  "permissions": ["create_quotes", "manage_own_quotes"],
  "is_active": false,
  "created_at": "15 days ago",
  "deactivated_at": "2 days ago",
  "deactivation_reason": "Left company",
  "last_login": "3 days ago"
}
```

**Testing Purpose:** Inactive user, historical data preservation

---

## 🏥 3. DEMO PATIENTS (15 Patients)

### Patient 1: VSP Signature - Fresh Benefits
```json
{
  "patient_id": "pat_001",
  "first_name": "John",
  "last_name": "Smith",
  "date_of_birth": "1985-06-15",
  "age": 39,
  "email": "john.smith@email.com",
  "phone": "(512) 555-1001",
  "insurance_carrier": "VSP",
  "plan_name": "VSP Signature",
  "member_id": "VSP123456789",
  "group_number": "12345",
  "effective_date": "2025-01-01",
  "exam_copay": 10.00,
  "frame_allowance": 210.00,
  "contact_lens_allowance": 210.00,
  "exam_used": false,
  "materials_used": false,
  "exam_frequency": 12,
  "materials_frequency": 12,
  "last_exam_date": null,
  "last_materials_date": null,
  "location_id": "loc_downtown_001",
  "created_at": "60 days ago"
}
```

**Testing Purpose:** Ideal VSP patient, all benefits available, high allowance

---

### Patient 2: EyeMed Insight - Exam Already Used
```json
{
  "patient_id": "pat_002",
  "first_name": "Sarah",
  "last_name": "Johnson",
  "date_of_birth": "1990-03-22",
  "age": 34,
  "email": "sarah.j@email.com",
  "phone": "(512) 555-1002",
  "insurance_carrier": "EyeMed",
  "plan_name": "EyeMed Insight",
  "member_id": "EM987654321",
  "group_number": "54321",
  "effective_date": "2025-01-01",
  "exam_copay": 0.00,
  "frame_allowance": 150.00,
  "contact_lens_allowance": 150.00,
  "exam_used": true,
  "materials_used": false,
  "exam_frequency": 12,
  "materials_frequency": 12,
  "last_exam_date": "2025-08-15",
  "last_materials_date": null,
  "location_id": "loc_downtown_001",
  "created_at": "55 days ago"
}
```

**Testing Purpose:** Exam benefit exhausted, materials still available

---

### Patient 3: Spectera Standard - Clean Slate
```json
{
  "patient_id": "pat_003",
  "first_name": "Michael",
  "last_name": "Chen",
  "date_of_birth": "1978-11-08",
  "age": 46,
  "email": "mchen@email.com",
  "phone": "(512) 555-1003",
  "insurance_carrier": "Spectera",
  "plan_name": "Spectera Standard",
  "member_id": "SP456789123",
  "group_number": "98765",
  "effective_date": "2025-01-01",
  "exam_copay": 10.00,
  "frame_allowance": 150.00,
  "contact_lens_allowance": 150.00,
  "exam_used": false,
  "materials_used": false,
  "exam_frequency": 12,
  "materials_frequency": 12,
  "last_exam_date": null,
  "last_materials_date": null,
  "location_id": "loc_westlake_002",
  "created_at": "50 days ago"
}
```

**Testing Purpose:** Standard Spectera plan, fresh benefits

---

### Patient 4: Cash Pay (No Insurance)
```json
{
  "patient_id": "pat_004",
  "first_name": "Emily",
  "last_name": "Davis",
  "date_of_birth": "1995-08-30",
  "age": 29,
  "email": "emily.davis@email.com",
  "phone": "(512) 555-1004",
  "insurance_carrier": null,
  "plan_name": null,
  "member_id": null,
  "exam_copay": null,
  "frame_allowance": null,
  "contact_lens_allowance": null,
  "exam_used": false,
  "materials_used": false,
  "location_id": "loc_westlake_002",
  "created_at": "45 days ago"
}
```

**Testing Purpose:** Out-of-pocket pricing, no insurance calculations

---

### Patient 5: VSP Choice - All Benefits Exhausted
```json
{
  "patient_id": "pat_005",
  "first_name": "Robert",
  "last_name": "Martinez",
  "date_of_birth": "1982-12-05",
  "age": 42,
  "email": "r.martinez@email.com",
  "phone": "(512) 555-1005",
  "insurance_carrier": "VSP",
  "plan_name": "VSP Choice",
  "member_id": "VSP555444333",
  "group_number": "67890",
  "effective_date": "2025-01-01",
  "exam_copay": 15.00,
  "frame_allowance": 170.00,
  "contact_lens_allowance": 170.00,
  "exam_used": true,
  "materials_used": true,
  "exam_frequency": 12,
  "materials_frequency": 12,
  "last_exam_date": "2025-06-10",
  "last_materials_date": "2025-06-10",
  "location_id": "loc_roundrock_003",
  "created_at": "40 days ago"
}
```

**Testing Purpose:** Both benefits used, out-of-pocket pricing scenario

---

### Patient 6: Child with EyeMed (Polycarbonate Required)
```json
{
  "patient_id": "pat_006",
  "first_name": "Sophia",
  "last_name": "Williams",
  "date_of_birth": "2013-04-18",
  "age": 11,
  "email": "parent@email.com",
  "phone": "(512) 555-1006",
  "insurance_carrier": "EyeMed",
  "plan_name": "EyeMed Select",
  "member_id": "EM111222333",
  "group_number": "11111",
  "effective_date": "2025-01-01",
  "exam_copay": 0.00,
  "frame_allowance": 130.00,
  "contact_lens_allowance": 130.00,
  "exam_used": false,
  "materials_used": false,
  "exam_frequency": 12,
  "materials_frequency": 12,
  "location_id": "loc_downtown_001",
  "created_at": "35 days ago",
  "requires_polycarbonate": true
}
```

**Testing Purpose:** Child safety lens requirement (under 18)

---

### Patient 7: Senior with VSP (65+)
```json
{
  "patient_id": "pat_007",
  "first_name": "Dorothy",
  "last_name": "Thompson",
  "date_of_birth": "1955-02-14",
  "age": 69,
  "email": "dorothy.t@email.com",
  "phone": "(512) 555-1007",
  "insurance_carrier": "VSP",
  "plan_name": "VSP Signature",
  "member_id": "VSP777888999",
  "group_number": "22222",
  "effective_date": "2025-01-01",
  "exam_copay": 10.00,
  "frame_allowance": 210.00,
  "contact_lens_allowance": 210.00,
  "exam_used": false,
  "materials_used": false,
  "exam_frequency": 12,
  "materials_frequency": 12,
  "location_id": "loc_westlake_002",
  "created_at": "30 days ago"
}
```

**Testing Purpose:** Senior patient, likely progressive lenses

---

### Patient 8: Contact Lens Wearer
```json
{
  "patient_id": "pat_008",
  "first_name": "Alex",
  "last_name": "Rodriguez",
  "date_of_birth": "1988-07-25",
  "age": 36,
  "email": "alex.r@email.com",
  "phone": "(512) 555-1008",
  "insurance_carrier": "VSP",
  "plan_name": "VSP Signature",
  "member_id": "VSP333222111",
  "group_number": "33333",
  "effective_date": "2025-01-01",
  "exam_copay": 10.00,
  "frame_allowance": 210.00,
  "contact_lens_allowance": 210.00,
  "exam_used": false,
  "materials_used": false,
  "exam_frequency": 12,
  "materials_frequency": 12,
  "prefers_contacts": true,
  "location_id": "loc_roundrock_003",
  "created_at": "28 days ago"
}
```

**Testing Purpose:** Contact lens benefit, annual supply scenario

---

### Patient 9: VSP with Patient-Owned Frame (POF)
```json
{
  "patient_id": "pat_009",
  "first_name": "Jessica",
  "last_name": "Lee",
  "date_of_birth": "1992-09-12",
  "age": 32,
  "email": "jessica.lee@email.com",
  "phone": "(512) 555-1009",
  "insurance_carrier": "VSP",
  "plan_name": "VSP Signature",
  "member_id": "VSP999888777",
  "group_number": "44444",
  "effective_date": "2025-01-01",
  "exam_copay": 10.00,
  "frame_allowance": 210.00,
  "contact_lens_allowance": 210.00,
  "exam_used": false,
  "materials_used": false,
  "exam_frequency": 12,
  "materials_frequency": 12,
  "location_id": "loc_downtown_001",
  "created_at": "25 days ago",
  "notes": "Bringing own frame for lens replacement"
}
```

**Testing Purpose:** Patient-owned frame workflow, VSP frame allowance forfeit

---

### Patient 10: EyeMed with Previous Year Benefits
```json
{
  "patient_id": "pat_010",
  "first_name": "Daniel",
  "last_name": "Park",
  "date_of_birth": "1980-05-20",
  "age": 44,
  "email": "daniel.park@email.com",
  "phone": "(512) 555-1010",
  "insurance_carrier": "EyeMed",
  "plan_name": "EyeMed Insight",
  "member_id": "EM444555666",
  "group_number": "55555",
  "effective_date": "2024-01-01",
  "exam_copay": 0.00,
  "frame_allowance": 150.00,
  "contact_lens_allowance": 150.00,
  "exam_used": true,
  "materials_used": true,
  "exam_frequency": 12,
  "materials_frequency": 12,
  "last_exam_date": "2024-03-15",
  "last_materials_date": "2024-03-15",
  "location_id": "loc_westlake_002",
  "created_at": "450 days ago",
  "notes": "Benefits should be available again (12-month cycle)"
}
```

**Testing Purpose:** Benefit renewal logic, frequency calculation

---

### Patient 11: Spectera with Mid-Tier Plan
```json
{
  "patient_id": "pat_011",
  "first_name": "Amanda",
  "last_name": "Foster",
  "date_of_birth": "1987-11-30",
  "age": 37,
  "email": "amanda.f@email.com",
  "phone": "(512) 555-1011",
  "insurance_carrier": "Spectera",
  "plan_name": "Spectera Enhanced",
  "member_id": "SP777666555",
  "group_number": "66666",
  "effective_date": "2025-01-01",
  "exam_copay": 10.00,
  "frame_allowance": 180.00,
  "contact_lens_allowance": 180.00,
  "exam_used": false,
  "materials_used": false,
  "exam_frequency": 12,
  "materials_frequency": 12,
  "location_id": "loc_downtown_001",
  "created_at": "22 days ago"
}
```

**Testing Purpose:** Mid-tier Spectera plan, higher allowances

---

### Patient 12: VSP with Special Add-Ons
```json
{
  "patient_id": "pat_012",
  "first_name": "Kevin",
  "last_name": "Nguyen",
  "date_of_birth": "1994-02-08",
  "age": 30,
  "email": "kevin.n@email.com",
  "phone": "(512) 555-1012",
  "insurance_carrier": "VSP",
  "plan_name": "VSP Signature",
  "member_id": "VSP111000999",
  "group_number": "77777",
  "effective_date": "2025-01-01",
  "exam_copay": 10.00,
  "frame_allowance": 210.00,
  "contact_lens_allowance": 210.00,
  "exam_used": false,
  "materials_used": false,
  "exam_frequency": 12,
  "materials_frequency": 12,
  "location_id": "loc_roundrock_003",
  "created_at": "20 days ago",
  "notes": "Interested in photochromic and blue light"
}
```

**Testing Purpose:** Lens enhancements, add-on pricing

---

### Patient 13: EyeMed - Recent New Patient
```json
{
  "patient_id": "pat_013",
  "first_name": "Rachel",
  "last_name": "Cooper",
  "date_of_birth": "1998-07-03",
  "age": 26,
  "email": "rachel.cooper@email.com",
  "phone": "(512) 555-1013",
  "insurance_carrier": "EyeMed",
  "plan_name": "EyeMed Select",
  "member_id": "EM888999000",
  "group_number": "88888",
  "effective_date": "2025-01-01",
  "exam_copay": 0.00,
  "frame_allowance": 130.00,
  "contact_lens_allowance": 130.00,
  "exam_used": false,
  "materials_used": false,
  "exam_frequency": 12,
  "materials_frequency": 12,
  "location_id": "loc_downtown_001",
  "created_at": "5 days ago",
  "notes": "First time patient"
}
```

**Testing Purpose:** New patient workflow, no history

---

### Patient 14: VSP with Toric Contact Lenses
```json
{
  "patient_id": "pat_014",
  "first_name": "Brandon",
  "last_name": "Hayes",
  "date_of_birth": "1991-10-15",
  "age": 33,
  "email": "brandon.h@email.com",
  "phone": "(512) 555-1014",
  "insurance_carrier": "VSP",
  "plan_name": "VSP Choice",
  "member_id": "VSP222333444",
  "group_number": "99999",
  "effective_date": "2025-01-01",
  "exam_copay": 15.00,
  "frame_allowance": 170.00,
  "contact_lens_allowance": 170.00,
  "exam_used": false,
  "materials_used": false,
  "exam_frequency": 12,
  "materials_frequency": 12,
  "prefers_contacts": true,
  "has_astigmatism": true,
  "location_id": "loc_westlake_002",
  "created_at": "18 days ago"
}
```

**Testing Purpose:** Toric contact lenses (higher cost), astigmatism

---

### Patient 15: Cash Pay - Premium Products
```json
{
  "patient_id": "pat_015",
  "first_name": "Victoria",
  "last_name": "Sterling",
  "date_of_birth": "1975-04-25",
  "age": 49,
  "email": "victoria.sterling@email.com",
  "phone": "(512) 555-1015",
  "insurance_carrier": null,
  "plan_name": null,
  "member_id": null,
  "location_id": "loc_downtown_001",
  "created_at": "12 days ago",
  "notes": "Prefers premium products, no insurance restrictions"
}
```

**Testing Purpose:** High-end cash pay, premium tier products

---

## 🛍️ 4. PRODUCT CATALOG (250+ Products)

### Product Categories Summary
- **Frames:** 50 products (budget, mid-range, premium, luxury)
- **Progressive Lenses:** 45 products (all tiers for VSP/EyeMed/Spectera)
- **Single Vision Lenses:** 15 products
- **Lens Materials:** 10 options
- **AR Coatings:** 40 products (all carrier tiers)
- **Lens Enhancements:** 15 products (photochromic, polarized, blue light, etc.)
- **Contact Lenses:** 60 products (daily, bi-weekly, monthly, toric, multifocal)
- **Accessories:** 15 products (cases, cleaning solutions, etc.)

### Frames (50 Products)

#### Budget Frames ($50-$150) - 15 products
```json
[
  {
    "sku": "FRM-BUD-001",
    "name": "Classic Metal Aviator - Silver",
    "category": "Frames",
    "brand": "Generic",
    "price": 89.00,
    "price_tier": "budget",
    "material": "Metal",
    "style": "Aviator",
    "color": "Silver",
    "size": "Medium",
    "gender": "Unisex"
  },
  {
    "sku": "FRM-BUD-002",
    "name": "Plastic Rectangle - Black",
    "category": "Frames",
    "brand": "Generic",
    "price": 79.00,
    "price_tier": "budget",
    "material": "Plastic",
    "style": "Rectangle",
    "color": "Black",
    "size": "Medium",
    "gender": "Unisex"
  },
  {
    "sku": "FRM-BUD-003",
    "name": "Budget Titanium Frame",
    "category": "Frames",
    "brand": "Generic",
    "price": 129.00,
    "price_tier": "budget",
    "material": "Titanium",
    "style": "Rectangle",
    "color": "Gunmetal",
    "size": "Large",
    "gender": "Men"
  }
  // ... 12 more budget frames
]
```

#### Mid-Range Frames ($150-$300) - 20 products
```json
[
  {
    "sku": "FRM-MID-001",
    "name": "Designer Metal Aviator - Ray-Ban Style",
    "category": "Frames",
    "brand": "Fashion Optics",
    "price": 189.00,
    "price_tier": "mid-range",
    "material": "Metal",
    "style": "Aviator",
    "color": "Gold",
    "size": "Large",
    "gender": "Unisex"
  },
  {
    "sku": "FRM-MID-002",
    "name": "Acetate Square Frame - Tortoise",
    "category": "Frames",
    "brand": "Fashion Optics",
    "price": 219.00,
    "price_tier": "mid-range",
    "material": "Acetate",
    "style": "Square",
    "color": "Tortoise",
    "size": "Medium",
    "gender": "Unisex"
  }
  // ... 18 more mid-range frames
]
```

#### Premium Frames ($300-$500) - 10 products
```json
[
  {
    "sku": "FRM-PRE-001",
    "name": "Luxury Titanium Rimless",
    "category": "Frames",
    "brand": "Premium Vision",
    "price": 389.00,
    "price_tier": "premium",
    "material": "Titanium",
    "style": "Rimless",
    "color": "Clear",
    "size": "Custom",
    "gender": "Unisex"
  }
  // ... 9 more premium frames
]
```

#### Luxury Frames ($500+) - 5 products
```json
[
  {
    "sku": "FRM-LUX-001",
    "name": "Designer Acetate Bold - Limited Edition",
    "category": "Frames",
    "brand": "Luxury Eyewear",
    "price": 649.00,
    "price_tier": "luxury",
    "material": "Acetate",
    "style": "Cat-Eye",
    "color": "Custom",
    "size": "Custom",
    "gender": "Women"
  }
  // ... 4 more luxury frames
]
```

---

### Progressive Lenses (45 Products)

**NOTE:** Import from project knowledge dynamic schemas:
- VSP Progressive Formulary (15 products across K, J, F, O, N tiers)
- EyeMed Progressive Formulary (15 products across Tier 1-5)
- Spectera Progressive Formulary (15 products across Category 1-3)

**Critical: Each progressive lens must include:**
- Product ID, Brand, Product Name
- Tier classification (K/J/F/O/N or Tier 1-5 or Cat 1-3)
- Base price (retail)
- VSP/EyeMed/Spectera copay amounts
- Is digital (boolean)
- Is customized (boolean)
- Lens code (for VSP)

---

### AR Coatings (40 Products)

**NOTE:** Import from project knowledge dynamic schemas:
- VSP AR Coating Formulary (12 products)
- EyeMed AR Coating Formulary (14 products)
- Spectera AR Coating Formulary (14 products)

**Critical: Each AR coating must include:**
- Product ID, Brand, Product Name
- Tier classification
- Has blue light (boolean)
- Base price (retail)
- VSP/EyeMed/Spectera copay amounts

---

### Lens Materials (10 Products)
```json
[
  {
    "sku": "MAT-001",
    "name": "Standard Plastic (CR-39) - 1.50 Index",
    "category": "Lens Materials",
    "index": "1.50",
    "price": 0.00,
    "is_default": true
  },
  {
    "sku": "MAT-002",
    "name": "Polycarbonate - Impact Resistant",
    "category": "Lens Materials",
    "index": "1.59",
    "price": 60.00,
    "is_impact_resistant": true,
    "is_child_required": true
  },
  {
    "sku": "MAT-003",
    "name": "Trivex - Premium Impact Resistant",
    "category": "Lens Materials",
    "index": "1.53",
    "price": 80.00,
    "is_impact_resistant": true
  },
  {
    "sku": "MAT-004",
    "name": "High-Index 1.60",
    "category": "Lens Materials",
    "index": "1.60",
    "price": 90.00
  },
  {
    "sku": "MAT-005",
    "name": "High-Index 1.67 - Ultra Thin",
    "category": "Lens Materials",
    "index": "1.67",
    "price": 120.00
  },
  {
    "sku": "MAT-006",
    "name": "High-Index 1.74 - Thinnest Available",
    "category": "Lens Materials",
    "index": "1.74",
    "price": 180.00
  }
]
```

---

### Lens Enhancements (15 Products)
```json
[
  {
    "sku": "ENH-001",
    "name": "Transitions Signature Gen 8",
    "category": "Lens Enhancements",
    "type": "Photochromic",
    "price": 80.00
  },
  {
    "sku": "ENH-002",
    "name": "Transitions XTRActive",
    "category": "Lens Enhancements",
    "type": "Photochromic",
    "price": 120.00
  },
  {
    "sku": "ENH-003",
    "name": "Polarized (Non-Prescription Sunglasses)",
    "category": "Lens Enhancements",
    "type": "Polarized",
    "price": 150.00
  },
  {
    "sku": "ENH-004",
    "name": "Blue Light Filter - Basic",
    "category": "Lens Enhancements",
    "type": "Blue Light",
    "price": 50.00
  },
  {
    "sku": "ENH-005",
    "name": "Blue Light Filter - Premium",
    "category": "Lens Enhancements",
    "type": "Blue Light",
    "price": 90.00
  },
  {
    "sku": "ENH-006",
    "name": "Mirror Coating - Silver",
    "category": "Lens Enhancements",
    "type": "Mirror",
    "price": 60.00,
    "color": "Silver"
  },
  {
    "sku": "ENH-007",
    "name": "Mirror Coating - Gold",
    "category": "Lens Enhancements",
    "type": "Mirror",
    "price": 60.00,
    "color": "Gold"
  },
  {
    "sku": "ENH-008",
    "name": "Solid Tint - Gray",
    "category": "Lens Enhancements",
    "type": "Tint",
    "price": 40.00,
    "color": "Gray"
  },
  {
    "sku": "ENH-009",
    "name": "Solid Tint - Brown",
    "category": "Lens Enhancements",
    "type": "Tint",
    "price": 40.00,
    "color": "Brown"
  },
  {
    "sku": "ENH-010",
    "name": "Gradient Tint",
    "category": "Lens Enhancements",
    "type": "Tint",
    "price": 50.00
  }
]
```

---

### Contact Lenses (60 Products)

**Daily Disposable (20 products):**
```json
[
  {
    "sku": "CL-DAY-001",
    "name": "Acuvue Oasys 1-Day",
    "category": "Contact Lenses",
    "brand": "Acuvue",
    "replacement_schedule": "Daily",
    "lens_type": "Spherical",
    "material": "Silicone Hydrogel",
    "price_per_box": 75.00,
    "quantity_per_box": 30,
    "boxes_for_annual_supply": 8,
    "vsp_price_annual": 600.00,
    "eyemed_price_annual": 600.00,
    "spectera_price_annual": 600.00
  },
  {
    "sku": "CL-DAY-002",
    "name": "Dailies Total 1",
    "category": "Contact Lenses",
    "brand": "Alcon",
    "replacement_schedule": "Daily",
    "lens_type": "Spherical",
    "material": "Water Gradient",
    "price_per_box": 85.00,
    "quantity_per_box": 30,
    "boxes_for_annual_supply": 8,
    "vsp_price_annual": 680.00,
    "eyemed_price_annual": 680.00,
    "spectera_price_annual": 680.00
  }
  // ... 18 more daily disposables (including toric and multifocal)
]
```

**Bi-Weekly (15 products):**
```json
[
  {
    "sku": "CL-BW-001",
    "name": "Acuvue Oasys",
    "category": "Contact Lenses",
    "brand": "Acuvue",
    "replacement_schedule": "Bi-Weekly",
    "lens_type": "Spherical",
    "material": "Silicone Hydrogel",
    "price_per_box": 55.00,
    "quantity_per_box": 6,
    "boxes_for_annual_supply": 8,
    "vsp_price_annual": 440.00,
    "eyemed_price_annual": 440.00,
    "spectera_price_annual": 440.00
  }
  // ... 14 more bi-weekly lenses
]
```

**Monthly (25 products):**
```json
[
  {
    "sku": "CL-MON-001",
    "name": "Air Optix Plus HydraGlyde",
    "category": "Contact Lenses",
    "brand": "Alcon",
    "replacement_schedule": "Monthly",
    "lens_type": "Spherical",
    "material": "Silicone Hydrogel",
    "price_per_box": 45.00,
    "quantity_per_box": 6,
    "boxes_for_annual_supply": 4,
    "vsp_price_annual": 360.00,
    "eyemed_price_annual": 360.00,
    "spectera_price_annual": 360.00
  }
  // ... 24 more monthly lenses (including toric and multifocal)
]
```

---

## 📦 5. PACKAGE TEMPLATES (4 Pre-Built Packages)

### Package 1: Essential Care Package
```json
{
  "package_id": "pkg_001",
  "name": "Essential Care Package",
  "description": "Perfect for budget-conscious patients - quality basics",
  "price": 299.00,
  "is_active": true,
  "includes": {
    "exam": {
      "comprehensive_exam": true,
      "optomap": false,
      "iwellness": false
    },
    "frame": {
      "sku": "FRM-BUD-001",
      "name": "Classic Metal Aviator - Silver",
      "price": 89.00
    },
    "lenses": {
      "lens_type": "Single Vision",
      "material": "Standard Plastic (1.50)",
      "ar_coating": "Basic AR",
      "enhancements": []
    }
  },
  "recommended_for": ["First-time patients", "Budget-conscious", "Simple prescriptions"],
  "locations": ["all"]
}
```

---

### Package 2: Progressive Comfort Package
```json
{
  "package_id": "pkg_002",
  "name": "Progressive Comfort Package",
  "description": "Most popular - premium progressives with quality frame",
  "price": 599.00,
  "is_active": true,
  "includes": {
    "exam": {
      "comprehensive_exam": true,
      "optomap": true,
      "iwellness": false
    },
    "frame": {
      "sku": "FRM-MID-002",
      "name": "Acetate Square Frame - Tortoise",
      "price": 219.00
    },
    "lenses": {
      "lens_type": "Progressive",
      "progressive_lens": "VSP Tier J (Premium Standard)",
      "material": "Polycarbonate",
      "ar_coating": "Crizal Easy (Premium)",
      "enhancements": ["Blue Light Filter - Basic"]
    }
  },
  "recommended_for": ["Progressive lens wearers", "Age 40+", "Office workers"],
  "locations": ["all"]
}
```

---

### Package 3: Ultimate Digital Eye Package
```json
{
  "package_id": "pkg_003",
  "name": "Ultimate Digital Eye Package",
  "description": "Top-tier technology - digital progressives and premium coatings",
  "price": 899.00,
  "is_active": true,
  "includes": {
    "exam": {
      "comprehensive_exam": true,
      "optomap": true,
      "iwellness": true
    },
    "frame": {
      "sku": "FRM-PRE-001",
      "name": "Luxury Titanium Rimless",
      "price": 389.00
    },
    "lenses": {
      "lens_type": "Progressive",
      "progressive_lens": "VSP Tier N (Custom Level 2 - Digital)",
      "material": "High-Index 1.67",
      "ar_coating": "Crizal Sapphire (Ultimate)",
      "enhancements": ["Blue Light Filter - Premium", "Transitions Signature Gen 8"]
    }
  },
  "recommended_for": ["Tech professionals", "Premium seekers", "Complex prescriptions"],
  "locations": ["loc_downtown_001", "loc_westlake_002"]
}
```

---

### Package 4: Contact Lens Annual Supply
```json
{
  "package_id": "pkg_004",
  "name": "Contact Lens Annual Supply",
  "description": "Full year of daily contact lenses with comprehensive exam",
  "price": 699.00,
  "is_active": true,
  "includes": {
    "exam": {
      "comprehensive_exam": true,
      "contact_lens_fitting": true,
      "optomap": true,
      "iwellness": false
    },
    "contacts": {
      "sku": "CL-DAY-001",
      "name": "Acuvue Oasys 1-Day",
      "boxes": 8,
      "annual_supply": true
    }
  },
  "recommended_for": ["Contact lens wearers", "Active lifestyle", "Daily disposable preference"],
  "locations": ["all"]
}
```

---

## 📋 6. QUOTES (50 Quotes Across All States)

### Quote State Distribution
- **BUILDING:** 5 quotes (actively being created, not saved)
- **DRAFT:** 10 quotes (saved but incomplete)
- **PRESENTED:** 8 quotes (shown to patient, awaiting decision)
- **SIGNED:** 12 quotes (patient accepted, pending completion)
- **COMPLETED:** 10 quotes (finalized sales)
- **CANCELLED:** 3 quotes (customer declined or chose different option)
- **EXPIRED:** 2 quotes (30+ days old drafts)

### Sample Quotes (detailed examples)

#### COMPLETED Quote Example
```json
{
  "quote_id": "QT-2025-001",
  "quote_number": "000001",
  "status": "COMPLETED",
  "patient_id": "pat_001",
  "location_id": "loc_downtown_001",
  "created_by": "usr_sales_001",
  "created_at": "45 days ago",
  "presented_at": "44 days ago",
  "signed_at": "43 days ago",
  "completed_at": "43 days ago",
  "insurance_carrier": "VSP",
  "plan_name": "VSP Signature",
  "items": [
    {
      "type": "exam",
      "includes_optomap": true,
      "includes_iwellness": false,
      "copay": 10.00
    },
    {
      "type": "frame",
      "sku": "FRM-MID-001",
      "retail_price": 189.00,
      "insurance_allowance": 210.00,
      "patient_owes": 0.00
    },
    {
      "type": "progressive_lens",
      "sku": "varilux-comfort-2",
      "tier": "J",
      "copay": 80.00
    },
    {
      "type": "ar_coating",
      "sku": "crizal-easy",
      "tier": "J",
      "copay": 50.00
    }
  ],
  "pricing": {
    "subtotal": 319.00,
    "tax": 26.32,
    "total": 345.32,
    "amount_paid": 345.32,
    "balance": 0.00
  }
}
```

---

#### DRAFT Quote Example
```json
{
  "quote_id": "QT-2025-015",
  "quote_number": "000015",
  "status": "DRAFT",
  "patient_id": "pat_006",
  "location_id": "loc_downtown_001",
  "created_by": "usr_sales_002",
  "created_at": "3 days ago",
  "last_updated": "2 days ago",
  "insurance_carrier": "EyeMed",
  "plan_name": "EyeMed Select",
  "items": [
    {
      "type": "exam",
      "includes_optomap": false,
      "includes_iwellness": false,
      "copay": 0.00
    },
    {
      "type": "frame",
      "sku": "FRM-BUD-002",
      "retail_price": 79.00
    }
  ],
  "notes": "Child patient - need to add polycarbonate lenses",
  "pricing": {
    "subtotal": 79.00,
    "estimated": true
  }
}
```

---

#### PRESENTED Quote Example
```json
{
  "quote_id": "QT-2025-025",
  "quote_number": "000025",
  "status": "PRESENTED",
  "patient_id": "pat_007",
  "location_id": "loc_westlake_002",
  "created_by": "usr_sales_004",
  "created_at": "2 days ago",
  "presented_at": "1 day ago",
  "insurance_carrier": "VSP",
  "plan_name": "VSP Signature",
  "items": [
    {
      "type": "exam",
      "includes_optomap": true,
      "includes_iwellness": true,
      "copay": 10.00
    },
    {
      "type": "frame",
      "sku": "FRM-PRE-001",
      "retail_price": 389.00,
      "insurance_allowance": 210.00,
      "patient_owes": 179.00
    },
    {
      "type": "progressive_lens",
      "sku": "varilux-x-fit",
      "tier": "N",
      "copay": 200.00
    },
    {
      "type": "ar_coating",
      "sku": "crizal-sapphire",
      "tier": "N",
      "copay": 120.00
    },
    {
      "type": "enhancement",
      "sku": "ENH-001",
      "name": "Transitions Signature Gen 8",
      "price": 80.00
    }
  ],
  "pricing": {
    "subtotal": 589.00,
    "tax": 48.60,
    "total": 637.60
  },
  "notes": "Customer thinking about Transitions, will decide tomorrow"
}
```

---

#### CANCELLED Quote Example
```json
{
  "quote_id": "QT-2025-032",
  "quote_number": "000032",
  "status": "CANCELLED",
  "patient_id": "pat_004",
  "location_id": "loc_westlake_002",
  "created_by": "usr_sales_005",
  "created_at": "7 days ago",
  "presented_at": "6 days ago",
  "cancelled_at": "5 days ago",
  "cancellation_reason": "Customer chose competitor due to lower price",
  "insurance_carrier": null,
  "items": [
    {
      "type": "exam",
      "retail_price": 95.00
    },
    {
      "type": "frame",
      "sku": "FRM-LUX-001",
      "retail_price": 649.00
    }
  ],
  "pricing": {
    "subtotal": 744.00,
    "tax": 61.38,
    "total": 805.38
  }
}
```

---

## 📊 7. ACTIVITY LOGS (200+ Entries)

### Activity Types & Volume
- **QUOTE_CREATED:** 50 entries
- **QUOTE_UPDATED:** 75 entries
- **QUOTE_PRESENTED:** 30 entries
- **QUOTE_SIGNED:** 20 entries
- **SALE_COMPLETED:** 15 entries
- **QUOTE_CANCELLED:** 5 entries
- **LOGIN:** 150 entries (distributed across users)
- **PRODUCT_ADDED:** 8 entries (admin only)
- **PRODUCT_UPDATED:** 12 entries (admin only)
- **USER_CREATED:** 4 entries (admin only)
- **LOCATION_UPDATED:** 3 entries (admin only)

### Activity Log Schema
```json
{
  "activity_id": "act_001",
  "user_id": "usr_sales_001",
  "location_id": "loc_downtown_001",
  "activity_type": "QUOTE_CREATED",
  "entity_type": "quote",
  "entity_id": "QT-2025-001",
  "description": "Created quote #000001 for John Smith",
  "metadata": {
    "patient_name": "John Smith",
    "quote_number": "000001",
    "insurance_carrier": "VSP",
    "estimated_total": 345.32
  },
  "timestamp": "45 days ago",
  "ip_address": "192.168.1.100"
}
```

### Activity Distribution Guidelines
- **Peak hours:** Mon-Fri, 9 AM - 6 PM
- **Low activity:** Weekends, before 9 AM, after 6 PM
- **Sales associates:** 70% of all activity
- **Managers:** 20% of activity
- **Admins:** 10% of activity
- **Most active users:** usr_sales_001, usr_sales_002, usr_sales_004
- **Least active:** usr_sales_007 (deactivated), usr_sales_003 (new hire)

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Data Preparation
- [ ] Review all specifications above
- [ ] Confirm database schema matches requirements
- [ ] Ensure Prisma models support all fields
- [ ] Verify relationship constraints (foreign keys)

### Phase 2: Seed Script Development
- [ ] Create `seed-production-week8.ts` file
- [ ] Implement location seeding function
- [ ] Implement user seeding with bcrypt password hashing
- [ ] Implement patient seeding function
- [ ] Import product data from dynamic schemas
- [ ] Implement package template seeding
- [ ] Implement quote seeding (all states)
- [ ] Implement activity log seeding
- [ ] Add progress logging to console
- [ ] Add error handling and rollback

### Phase 3: Data Validation
- [ ] Run seed script on clean database
- [ ] Verify all 4 locations created
- [ ] Verify all 12 users with correct roles
- [ ] Verify 15 patients with varied insurance
- [ ] Verify 250+ products across categories
- [ ] Verify 4 package templates
- [ ] Verify 50 quotes in correct states
- [ ] Verify 200+ activity logs
- [ ] Test login with each user type
- [ ] Verify foreign key relationships intact

### Phase 4: Smoke Testing
- [ ] Admin can log in and view dashboard
- [ ] View all locations (3 active, 1 inactive)
- [ ] View all users by role
- [ ] View activity logs with filters
- [ ] Create new quote for test patient
- [ ] Apply package template to quote
- [ ] Test pricing calculation accuracy
- [ ] Test quote state transitions
- [ ] View analytics dashboard with real data
- [ ] Test product management (add/edit/deactivate)

### Phase 5: Documentation
- [ ] Create admin user guide
- [ ] Create staff training checklist
- [ ] Document test credentials
- [ ] Create troubleshooting guide
- [ ] Document known limitations
- [ ] Create alpha testing feedback form

---

## 🔐 TEST CREDENTIALS

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
Notes: Highest activity, best for demo
```

---

## 📈 ANALYTICS DATA EXPECTATIONS

With this data set, analytics should show:

### Sales Metrics
- **Total Revenue (60 days):** ~$35,000
- **Average Quote Value:** ~$550
- **Conversion Rate:** 40% (20 completed / 50 total quotes)
- **Top Location:** Downtown (60% of sales)
- **Top Sales Associate:** Robert Johnson (12 completed quotes)

### Quote Metrics
- **Total Quotes Created:** 50
- **Active Quotes:** 30 (DRAFT + PRESENTED + SIGNED)
- **Completed Quotes:** 10
- **Average Time to Close:** 2.5 days
- **Quote Expiration Rate:** 4% (2/50)
- **Cancellation Rate:** 6% (3/50)

### Product Metrics
- **Most Popular Frame Price:** $189 (mid-range)
- **Most Popular Progressive:** VSP Tier J (Premium Standard)
- **Most Popular AR Coating:** Crizal Easy
- **Contact Lens Orders:** 8 annual supplies

### User Metrics
- **Most Active User:** Robert Johnson (45 activities)
- **Average Activities per User:** 30
- **Peak Activity Day:** Wednesday
- **Peak Activity Hour:** 2 PM - 3 PM

---

## 🚀 DEPLOYMENT READINESS

### Pre-Deployment Verification
- [ ] All seed data loads without errors
- [ ] All relationships validate correctly
- [ ] Login works for all user types
- [ ] Quote builder functions with test data
- [ ] Analytics dashboard displays correctly
- [ ] No console errors in production build
- [ ] Performance acceptable (<2s page loads)

### Post-Deployment Tasks
- [ ] Run smoke tests on production
- [ ] Verify all 4 locations accessible
- [ ] Create first real quote
- [ ] Test package application
- [ ] Verify pricing calculations
- [ ] Check analytics accuracy
- [ ] Confirm email notifications work
- [ ] Test mobile responsiveness

---

## 📝 NOTES FOR COPILOT

### Key Implementation Points

1. **Use Transactions:** All seeding should be wrapped in Prisma transactions to ensure atomicity
2. **Idempotent Operations:** Check for existing data before inserting (use `upsert` where possible)
3. **Password Hashing:** Use bcrypt with salt rounds = 10 for all passwords
4. **Timestamps:** Use relative dates (e.g., "45 days ago") calculated from current date
5. **Foreign Keys:** Ensure all relationships reference existing IDs
6. **Realistic Data:** Activity logs should follow natural patterns (business hours, weekday peaks)
7. **Data Volume:** This is comprehensive but not excessive - focused on testing, not stress testing
8. **Performance:** Seed script should complete in <60 seconds
9. **Logging:** Console log progress for each major section
10. **Error Handling:** Catch and log errors, provide helpful messages

### Critical Relationships
```
Users → Locations (user.location_id)
Quotes → Patients (quote.patient_id)
Quotes → Users (quote.created_by)
Quotes → Locations (quote.location_id)
Activity Logs → Users (activity.user_id)
Activity Logs → Locations (activity.location_id)
Products → Product Categories (product.category_id)
```

### Data Integrity Rules
- All users must have valid location_id
- All quotes must have valid patient_id, user_id, location_id
- Completed quotes must have: created_at, presented_at, signed_at, completed_at
- Inactive users cannot have recent activity logs
- Expired quotes must have created_at > 30 days ago
- Cancelled quotes must have cancellation_reason

---

## 🎯 SUCCESS DEFINITION

**This data set is successful if:**

1. ✅ System boots without errors
2. ✅ All 12 users can log in
3. ✅ Analytics dashboard shows meaningful data
4. ✅ New quotes can be created for any patient
5. ✅ Pricing calculations are accurate (spot-check 5 quotes)
6. ✅ Package templates apply correctly
7. ✅ Activity logs reflect realistic usage
8. ✅ All CRUD operations work (users, locations, products)
9. ✅ Quote state transitions function correctly
10. ✅ Staff can complete a full quote lifecycle in training

---

**END OF SPECIFICATION**

This document contains everything needed to generate comprehensive, production-ready test data for Week 8 Day 5 deployment and alpha testing.
