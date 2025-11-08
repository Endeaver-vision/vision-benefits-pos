-- Week 8 Day 1 - Analytics Database Views
-- This migration creates comprehensive analytics views for efficient reporting

-- Daily Analytics View
-- Aggregates quote, sales, and activity data by day for dashboard metrics
CREATE VIEW IF NOT EXISTS daily_analytics AS
SELECT 
  DATE(q.createdAt) as analytics_date,
  q.locationId,
  l.name as location_name,
  
  -- Quote Metrics
  COUNT(CASE WHEN q.status = 'BUILDING' THEN 1 END) as quotes_building,
  COUNT(CASE WHEN q.status = 'DRAFT' THEN 1 END) as quotes_draft,
  COUNT(CASE WHEN q.status = 'PRESENTED' THEN 1 END) as quotes_presented,
  COUNT(CASE WHEN q.status = 'SIGNED' THEN 1 END) as quotes_signed,
  COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) as quotes_completed,
  COUNT(CASE WHEN q.status = 'CANCELLED' THEN 1 END) as quotes_cancelled,
  COUNT(CASE WHEN q.status = 'EXPIRED' THEN 1 END) as quotes_expired,
  COUNT(*) as total_quotes,
  
  -- Financial Metrics
  COALESCE(SUM(CASE WHEN q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as revenue_completed,
  COALESCE(SUM(CASE WHEN q.status = 'SIGNED' THEN q.total ELSE 0 END), 0) as revenue_pending,
  COALESCE(SUM(q.total), 0) as total_quote_value,
  COALESCE(AVG(CASE WHEN q.status IN ('COMPLETED', 'SIGNED') THEN q.total END), 0) as avg_sale_value,
  
  -- Product Mix Metrics
  COUNT(CASE WHEN q.isSecondPair = 1 THEN 1 END) as second_pair_quotes,
  COUNT(CASE WHEN q.isPatientOwnedFrame = 1 THEN 1 END) as pof_quotes,
  
  -- Conversion Metrics (calculated as percentages)
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*))
      ELSE 0 
    END, 2
  ) as completion_rate,
  
  ROUND(
    CASE 
      WHEN COUNT(CASE WHEN q.status IN ('PRESENTED', 'SIGNED', 'COMPLETED') THEN 1 END) > 0
      THEN (COUNT(CASE WHEN q.status IN ('SIGNED', 'COMPLETED') THEN 1 END) * 100.0 / 
            COUNT(CASE WHEN q.status IN ('PRESENTED', 'SIGNED', 'COMPLETED') THEN 1 END))
      ELSE 0 
    END, 2
  ) as presentation_to_sale_rate,
  
  -- Staff Metrics
  COUNT(DISTINCT q.userId) as active_staff_count,
  
  -- Customer Metrics  
  COUNT(DISTINCT q.customerId) as unique_customers

FROM quotes q
LEFT JOIN locations l ON q.locationId = l.id
GROUP BY DATE(q.createdAt), q.locationId, l.name;

-- Staff Performance View
-- Aggregates performance metrics by staff member for leaderboards
CREATE VIEW IF NOT EXISTS staff_performance_analytics AS
SELECT 
  u.id as user_id,
  u.firstName || ' ' || u.lastName as staff_name,
  u.email,
  u.role,
  q.locationId,
  l.name as location_name,
  DATE(q.createdAt) as performance_date,
  
  -- Quote Volume Metrics
  COUNT(*) as total_quotes,
  COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) as completed_sales,
  COUNT(CASE WHEN q.status = 'SIGNED' THEN 1 END) as signed_quotes,
  COUNT(CASE WHEN q.status = 'PRESENTED' THEN 1 END) as presented_quotes,
  COUNT(CASE WHEN q.status = 'CANCELLED' THEN 1 END) as cancelled_quotes,
  
  -- Revenue Metrics
  COALESCE(SUM(CASE WHEN q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as total_revenue,
  COALESCE(AVG(CASE WHEN q.status = 'COMPLETED' THEN q.total END), 0) as avg_sale_value,
  COALESCE(MAX(CASE WHEN q.status = 'COMPLETED' THEN q.total END), 0) as highest_sale,
  
  -- Performance Ratios
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*))
      ELSE 0 
    END, 2
  ) as completion_rate,
  
  ROUND(
    CASE 
      WHEN COUNT(CASE WHEN q.status IN ('PRESENTED', 'SIGNED', 'COMPLETED') THEN 1 END) > 0
      THEN (COUNT(CASE WHEN q.status IN ('SIGNED', 'COMPLETED') THEN 1 END) * 100.0 / 
            COUNT(CASE WHEN q.status IN ('PRESENTED', 'SIGNED', 'COMPLETED') THEN 1 END))
      ELSE 0 
    END, 2
  ) as close_rate,
  
  -- Specialty Metrics
  COUNT(CASE WHEN q.isSecondPair = 1 THEN 1 END) as second_pair_sales,
  COUNT(CASE WHEN q.isPatientOwnedFrame = 1 THEN 1 END) as pof_sales,
  
  -- Activity Score (weighted performance metric)
  (
    (COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) * 10) +
    (COUNT(CASE WHEN q.status = 'SIGNED' THEN 1 END) * 7) +
    (COUNT(CASE WHEN q.status = 'PRESENTED' THEN 1 END) * 3) +
    (COUNT(*) * 1)
  ) as activity_score

FROM users u
LEFT JOIN quotes q ON u.id = q.userId
LEFT JOIN locations l ON q.locationId = l.id
WHERE u.role IN ('ADMIN', 'MANAGER', 'SALES')
GROUP BY u.id, u.firstName, u.lastName, u.email, u.role, q.locationId, l.name, DATE(q.createdAt);

-- Monthly Trends View
-- Provides month-over-month analytics for trend analysis
CREATE VIEW IF NOT EXISTS monthly_trends AS
SELECT 
  strftime('%Y-%m', q.createdAt) as month_year,
  strftime('%Y', q.createdAt) as year,
  strftime('%m', q.createdAt) as month,
  q.locationId,
  l.name as location_name,
  
  -- Volume Metrics
  COUNT(*) as total_quotes,
  COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) as completed_sales,
  COUNT(DISTINCT q.customerId) as unique_customers,
  COUNT(DISTINCT q.userId) as active_staff,
  
  -- Financial Metrics
  COALESCE(SUM(CASE WHEN q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as total_revenue,
  COALESCE(AVG(CASE WHEN q.status = 'COMPLETED' THEN q.total END), 0) as avg_sale_value,
  
  -- Product Mix
  COUNT(CASE WHEN q.isSecondPair = 1 AND q.status = 'COMPLETED' THEN 1 END) as second_pair_revenue_count,
  COALESCE(SUM(CASE WHEN q.isSecondPair = 1 AND q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as second_pair_revenue,
  
  COUNT(CASE WHEN q.isPatientOwnedFrame = 1 AND q.status = 'COMPLETED' THEN 1 END) as pof_revenue_count,
  COALESCE(SUM(CASE WHEN q.isPatientOwnedFrame = 1 AND q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as pof_revenue,
  
  -- Performance Ratios
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*))
      ELSE 0 
    END, 2
  ) as completion_rate

FROM quotes q
LEFT JOIN locations l ON q.locationId = l.id
GROUP BY strftime('%Y-%m', q.createdAt), strftime('%Y', q.createdAt), strftime('%m', q.createdAt), q.locationId, l.name;

-- Customer Analytics View
-- Provides customer-centric analytics for retention and value analysis
CREATE VIEW IF NOT EXISTS customer_analytics AS
SELECT 
  c.id as customer_id,
  c.firstName || ' ' || c.lastName as customer_name,
  c.email,
  c.dateOfBirth,
  
  -- Quote Statistics
  COUNT(q.id) as total_quotes,
  COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) as completed_purchases,
  COUNT(CASE WHEN q.status = 'CANCELLED' THEN 1 END) as cancelled_quotes,
  
  -- Financial Metrics
  COALESCE(SUM(CASE WHEN q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as lifetime_value,
  COALESCE(AVG(CASE WHEN q.status = 'COMPLETED' THEN q.total END), 0) as avg_purchase_value,
  COALESCE(MAX(CASE WHEN q.status = 'COMPLETED' THEN q.total END), 0) as highest_purchase,
  
  -- Engagement Metrics
  MIN(q.createdAt) as first_quote_date,
  MAX(q.createdAt) as last_quote_date,
  MAX(CASE WHEN q.status = 'COMPLETED' THEN q.createdAt END) as last_purchase_date,
  
  -- Product Preferences
  COUNT(CASE WHEN q.isSecondPair = 1 THEN 1 END) as second_pair_quotes,
  COUNT(CASE WHEN q.isPatientOwnedFrame = 1 THEN 1 END) as pof_quotes,
  
  -- Customer Segment (based on purchase behavior)
  CASE 
    WHEN COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) >= 5 THEN 'VIP'
    WHEN COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) >= 3 THEN 'LOYAL'
    WHEN COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) >= 1 THEN 'ACTIVE'
    ELSE 'PROSPECT'
  END as customer_segment,
  
  -- Risk Indicators
  CASE 
    WHEN julianday('now') - julianday(MAX(q.createdAt)) > 365 THEN 'AT_RISK'
    WHEN julianday('now') - julianday(MAX(q.createdAt)) > 180 THEN 'INACTIVE'
    ELSE 'ACTIVE'
  END as engagement_status

FROM customers c
LEFT JOIN quotes q ON c.id = q.customerId
GROUP BY c.id, c.firstName, c.lastName, c.email, c.dateOfBirth;

-- Activity Summary View
-- Provides real-time activity metrics for dashboard
CREATE VIEW IF NOT EXISTS activity_summary AS
SELECT 
  DATE(ual.createdAt) as activity_date,
  ual.locationId,
  l.name as location_name,
  ual.action,
  
  -- Activity Counts
  COUNT(*) as action_count,
  COUNT(DISTINCT ual.userId) as unique_users,
  COUNT(DISTINCT ual.entityId) as unique_entities,
  
  -- Time Distribution
  strftime('%H', ual.createdAt) as hour_of_day,
  COUNT(*) as hourly_count

FROM user_activity_logs ual
LEFT JOIN locations l ON ual.locationId = l.id
GROUP BY DATE(ual.createdAt), ual.locationId, l.name, ual.action, strftime('%H', ual.createdAt);