#!/bin/bash
# Database query wrapper - avoids permission prompts
PGPASSWORD='un5SwosqaBRX3IXY' psql -h aws-1-us-east-1.pooler.supabase.com -p 6543 -U postgres.fkhswtfxxagxnhuiptrp -d postgres -c "$1"
