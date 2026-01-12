# Clinic Type Configuration - Quick Reference

## Overview

Configure clinic specialty types to automatically customize consultation features for different medical specialties.

## Available Clinic Types

| Type          | Label                | Features                                 |
| ------------- | -------------------- | ---------------------------------------- |
| GENERAL       | General Medicine     | All features enabled                     |
| DENTAL        | Dental Clinic        | Simplified (no History/Examination tabs) |
| PEDIATRIC     | Pediatric Care       | All features + Growth Chart              |
| ORTHOPEDIC    | Orthopedic Center    | All features                             |
| CARDIOLOGY    | Cardiology Center    | All features                             |
| DERMATOLOGY   | Dermatology Clinic   | All features                             |
| ENT           | ENT Specialist       | All features                             |
| GYNECOLOGY    | Gynecology Clinic    | All features                             |
| OPHTHALMOLOGY | Eye Care Center      | All features + Vision Test               |
| PSYCHIATRY    | Mental Health Clinic | All features except Procedures           |
| SPECIALTY     | Specialty Clinic     | All features                             |

## Creating a Clinic with Type

1. Navigate to Super Admin Dashboard
2. Click "Create Clinic"
3. Fill in basic details:
   - Clinic Name
   - Email
   - Phone
   - Address
4. Select Tier (CAPTURE, RECORD, INSIGHT, TRANSFORM, ENTERPRISE)
5. **Select Clinic Type from dropdown** (defaults to GENERAL)
6. Toggle Intelligence addon if needed
7. Click "Create Clinic"

## Editing Clinic Type

1. Navigate to Super Admin Dashboard
2. Find clinic in list
3. Click "Edit" button on the clinic row
4. Change "Clinic Type" dropdown to desired type
5. Click "Update Clinic"
6. Type badge in list will update immediately

## Consultation Tab Visibility by Type

### GENERAL (All Tabs)

- ✅ Chief Complaint
- ✅ History
- ✅ Examination
- ✅ Vitals
- ✅ Diagnosis
- ✅ Treatment
- ✅ Investigations
- ✅ Prescriptions
- ✅ Procedures
- ✅ Follow Up

### DENTAL (Simplified)

- ✅ Chief Complaint
- ❌ History (Hidden)
- ❌ Examination (Hidden)
- ✅ Vitals
- ✅ Diagnosis
- ✅ Treatment
- ✅ Investigations
- ✅ Prescriptions
- ✅ Procedures
- ✅ Follow Up

### PSYCHIATRY (No Procedures)

- ✅ Chief Complaint
- ✅ History
- ✅ Examination
- ✅ Vitals
- ✅ Diagnosis
- ✅ Treatment
- ✅ Investigations
- ✅ Prescriptions
- ❌ Procedures (Hidden)
- ✅ Follow Up
- ✅ Mental Status Exam (Future)

## Type Badge Colors

Each clinic type has a distinct color for easy identification:

- 🔵 GENERAL - Slate
- 🔷 DENTAL - Cyan
- 🌸 PEDIATRIC - Pink
- 🔹 ORTHOPEDIC - Blue
- 🔴 CARDIOLOGY - Red
- 🟡 DERMATOLOGY - Amber
- 🔶 ENT - Teal
- 🟣 GYNECOLOGY - Purple
- 🟦 OPHTHALMOLOGY - Indigo
- 🟪 PSYCHIATRY - Violet
- 🟢 SPECIALTY - Emerald

## Common Use Cases

### Converting Existing Clinic to Specialty Type

1. Edit the clinic
2. Change type from GENERAL to specialty (e.g., DENTAL)
3. Save changes
4. Doctors will see simplified consultation interface

### Setting Up New Dental Clinic

1. Create clinic with type = DENTAL
2. Doctors see only: Chief Complaint, Vitals, Diagnosis, Treatment
3. Faster workflow for dental consultations

### Multi-Specialty Hospital

1. Create separate clinics for each specialty
2. Set appropriate type for each (CARDIOLOGY, ORTHOPEDIC, etc.)
3. Each specialty has customized consultation interface

## Developer Notes

### Adding New Clinic Type

1. Add enum value to `ClinicType` in schema.prisma
2. Add to `CLINIC_TYPES` constant in create/edit dialogs
3. Add feature set to `CLINIC_TYPE_FEATURES` in packages/types/src/index.ts
4. Add color mapping in clinic-list.tsx `getClinicTypeDisplay()`
5. Create migration to add enum value

### Customizing Features for Type

Edit `CLINIC_TYPE_FEATURES` in `packages/types/src/index.ts`:

```typescript
DENTAL: {
  chiefComplaint: true,
  history: false,        // Set to false to hide
  examination: false,    // Set to false to hide
  vitals: true,
  diagnosis: true,
  treatment: true,
  investigations: true,
  prescriptions: true,
  procedures: true,
  followUp: true,
  dentalChart: true,     // Specialty-specific feature
}
```

## Migration Instructions

### Running Migration

```bash
cd packages/db
pnpm prisma migrate dev --name add_clinic_types
```

### Verifying Migration

```sql
-- Check enum values
SELECT unnest(enum_range(NULL::\"ClinicType\"));

-- Check existing clinics have type
SELECT id, name, type FROM \"Clinic\";
```

### Rollback (if needed)

```sql
ALTER TABLE \"Clinic\" DROP COLUMN IF EXISTS \"type\";
```

## Troubleshooting

### Type Not Showing in Dropdown

- Clear browser cache
- Check CLINIC_TYPES constant in dialog component
- Verify schema has all 11 types

### Consultation Tabs Not Hiding

- Check clinic type is set correctly
- Verify CLINIC_TYPE_FEATURES has correct configuration
- Check browser console for errors
- Verify consultation component imports CLINIC_TYPE_FEATURES

### Migration Fails

- Check if enum already has values (use IF NOT EXISTS)
- Verify Prisma schema matches migration
- Check database connection

## Related Files

- Schema: `packages/db/prisma/schema.prisma`
- Types: `packages/types/src/index.ts`
- Create Dialog: `apps/admin/app/(protected)/dashboard/create-clinic-dialog.tsx`
- Edit Dialog: `apps/admin/app/(protected)/dashboard/edit-clinic-dialog.tsx`
- Clinic List: `apps/admin/app/(protected)/dashboard/clinic-list.tsx`
- Consultation: `apps/app/components/consultation/clinical-documentation.tsx`
- Migration: `packages/db/prisma/migrations/20260108_add_clinic_types/migration.sql`

## Support

For questions or issues:

1. Check [CLINIC_TYPE_IMPLEMENTATION.md](./CLINIC_TYPE_IMPLEMENTATION.md) for detailed documentation
2. Review feature matrix in types package
3. Check consultation component code for tab visibility logic
4. Verify migration was run successfully

---

**Last Updated:** January 6, 2026
