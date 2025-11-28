#!/bin/bash

# Phase 18 Deployment Script
# This script applies the performance indexes migration

echo "🚀 Starting Phase 18 Deployment..."
echo ""

# Navigate to database package
cd "$(dirname "$0")/packages/db"

echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🗄️  Running database migration..."
pnpm prisma migrate deploy

echo ""
echo "✅ Verifying indexes..."
psql $DATABASE_URL -c "SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%_createdAt_%' OR indexname LIKE '%_startTime_%' ORDER BY tablename, indexname;"

echo ""
echo "🎉 Phase 18 deployment complete!"
echo ""
echo "Next steps:"
echo "1. Restart your application"
echo "2. Monitor performance metrics"
echo "3. Check React Query DevTools for caching behavior"
echo ""
