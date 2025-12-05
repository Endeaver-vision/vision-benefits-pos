# Order Tracking System - Testing Guide

## Overview
This guide explains how to test the order tracking system both manually and programmatically.

---

## Prerequisites

1. **Database Setup**
   ```bash
   cd /Users/cmac/let/vision-pos
   
   # Generate Prisma client
   npx prisma generate
   
   # Run migration to create tables
   npx prisma migrate dev --name add_order_tracking_system
   ```

2. **Verify Database**
   ```bash
   # Open Prisma Studio to view tables
   npx prisma studio
   ```

---

## Testing Methods

### Method 1: Automated Test Script (Recommended)

I've created a test script at `scripts/test-order-tracking.ts` that will:
- ✅ Create test customers
- ✅ Create sample orders with various statuses
- ✅ Test status updates
- ✅ Test communications log
- ✅ Test quality checks
- ✅ Verify API endpoints

**Run the test:**
```bash
cd /Users/cmac/let/vision-pos
npx tsx scripts/test-order-tracking.ts
```

### Method 2: API Testing with cURL

**Create an Order:**
```bash
curl -X POST http://localhost:3000/api/order-tracking \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "YOUR_CUSTOMER_ID",
    "estimatedCompletionDate": "2025-12-15",
    "deliveryMethod": "PICKUP",
    "items": [
      {
        "type": "FRAME",
        "productName": "Ray-Ban Aviator",
        "sku": "RB-AV-001",
        "unitPrice": 150.00,
        "quantity": 1
      },
      {
        "type": "LENS",
        "productName": "Progressive HD",
        "sku": "LENS-PROG-HD",
        "unitPrice": 250.00,
        "lensType": "progressive",
        "lensCoatings": ["anti-reflective", "blue-light"],
        "quantity": 1
      }
    ]
  }'
```

**List Orders:**
```bash
# All orders
curl http://localhost:3000/api/order-tracking

# Filter by customer
curl http://localhost:3000/api/order-tracking?customerId=CUSTOMER_ID

# Filter by status
curl http://localhost:3000/api/order-tracking?status=IN_PRODUCTION

# Search
curl http://localhost:3000/api/order-tracking?search=Smith

# Pagination
curl http://localhost:3000/api/order-tracking?page=1&limit=10
```

**Get Order Details:**
```bash
curl http://localhost:3000/api/order-tracking/ORDER_ID
```

**Update Order Status:**
```bash
curl -X POST http://localhost:3000/api/order-tracking/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PRODUCTION",
    "updatedBy": "staff-001",
    "updatedByName": "John Doe",
    "notes": "Sent to lab for production"
  }'
```

**Update Order:**
```bash
curl -X PATCH http://localhost:3000/api/order-tracking/ORDER_ID \
  -H "Content-Type: application/json" \
  -d '{
    "labName": "Precision Optical Lab",
    "labOrderNumber": "LAB-2025-001",
    "labTrackingNumber": "TRACK-123456"
  }'
```

**Cancel Order:**
```bash
curl -X DELETE http://localhost:3000/api/order-tracking/ORDER_ID
```

### Method 3: Prisma Studio (Visual Testing)

```bash
# Open Prisma Studio
npx prisma studio
```

Navigate to:
- `orders` table - View all orders
- `order_items` table - View order items
- `order_status_history` table - View status changes
- `order_communications` table - View communications
- `order_quality_checks` table - View QC records

### Method 4: Integration with Existing App

**Test from POS Page:**
Once the UI is built, you can test from the app:
1. Navigate to `/orders` (staff dashboard)
2. Create a new order
3. Track order status
4. View order details

---

## Test Scenarios

### Scenario 1: Complete Order Lifecycle
1. Create order → Status: DRAFT
2. Submit order → Status: SUBMITTED
3. Confirm order → Status: CONFIRMED
4. Send to lab → Status: IN_PRODUCTION
5. Quality check → Status: QUALITY_CHECK
6. Ready for pickup → Status: READY_FOR_PICKUP
7. Customer pickup → Status: DELIVERED

### Scenario 2: Order with Multiple Items
1. Create order with frame + lenses + coating
2. Verify all items created
3. Update individual item status
4. Track different completion dates

### Scenario 3: Order Cancellation
1. Create order
2. Cancel before production
3. Verify cannot cancel after shipping

### Scenario 4: Lab Tracking
1. Create order
2. Add lab information
3. Add tracking number
4. Update estimated delivery

### Scenario 5: Quality Check Workflow
1. Order reaches QUALITY_CHECK status
2. Perform QC inspection
3. Pass/Fail with notes
4. Track issues found

---

## Expected Results

### Successful Order Creation
```json
{
  "success": true,
  "order": {
    "id": "clx...",
    "orderNumber": "ORD-202512-0001",
    "status": "DRAFT",
    "customer": {
      "firstName": "John",
      "lastName": "Smith"
    },
    "items": [...],
    "totalAmount": 432.00
  },
  "message": "Order created successfully"
}
```

### Order List Response
```json
{
  "orders": [...],
  "total": 15,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

## Troubleshooting

### Issue: Prisma client not found
**Solution:**
```bash
npx prisma generate
```

### Issue: Tables don't exist
**Solution:**
```bash
npx prisma migrate dev --name add_order_tracking_system
```

### Issue: TypeScript errors
**Solution:**
```bash
# Restart VS Code TypeScript server
# Or regenerate Prisma client
npx prisma generate
```

### Issue: Cannot connect to database
**Solution:**
Check `.env` file has correct database credentials:
```
POSTGRES_PRISMA_URL="..."
POSTGRES_URL_NON_POOLING="..."
```

---

## Verification Checklist

- [ ] Database tables created successfully
- [ ] Can create orders via API
- [ ] Can list orders with filters
- [ ] Can update order status
- [ ] Can add order items
- [ ] Status history is tracked
- [ ] Can cancel orders
- [ ] Cannot cancel shipped/delivered orders
- [ ] Order numbers are unique and sequential
- [ ] Totals calculate correctly

---

## Performance Testing

```bash
# Test with multiple orders
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/order-tracking \
    -H "Content-Type: application/json" \
    -d '{"customerId":"test-customer","estimatedCompletionDate":"2025-12-15","deliveryMethod":"PICKUP","items":[{"type":"FRAME","productName":"Test Frame","sku":"TEST-001","unitPrice":100}]}'
done
```

---

## Next Steps

1. ✅ Run the test script
2. ✅ Verify all API endpoints work
3. ✅ Check data in Prisma Studio
4. ✅ Test different scenarios
5. 🔲 Build UI components (Phase 2)
6. 🔲 Add authentication
7. 🔲 Add email/SMS notifications

---

## Support

If you encounter issues:
1. Check the terminal for error messages
2. Verify database connection
3. Ensure Prisma client is generated
4. Check API endpoint URLs
5. Verify request payload format
