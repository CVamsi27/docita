# Docita - API Documentation

**Healthcare Management System API**  
Version 1.0  
Base URL: `http://localhost:3001/api` (Development)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Patients API](#patients-api)
3. [Appointments API](#appointments-api)
4. [Prescriptions API](#prescriptions-api)
5. [Invoices API](#invoices-api)
6. [Documents API](#documents-api)
7. [Analytics API](#analytics-api)
8. [Clinics API](#clinics-api)
9. [Reminders API](#reminders-api)
10. [Error Handling](#error-handling)

---

## Authentication

### Login

```http
POST /auth/login
```

**Request Body:**

```json
{
  "email": "doctor@docita.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "doctor@docita.com",
    "name": "Dr. Vamsi Krishna",
    "role": "DOCTOR"
  }
}
```

### Using the Token

Include the token in the Authorization header for all subsequent requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Patients API

### List All Patients

```http
GET /patients
```

**Query Parameters:**

- `search` (optional): Search by name or phone
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**

```json
{
  "data": [
    {
      "id": "patient_123",
      "firstName": "Rajesh",
      "lastName": "Kumar",
      "dateOfBirth": "1985-03-15T00:00:00.000Z",
      "gender": "MALE",
      "phoneNumber": "9876543210",
      "email": "rajesh.kumar@email.com",
      "bloodGroup": "O+",
      "allergies": "Penicillin",
      "medicalHistory": ["Hypertension", "Diabetes Type 2"],
      "clinicId": "default-clinic-id",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

### Get Patient by ID

```http
GET /patients/:id
```

**Response:**

```json
{
  "id": "patient_123",
  "firstName": "Rajesh",
  "lastName": "Kumar",
  "dateOfBirth": "1985-03-15T00:00:00.000Z",
  "gender": "MALE",
  "phoneNumber": "9876543210",
  "email": "rajesh.kumar@email.com",
  "address": "123 MG Road, Bangalore",
  "bloodGroup": "O+",
  "allergies": "Penicillin",
  "medicalHistory": ["Hypertension", "Diabetes Type 2"],
  "tags": [
    { "tag": "VIP", "color": "gold" }
  ],
  "appointments": [...],
  "prescriptions": [...],
  "invoices": [...]
}
```

### Create Patient

```http
POST /patients
```

**Request Body:**

```json
{
  "firstName": "Priya",
  "lastName": "Sharma",
  "dateOfBirth": "1990-07-22",
  "gender": "FEMALE",
  "phoneNumber": "9876543211",
  "email": "priya.sharma@email.com",
  "address": "456 Brigade Road, Bangalore",
  "bloodGroup": "A+",
  "allergies": null,
  "medicalHistory": ["Asthma"],
  "clinicId": "default-clinic-id",
  "tags": [{ "tag": "Regular", "color": "blue" }]
}
```

**Response:**

```json
{
  "id": "patient_124",
  "firstName": "Priya",
  "lastName": "Sharma",
  ...
}
```

### Update Patient

```http
PUT /patients/:id
```

**Request Body:** (same as create, all fields optional)

### Delete Patient

```http
DELETE /patients/:id
```

---

## Appointments API

### List Appointments

```http
GET /appointments
```

**Query Parameters:**

- `date` (optional): Filter by date (YYYY-MM-DD)
- `doctorId` (optional): Filter by doctor
- `patientId` (optional): Filter by patient
- `status` (optional): Filter by status
- `clinicId` (optional): Filter by clinic

**Response:**

```json
{
  "data": [
    {
      "id": "apt_123",
      "patientId": "patient_123",
      "doctorId": "doctor_123",
      "clinicId": "default-clinic-id",
      "startTime": "2024-01-15T10:00:00.000Z",
      "endTime": "2024-01-15T10:30:00.000Z",
      "status": "scheduled",
      "type": "consultation",
      "notes": "Regular checkup",
      "patient": {
        "firstName": "Rajesh",
        "lastName": "Kumar"
      },
      "doctor": {
        "name": "Dr. Vamsi Krishna"
      }
    }
  ]
}
```

### Create Appointment

```http
POST /appointments
```

**Request Body:**

```json
{
  "patientId": "patient_123",
  "doctorId": "doctor_123",
  "clinicId": "default-clinic-id",
  "startTime": "2024-01-15T10:00:00.000Z",
  "endTime": "2024-01-15T10:30:00.000Z",
  "type": "consultation",
  "notes": "Follow-up appointment"
}
```

### Update Appointment

```http
PUT /appointments/:id
```

### Cancel Appointment

```http
DELETE /appointments/:id
```

---

## Prescriptions API

### List Prescriptions

```http
GET /prescriptions
```

**Query Parameters:**

- `patientId` (optional): Filter by patient
- `appointmentId` (optional): Filter by appointment

**Response:**

```json
{
  "data": [
    {
      "id": "rx_123",
      "appointmentId": "apt_123",
      "patientId": "patient_123",
      "medications": [
        {
          "name": "Metformin",
          "dosage": "500mg",
          "frequency": "Twice daily",
          "duration": "30 days",
          "instructions": "Take after meals"
        }
      ],
      "notes": "Continue current regimen",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Create Prescription

```http
POST /prescriptions
```

**Request Body:**

```json
{
  "appointmentId": "apt_123",
  "patientId": "patient_123",
  "medications": [
    {
      "name": "Metformin",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "30 days",
      "instructions": "Take after meals"
    }
  ],
  "notes": "Continue current regimen"
}
```

---

## Invoices API

### List Invoices

```http
GET /invoices
```

**Query Parameters:**

- `patientId` (optional): Filter by patient
- `status` (optional): Filter by status (pending, paid, cancelled)
- `startDate` (optional): Start date range
- `endDate` (optional): End date range

**Response:**

```json
{
  "data": [
    {
      "id": "inv_123",
      "appointmentId": "apt_123",
      "patientId": "patient_123",
      "items": [
        {
          "description": "Consultation Fee",
          "quantity": 1,
          "rate": 500,
          "amount": 500
        }
      ],
      "subtotal": 500,
      "tax": 0,
      "discount": 0,
      "total": 500,
      "status": "paid",
      "paymentMethod": "cash",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Create Invoice

```http
POST /invoices
```

**Request Body:**

```json
{
  "appointmentId": "apt_123",
  "patientId": "patient_123",
  "items": [
    {
      "description": "Consultation Fee",
      "quantity": 1,
      "rate": 500
    },
    {
      "description": "Lab Test",
      "quantity": 1,
      "rate": 300
    }
  ],
  "discount": 50,
  "paymentMethod": "card"
}
```

### Update Invoice Status

```http
PUT /invoices/:id/status
```

**Request Body:**

```json
{
  "status": "paid",
  "paymentMethod": "cash"
}
```

---

## Documents API

### Upload Document

```http
POST /documents/upload
```

**Request:** Multipart form data

- `file`: File to upload
- `patientId`: Patient ID
- `type`: Document type (lab_report, xray, prescription, etc.)
- `description`: Optional description

**Response:**

```json
{
  "id": "doc_123",
  "patientId": "patient_123",
  "fileName": "lab_report.pdf",
  "fileType": "application/pdf",
  "fileSize": 1024000,
  "type": "lab_report",
  "description": "Blood test results",
  "url": "/uploads/documents/lab_report.pdf",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### List Documents

```http
GET /documents
```

**Query Parameters:**

- `patientId` (required): Patient ID
- `type` (optional): Document type

### Download Document

```http
GET /documents/:id/download
```

---

## Analytics API

### Get Overview Stats

```http
GET /analytics/overview
```

**Response:**

```json
{
  "totalPatients": 150,
  "newPatientsThisMonth": 12,
  "patientGrowth": 8.5,
  "totalAppointments": 45,
  "todayAppointments": 8,
  "appointmentGrowth": 12.3,
  "revenueThisMonth": 125000,
  "revenueGrowth": 15.2,
  "pendingInvoices": 5
}
```

### Get Revenue Trends

```http
GET /analytics/revenue-trends
```

**Query Parameters:**

- `period` (optional): "week", "month", "year" (default: "month")

**Response:**

```json
{
  "data": [
    { "date": "2024-01", "revenue": 125000 },
    { "date": "2024-02", "revenue": 135000 },
    { "date": "2024-03", "revenue": 145000 }
  ]
}
```

### Get Patient Growth

```http
GET /analytics/patient-growth
```

### Get Appointment Statistics

```http
GET /analytics/appointment-stats
```

### Get Top Diagnoses

```http
GET /analytics/top-diagnoses
```

---

## Clinics API

### List Clinics

```http
GET /clinics
```

**Response:**

```json
{
  "data": [
    {
      "id": "default-clinic-id",
      "name": "Docita Health Clinic",
      "address": "123 Health Street, Bangalore",
      "phone": "+91 80 1234 5678",
      "email": "contact@docita.health",
      "active": true,
      "settings": {
        "timezone": "Asia/Kolkata",
        "currency": "INR"
      }
    }
  ]
}
```

### Create Clinic

```http
POST /clinics
```

**Request Body:**

```json
{
  "name": "New Clinic",
  "address": "456 Medical Ave, Mumbai",
  "phone": "+91 22 9876 5432",
  "email": "newclinic@example.com",
  "settings": {
    "timezone": "Asia/Kolkata",
    "currency": "INR"
  }
}
```

### Get User's Clinics

```http
GET /clinics/user/:userId
```

### Get Clinic Statistics

```http
GET /clinics/:id/stats
```

---

## Reminders API

### Get Reminder Settings

```http
GET /reminders/settings
```

**Response:**

```json
{
  "enabled": true,
  "smsEnabled": false,
  "emailEnabled": true,
  "hoursBeforeAppt": 24,
  "emailTemplate": "Dear {patientName}, this is a reminder...",
  "emailSubject": "Appointment Reminder"
}
```

### Update Reminder Settings

```http
PUT /reminders/settings
```

**Request Body:**

```json
{
  "enabled": true,
  "emailEnabled": true,
  "hoursBeforeAppt": 24,
  "emailTemplate": "Custom template with {patientName}, {doctorName}, {appointmentTime}"
}
```

### Get Reminder History

```http
GET /reminders/history
```

**Query Parameters:**

- `appointmentId` (optional): Filter by appointment
- `status` (optional): Filter by status (sent, failed)

---

## Error Handling

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Common Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate resource
- `500 Internal Server Error`: Server error

---

## Rate Limiting

- **Limit**: 100 requests per minute per IP
- **Headers**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

---

## Pagination

For list endpoints, use these query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

Response includes:

```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 10,
  "totalPages": 15
}
```

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Login
const response = await fetch("http://localhost:3001/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "doctor@docita.com",
    password: "password123",
  }),
});

const { access_token } = await response.json();

// Get patients
const patients = await fetch("http://localhost:3001/api/patients", {
  headers: {
    Authorization: `Bearer ${access_token}`,
  },
});

const data = await patients.json();
```

### Python

```python
import requests

# Login
response = requests.post('http://localhost:3001/api/auth/login', json={
    'email': 'doctor@docita.com',
    'password': 'password123'
})

token = response.json()['access_token']

# Get patients
headers = {'Authorization': f'Bearer {token}'}
patients = requests.get('http://localhost:3001/api/patients', headers=headers)

print(patients.json())
```

### cURL

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@docita.com","password":"password123"}'

# Get patients
curl http://localhost:3001/api/patients \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

**For API support or bug reports, contact: api-support@docita.com**
