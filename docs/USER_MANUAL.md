# Docita - User Manual

**Healthcare Management System**  
Version 1.0

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Patient Management](#patient-management)
4. [Appointment Scheduling](#appointment-scheduling)
5. [Consultation Workflow](#consultation-workflow)
6. [Prescription Management](#prescription-management)
7. [Invoice & Billing](#invoice--billing)
8. [Document Management](#document-management)
9. [Analytics & Reports](#analytics--reports)
10. [Settings & Configuration](#settings--configuration)
11. [Multi-Clinic Features](#multi-clinic-features)

---

## Getting Started

### Logging In

1. Navigate to the Docita login page
2. Enter your email and password
3. Click "Sign In"

**Default Credentials** (for initial setup):
- Email: `doctor@docita.com`
- Password: `password123`

> **⚠️ IMPORTANT**: Change your password immediately after first login.

### User Roles

- **Doctor**: Full access to patient records, consultations, prescriptions
- **Receptionist**: Patient registration, appointment scheduling, billing
- **Admin**: System configuration, user management, clinic settings

---

## Dashboard Overview

The dashboard provides a quick overview of your clinic's activities:

### Key Metrics
- **Total Patients**: Number of registered patients
- **Today's Appointments**: Scheduled appointments for today
- **Pending Invoices**: Unpaid invoices requiring attention
- **Revenue This Month**: Total revenue for the current month

### Quick Actions
- Add new patient
- Schedule appointment
- View today's schedule
- Access analytics

### Recent Activity
- Latest patient registrations
- Recent appointments
- Pending tasks

---

## Patient Management

### Adding a New Patient

1. Click **"Add Patient"** button in the Patients section
2. Fill in required information:
   - **Personal Details**: First name, last name, date of birth, gender
   - **Contact**: Phone number, email, address
   - **Medical**: Blood group, allergies, medical history
3. Add custom tags for categorization (optional)
4. Click **"Save"**

### Viewing Patient Records

1. Navigate to **Patients** from the sidebar
2. Use the search bar to find specific patients
3. Filter by tags or status
4. Click on a patient to view full details

### Patient Profile

Each patient profile includes:
- **Personal Information**: Demographics and contact details
- **Medical History**: Past conditions, allergies, medications
- **Appointments**: Upcoming and past appointments
- **Prescriptions**: All issued prescriptions
- **Documents**: Uploaded medical documents
- **Invoices**: Billing history

### Editing Patient Information

1. Open the patient profile
2. Click **"Edit"** button
3. Update the required fields
4. Click **"Save Changes"**

---

## Appointment Scheduling

### Creating an Appointment

1. Click **"Add Appointment"** or use the calendar
2. Select the patient (or create new patient)
3. Choose appointment details:
   - **Date & Time**: Select from available slots
   - **Type**: Consultation, Follow-up, Check-up
   - **Doctor**: Assign to specific doctor
   - **Notes**: Add any special instructions
4. Click **"Schedule"**

### Managing Appointments

**Appointment Statuses**:
- **Scheduled**: Confirmed appointment
- **Confirmed**: Patient confirmed attendance
- **Completed**: Consultation finished
- **Cancelled**: Appointment cancelled
- **No-show**: Patient didn't attend

**Actions**:
- **Reschedule**: Change date/time
- **Cancel**: Cancel the appointment
- **Mark as Complete**: After consultation
- **Send Reminder**: Manual reminder to patient

### Calendar View

- **Day View**: See all appointments for a specific day
- **Week View**: Weekly schedule overview
- **Month View**: Monthly calendar with appointment counts

---

## Consultation Workflow

### Starting a Consultation

1. Navigate to **Appointments**
2. Click on the scheduled appointment
3. Click **"Start Consultation"**

### During Consultation

#### 1. Record Vital Signs
- Height, Weight, BMI
- Blood Pressure
- Temperature, Heart Rate
- Oxygen Saturation

#### 2. Chief Complaint
- Document patient's primary concern
- Add detailed notes

#### 3. Examination Findings
- Record physical examination results
- Add observations

#### 4. Diagnosis
- Enter diagnosis codes (ICD-10)
- Add multiple diagnoses if needed

#### 5. Treatment Plan
- Prescribe medications
- Recommend tests
- Schedule follow-up

#### 6. Clinical Notes
- Use templates for common conditions
- Add custom notes
- Attach documents

### Completing Consultation

1. Review all entered information
2. Generate prescription (if needed)
3. Create invoice
4. Click **"Complete Consultation"**
5. Print/email summary to patient

---

## Prescription Management

### Creating a Prescription

1. During consultation, click **"Add Prescription"**
2. Add medications:
   - **Drug Name**: Search from database
   - **Dosage**: Strength and form
   - **Frequency**: Times per day
   - **Duration**: Number of days
   - **Instructions**: Special instructions
3. Add multiple medications as needed
4. Click **"Save Prescription"**

### Prescription Templates

Create templates for commonly prescribed combinations:
1. Go to **Settings** → **Templates**
2. Click **"Add Template"**
3. Name the template
4. Add medications
5. Save for future use

### Viewing Past Prescriptions

1. Open patient profile
2. Navigate to **Prescriptions** tab
3. View all historical prescriptions
4. Reissue or modify as needed

---

## Invoice & Billing

### Creating an Invoice

1. After consultation, click **"Create Invoice"**
2. Add line items:
   - Consultation fee
   - Procedures performed
   - Tests ordered
   - Medications (if sold)
3. Apply discounts (if applicable)
4. Select payment method
5. Click **"Generate Invoice"**

### Payment Methods

- Cash
- Card
- UPI
- Insurance

### Invoice Management

**Statuses**:
- **Pending**: Awaiting payment
- **Paid**: Payment received
- **Partially Paid**: Partial payment made
- **Cancelled**: Invoice cancelled

**Actions**:
- **Record Payment**: Mark as paid
- **Send Reminder**: Email reminder to patient
- **Print**: Print invoice
- **Download PDF**: Save as PDF

---

## Document Management

### Uploading Documents

1. Open patient profile
2. Navigate to **Documents** tab
3. Click **"Upload Document"**
4. Select file type:
   - Lab Report
   - X-Ray/Scan
   - Prescription
   - Insurance
   - Other
5. Add description
6. Upload file

### Supported Formats

- PDF documents
- Images (JPG, PNG)
- DICOM files (medical imaging)

### OCR Document Import

For bulk patient import:
1. Go to **Import** → **OCR**
2. Upload scanned patient records
3. Review extracted data
4. Confirm and import

---

## Analytics & Reports

### Dashboard Analytics

View key metrics:
- **Revenue Trends**: Monthly revenue graph
- **Patient Growth**: New patient registrations
- **Appointment Statistics**: Completion rates
- **Top Diagnoses**: Most common conditions

### Custom Reports

Generate reports for:
- **Date Range**: Specific time period
- **Doctor**: Individual doctor performance
- **Department**: Clinic-wide statistics
- **Financial**: Revenue and billing reports

### Exporting Data

1. Select report type
2. Choose date range
3. Click **"Export"**
4. Download as CSV or PDF

---

## Settings & Configuration

### Profile Settings

Update your personal information:
- Name and contact details
- Password change
- Notification preferences

### Clinic Settings

Configure clinic-wide settings:
- **Working Hours**: Set clinic timings
- **Appointment Duration**: Default slot length
- **Currency**: Billing currency
- **Timezone**: Local timezone

### Custom Fields

Add clinic-specific patient fields:
1. Go to **Settings** → **Custom Fields**
2. Click **"Add Field"**
3. Define field properties:
   - Field name
   - Field type (text, number, date, dropdown)
   - Required/Optional
4. Save

### Clinical Templates

Create templates for:
- **Prescriptions**: Common medication combinations
- **Clinical Notes**: Standard examination templates
- **Diagnoses**: Frequently used diagnosis codes

### Appointment Reminders

Configure automated reminders:
- **Email Reminders**: Enable/disable
- **SMS Reminders**: Enable/disable
- **Timing**: Hours before appointment
- **Templates**: Customize message content

---

## Multi-Clinic Features

### Clinic Selection

If you have access to multiple clinics:
1. Click the clinic selector in the navbar
2. Choose the clinic you want to work with
3. All data will be filtered for that clinic

### Clinic Management (Admin Only)

#### Adding a New Clinic

1. Go to **Settings** → **Clinics**
2. Click **"Add Clinic"**
3. Enter clinic details:
   - Name
   - Address
   - Contact information
   - Logo (optional)
4. Save

#### Assigning Doctors to Clinics

1. Go to **Settings** → **Doctor Assignments**
2. Select doctor
3. Choose clinic
4. Assign role (Doctor, Admin, Receptionist)
5. Save

### Data Isolation

Each clinic's data is completely isolated:
- Patients belong to specific clinics
- Appointments are clinic-specific
- Invoices and documents are separated
- Analytics show clinic-specific data

---

## Troubleshooting

### Common Issues

**Can't log in**
- Verify email and password
- Check caps lock is off
- Contact admin for password reset

**Appointment not showing**
- Refresh the page
- Check selected date range
- Verify clinic selection (if multi-clinic)

**Patient search not working**
- Try different search terms
- Check spelling
- Use phone number or patient ID

**Invoice not generating**
- Ensure all required fields are filled
- Check payment method is selected
- Verify patient has active record

### Getting Help

- **Email Support**: support@docita.com
- **Documentation**: docs.docita.com
- **Video Tutorials**: tutorials.docita.com

---

## Keyboard Shortcuts

- `Ctrl/Cmd + K`: Quick search
- `Ctrl/Cmd + N`: New patient
- `Ctrl/Cmd + A`: New appointment
- `Ctrl/Cmd + S`: Save current form
- `Esc`: Close dialog/modal

---

## Best Practices

### Data Entry
- Always verify patient information before saving
- Use consistent naming conventions
- Add detailed notes during consultations
- Attach relevant documents to patient records

### Appointment Management
- Confirm appointments 24 hours in advance
- Mark no-shows appropriately
- Keep appointment notes updated
- Schedule follow-ups during consultation

### Billing
- Generate invoices immediately after consultation
- Record payments promptly
- Send reminders for pending invoices
- Maintain accurate payment records

### Security
- Change password regularly
- Log out when leaving workstation
- Don't share login credentials
- Report suspicious activity immediately

---

## Updates & Changelog

### Version 1.0 (Current)
- Initial release
- Patient management
- Appointment scheduling
- Consultation workflow
- Prescription management
- Invoice & billing
- Document management
- Analytics dashboard
- Multi-clinic support
- Appointment reminders

---

**For additional support or feature requests, contact your system administrator.**
