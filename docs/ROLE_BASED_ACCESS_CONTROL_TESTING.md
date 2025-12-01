# Role-Based Access Control Testing Guide

## Overview

This document outlines the comprehensive testing scenarios for verifying role-based access control implementation across the Docita admin portal.

## Architecture Summary

### Roles Supported

1. **SUPER_ADMIN** - System administrator, access to `/dashboard`, can manage all clinics and admins
2. **ADMIN** - Clinic administrator for multi-doctor clinics, access to `/clinic`
3. **ADMIN_DOCTOR** - Clinic administrator for single-doctor clinics, access to `/clinic`
4. **DOCTOR** - Medical professional assigned to a clinic
5. **RECEPTIONIST** - Clinic staff assigned to a clinic

### Access Control Rules

- Super admin: `/dashboard` only
- Clinic admin (ADMIN/ADMIN_DOCTOR): `/clinic` only
- Doctors/Receptionists: Patient app or clinic-specific portals (clinicId-based)
- Clinic isolation: All endpoints verify `req.user.clinicId === paramClinicId`
- Token isolation: Admin app uses `docita_admin_token`, Patient app uses `docita_token`

---

## Frontend Testing Scenarios

### Test Suite 1: Authentication & Route Protection

#### Test 1.1: Super Admin Login and Access

**Scenario**: Super admin user logs in

- **Step 1**: Navigate to `/` (login page)
- **Step 2**: Enter super admin credentials (role: SUPER_ADMIN)
- **Step 3**: System redirects to `/dashboard`
- **Step 4**: Verify super admin portal is accessible
- **Expected Result**: ✅ Redirects to /dashboard, can access super admin portal
- **Verification Points**:
  - localStorage contains `docita_admin_token`
  - `useAuth().isSuperAdmin` returns `true`
  - `useAuth().isClinicAdmin` returns `false`

#### Test 1.2: Clinic Admin Login and Access

**Scenario**: Clinic admin user logs in

- **Step 1**: Navigate to `/` (login page)
- **Step 2**: Enter clinic admin credentials (role: ADMIN)
- **Step 3**: System redirects to `/clinic`
- **Step 4**: Verify clinic admin portal is accessible
- **Expected Result**: ✅ Redirects to /clinic, can access clinic admin portal
- **Verification Points**:
  - localStorage contains `docita_admin_token`
  - `useAuth().isClinicAdmin` returns `true`
  - `useAuth().isSuperAdmin` returns `false`
  - localStorage contains `clinicId`

#### Test 1.3: Admin Doctor Login and Access

**Scenario**: Admin doctor user logs in

- **Step 1**: Navigate to `/` (login page)
- **Step 2**: Enter admin doctor credentials (role: ADMIN_DOCTOR)
- **Step 3**: System redirects to `/clinic`
- **Step 4**: Verify clinic admin portal is accessible
- **Expected Result**: ✅ Redirects to /clinic, can access clinic admin portal
- **Verification Points**:
  - localStorage contains `docita_admin_token`
  - `useAuth().isClinicAdmin` returns `true`

#### Test 1.4: Super Admin Cannot Access Clinic Portal

**Scenario**: Super admin tries to access `/clinic` route

- **Step 1**: Login as super admin
- **Step 2**: Navigate to `/clinic` (e.g., `/clinic/team`)
- **Expected Result**: ✅ Redirected to home (`/`)
- **Verification Points**:
  - Auth guard detects super admin
  - Route protection prevents access
  - Browser shows error toast or redirect message

#### Test 1.5: Clinic Admin Cannot Access Super Admin Dashboard

**Scenario**: Clinic admin tries to access `/dashboard` route

- **Step 1**: Login as clinic admin
- **Step 2**: Navigate to `/dashboard` (e.g., `/dashboard/admins`)
- **Expected Result**: ✅ Redirected to home (`/`)
- **Verification Points**:
  - Auth guard detects clinic admin (not SUPER_ADMIN)
  - Route protection prevents access

#### Test 1.6: Unauthenticated Access Blocked

**Scenario**: Unlogged user tries to access protected routes

- **Step 1**: Clear localStorage
- **Step 2**: Navigate to `/dashboard/admins`
- **Expected Result**: ✅ Redirected to home (`/`)
- **Step 3**: Navigate to `/clinic/team`
- **Expected Result**: ✅ Redirected to home (`/`)
- **Verification Points**:
  - localStorage is empty
  - Auth guard prevents access

---

### Test Suite 2: Clinic Admin Portal Functionality

#### Test 2.1: Clinic Dashboard Display

**Scenario**: Clinic admin views their clinic dashboard

- **Step 1**: Login as clinic admin
- **Step 2**: Navigate to `/clinic`
- **Expected Result**: ✅ Dashboard displays
  - Clinic name, address, contact info
  - Team statistics (doctors count, receptionists count)
- **Verification Points**:
  - API call to `/clinics/:clinicId` succeeds
  - `req.user.clinicId` matches route param

#### Test 2.2: Team Member Listing

**Scenario**: Clinic admin views all team members

- **Step 1**: Navigate to `/clinic/team`
- **Expected Result**: ✅ Team page displays
  - All doctors in the clinic with badges
  - All receptionists in the clinic with badges
  - Member details: name, email, phone, role, join date
- **Verification Points**:
  - Fetches from `/clinics/:clinicId/doctors`
  - Fetches from `/clinics/:clinicId/receptionists`
  - Filters by `clinicId` on backend

#### Test 2.3: Create Doctor Form

**Scenario**: Clinic admin accesses doctor creation form

- **Step 1**: Navigate to `/clinic/create-doctor`
- **Expected Result**: ✅ Form displays with fields:
  - Name, Email, Password
  - Phone Number
  - Specialization (dropdown)
  - Qualification, Registration Number
- **Verification Points**:
  - Form validation works
  - Specialization dropdown populated from SPECIALIZATION_LABELS

#### Test 2.4: Create Doctor Successfully

**Scenario**: Clinic admin creates a new doctor

- **Step 1**: Navigate to `/clinic/create-doctor`
- **Step 2**: Fill form with valid data
  - Name: "Dr. John Smith"
  - Email: "john@example.com"
  - Password: "SecurePass123!"
  - Phone: "+1234567890"
  - Specialization: "CARDIOLOGY"
  - Qualification: "MD"
  - Registration: "REG123"
- **Step 3**: Click "Create Doctor"
- **Expected Result**: ✅
  - Doctor created successfully
  - Redirects to `/clinic/team`
  - New doctor appears in team list
- **Backend Verification Points**:
  - POST `/clinics/:clinicId/doctors` called
  - `req.user.clinicId === clinicId` check passes
  - User created with role: DOCTOR
  - Password hashed with bcrypt
  - DoctorClinic association created
  - clinicId set on user record

#### Test 2.5: Create Receptionist Successfully

**Scenario**: Clinic admin creates a new receptionist

- **Step 1**: Navigate to `/clinic/create-receptionist`
- **Step 2**: Fill form with valid data
  - Name: "Jane Doe"
  - Email: "jane@example.com"
  - Password: "SecurePass123!"
  - Phone: "+1234567890"
- **Step 3**: Click "Create Receptionist"
- **Expected Result**: ✅
  - Receptionist created successfully
  - Redirects to `/clinic/team`
  - New receptionist appears in team list
- **Backend Verification Points**:
  - POST `/clinics/:clinicId/receptionists` called
  - User created with role: RECEPTIONIST
  - Password hashed with bcrypt
  - clinicId set on user record

---

## Backend Testing Scenarios

### Test Suite 3: API Endpoint Security

#### Test 3.1: Create Doctor - Clinic Isolation Check

**Scenario**: Verify clinic admin can only create doctors in their own clinic

- **API Call**: `POST /clinics/:clinicId/doctors`
- **Test Case A - Own Clinic**:
  - Auth user clinicId: `clinic-A`
  - Request param clinicId: `clinic-A`
  - Expected Result\*\*: ✅ 201 Created
  - **Verification**: `req.user.clinicId === clinicId` passes
- **Test Case B - Other Clinic**:
  - Auth user clinicId: `clinic-A`
  - Request param clinicId: `clinic-B`
  - **Expected Result**: ✅ 403 Forbidden
  - **Error Message**: "You can only create doctors in your own clinic"

#### Test 3.2: Create Receptionist - Clinic Isolation Check

**Scenario**: Verify clinic admin can only create receptionists in their own clinic

- **API Call**: `POST /clinics/:clinicId/receptionists`
- **Test Case A - Own Clinic**:
  - Auth user clinicId: `clinic-A`
  - Request param clinicId: `clinic-A`
  - **Expected Result**: ✅ 201 Created
- **Test Case B - Other Clinic**:
  - Auth user clinicId: `clinic-A`
  - Request param clinicId: `clinic-B`
  - **Expected Result**: ✅ 403 Forbidden

#### Test 3.3: Get Doctors - Clinic-Specific Data

**Scenario**: Verify doctors list returns only clinic members

- **API Call**: `GET /clinics/:clinicId/doctors`
- **Setup**:
  - Clinic A has doctors: D1, D2
  - Clinic B has doctors: D3, D4
- **Test**:
  - Auth user clinicId: `clinic-A`
  - Request param clinicId: `clinic-A`
  - **Expected Result**: Returns only [D1, D2]
  - **Database Verification**: Query filters by `clinicId`

#### Test 3.4: Get Receptionists - Clinic-Specific Data

**Scenario**: Verify receptionists list returns only clinic members

- **API Call**: `GET /clinics/:clinicId/receptionists`
- **Setup**:
  - Clinic A has receptionists: R1, R2
  - Clinic B has receptionists: R3, R4
- **Test**:
  - Request param clinicId: `clinic-A`
  - **Expected Result**: Returns only [R1, R2]

#### Test 3.5: No JWT Token - Access Denied

**Scenario**: Verify JWT guard blocks unauthenticated requests

- **API Call**: `POST /clinics/:clinicId/doctors` (without JWT token)
- **Expected Result**: ✅ 401 Unauthorized
- **Headers**: No `Authorization: Bearer <token>`

#### Test 3.6: Invalid JWT Token - Access Denied

**Scenario**: Verify invalid JWT token rejected

- **API Call**: `POST /clinics/:clinicId/doctors`
- **Headers**: `Authorization: Bearer invalid_token_xyz`
- **Expected Result**: ✅ 401 Unauthorized

#### Test 3.7: Expired JWT Token - Access Denied

**Scenario**: Verify expired JWT token rejected

- **API Call**: `POST /clinics/:clinicId/doctors`
- **Headers**: `Authorization: Bearer <expired_token>`
- **Expected Result**: ✅ 401 Unauthorized

---

### Test Suite 4: Data Isolation for Doctors/Receptionists

#### Test 4.1: Doctor Can Only See Own Clinic Appointments

**Scenario**: Verify doctor sees appointments only for their clinic

- **Setup**:
  - Doctor assigned to Clinic A
  - Clinic A has appointments: A1, A2
  - Clinic B has appointments: A3, A4
- **API Call**: `GET /appointments` (as doctor user)
- **JWT Payload**: `{ role: "DOCTOR", clinicId: "clinic-A", ... }`
- **Expected Result**: Returns only [A1, A2]
- **Verification**: Service filters by `clinicId` from JWT

#### Test 4.2: Receptionist Can Only See Own Clinic Patients

**Scenario**: Verify receptionist sees patients only for their clinic

- **Setup**:
  - Receptionist assigned to Clinic A
  - Clinic A has patients: P1, P2
  - Clinic B has patients: P3, P4
- **API Call**: `GET /patients` (as receptionist user)
- **JWT Payload**: `{ role: "RECEPTIONIST", clinicId: "clinic-A", ... }`
- **Expected Result**: Returns only [P1, P2]
- **Verification**: Service filters by `clinicId` from JWT

---

## Token Isolation Testing

### Test Suite 5: Storage Key Isolation

#### Test 5.1: Admin App and Patient App Token Separation

**Scenario**: Verify tokens don't interfere between apps

- **Step 1**: Open patient app, login as patient
  - Token stored in localStorage as `docita_token`
  - User stored as `docita_user`
- **Step 2**: Open admin app in same browser
  - Login as super admin
  - Token stored in localStorage as `docita_admin_token`
  - User stored as `docita_admin_user`
- **Expected Result**: ✅ Both tokens exist without conflict
  - `localStorage.getItem('docita_token')` = patient JWT
  - `localStorage.getItem('docita_admin_token')` = admin JWT
- **Verification Points**:
  - Admin app makes patient appointment calls with admin token
  - Does NOT trigger 403 Forbidden errors
  - Patient app continues working normally

#### Test 5.2: No Cross-App Authentication

**Scenario**: Admin token should not work for patient app API

- **Setup**:
  - Get admin JWT token from login
- **Test**:
  - Call patient app endpoint: `GET /appointments`
  - Header: `Authorization: Bearer <admin_jwt_token>`
- **Expected Result**: ✅ 401 Unauthorized or different error
  - Admin JWT should not be valid for patient app
  - Clinic isolation prevents cross-clinic access

---

## Manual Testing Checklist

### Pre-Test Setup

- [ ] Database has test clinic with ID: `test-clinic-001`
- [ ] Test super admin user created
- [ ] Test clinic admin (ADMIN) user created with `clinicId: test-clinic-001`
- [ ] Test admin doctor (ADMIN_DOCTOR) user created with `clinicId: test-clinic-001`
- [ ] Test doctor user created with `clinicId: test-clinic-001`
- [ ] Test receptionist user created with `clinicId: test-clinic-001`
- [ ] API running on port 3001
- [ ] Admin portal running on port 3002
- [ ] Patient app running on port 3000

### Frontend Access Control

- [ ] Super admin redirects to `/dashboard` on login
- [ ] Clinic admin redirects to `/clinic` on login
- [ ] Super admin cannot access `/clinic` routes
- [ ] Clinic admin cannot access `/dashboard` routes
- [ ] Unauthenticated users redirected to home
- [ ] Clinic info displays correctly for clinic admin
- [ ] Team members list shows both doctors and receptionists
- [ ] Create doctor form submits successfully
- [ ] Create receptionist form submits successfully

### API Clinic Isolation

- [ ] Clinic admin can create doctor in own clinic
- [ ] Clinic admin gets 403 when trying to create doctor in other clinic
- [ ] Clinic admin can create receptionist in own clinic
- [ ] Clinic admin gets 403 when trying to create receptionist in other clinic
- [ ] Doctor list filters by clinicId
- [ ] Receptionist list filters by clinicId

### Token Security

- [ ] Admin app token (`docita_admin_token`) doesn't interfere with patient app
- [ ] Patient app token (`docita_token`) doesn't interfere with admin app
- [ ] Logging out clears correct tokens
- [ ] Login to one app doesn't affect other app's session

---

## Automated Test Examples

### Jest/Vitest Examples

```typescript
// Example: Test clinic isolation on doctor creation
describe("ClinicsController - Doctor Creation", () => {
  it("should create doctor for own clinic", async () => {
    const req = {
      user: { clinicId: "clinic-A", role: "ADMIN" },
    };

    const result = await controller.createDoctor(
      "clinic-A",
      { name: "Dr. Smith", email: "dr@test.com", password: "pass123" },
      req,
    );

    expect(result).toBeDefined();
    expect(result.role).toBe("DOCTOR");
  });

  it("should reject creation for other clinic", async () => {
    const req = {
      user: { clinicId: "clinic-A", role: "ADMIN" },
    };

    expect(() =>
      controller.createDoctor(
        "clinic-B",
        { name: "Dr. Smith", email: "dr@test.com", password: "pass123" },
        req,
      ),
    ).toThrow(ForbiddenException);
  });
});
```

---

## Bug Reporting Template

If issues are found during testing, report using this template:

```
## Test Case
[Describe which test case failed]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Result
[What should happen]

## Actual Result
[What actually happened]

## Error Details
[Console errors, API response, etc.]

## Environment
- Node version: [version]
- Browser: [browser + version]
- API port: 3001
- Admin app port: 3002
```

---

## Completion Criteria

✅ All tests pass when:

1. Authentication works for all roles
2. Route protection prevents unauthorized access
3. Clinic isolation enforced on all endpoints
4. Tokens don't interfere between apps
5. Doctors/receptionists can only see own clinic data
6. All CRUD operations work for authorized users
7. Error messages clear and appropriate
8. No console errors during normal operation
