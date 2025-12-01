# Admin Management Feature Documentation

## Overview

This document describes the new Admin Management feature added to the Docita Super Admin Portal. This feature allows super administrators to manage clinic administrators and admin doctors across different clinics.

## Features

### 1. Admin Types

The system supports two types of admin roles:

#### **Admin (ADMIN)**

- Manages clinic operations for multi-doctor clinics
- Can manage doctors, staff, appointments, and patients
- Can configure clinic settings and billing
- Cannot prescribe or see patients as a doctor

#### **Admin Doctor (ADMIN_DOCTOR)**

- For single-doctor clinics where the owner is both admin and doctor
- Has all admin privileges
- Can also see patients and write prescriptions
- Acts as the clinic's primary doctor and administrator

### 2. CRUD Operations

The feature provides complete admin management capabilities:

#### **Create Admin**

- Create new admin or admin_doctor for a clinic
- Set name, email, password, and phone number
- Select admin type during creation
- Email validation to prevent duplicates

#### **View Admin**

- View complete admin details
- Display admin type and creation date
- See all stored information

#### **Edit Admin**

- Update admin name, email, phone, and type
- Change admin type (admin → admin_doctor or vice versa)
- Email validation on update

#### **Delete Admin** (Deactivate)

- Soft delete admin by deactivating account
- Note: Current implementation includes placeholder for status-based deactivation
- Can be extended to add permanent deletion

## API Endpoints

### Backend Endpoints (NestJS - `/apps/api/src/modules/super-admin`)

**Get all admins for a clinic**

```
GET /super-admin/clinics/:clinicId/admins
```

- Returns list of all admins (ADMIN and ADMIN_DOCTOR) for a clinic

**Create admin**

```
POST /super-admin/clinics/:clinicId/admins
Body: {
  name: string,
  email: string,
  password: string,
  phoneNumber?: string,
  adminType: "admin" | "admin_doctor"
}
```

**Get admin details**

```
GET /super-admin/admins/:id
```

- Returns complete admin information including associated clinic

**Update admin**

```
PATCH /super-admin/admins/:id
Body: {
  name?: string,
  email?: string,
  phoneNumber?: string,
  adminType?: "admin" | "admin_doctor"
}
```

**Deactivate admin**

```
PATCH /super-admin/admins/:id/deactivate
```

**Activate admin**

```
PATCH /super-admin/admins/:id/activate
```

## Frontend Implementation

### File Structure

```
/apps/admin/app/dashboard/admins/
  └── page.tsx         # Main admin management page
```

### Features in UI

1. **Clinic Selection**: Dropdown to select which clinic's admins to manage
2. **Search**: Filter admins by name or email
3. **Table View**: Lists all admins with columns:
   - Name
   - Email
   - Phone
   - Admin Type (badge - different colors for ADMIN vs ADMIN_DOCTOR)
   - Created Date
   - Actions (View, Edit, Delete)

4. **Create Admin Dialog**:
   - Name input
   - Email input (validated)
   - Password input
   - Phone number (optional)
   - Admin Type selector with descriptions
   - Save button with loading state

5. **View Admin Dialog**:
   - Display all admin information
   - Read-only format
   - Shows clinic type badge

6. **Edit Admin Dialog**:
   - Editable fields for name, email, phone
   - Ability to change admin type
   - Save with validation

7. **Delete Confirmation**:
   - Confirmation dialog before deletion
   - Calls deactivate endpoint

### Navigation

The Admins page is now accessible from the main dashboard sidebar:

- Icon: ShieldAdmin
- URL: `/dashboard/admins`
- Position: Between "Doctors" and "Billing" in navigation

## Database Schema

The feature uses existing User model with:

- `id`: User unique identifier
- `email`: Admin email (unique)
- `password`: Hashed password
- `name`: Admin name
- `phoneNumber`: Contact phone
- `role`: User role (enum - ADMIN or ADMIN_DOCTOR)
- `clinicId`: Associated clinic
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

No schema migrations needed - leverages existing Role enum values.

## Security Considerations

1. **Password Hashing**: All passwords are hashed using bcrypt (rounds: 10)
2. **Authentication**: All endpoints require JWT authentication
3. **Authorization**: Only SUPER_ADMIN role can access admin management endpoints
4. **Email Uniqueness**: Prevents duplicate admin emails system-wide
5. **Input Validation**: All required fields are validated

## Implementation Details

### Backend (`super-admin.service.ts`)

Key methods added:

```typescript
// Get all admins for a clinic
getClinicAdmins(clinicId: string)

// Create new admin with validation
createAdmin(clinicId: string, data: CreateAdminDto)

// Get admin full details
getAdminDetails(adminId: string)

// Update admin information
updateAdmin(adminId: string, data: UpdateAdminDto)

// Deactivate/Activate (placeholder for status field)
deactivateAdmin(adminId: string)
activateAdmin(adminId: string)
```

### Frontend (`/apps/admin/app/dashboard/admins/page.tsx`)

- State management for clinics, admins, and forms
- API communication with proper error handling
- Toast notifications for user feedback
- Loading states and spinners
- Responsive design (mobile-friendly)

## Usage Example

1. **Navigate to Admins Page**:
   - Go to `/dashboard/admins`

2. **Select a Clinic**:
   - Choose clinic from dropdown
   - Admins list loads automatically

3. **Create New Admin**:
   - Click "Add Admin" button
   - Fill in required information
   - Select admin type
   - Click "Create Admin"

4. **Edit Existing Admin**:
   - Click "Edit" icon on admin row
   - Update information
   - Change type if needed
   - Click "Save Changes"

5. **View Admin Details**:
   - Click "View" icon to see full details

6. **Delete Admin**:
   - Click trash icon
   - Confirm deletion
   - Admin is deactivated

## Future Enhancements

1. **Status Field**: Add `active` boolean field to User model for proper activation/deactivation
2. **Admin Permissions**: Implement granular permissions for different admin types
3. **Audit Trail**: Log all admin management changes
4. **Bulk Operations**: Bulk create/update/delete admins
5. **Admin Dashboard**: Create separate admin portal for ADMIN and ADMIN_DOCTOR users
6. **Activity Log**: Track admin login history and actions
7. **Email Notifications**: Notify admins when created/updated

## Testing Checklist

- [ ] Create admin (ADMIN type)
- [ ] Create admin_doctor (ADMIN_DOCTOR type)
- [ ] View admin details
- [ ] Edit admin information
- [ ] Edit admin type
- [ ] Delete (deactivate) admin
- [ ] Search functionality
- [ ] Email validation (duplicate prevention)
- [ ] Phone number validation
- [ ] Multi-clinic admin management
- [ ] Error handling and toasts
- [ ] Responsive design on mobile

## Related Files

- Backend Controller: `/apps/api/src/modules/super-admin/super-admin.controller.ts`
- Backend Service: `/apps/api/src/modules/super-admin/super-admin.service.ts`
- Frontend Page: `/apps/admin/app/dashboard/admins/page.tsx`
- Dashboard Layout: `/apps/admin/app/dashboard/layout.tsx`
- Database Schema: `/packages/db/prisma/schema.prisma` (User model)
