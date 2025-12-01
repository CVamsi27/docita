# Role-Based Access Control - Quick Reference

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     DOCITA RBAC SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Super Admin Portal (Port 3002)                                │
│  ├── /dashboard       → SUPER_ADMIN only                       │
│  ├── /dashboard/admins   → Manage all admins                  │
│  └── /dashboard/clinics  → Manage all clinics                 │
│                                                                 │
│  Clinic Admin Portal (Port 3002)                              │
│  ├── /clinic          → ADMIN / ADMIN_DOCTOR only            │
│  ├── /clinic/team     → View team members                    │
│  ├── /clinic/create-doctor    → Create doctors              │
│  └── /clinic/create-receptionist → Create receptionists      │
│                                                                 │
│  Patient App (Port 3000)                                       │
│  ├── /appointments    → DOCTOR / RECEPTIONIST / PATIENT      │
│  ├── /patients        → Clinic staff only                    │
│  └── /queue           → Clinic staff only                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Role Definitions

| Role         | App Access          | Routes                                 | Permissions                                             |
| ------------ | ------------------- | -------------------------------------- | ------------------------------------------------------- |
| SUPER_ADMIN  | Admin Portal (3002) | `/dashboard/*`                         | View/manage all clinics, admins, super admin operations |
| ADMIN        | Admin Portal (3002) | `/clinic/*`                            | Manage own clinic, create doctors/receptionists         |
| ADMIN_DOCTOR | Admin Portal (3002) | `/clinic/*`                            | Same as ADMIN (for single-doctor clinics)               |
| DOCTOR       | Patient App (3000)  | `/appointments`, `/patients`           | View own clinic's appointments, manage schedule         |
| RECEPTIONIST | Patient App (3000)  | `/appointments`, `/patients`, `/queue` | View own clinic's data, manage queue                    |
| PATIENT      | Patient App (3000)  | `/appointments`, `/doctors`            | View appointments, book appointments                    |

## Frontend Architecture

### Auth Context (`/apps/admin/lib/auth.tsx`)

```typescript
interface AuthContextType {
  user: User | null;                    // Current user
  token: string | null;                 // JWT token
  isAuthenticated: boolean;             // Is logged in?
  isSuperAdmin: boolean;                // user.role === "SUPER_ADMIN"
  isClinicAdmin: boolean;               // user.role in ["ADMIN", "ADMIN_DOCTOR"]
  login: (token, user) => void;         // Login function
  logout: () => void;                   // Logout function
}

// Storage Keys (Admin App Only)
- docita_admin_token    → JWT access token
- docita_admin_user     → User object with role, clinicId
- docita_admin_cookie   → Session cookie (7-day expiry)
```

### Login Flow

```
User enters credentials
    ↓
POST /auth/login
    ↓
Response includes: { access_token, user: { role, clinicId } }
    ↓
Auth context stores token & user in localStorage
    ↓
useAuth hook reads storage on mount
    ↓
Route guard checks role:
  - SUPER_ADMIN → redirect to /dashboard
  - ADMIN/ADMIN_DOCTOR → redirect to /clinic
  - Other → redirect to /
```

### Route Protection Flow

```
User navigates to route
    ↓
useEffect in auth.tsx triggers
    ↓
Check if authenticated (token + user exist)
    ↓
If /dashboard route:
  - Allow only if isSuperAdmin
  - Else redirect to /
  ↓
If /clinic route:
  - Allow only if isClinicAdmin
  - Else redirect to /
  ↓
Otherwise: Allow access
```

## Backend Architecture

### Database Schema (Key Fields)

```sql
-- User Table
CREATE TABLE User {
  id                 String (PK)
  email              String (UNIQUE)
  password           String (hashed with bcrypt)
  name               String
  role               Enum(SUPER_ADMIN, ADMIN, ADMIN_DOCTOR, DOCTOR, RECEPTIONIST, PATIENT)
  clinicId           String? (FK to Clinic.id)
  specialization     Enum?
  qualification      String?
  registrationNumber String?
  phoneNumber        String?
}

-- Clinic Table
CREATE TABLE Clinic {
  id                String (PK)
  name              String
  address           String
  phone             String
  email             String
  active            Boolean
}

-- DoctorClinic Junction Table
CREATE TABLE DoctorClinic {
  doctorId          String (FK)
  clinicId          String (FK)
  role              String?
  active            Boolean
}
```

### API Endpoints

#### Clinics Controller (`/clinics`)

| Method | Endpoint                           | Auth         | Clinic Check                     | Purpose                   |
| ------ | ---------------------------------- | ------------ | -------------------------------- | ------------------------- |
| POST   | `/clinics/:clinicId/doctors`       | JwtAuthGuard | `req.user.clinicId === clinicId` | Create doctor             |
| GET    | `/clinics/:clinicId/doctors`       | JwtAuthGuard | None (data filtered by clinicId) | List clinic doctors       |
| POST   | `/clinics/:clinicId/receptionists` | JwtAuthGuard | `req.user.clinicId === clinicId` | Create receptionist       |
| GET    | `/clinics/:clinicId/receptionists` | JwtAuthGuard | None (data filtered by clinicId) | List clinic receptionists |

#### Clinic Settings Controller (`/clinic`)

| Method | Endpoint           | Auth         | Purpose                    |
| ------ | ------------------ | ------------ | -------------------------- |
| GET    | `/clinic/settings` | JwtAuthGuard | Get own clinic settings    |
| PUT    | `/clinic/settings` | JwtAuthGuard | Update own clinic settings |

### Service Methods

```typescript
// ClinicsService

async createDoctor(clinicId: string, data: {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}): Promise<User>
// Creates user with DOCTOR role, hashes password, creates DoctorClinic association

async getDoctors(clinicId: string): Promise<User[]>
// Returns all doctors in clinic, sorted by creation date

async createReceptionist(clinicId: string, data: {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
}): Promise<User>
// Creates user with RECEPTIONIST role, hashes password

async getReceptionists(clinicId: string): Promise<User[]>
// Returns all receptionists in clinic, sorted by creation date
```

### Security Implementation

```typescript
// 1. Password Hashing
const hashedPassword = await bcrypt.hash(data.password, 10);
// Passwords hashed with salt rounds: 10

// 2. JWT Guard
@UseGuards(JwtAuthGuard)
// Validates JWT token from Authorization header

// 3. Clinic Isolation Check
if (req.user?.clinicId !== clinicId) {
  throw new ForbiddenException('You can only access your own clinic');
}

// 4. Role-based Authorization
if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ADMIN_DOCTOR') {
  throw new ForbiddenException('Insufficient permissions');
}

// 5. Data Filtering
// All queries filter by clinicId from JWT payload
const appointments = await prisma.appointment.findMany({
  where: { clinicId: req.user.clinicId }
});
```

## Common Operations

### 1. Super Admin Creates Clinic Admin

```
1. Super admin logs in (role: SUPER_ADMIN)
2. Redirects to /dashboard
3. Navigates to /dashboard/admins
4. Clicks "Add Admin"
5. Fills form:
   - Email: clinic_admin@example.com
   - Password: SecurePass123!
   - Role: ADMIN (for multi-doctor clinic)
   - Clinic: Select clinic
6. System creates User with:
   - role: ADMIN
   - clinicId: selected clinic ID
   - password: hashed with bcrypt
7. Response: { id, email, role, clinicId }
8. Super admin can view in admin list
```

### 2. Clinic Admin Creates Doctor

```
1. Clinic admin logs in (role: ADMIN)
2. Redirects to /clinic
3. Navigates to /clinic/create-doctor
4. Fills form:
   - Name: Dr. John Smith
   - Email: john@clinic.com
   - Password: DoctorPass123!
   - Specialization: CARDIOLOGY
   - Qualification: MD
   - Registration: REG123
5. Frontend calls: POST /clinics/:clinicId/doctors
   Headers: Authorization: Bearer <admin_jwt_token>
6. Backend validates:
   - JWT valid?
   - req.user.clinicId === clinicId?
   - Clinic exists?
7. If valid:
   - Hash password
   - Create User with role: DOCTOR
   - Create DoctorClinic association
8. Response: { id, name, email, role, specialization, ... }
9. Redirects to /clinic/team
10. New doctor appears in team list
```

### 3. Doctor Accesses Patient App

```
1. Doctor logs in on patient app (port 3000)
2. System stores docita_token (different from admin token)
3. JWT payload includes: { role: "DOCTOR", clinicId: "clinic-A" }
4. When accessing /appointments:
   - API checks Authorization header
   - Validates JWT
   - Filters: WHERE clinicId = "clinic-A"
5. Doctor sees only own clinic's appointments
6. Cannot see other clinics' data
```

## Token Isolation

### Storage Keys by App

**Admin Portal (Port 3002)**

```javascript
localStorage.getItem("docita_admin_token"); // JWT
localStorage.getItem("docita_admin_user"); // User object
localStorage.getItem("docita_admin_cookie"); // Session cookie
```

**Patient App (Port 3000)**

```javascript
localStorage.getItem("docita_token"); // JWT
localStorage.getItem("docita_user"); // User object
localStorage.getItem("docita_cookie"); // Session cookie
```

### Why Isolation?

- Each app can maintain independent session
- Prevents token confusion (403 errors in cross-app calls)
- Different token expiration policies possible
- Logout in one app doesn't affect other

## Error Handling

### Common Error Scenarios

| Error            | Status | Cause                         | Solution                        |
| ---------------- | ------ | ----------------------------- | ------------------------------- |
| Unauthorized     | 401    | Missing/invalid JWT token     | Login again, check token expiry |
| Forbidden        | 403    | Clinic isolation check failed | Using wrong clinic ID           |
| Not Found        | 404    | Resource doesn't exist        | Verify resource ID              |
| Conflict         | 409    | Email already exists          | Use different email             |
| Validation Error | 400    | Invalid input data            | Check required fields           |

### Error Response Format

```typescript
{
  statusCode: 403,
  message: "You can only create doctors in your own clinic",
  error: "Forbidden"
}
```

## Testing Quick Commands

```bash
# 1. Build all packages
pnpm build

# 2. Start API (port 3001)
cd apps/api && pnpm start:dev

# 3. Start Admin Portal (port 3002)
cd apps/admin && pnpm dev

# 4. Start Patient App (port 3000)
cd apps/app && pnpm dev

# 5. Test super admin login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "password": "password123"
  }'

# 6. Test clinic admin doctor creation
curl -X POST http://localhost:3001/clinics/clinic-id-123/doctors \
  -H "Authorization: Bearer <admin_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Smith",
    "email": "doctor@example.com",
    "password": "pass123",
    "specialization": "CARDIOLOGY"
  }'
```

## Files Reference

### Frontend

- **Auth Context**: `/apps/admin/lib/auth.tsx`
- **Login Page**: `/apps/admin/app/page.tsx`
- **Super Admin Portal**: `/apps/admin/app/dashboard/layout.tsx`, `/page.tsx`
- **Clinic Admin Portal**: `/apps/admin/app/clinic/layout.tsx`, `/page.tsx`
- **Team Management**: `/apps/admin/app/clinic/team/page.tsx`
- **Create Doctor**: `/apps/admin/app/clinic/create-doctor/page.tsx`
- **Create Receptionist**: `/apps/admin/app/clinic/create-receptionist/page.tsx`

### Backend

- **Clinics Controller**: `/apps/api/src/clinics/clinics.controller.ts`
- **Clinics Service**: `/apps/api/src/clinics/clinics.service.ts`
- **Auth Service**: `/apps/api/src/auth/auth.service.ts`
- **JWT Guard**: `/apps/api/src/auth/jwt-auth.guard.ts`

## Troubleshooting

### Issue: "You can only create doctors in your own clinic" error

**Cause**: Clinic ID mismatch between request parameter and user's clinic ID
**Solution**:

1. Check JWT token includes correct `clinicId`
2. Verify URL parameter matches user's clinic ID
3. Ensure clinic admin is assigned to the clinic

### Issue: Super admin redirects to /clinic instead of /dashboard

**Cause**: Auth context not detecting SUPER_ADMIN role correctly
**Solution**:

1. Check localStorage has correct user role
2. Verify JWT payload includes role field
3. Clear localStorage and login again

### Issue: Token doesn't work between apps

**Cause**: Apps using different storage keys
**Solution**: This is intentional for security. Each app maintains separate session.

### Issue: Appointments returning 403 Forbidden

**Cause**: Token mismatch (admin token used for patient app)
**Solution**:

1. Ensure using correct app (admin portal vs patient app)
2. Login to patient app separately
3. Clear localStorage if confused
4. Check storage keys are app-specific
