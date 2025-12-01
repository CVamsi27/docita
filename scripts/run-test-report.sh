#!/bin/bash
# Test Coverage Verification Script

echo "=========================================="
echo "Docita E2E Test Coverage Report"
echo "=========================================="
echo ""

REPO="/Users/vamsikrishnachandaluri/repos/docita"
APP_DIR="$REPO/apps/app"

cd "$APP_DIR"

echo "1. Running API Tests (Non-UI)..."
echo "================================"
echo ""

pnpm playwright test \
  e2e/health.spec.ts \
  e2e/analytics.spec.ts \
  e2e/clinics.spec.ts \
  e2e/documents.spec.ts \
  e2e/inventory.spec.ts \
  e2e/invoices.spec.ts \
  e2e/lab-tests.spec.ts \
  e2e/medical-coding.spec.ts \
  e2e/prescriptions.spec.ts \
  e2e/queue.spec.ts \
  --reporter=list 2>&1 | tail -30

echo ""
echo "2. Test Coverage Summary"
echo "========================"
echo ""
find e2e -name "*.spec.ts" | wc -l | awk '{print "Total Test Files: " $1}'
find e2e -name "*.spec.ts" -exec grep -c "test(" {} \; | paste -sd+ | bc | awk '{print "Total Tests: " $1}'
echo ""
echo "3. Test Files:"
find e2e -name "*.spec.ts" | sort
echo ""
echo "=========================================="
echo "Report Complete"
echo "=========================================="
