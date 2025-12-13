#!/bin/bash

# Medical Coding API Test Script
# This script tests the ICD and CPT code search endpoints

API_URL="${API_URL:-http://localhost:3001}"

echo "🧪 Testing Medical Coding API"
echo "================================"
echo "API URL: $API_URL"
echo ""

# Check if backend is running
if ! curl -s --fail "$API_URL/api/health" > /dev/null 2>&1; then
  echo "❌ Backend not running on $API_URL"
  echo "   Start it with: npm run dev:api"
  exit 1
fi

echo "✅ Backend is running"
echo ""

# Test 1: Short CPT query (should return common codes)
echo "Test 1: CPT search with short query '9'"
echo "----------------------------------------"
response=$(curl -s "$API_URL/api/medical-coding/cpt-codes?search=9")
count=$(echo "$response" | jq '. | length')
echo "Returned $count codes"
if [ "$count" -gt 0 ]; then
  echo "✅ PASS - Common codes returned for short query"
  echo "First 3 codes:"
  echo "$response" | jq -r '.[0:3][] | "  \(.code) - \(.description[0:50])"'
else
  echo "❌ FAIL - No codes returned"
fi
echo ""

# Test 2: CPT search for office visits
echo "Test 2: CPT search for office visits '99'"
echo "----------------------------------------"
response=$(curl -s "$API_URL/api/medical-coding/cpt-codes?search=99")
count=$(echo "$response" | jq '. | length')
echo "Returned $count codes"
if [ "$count" -gt 0 ]; then
  echo "✅ PASS - Found office visit codes"
  echo "First 5 codes:"
  echo "$response" | jq -r '.[0:5][] | "  \(.code) - \(.description[0:50]) \(if .isCommon then "⭐" else "" end)"'
else
  echo "❌ FAIL - No codes returned"
fi
echo ""

# Test 3: ICD search for hypertension
echo "Test 3: ICD search for 'hypertension'"
echo "----------------------------------------"
response=$(curl -s "$API_URL/api/medical-coding/icd-codes?search=hypertension")
count=$(echo "$response" | jq '. | length')
echo "Returned $count codes"
if [ "$count" -gt 0 ]; then
  echo "✅ PASS - Found hypertension codes"
  echo "First 3 codes:"
  echo "$response" | jq -r '.[0:3][] | "  \(.code) - \(.description[0:60]) \(if .isCommon then "⭐" else "" end)"'
else
  echo "❌ FAIL - No codes returned"
fi
echo ""

# Test 4: Short ICD query (should return common codes)
echo "Test 4: ICD search with short query 'J'"
echo "----------------------------------------"
response=$(curl -s "$API_URL/api/medical-coding/icd-codes?search=J")
count=$(echo "$response" | jq '. | length')
echo "Returned $count codes"
if [ "$count" -gt 0 ]; then
  echo "✅ PASS - Common codes returned"
  echo "First 3 codes:"
  echo "$response" | jq -r '.[0:3][] | "  \(.code) - \(.description[0:50])"'
else
  echo "❌ FAIL - No codes returned"
fi
echo ""

# Test 5: ICD search for diabetes
echo "Test 5: ICD search for 'diabetes'"
echo "----------------------------------------"
response=$(curl -s "$API_URL/api/medical-coding/icd-codes?search=diabetes")
count=$(echo "$response" | jq '. | length')
echo "Returned $count codes"
if [ "$count" -gt 0 ]; then
  echo "✅ PASS - Found diabetes codes"
  echo "First 3 codes:"
  echo "$response" | jq -r '.[0:3][] | "  \(.code) - \(.description[0:60]) \(if .isCommon then "⭐" else "" end)"'
else
  echo "❌ FAIL - No codes returned"
fi
echo ""

# Test 6: CPT search for vaccines
echo "Test 6: CPT search for vaccines '90'"
echo "----------------------------------------"
response=$(curl -s "$API_URL/api/medical-coding/cpt-codes?search=90")
count=$(echo "$response" | jq '. | length')
echo "Returned $count codes"
if [ "$count" -gt 0 ]; then
  echo "✅ PASS - Found vaccine codes"
  echo "First 5 codes:"
  echo "$response" | jq -r '.[0:5][] | "  \(.code) - \(.description[0:50])"'
else
  echo "❌ FAIL - No codes returned"
fi
echo ""

echo "================================"
echo "🎉 Test suite complete!"
