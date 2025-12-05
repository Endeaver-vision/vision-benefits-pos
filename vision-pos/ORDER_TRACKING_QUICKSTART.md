# Order Tracking System - Quick Start Testing

## Step-by-Step Testing Instructions

### Step 1: Generate Prisma Client & Run Migration

```bash
cd /Users/cmac/let/vision-pos

# Generate Prisma client (this will fix TypeScript errors)
npx prisma generate

# Create the database tables
npx prisma migrate dev --name add_order_tracking_system

# If migration asks, select: Yes (create new migration)
```

### Step 2: Verify Tables Were Created

```bash
# Open Prisma Studio
npx prisma studio
```

You should see these new tables:
- ✅ `orders`
- ✅ `order_items`
- ✅ `order_status_history`
- ✅ `order_communications`
- ✅ `order_quality_checks`

### Step 3: Run the Automated Test Script

```bash
# Make sure your dev server is NOT running on port 3000
# Then run the test script
npx tsx scripts/test-order-tracking.ts
```

**Expected Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ORDER TRACKING SYSTEM - TEST SUITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test 1: Creating test customers...
✓ Created customers: Alice Johnson, Bob Williams

Test 2: Creating test orders...
✓ Created Order 1: TEST-ORD-... with 2 items
✓ Created Order 2: TEST-ORD-... with 2 items

...

TEST SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tests Passed: 8
Tests Failed: 0
Success Rate: 100%

✓ All tests completed successfully!
```

### Step 4: Test API Endpoints (Start Dev Server)

```bash
# Start the dev server
npm run dev
```

**In another terminal, test the APIs:**

```bash
# Get existing customer ID first
curl http://localhost:3000/api/customers | jq '.[0].id'

# Copy that ID and use it below (replace CUSTOMER_ID)

# Create a test order
curl -X POST http://localhost:3000/api/order-tracking \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "estimatedCompletionDate": "2025-12-15",
    "deliveryMethod": "PICKUP",
    "items": [
      {
        "type": "FRAME",
        "productName": "Test Frame",
        "sku": "TEST-001",
        "unitPrice": 150
      }
    ]
  }' | jq

# List all orders
curl http://localhost:3000/api/order-tracking | jq

# Get specific order (copy ID from above)
curl http://localhost:3000/api/order-tracking/ORDER_ID | jq
```

### Step 5: Visual Inspection in Prisma Studio

```bash
npx prisma studio
```

Navigate through the tables and verify:
1. Orders are created with correct data
2. Order items are linked properly
3. Status history is tracked
4. Communications are logged
5. Quality checks are recorded

---

## Troubleshooting

### If you see "Property 'order' does not exist"

This means Prisma client hasn't been generated. Run:
```bash
npx prisma generate
```

Then restart your TypeScript server in VS Code:
- Press `Cmd+Shift+P`
- Type "TypeScript: Restart TS Server"
- Press Enter

### If migration fails

Check your `.env` file has database credentials:
```bash
cat .env | grep POSTGRES
```

### If you get connection errors

Make sure the database is accessible:
```bash
# Test database connection
npx prisma db push
```

---

## What Each Test Does

| Test # | Description | What It Verifies |
|--------|-------------|------------------|
| 1 | Create customers | Database write works |
| 2 | Create orders | Orders + items created together |
| 3 | Update status | Status changes tracked |
| 4 | Add communication | Communication logs work |
| 5 | Quality check | QC workflow functional |
| 6 | Query orders | Filters and includes work |
| 7 | Data integrity | Calculations are correct |
| 8 | Cancel order | Cancellation logic works |

---

## Next Steps After Testing

Once tests pass:

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add order tracking system foundation"
   ```

2. **Build the UI (Phase 2):**
   - Order list page
   - Order detail page
   - Status update modal
   - Customer order portal

3. **Add authentication:**
   - Protect API routes
   - Track who makes changes

4. **Add notifications:**
   - Email on status change
   - SMS alerts
   - In-app notifications

---

## Ready to Test?

Run this command:
```bash
cd /Users/cmac/let/vision-pos && npx prisma generate && npx prisma migrate dev --name add_order_tracking_system
```

Then:
```bash
npx tsx scripts/test-order-tracking.ts
```

🎉 You're all set!
