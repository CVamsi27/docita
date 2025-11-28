#!/bin/bash

BASE_URL="http://localhost:3002/api"
EMAIL="doctor@docita.com"
PASSWORD="password123"

echo "1. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login Failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
else
  echo "✅ Login Successful"
fi

echo "--------------------------------"
echo "2. Testing Get Patients..."
PATIENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/patients" \
  -H "Authorization: Bearer $TOKEN")

if [[ $PATIENTS_RESPONSE == *"["* ]]; then
  echo "✅ Get Patients Successful"
  COUNT=$(echo $PATIENTS_RESPONSE | grep -o '"id":' | wc -l)
  echo "   Found $COUNT patients"
else
  echo "❌ Get Patients Failed"
  echo "Response: $PATIENTS_RESPONSE"
fi

echo "--------------------------------"
echo "3. Testing Create Patient..."
RANDOM_PHONE="99$(date +%s | tail -c 9 | head -c 8)"
CREATE_PATIENT_RESPONSE=$(curl -s -X POST "$BASE_URL/patients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"Backend\",
    \"dateOfBirth\": \"1990-01-01T00:00:00.000Z\",
    \"gender\": \"male\",
    \"phoneNumber\": \"$RANDOM_PHONE\",
    \"email\": \"test.backend@example.com\",
    \"address\": \"123 Test St\",
    \"bloodGroup\": \"O+\",
    \"allergies\": \"None\",
    \"medicalHistory\": []
  }")

if [[ $CREATE_PATIENT_RESPONSE == *"\"id\":"* ]]; then
  echo "Response: $CREATE_PATIENT_RESPONSE"
  PATIENT_ID=$(echo $CREATE_PATIENT_RESPONSE | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
  echo "✅ Create Patient Successful. ID: $PATIENT_ID"
else
  echo "❌ Create Patient Failed"
  echo "Response: $CREATE_PATIENT_RESPONSE"
  exit 1
fi

echo "--------------------------------"
echo "4. Testing Duplicate Patient (Should Fail)..."
DUPLICATE_RESPONSE=$(curl -s -X POST "$BASE_URL/patients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"Duplicate\",
    \"dateOfBirth\": \"1990-01-01T00:00:00.000Z\",
    \"gender\": \"MALE\",
    \"phoneNumber\": \"$RANDOM_PHONE\",
    \"email\": \"test.duplicate@example.com\"
  }")

if [[ $DUPLICATE_RESPONSE == *"Unique constraint"* ]] || [[ $DUPLICATE_RESPONSE == *"Conflict"* ]] || [[ $DUPLICATE_RESPONSE == *"error"* ]]; then
  echo "✅ Duplicate Detection Successful (Request Failed as expected)"
else
  echo "⚠️ Duplicate Detection Warning (Request might have succeeded unexpectedly)"
  echo "Response: $DUPLICATE_RESPONSE"
fi

echo "--------------------------------"
echo "5. Testing Get Invoices..."
INVOICES_RESPONSE=$(curl -s -X GET "$BASE_URL/invoices" \
  -H "Authorization: Bearer $TOKEN")

if [[ $INVOICES_RESPONSE == *"["* ]]; then
  echo "✅ Get Invoices Successful"
else
  echo "❌ Get Invoices Failed"
  echo "Response: $INVOICES_RESPONSE"
fi

echo "--------------------------------"
echo "6. Testing Create Invoice..."
CREATE_INVOICE_RESPONSE=$(curl -s -X POST "$BASE_URL/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"total\": 1000,
    \"status\": \"pending\",
    \"items\": [{\"description\": \"Test Service\", \"quantity\": 1, \"price\": 1000}]
  }")

if [[ $CREATE_INVOICE_RESPONSE == *"id"* ]]; then
  INVOICE_ID=$(echo $CREATE_INVOICE_RESPONSE | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
  echo "✅ Create Invoice Successful. ID: $INVOICE_ID"
else
  echo "❌ Create Invoice Failed"
  echo "Response: $CREATE_INVOICE_RESPONSE"
fi

echo "--------------------------------"
echo "7. Testing PDF Generation..."
echo "Requesting: $BASE_URL/invoices/$INVOICE_ID/pdf"
PDF_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/invoices/$INVOICE_ID/pdf" \
  -H "Authorization: Bearer $TOKEN")

echo "HTTP Code: $PDF_RESPONSE"

if [ "$PDF_RESPONSE" == "200" ]; then
  echo "✅ PDF Generation Successful (HTTP 200)"
else
  echo "❌ PDF Generation Failed (HTTP $PDF_RESPONSE)"
fi


echo "--------------------------------"
echo "8. Testing Import Patients..."
IMPORT_RESPONSE=$(curl -s -X POST "$BASE_URL/imports/patients" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_patients.csv" \
  -F "patientId=dummy")

if [[ $IMPORT_RESPONSE == *"success"* ]]; then
  echo "✅ Import Patients Successful"
  SUCCESS_COUNT=$(echo $IMPORT_RESPONSE | grep -o '"success":[0-9]*' | cut -d':' -f2)
  echo "   Imported $SUCCESS_COUNT patients"
else
  echo "❌ Import Patients Failed"
  echo "Response: $IMPORT_RESPONSE"
fi

echo "--------------------------------"
echo "Backend Verification Complete"
