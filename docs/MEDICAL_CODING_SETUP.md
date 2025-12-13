# Medical Coding Database Setup - Summary

## Problem

ICD and CPT code searches were returning empty results (`[]`) because the database had insufficient medical coding data. The original seed file only contained 14 CPT codes, making most searches unsuccessful.

## Solution Implemented

### 1. Database Schema Enhancement

Added `isCommon` field to both `IcdCode` and `CptCode` models to support "commonly used codes" feature:

```prisma
model IcdCode {
  // ... existing fields
  isCommon    Boolean  @default(false)

  @@index([isCommon])
}

model CptCode {
  // ... existing fields
  isCommon    Boolean  @default(false)

  @@index([isCommon])
}
```

### 2. Comprehensive CPT Code Database

Created `seed-cpt-comprehensive.ts` with **102 CPT codes** across all major categories:

#### Coverage by Category:

- **Evaluation & Management (99xxx)**: 30 codes
  - Office visits (new & established)
  - Emergency department visits
  - Hospital inpatient care
  - Consultations
- **Preventive Medicine (99xxx)**: 14 codes
  - All age groups (under 1 year to 65+)
  - New and established patients
- **Cardiovascular (93xxx)**: 6 codes
  - ECG, stress tests, echocardiography
- **Immunizations (90xxx)**: 13 codes
  - Flu, pneumonia, MMR, Tdap, hepatitis, shingles
  - Vaccine administration codes
- **Laboratory (8xxxx)**: 15 codes
  - CMP, lipid panel, glucose, A1c, CBC, TSH
  - Urinalysis, cultures, strep tests
- **Radiology (7xxxx)**: 12 codes
  - Chest, spine, extremity x-rays
  - Ultrasound exams
- **Surgery/Procedures (1xxxx, 36xxx, 96xxx, 94xxx, 97xxx)**: 12 codes
  - I&D, wound repair, venipuncture
  - Injections, nebulizer, physical therapy

**Common Codes**: 65 codes marked as `isCommon: true`

### 3. Enhanced ICD-10 Database

- Existing: **268 ICD-10 codes** (A00-Z87.891)
- Updated: **43 most frequently used codes** marked as common
- Categories: Respiratory, cardiovascular, diabetes, mental health, musculoskeletal, infections, GI, endocrine, preventive care, common symptoms

**Common ICD Codes Include**:

- I10 (Essential hypertension)
- E11.9 (Type 2 diabetes)
- J06.9 (Upper respiratory infection)
- M54.5 (Low back pain)
- F32.9 (Depression)
- Z23 (Encounter for immunization)
- And 37 more frequently used codes

### 4. API Service Enhancement

Updated `medical-coding.service.ts` to provide better search experience:

**Before**:

```typescript
if (!query || query.length < 2) {
  return []; // Empty results for short queries
}
```

**After**:

```typescript
if (!query || query.length < 2) {
  // Return commonly used codes when query is too short
  return this.prisma.cptCode.findMany({
    where: { isCommon: true },
    take: 20,
    orderBy: { code: "asc" },
  });
}

// In regular searches, prioritize common codes
orderBy: [
  { isCommon: "desc" }, // Common codes first
  { code: "asc" },
];
```

## Results

### Database Statistics

- **CPT Codes**: 102 total (65 common)
- **ICD Codes**: 273 total (38 common)

### Search Behavior

1. **Short queries (< 2 characters)**: Returns up to 20 commonly used codes
2. **Regular searches**: Results sorted with common codes appearing first
3. **Code prefix searches**: "99" → Returns office visit codes (99201-99215, etc.)
4. **Text searches**: Searches both code and description fields

### Example Search Results

Query: `"99"`

```json
[
  {
    "code": "99201",
    "description": "Office visit new patient (problem focused)",
    "isCommon": true
  },
  {
    "code": "99202",
    "description": "Office visit new patient (15-29 mins)",
    "isCommon": true
  },
  {
    "code": "99203",
    "description": "Office visit new patient (30-44 mins)",
    "isCommon": true
  },
  {
    "code": "99204",
    "description": "Office visit new patient (45-59 mins)",
    "isCommon": true
  },
  {
    "code": "99205",
    "description": "Office visit new patient (60-74 mins)",
    "isCommon": true
  }
]
```

Query: `"hypertension"`

```json
[
  {
    "code": "I10",
    "description": "Essential (primary) hypertension",
    "isCommon": true
  },
  {
    "code": "I11.0",
    "description": "Hypertensive heart disease with heart failure",
    "isCommon": false
  }
]
```

## Files Modified/Created

### Created:

1. `packages/db/prisma/seed-cpt-comprehensive.ts` - Comprehensive CPT code seed (102 codes)
2. `packages/db/prisma/update-common-icd.ts` - Script to mark common ICD codes
3. `docs/MEDICAL_CODING_SETUP.md` - This documentation

### Modified:

1. `packages/db/prisma/schema.prisma` - Added `isCommon` field to IcdCode and CptCode models
2. `apps/api/src/medical-coding/medical-coding.service.ts` - Enhanced search to show common codes

## How to Verify

### 1. Check Database

```bash
cd packages/db
npx prisma studio
```

Navigate to `CptCode` and `IcdCode` tables, filter by `isCommon = true`

### 2. Test API (when backend is running)

```bash
# Test CPT search
curl "http://localhost:3001/api/medical-coding/cpt-codes?search=99"

# Test ICD search
curl "http://localhost:3001/api/medical-coding/icd-codes?search=hypertension"

# Test short query (returns common codes)
curl "http://localhost:3001/api/medical-coding/cpt-codes?search=9"
```

### 3. Frontend Testing

1. Open consultation page
2. Click on ICD or CPT code search field
3. Type short query (e.g., "99") → Should see common office visit codes
4. Type specific term (e.g., "diabetes") → Should see relevant codes with common ones first

## Future Enhancements

### Potential Additions:

1. **Expand Code Database**: Add remaining CPT codes (currently ~10,000 total codes exist)
2. **ICD-11 Support**: Prepare migration path to ICD-11
3. **Custom Favorites**: Allow doctors to mark their own frequently used codes
4. **Usage Analytics**: Track which codes are actually used most in practice
5. **Code Bundling**: Suggest commonly bundled procedure codes
6. **Smart Suggestions**: ML-based code recommendations based on clinical notes

### Maintenance:

- Annual CPT code updates (released October 1st each year)
- ICD-10-CM updates (released October 1st each year)
- Review and update `isCommon` flags based on actual usage patterns

## Troubleshooting

### If searches still return empty:

1. Verify backend is running: `lsof -i :3001`
2. Check database connection in backend logs
3. Regenerate Prisma client: `npx prisma generate`
4. Verify codes in database: `npx prisma studio`

### If common codes not showing:

1. Check `isCommon` field exists: `npx prisma db push`
2. Re-run seed scripts:
   ```bash
   npx tsx prisma/seed-cpt-comprehensive.ts
   npx tsx prisma/update-common-icd.ts
   ```
3. Restart backend to pick up database changes

## References

- [WHO ICD-10 Classification](https://icd.who.int/browse10/2019/en)
- [AMA CPT Codes](https://www.ama-assn.org/practice-management/cpt)
- [CMS Medicare Fee Schedule](https://www.cms.gov/medicare/physician-fee-schedule)
