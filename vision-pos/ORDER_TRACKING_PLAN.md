# Order Tracking System - Feature Implementation Plan

**Branch:** `feature/order-tracking-system`  
**Status:** Planning  
**Target Integration:** After testing, merge to master

---

## Overview

Build a comprehensive order tracking system that allows staff and customers to track eyewear orders from creation through delivery.

---

## Features

### 1. Order Dashboard
- **Staff View**: All orders with filtering/sorting
- **Customer View**: Their orders only
- **Status Overview**: Visual pipeline (Draft → Production → QC → Ready)
- **Quick Actions**: Update status, add notes, contact customer

### 2. Order Detail Page
- Complete order information
- Customer & prescription details
- Item breakdown (frames, lenses, services)
- Status timeline with history
- Lab tracking integration
- Notes and communications log

### 3. Order Status Updates
- Real-time status changes
- Automated notifications (email/SMS)
- Lab tracking number integration
- Estimated vs actual delivery dates
- Quality check tracking

### 4. Customer Portal Features
- Track order status
- View order history
- Delivery notifications
- Direct messaging with staff

### 5. Lab Integration
- Lab order submission
- Tracking number capture
- Status sync from lab
- Quality check workflow

---

## Database Schema

### Orders Table Enhancement
Already exists in schema as `PurchaseOrder` but needs enhancement:

```prisma
model Order {
  id                       String            @id @default(cuid())
  orderNumber              String            @unique
  customerId               String
  prescriptionId           String?
  
  // Status tracking
  status                   OrderStatus       @default(DRAFT)
  statusUpdatedAt          DateTime          @default(now())
  statusUpdatedBy          String?
  
  // Dates
  orderDate                DateTime          @default(now())
  estimatedCompletionDate  DateTime
  actualCompletionDate     DateTime?
  
  // Lab information
  labId                    String?
  labOrderNumber           String?
  labTrackingNumber        String?
  labEstimatedDelivery     DateTime?
  
  // Delivery
  deliveryMethod           DeliveryMethod    @default(PICKUP)
  deliveryAddress          Json?
  deliveryInstructions     String?
  
  // Pricing
  subtotal                 Decimal           @db.Decimal(10, 2)
  taxAmount                Decimal           @db.Decimal(10, 2)
  discountAmount           Decimal?          @db.Decimal(10, 2)
  insuranceAmount          Decimal?          @db.Decimal(10, 2)
  totalAmount              Decimal           @db.Decimal(10, 2)
  
  // Relations
  customer                 Customer          @relation(fields: [customerId], references: [id])
  items                    OrderItem[]
  statusHistory            OrderStatusHistory[]
  communications           OrderCommunication[]
  qualityChecks            OrderQualityCheck[]
  
  createdAt                DateTime          @default(now())
  updatedAt                DateTime          @updatedAt
  createdBy                String
  
  @@index([customerId])
  @@index([status])
  @@index([orderDate])
}

model OrderItem {
  id                    String       @id @default(cuid())
  orderId               String
  type                  ItemType
  productId             String?
  
  // Product details
  productName           String
  sku                   String
  description           String?
  
  // Lens specifics
  lensType              String?
  lensCoatings          String[]
  prescriptionId        String?
  
  // Frame specifics
  frameColor            String?
  frameSize             String?
  
  // Pricing
  unitPrice             Decimal      @db.Decimal(10, 2)
  finalPrice            Decimal      @db.Decimal(10, 2)
  quantity              Int          @default(1)
  
  // Status
  status                ItemStatus   @default(PENDING)
  estimatedDelivery     DateTime?
  actualDelivery        DateTime?
  
  // Lab tracking
  labId                 String?
  labOrderNumber        String?
  trackingNumber        String?
  
  order                 Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
  @@index([status])
}

model OrderStatusHistory {
  id              String    @id @default(cuid())
  orderId         String
  status          OrderStatus
  previousStatus  OrderStatus?
  updatedBy       String
  notes           String?
  timestamp       DateTime  @default(now())
  
  order           Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
  @@index([timestamp])
}

model OrderCommunication {
  id              String    @id @default(cuid())
  orderId         String
  type            CommType  // EMAIL, SMS, NOTE, CALL
  direction       Direction // INBOUND, OUTBOUND
  subject         String?
  message         String
  sentBy          String?
  sentTo          String?
  timestamp       DateTime  @default(now())
  
  order           Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
  @@index([timestamp])
}

model OrderQualityCheck {
  id              String    @id @default(cuid())
  orderId         String
  performedBy     String
  performedAt     DateTime  @default(now())
  passed          Boolean
  notes           String?
  issues          String[]
  
  order           Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
}

enum OrderStatus {
  DRAFT
  SUBMITTED
  CONFIRMED
  IN_PRODUCTION
  QUALITY_CHECK
  READY_FOR_PICKUP
  READY_FOR_SHIPPING
  SHIPPED
  DELIVERED
  CANCELLED
  ON_HOLD
}

enum ItemStatus {
  PENDING
  IN_PRODUCTION
  QUALITY_CHECK
  READY_FOR_PICKUP
  COMPLETED
  CANCELLED
}

enum ItemType {
  FRAME
  LENS
  SERVICE
  ACCESSORY
}

enum DeliveryMethod {
  PICKUP
  SHIPPING
  HAND_DELIVERY
}

enum CommType {
  EMAIL
  SMS
  NOTE
  CALL
}

enum Direction {
  INBOUND
  OUTBOUND
}
```

---

## API Endpoints

### Order Management
- `GET /api/orders` - List orders (with filters)
- `GET /api/orders/[id]` - Get order details
- `POST /api/orders` - Create new order
- `PATCH /api/orders/[id]` - Update order
- `DELETE /api/orders/[id]` - Cancel order

### Order Tracking
- `GET /api/orders/[id]/tracking` - Get tracking info
- `POST /api/orders/[id]/status` - Update status
- `GET /api/orders/[id]/history` - Status history
- `POST /api/orders/[id]/notify` - Send notification

### Quality Control
- `POST /api/orders/[id]/quality-check` - Record QC
- `GET /api/orders/[id]/quality-checks` - Get QC history

### Communications
- `GET /api/orders/[id]/communications` - Get comms log
- `POST /api/orders/[id]/communicate` - Add communication

### Customer Portal
- `GET /api/customer/orders` - Customer's orders
- `GET /api/customer/orders/[id]/track` - Track specific order

---

## UI Components

### Pages
1. `/orders` - Order dashboard (staff)
2. `/orders/[id]` - Order detail page
3. `/orders/new` - Create order
4. `/customer/orders` - Customer order list
5. `/customer/orders/[id]` - Customer order tracking

### Components
- `OrderList` - Filterable order table
- `OrderCard` - Order summary card
- `OrderStatusBadge` - Visual status indicator
- `OrderTimeline` - Status history timeline
- `OrderItemsTable` - Order items breakdown
- `OrderTracking` - Tracking information display
- `OrderActions` - Quick action buttons
- `OrderCommunicationLog` - Communication history
- `QualityCheckForm` - QC recording form
- `OrderNotifications` - Notification panel
- `CustomerOrderPortal` - Customer-facing view

---

## Implementation Phases

### Phase 1: Database & API (Week 1)
- [ ] Create database migration
- [ ] Implement core API endpoints
- [ ] Add seed data for testing
- [ ] Unit tests for APIs

### Phase 2: Staff Dashboard (Week 2)
- [ ] Order list page with filters
- [ ] Order detail page
- [ ] Status update functionality
- [ ] Communication logging

### Phase 3: Order Processing (Week 3)
- [ ] Create order flow
- [ ] Lab integration hooks
- [ ] Quality check workflow
- [ ] Automated notifications

### Phase 4: Customer Portal (Week 4)
- [ ] Customer order list
- [ ] Order tracking page
- [ ] Delivery notifications
- [ ] Communication interface

### Phase 5: Advanced Features (Week 5)
- [ ] Real-time status updates
- [ ] SMS integration
- [ ] Lab API integration
- [ ] Analytics dashboard

---

## Testing Strategy

- Unit tests for all API endpoints
- Integration tests for order workflow
- E2E tests for critical user journeys
- Load testing for order list queries

---

## Deployment Plan

1. **Development**: Test on feature branch
2. **Staging**: Merge to staging branch, full testing
3. **Production**: Merge to master after approval
4. **Rollback Plan**: Keep previous version tagged

---

## Notes

- This system will integrate with existing Customer and Transaction systems
- Will use existing Prisma schema but extend it
- All changes are additive - won't break existing functionality
- Can be developed and tested independently on feature branch
