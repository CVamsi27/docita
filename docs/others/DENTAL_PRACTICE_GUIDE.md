# Dental Practice User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Patient Registration](#patient-registration)
3. [Medical History](#medical-history)
4. [Dental Charting](#dental-charting)
5. [Prescriptions](#prescriptions)
6. [X-ray Management](#x-ray-management)
7. [Treatment Planning](#treatment-planning)
8. [Billing with CDT Codes](#billing-with-cdt-codes)
9. [Best Practices](#best-practices)

---

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Recommended screen size: 1366x768 or higher

### Initial Setup

1. **Clinic Configuration**
   - Ensure clinic type is set to `DENTAL`
   - Configure clinic details (name, address, contact)
   - Upload clinic logo for documents

2. **User Accounts**
   - Create doctor accounts with dental specialization
   - Add receptionist/admin accounts as needed
   - Configure roles and permissions

---

## Patient Registration

### New Patient Registration

**Step 1: Basic Information**

- First Name, Last Name (required)
- Date of Birth (required)
- Gender (required)
- Phone Number (required - for appointment reminders)
- Email (optional)
- Address (optional)

**Step 2: Emergency Contact**

```
Emergency Contact Name
Emergency Contact Phone
Relationship
```

**Step 3: Insurance Information (Optional)**

```
Insurance Provider
Policy Number
Group Number
```

### Critical Fields for Dental Practice

- **Blood Group**: Important for extractions and surgical procedures
- **Allergies**: Special attention to local anesthetics
- **Medical History**: Focus on bleeding disorders, diabetes, cardiovascular conditions

---

## Medical History

### Why Medical History Matters in Dentistry

**Bleeding Disorders**

- Hemophilia, Von Willebrand's disease affect extraction procedures
- System tracks and warns automatically

**Cardiovascular Conditions**

- Hypertension: Monitor blood pressure before procedures with epinephrine
- Heart disease: May require antibiotic prophylaxis before certain procedures
- Mitral valve prolapse: Endocarditis prophylaxis consideration

**Diabetes**

- Delayed wound healing
- Increased infection risk
- Poor glycemic control affects periodontal health

**Osteoporosis**

- Bisphosphonate therapy: Risk of osteonecrosis of the jaw (BRONJ/MRONJ)
- System flags medications like alendronate, risedronate

**Immunocompromised States**

- HIV, organ transplant, immunosuppressant medications
- Increased infection risk

### Capturing Medical History

**1. Medical Conditions**

```
Navigate to: Patient → Medical History → Conditions
- Add existing conditions with ICD codes
- Mark status: ACTIVE, MANAGED, RESOLVED
- Set severity: MILD, MODERATE, SEVERE, CRITICAL
```

**2. Allergies (Critical for Dental!)**

```
Navigate to: Patient → Medical History → Allergies

Common Dental Allergies:
 Local Anesthetics: Lidocaine, Articaine, Mepivacaine, Bupivacaine
 Antibiotics: Penicillin/Amoxicillin (check cross-reactivity warnings)
 NSAIDs: Ibuprofen, Aspirin
 Latex: Gloves, rubber dam
 Contrast: For imaging procedures
```

**Allergy Severity Levels:**

- **MILD**: Minor rash, itching
- **MODERATE**: Significant reactions, urticaria
- **SEVERE**: Angioedema, respiratory symptoms
- **LIFE_THREATENING**: Anaphylaxis (shows pulse animation for visibility!)

**3. Current Medications**

```
Navigate to: Patient → Medical History → Medications

Key Medications for Dental:
️ Anticoagulants: Warfarin, aspirin, clopidogrel (bleeding risk)
️ Bisphosphonates: Alendronate, zoledronic acid (jaw osteonecrosis risk)
️ Immunosuppressants: Delayed healing, infection risk
️ Antihypertensives: Epinephrine interactions
```

**4. Social History**

```
Smoking Status:
- NEVER, FORMER, CURRENT
- Pack-years calculation

Dental Relevance:
 Periodontal disease risk
 Oral cancer screening
 Delayed wound healing post-extraction
 Implant failure risk
```

---

## Dental Charting

### Accessing Dental Charts

```
Navigate to: Patient → Consultation → Specialty → Dental Charts
```

### Tooth Numbering Systems

**FDI (ISO 3950) - International Standard**

```
Upper Right: 18 17 16 15 14 13 12 11 | 21 22 23 24 25 26 27 28 :Upper Left
Lower Right: 48 47 46 45 44 43 42 41 | 31 32 33 34 35 36 37 38 :Lower Left

Primary teeth: 55-51, 61-65, 75-71, 81-85
```

**Universal (US Standard)**

```
Upper Right: 1 2 3 4 5 6 7 8  | 9 10 11 12 13 14 15 16 :Upper Left
Lower Right: 32 31 30... 25   | 24 23 22 ... 17        :Lower Left
```

### Tooth Conditions

| Condition      | Description         | Visual Color |
| -------------- | ------------------- | ------------ |
| **HEALTHY**    | No pathology        | Green        |
| **CARIES**     | Dental caries/decay | Red          |
| **FILLED**     | Restoration present | Blue         |
| **MISSING**    | Tooth absent        | Gray         |
| **CROWN**      | Crown restoration   | Purple       |
| **ROOT_CANAL** | RCT completed       | Orange       |
| **IMPLANT**    | Dental implant      | Indigo       |
| **BRIDGE**     | Part of bridge      | Pink         |
| **EXTRACTED**  | Recently extracted  | Dark Gray    |
| **IMPACTED**   | Impacted tooth      | Yellow       |

### Surface Notation (MODBL)

- **M**: Mesial
- **O**: Occlusal
- **D**: Distal
- **L**: Lingual (or Palatal)
- **B**: Buccal (or Facial)

### How to Use the Dental Chart

**Step 1: Click on a Tooth**

- Click any tooth number in the odontogram

**Step 2: Select Condition**

- Choose from dropdown: CARIES, FILLED, etc.

**Step 3: Select Surface (if applicable)**

- Choose specific surface (M, O, D, L, B) or ALL

**Step 4: Add Clinical Notes**

```
Example:
"Deep caries on occlusal surface, no pain on percussion,
tender to palpation apically. No mobility."
```

**Step 5: Proposed Treatment**

```
Example:
"Composite filling - one surface" (D2391)
"RCT with permanent crown" (D3330 + D2740)
"Surgical extraction"

 (D7210)
```

**Step 6: Save**

- Findings automatically added to patient record

### Treatment Planning Example

**Case: Multiple Caries**

```
Tooth #14 (FDI): Caries, Occlusal surface
  Clinical Notes: "Moderate decay, no pain"
  Treatment: "Composite filling - one surface" (D2391)

Tooth #15: Caries, Mesio-Occlusal
  Clinical Notes: "Deep caries approaching pulp"
  Treatment: "RCT + Crown" (D3320 + D2750)

Tooth #18: Impacted
  Clinical Notes: "Partially erupted, recurrent pericoronitis"
  Treatment: "Surgical removal" (D7230)
```

---

## Prescriptions

### Common Dental Medications

**Pain Management**

```
Paracetamol (Acetaminophen):
- Dosage: 500-1000mg
- Frequency: 4-6 hourly
- Max Daily: 4000mg

Ibuprofen:
- Dosage: 400-600mg
- Frequency: 6-8 hourly
- Max Daily: 3200mg

Tramadol (severe pain):
- Dosage: 50-100mg
- Frequency: 4-6 hourly
- Max Daily: 400mg
```

**Antibiotics for Dental Infections**

```
Amoxicillin (First-line):
- Dosage: 500mg
- Frequency: Every 8 hours (Q8H)
- Duration: 5-7 days
- CDT Note: Use for periapical abscess, periodontal abscess

Metronidazole (Anaerobic coverage):
- Dosage: 400mg
- Frequency: Every 8 hours
- Duration: 5-7 days
- CDT Note: Combine with amoxicillin for severe infections

Clindamycin (Penicillin-allergic):
- Dosage: 300mg
- Frequency: Every 6 hours
- Duration: 7 days
- CDT Note: Alternative for penicillin-allergic patients

Azithromycin (Alternative):
- Dosage: 500mg Day 1, then 250mg Days 2-5
- Frequency: Once daily
- Duration: 5 days
```

**Mouthwash**

```
Chlorhexidine 0.12% or 0.2%:
- Dosage: 10-15ml
- Frequency: Twice daily
- Duration: 2 weeks
- Instructions: "Rinse for 30 seconds, do not eat/drink for 30 min after"
```

### How to Write a Prescription

**Step 1: Navigate**

```
Patient → Consultation → Prescriptions
```

**Step 2: Add Medication**

- Click "Add Medication"
- Search and select medication name

**Step 3: Configure Dosage**

```
Medication: Amoxicillin
Dosage: 500mg
Form: Capsule
Route: PO (Oral)
Frequency: Q8H (Every 8 hours)
Duration: 7 days
```

**Step 4: Special Instructions**

```
Optional fields:
- "Take after food"
- "Complete the full course"
- "Avoid alcohol"
```

**Step 5: Allergy Check**

- System automatically checks for drug allergies
- Warns about cross-reactivity (penicillin → cephalosporin)

**Step 6: Save and Print**

- Prescription auto-populates doctor details
- Includes license number, signature
- Can send via WhatsApp (if configured)

---

## X-ray Management

### X-ray Types in Dentistry

**Intraoral X-rays**

```
Periapical (PA):
- Shows: Entire tooth + surrounding bone
- Use: Detect apical pathology, periapical abscess, bone loss
- Document Type: XRAY_INTRAORAL_PERIAPICAL

Bitewing (BW):
- Shows: Crowns of upper and lower teeth
- Use: Detect interproximal caries, marginal bone levels
- Document Type: XRAY_INTRAORAL_BITEWING

Occlusal:
- Shows: Roof/floor of mouth
- Use: Detect impacted teeth, salivary stones, fractures
- Document Type: XRAY_INTRAORAL_OCCLUSAL
```

**Extraoral X-rays**

```
Panoramic (OPG):
- Shows: Entire mouth in single image
- Use: Screening, impacted wisdom teeth, jaw pathology
- Document Type: XRAY_PANORAMIC

Cephalometric (Ceph):
- Shows: Side view of skull
- Use: Orthodontic analysis, growth assessment
- Document Type: XRAY_CEPHALOMETRIC

CBCT (Cone Beam CT):
- Shows: 3D imaging of teeth, bone, nerves
- Use: Implant planning, impacted teeth, pathology
- Document Type: XRAY_CBCT
```

### Uploading X-rays

**Step 1: Navigate**

```
Patient → Documents → Upload
```

**Step 2: Select File**

- Choose X-ray image file
- Supported formats: JPG, PNG, PDF, DICOM

**Step 3: Categorize**

```
Document Type: Select specific X-ray type
- XRAY_INTRAORAL_PERIAPICAL
- XRAY_PANORAMIC
- etc.
```

**Step 4: Add Description**

```
Example:
"Periapical X-ray - Tooth #14"
"Panoramic X-ray - Pre-operative assessment for wisdom teeth"
"CBCT - Implant planning #21, #22"
```

**Step 5: Save**

- X-ray stored in patient's document library
- Accessible from Documents tab
- Can view/download anytime

### Organizing X-rays

**Filtering by Type**

- Documents page has filter for X-ray categories
- View all dental X-rays together
- Compare serial X-rays over time

**Before/After Comparisons**

- Upload pre-treatment X-rays
- Upload post-treatment X-rays
- Side-by-side comparison for patient education

---

## Treatment Planning

### Creating a Treatment Plan

**Step 1: Clinical Examination**

1. Complete dental charting
2. Note all findings
3. Identify treatment needs

**Step 2: Prioritize Treatment**

```
Priority 1 (Urgent/Emergency):
- Acute pain management
- Active infection
- Mobile teeth requiring extraction

Priority 2 (Necessary):
- Deep caries requiring RCT
- Periodontal disease treatment
- Essential restorations

Priority 3 (Elective):
- Aesthetic improvements
- Whitening
- Orthodontics
```

**Step 3: Document in Notes**

```
Navigate to: Consultation → Treatment Plan

Example Treatment Plan:
===============================
CHIEF COMPLAINT: "Pain in lower right tooth for 3 days"

DIAGNOSIS:
- Acute periapical abscess #46 (FDI)
- Chronic generalized periodontitis
- Multiple caries (#14, #15, #27)

TREATMENT PLAN - PHASE 1 (Emergency):
1. Tooth #46: Incision & drainage, Endodontic therapy
   CDT: D3330 (RCT molar)
   Prescribe: Amoxicillin 500mg Q8H x 7 days
              Ibuprofen 400mg Q6H PRN x 5 days

PHASE 2 (Restorative):
2. Tooth #14: Composite filling DO surface
   CDT: D2392
3. Tooth #15: Composite filling MOD
   CDT: D2393
4. Tooth #27: Composite filling O
   CDT: D2391

PHASE 3 (Periodontal):
5. Full mouth scaling & root planing
   CDT: D4341 x 4 quadrants
6. Oral hygiene instructions
   CDT: D1330

PHASE 4 (Crown - Tooth #46):
7. Permanent crown post-RCT
   CDT: D2750 (PFM crown)

FOLLOW-UP:
- Review in 1 week post-RCT
- Periodontal re-eval in 6 weeks
```

---

## Billing with CDT Codes

### Common Dental Procedure Codes (CDT)

**Diagnostic**

- D0120: Periodic oral evaluation - $50-75
- D0150: Comprehensive oral evaluation - $75-100
- D0210: Complete intraoral X-ray series - $125-150
- D0330: Panoramic X-ray - $100-130

**Preventive**

- D1110: Prophylaxis (cleaning) - adult - $75-100
- D1120: Prophylaxis - child - $50-75
- D1206: Fluoride varnish - $25-40
- D1351: Sealant per tooth - $40-60

**Restorative**

- D2140: Amalgam - 1 surface - $100-150
- D2391: Composite - 1 surface, posterior - $150-200
- D2392: Composite - 2 surfaces, posterior - $200-275
- D2393: Composite - 3 surfaces, posterior - $250-350

**Endodontics**

- D3310: RCT - anterior - $600-900
- D3320: RCT - premolar - $700-1000
- D3330: RCT - molar - $900-1500

**Periodontics**

- D4341: SRP - 4+ teeth per quadrant - $200-300
- D4342: SRP - 1-3 teeth per quadrant - $100-150

**Prosthodontics**

- D2740: Crown - porcelain/ceramic - $1000-1500
- D2750: Crown - PFM - $900-1300
- D6010: Implant placement - $1500-2500
- D6058: Implant crown - porcelain - $1200-2000

**Oral Surgery**

- D7140: Extraction - erupted tooth - $100-200
- D7210: Extraction - surgical - $200-350
- D7230: Impacted tooth - partially bony - $250-400
- D7240: Impacted tooth - completely bony - $350-600

### Creating an Invoice

**Step 1: Navigate**

```
Patient → Consultation → Invoice
OR
Invoices → Create New Invoice
```

**Step 2: Add Procedures**

```
Click "Add Procedure"
Search by CDT code or description:
- Type "D2391" or "Composite one surface"
- Select from list
- Quantity: 1
- Price: Auto-fills or manual entry
```

**Step 3: Multiple Procedures**

```
Example Invoice:
-----------------------
D0120: Periodic evaluation       $60
D0274: Bitewings (4 films)       $80
D1110: Adult prophylaxis         $90
D2391: Composite #14             $180
D2392: Composite #15             $250
                    SUBTOTAL:    $660
                    TAX (if applicable)
                    TOTAL:       $660
```

**Step 4: Payment**

- Record payment method
- Generate receipt
- Send via WhatsApp (if enabled)

### Insurance Claims

**Insurance Information**

- Ensure patient insurance details are complete
- Policy number, group number, provider

**Claim Submission**

- Invoice includes CDT codes (required for claims)
- Print/export invoice for claim submission
- Track payment status

---

## Best Practices

### Clinical Documentation

** Be Specific**

```
 Bad: "Caries on #14"
 Good: "Deep caries on occlusal surface #14, approaching pulp,
          tender to percussion, no mobility, vitality testing: delayed response"
```

** Use Standard Terminology**

- Use correct tooth numbering (FDI or Universal consistently)
- Use MODBL surface notation
- Proper abbreviations: RCT, PA, OPG, etc.

** Document Treatment Rationale**

```
"RCT indicated due to irreversible pulpitis, evidenced by:
 - Spontaneous severe pain
 - Prolonged response to cold
 - Periapical radiolucency on PA X-ray"
```

### Medical History Updates

** Review at Every Visit**

- Ask about changes in medical conditions
- New medications
- New allergies
- Recent hospitalization/surgery

** Annual Comprehensive Update**

- Complete medical history review
- Update smoking status
- Review family history

### Prescription Safety

** Always Check Allergies**

- System auto-checks, but verify
- Ask patient about previous reactions

** Drug Interactions**

- Anticoagulants + NSAIDs = increased bleeding
- MAO inhibitors + epinephrine = hypertensive crisis

** Pregnancy Considerations**

- Amoxicillin: Safe (Category B)
- Ibuprofen: Avoid in 3rd trimester (Category D)
- Paracetamol: Safe (Category A)

### X-ray Organization

** Consistent Naming**

```
Format: [Type]_[Tooth/Area]_[Date]
Example: "PA_14_2024-01-10"
         "OPG_FullMouth_2024-01-10"
```

** Regular Archiving**

- Keep serial X-rays for comparison
- Document radiation exposure (ALARA principle)

### Infection Control

** Document Sterilization**

- Autoclave records
- Instrument tracking

** High-Risk Procedures**

- Extractions: Document bleeding control measures
- RCT: Rubber dam usage
- Implants: Sterile technique documentation

---

## Keyboard Shortcuts

- `Cmd/Ctrl + K`: Global search
- `Cmd/Ctrl + /`: Open command palette

---

## Getting Help

**Support:**

- Email: support@docita.work
- In-app feedback: Click feedback button in sidebar

**Training:**

- Video tutorials available in Help Center
- Schedule onboarding session with support team

---

_Last Updated: January 2026_
_Version: 1.0 - Dental Practice Edition_
