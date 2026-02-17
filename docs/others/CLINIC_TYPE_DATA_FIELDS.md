# Clinic Type Specific Data Fields & Requirements

## Overview

This document details the specific data fields, forms, and pages required for each supported clinic type within the Docita platform. It analyzes the current implementation status, identifying shared core modules versus specialty-specific requirements.

**Context:** The application uses a "Feature Flag" system (`CLINIC_TYPE_FEATURES`) to enable/disable modules per clinic type. However, the _data shape_ of these modules is currently standardized (Superset approach).

---

## Universal Requirements (All Clinic Types)

The following fields are **mandatory** for all clinic types, regardless of specialty:

1. **Symptom/Chief Complaint**: Primary presenting symptom with duration, severity (1-10), onset, and associated symptoms.
2. **Treatment History Summary**: Documentation of previous treatments attempted for the current condition.
3. **Vital Signs**: At minimum - Blood Pressure, Heart Rate, Temperature (see detailed table below).
4. **Diagnosis**: ICD-10 coded diagnoses.
5. **Treatment Plan**: Current treatment approach.
6. **Follow-up**: Next steps and return visit planning.

---

## 1. Core Data Modules (Shared Superset)

These modules are available to all clinic types where the corresponding feature flag is enabled.

### A. Vital Signs (`vitalSignSchema`)

_Used in: All Types_
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Systolic BP | Number | Yes | 90-140 mmHg warning |
| Diastolic BP | Number | Yes | 60-90 mmHg warning |
| Pulse (HR) | Number | Yes | |
| Respiratory Rate | Number | No | |
| Temperature | Number | No | Celsius |
| SpO2 | Number | No | % Saturation |
| Height | Number | No | Used for BMI |
| Weight | Number | No | Used for BMI |
| Pain Score | Number (0-10) | No | |
| Blood Glucose | Number | No | mg/dL |

### B. Clinical History (`clinicalNoteSchema`)

_Used in: All Types (Note: Dental uses a simplified version but MUST include Symptom & Treatment History)_

**Universal Fields (Required for ALL clinic types):**

-  **Symptom (Chief Complaint)**: Enhanced with duration, severity (1-10), onset
-  **Treatment History Summary**: Previous treatments for current condition

| Section                   | Field           | Required                  | Notes                                                                             |
| ------------------------- | --------------- | ------------------------- | --------------------------------------------------------------------------------- |
| Symptom (Chief Complaint) | Text + Duration | **Yes - All Types**       | Enhanced Searchable Select. Includes Severity (1-10), Onset, Associated Symptoms. |
| Treatment History Summary | Text (Long)     | **Yes - All Types**       | Previous treatments attempted for the current condition. What worked/didn't work. |
| HPI                       | Text (Long)     | Optional (Type-dependent) | History of Present Illness                                                        |
| Medical History           | Text (Long)     | Optional (Type-dependent) | Past Medical History                                                              |
| Surgical History          | Text (Long)     | Optional                  | Past surgeries                                                                    |
| Social History            | Text (Long)     | Optional                  | Smoking, Alcohol, Lifestyle                                                       |
| Family History            | Text (Long)     | Optional                  | Hereditary conditions                                                             |
| Allergies                 | Array           | Recommended               | Drug/Food allergies                                                               |
| Current Meds              | Text (Long)     | Recommended               | Existing prescriptions                                                            |
| ROS                       | Text (Long)     | Optional (Type-dependent) | Review of Systems                                                                 |

### C. Physical Examination

_Used in: General, Pediatric, Ortho, Cardio, Derm, ENT, Gyn, Ophth, Psych, Specialty_
_Disabled in: Dental (uses Dental Chart)_

#### General Examination (`generalExaminationSchema`)

- **PICCLE**: Pallor, Icterus, Cyanosis, Clubbing, Lymphadenopathy, Edema (Booleans + Notes)
- **Vitals/Mental**: GCS (3-15), Consciousness, Orientation, Nutrition, Hydration.

#### Systemic Examination (`systemicExaminationSchema`)

| System              | Key Fields                                                                              |
| ------------------- | --------------------------------------------------------------------------------------- |
| **CVS**             | Heart Rate, Rhythm, Sounds (S1/S2), JVP, Peripheral Pulses                              |
| **RS**              | Rate, Breath Sounds (Vesicular/Bronchial), Added Sounds (Crepts/Wheeze), Chest Movement |
| **Abdomen**         | Shape, Tenderness, Organomegaly, Bowel Sounds, Ascites                                  |
| **CNS**             | Consciousness, Cranial Nerves, Motor/Sensory Function, Reflexes, Coordination           |
| **Musculoskeletal** | Gait, Joint Exam, Muscle Strength, Deformities                                          |
| **Skin**            | Color, Texture, Lesions, Rashes                                                         |

---

## 2. Clinic Type Specific Configurations

### 1. GENERAL (General Medicine)

- **Universal Requirements:**  Symptom, Treatment History, Vitals, Diagnosis, Treatment, Follow-up.
- **Enabled Modules:** All Core Modules.
- **Specific Fields:** None. Uses standard SOAP format.
- **Implementation Status:**  Fully Implemented.

### 2. DENTAL (Dental Clinic)

- **Universal Requirements:**  Symptom (Dental pain/issue), Treatment History (Previous dental work), Vitals, Diagnosis, Treatment, Follow-up.
- **Enabled Modules:** Chief Complaint, Vitals, Diagnosis, Treatment, Procedures.
- **Disabled Modules:** Detailed Medical/Social/Family History, General/Systemic Examination.
- **Specific Requirements (Pending Implementation):**
  - **Dental Chart:** Interactive Odontogram (Adult 32 teeth / Primary 20 teeth).
    - Fields: Tooth Number (FDI/ISO notation), Surface (M/O/D/L/B), Condition (Caries/Filled/Missing/Crown), Proposed Treatment.
  - **Periodontal Chart:** 6-point pocket depths per tooth, Bleeding on Probing (BOP), Gingival Recession.
  - **Treatment History:** Simplified form within Chief Complaint section (e.g., "Previous RCT on #14, Filling on #18").
- **Current State:** Uses standard Vitals. Examination tab is hidden. **Dental Chart not implemented. Treatment History needs dedicated UI.**

### 3. PEDIATRIC (Pediatric Care)

- **Universal Requirements:**  Symptom, Treatment History, Vitals (Age-adjusted ranges), Diagnosis, Treatment, Follow-up.
- **Enabled Modules:** All Core Modules.
- **Specific Requirements:**
  - **Growth Chart:** WHO/CDC Percentiles for 0-18 years.
    - Fields: Head Circumference (OFC 0-36mo), Height-for-Age, Weight-for-Age, BMI-for-Age.
    - Display: Percentile curves (3rd, 10th, 25th, 50th, 75th, 90th, 97th).
  - **Immunization Schedule:** Vaccination tracker (Due/Given dates, Batch #, Site).
  - **Pediatric Vitals:** Age-specific normal ranges (e.g., HR 110-160 for infants).
  - **Developmental Milestones:** Motor, Language, Social checkboxes by age.
- **Current State:** Uses adult Vitals ranges. **Growth Chart, Immunization tracker, and Milestone modules are missing.**

### 4. ORTHOPEDIC (Orthopedic Center)

- **Universal Requirements:**  Symptom (Pain/Injury location), Treatment History (Previous surgeries/PT), Vitals, Diagnosis, Treatment, Follow-up.
- **Enabled Modules:** All Core Modules.
- **Specific Requirements:**
  - **Range of Motion (ROM):** Joint-specific measurement (degrees) - Shoulder, Elbow, Wrist, Hip, Knee, Ankle.
  - **Imaging Review:** DICOM viewer integration or structured image annotations (X-ray, MRI, CT).
  - **Special Tests:** Lachman, Drawer, McMurray, etc. (checkboxes with results).
- **Current State:** Uses standard Systemic Exam (MSS section). **ROM measurement UI and DICOM viewer not implemented.**

### 5. CARDIOLOGY (Cardiology Center)

- **Universal Requirements:**  Symptom (Chest pain/SOB), Treatment History (Medications/Interventions), Vitals (BP critical), Diagnosis, Treatment, Follow-up.
- **Enabled Modules:** All Core Modules + Cardiology Exam.
- **Specific Requirements:**
  - **ECG Data:**  Implemented - HR, rhythm, intervals (PR, QRS, QT, QTc auto-calculation), axis, findings.
  - **Echo Parameters:**  Implemented - LVEF, LV dimensions, valve assessments (Mitral/Aortic/Tricuspid), Doppler findings.
  - **Stress Test:**  Implemented - Protocol (Treadmill/Pharmacological), METs achieved, ST changes, BP response, symptoms.
  - **Assessment:**  Implemented - Clinical assessment, risk factors, medications, plan.
- **Implementation Status:**  **Fully Implemented** - Complete cardiac examination module with ECG, Echocardiography, Stress Test, and Assessment tabs integrated into clinical documentation.

### 6. DERMATOLOGY (Dermatology Clinic)

- **Universal Requirements:**  Symptom (Skin complaint), Treatment History (Topicals/Oral meds tried), Vitals, Diagnosis, Treatment, Follow-up.
- **Enabled Modules:** All Core Modules + Dermatology Exam.
- **Specific Requirements:**
  - **Skin Assessment:**  Implemented - Fitzpatrick skin type classification (I-VI), skin type (normal/dry/oily/combination/sensitive), general condition documentation.
  - **Lesion Documentation:**  Implemented - Comprehensive lesion tracking with location, body region, size (mm), shape, color, border characteristics, surface texture, elevation, consistency, tenderness assessment.
  - **ABCDE Criteria:**  Implemented - Structured documentation for melanoma screening (Asymmetry, Border, Color, Diameter, Evolution).
  - **Body Map:**  Implemented - Location tracking with body region categorization (placeholder for interactive map in future).
  - **Treatment Planning:**  Implemented - Per-lesion diagnosis, treatment plan, and follow-up scheduling.
- **Implementation Status:**  **Fully Implemented** - Complete dermatology examination module with Fitzpatrick classification, multi-lesion tracking, ABCDE criteria documentation, and body mapping integrated into clinical documentation.

### 7. ENT (ENT Specialist)

- **Universal Requirements:**  Symptom (Ear/Nose/Throat issue), Treatment History (Medications/Surgeries), Vitals, Diagnosis, Treatment, Follow-up.
- **Enabled Modules:** All Core Modules.
- **Specific Requirements:**
  - **Audiogram:** Frequency (Hz) vs Threshold (dB) plotting for both ears (Air/Bone conduction).
  - **Tuning Fork Tests:** Rinne (positive/negative), Weber (lateralization).
  - **Nasal Endoscopy:** Findings documentation.
- **Current State:** Uses general examination fields. **Audiogram plotting and tuning fork test templates not implemented.**

### 8. GYNECOLOGY (Gynecology Clinic)

- **Universal Requirements:**  Symptom (Gynae/Obstetric complaint), Treatment History (Previous pregnancies/treatments), Vitals, Diagnosis, Treatment, Follow-up.
- **Enabled Modules:** All Core Modules + Gynecology Exam.
- **Specific Requirements:**
  - **Obstetric History:**  Implemented - GTPAL (Gravida, Term, Preterm, Abortions, Living) structured fields with summary display.
  - **LMP/EDD Calculator:**  Implemented - Auto-calculate EDD from LMP (Naegele's Rule: LMP + 280 days), gestational age display.
  - **Menstrual History:**  Implemented - LMP, cycle length/duration, regularity, flow, dysmenorrhea tracking.
  - **Antenatal Record:**  Implemented - Fundal height, FHR, presentation, engagement, liquor volume, fetal movements, cervical dilation/effacement.
- **Implementation Status:**  **Fully Implemented** - Complete obstetric and gynecological examination module with menstrual history, GTPAL tracking, LMP/EDD calculator, and antenatal record integrated into clinical documentation.

### 9. OPHTHALMOLOGY (Eye Care Center)

- **Universal Requirements:**  Symptom (Vision complaint), Treatment History (Glasses/Surgery/Drops), Vitals, Diagnosis, Treatment, Follow-up.
- **Enabled Modules:** All Core Modules.
- **Specific Requirements:**
  - **Visual Acuity:** Snellen Chart (6/6, 20/20) for OD/OS/OU, with/without correction.
  - **Refraction:** Sphere, Cylinder, Axis, Add (for near), PD (Pupillary Distance).
  - **IOP:** Intraocular Pressure (mmHg) OD/OS.
  - **Fundoscopy:** Cup-to-Disc ratio, Retinal findings.
- **Current State:** Uses standard examination. **Refraction form, VA grid, and IOP tracking not implemented.**

### 10. PSYCHIATRY (Mental Health Clinic)

- **Universal Requirements:**  Symptom (Psychiatric complaint), Treatment History (Medications/Therapy), Vitals (for med monitoring), Diagnosis, Treatment, Follow-up.
- **Enabled Modules:** History, Mental Status Exam (MSE), Treatment + Psychiatry Exam.
- **Disabled Modules:** Physical Procedures.
- **Specific Requirements:**
  - **Mental Status Examination:**  Implemented - Comprehensive MSE with structured fields for Appearance (grooming, hygiene, dress), Behavior (cooperation, agitation), Eye Contact, Psychomotor Activity (normal/retarded/agitated).
  - **Speech Assessment:**  Implemented - Rate (normal/slow/rapid/pressured), Volume (normal/soft/loud), quality and fluency tracking.
  - **Mood & Affect:**  Implemented - Subjective mood (patient's words), Objective affect observation, Affect type (full/restricted/blunted/flat/labile), Congruence assessment (congruent/incongruent).
  - **Thought Process & Content:**  Implemented - Process type (linear/circumstantial/tangential/loose/flight-of-ideas/perseveration), Delusions tracking with type specification, Obsessions/Compulsions checkboxes.
  - **Perception:**  Implemented - Hallucinations (type and description for auditory/visual/tactile/olfactory/gustatory), Illusions, Depersonalization, Derealization tracking.
  - **Cognition:**  Implemented - Level of consciousness (alert/drowsy/obtunded/stuporous/comatose), Orientation assessment (person/place/time/situation), Attention & Concentration, Memory (immediate/recent/remote) evaluation.
  - **Insight & Judgment:**  Implemented - Insight level (good/fair/poor/absent) with awareness description, Judgment assessment (good/fair/poor/impaired) with decision-making evaluation.
  - **Risk Assessment:**  Implemented - Structured suicide risk evaluation (low/moderate/high/imminent) with thoughts/plan/intent/means/previous attempts tracking, Protective factors documentation, Homicide risk assessment with identified target tracking (duty to warn), Risk management interventions and Safety planning.
  - **Screening Scales:**  Implemented - PHQ-9 (Depression) score (0-27) with severity categorization (minimal/mild/moderate/moderately-severe/severe), GAD-7 (Anxiety) score (0-21) with severity levels, YMRS (Mania) score (0-60) optional tracking, Other scales documentation (CAGE, AUDIT, PCL-5, MMSE, MoCA).
  - **Clinical Assessment:**  Implemented - Psychiatric assessment and formulation with diagnostic impression, differential diagnoses, biopsychosocial formulation, Treatment plan with medication management, psychotherapy modality, follow-up frequency.
- **Implementation Status:**  **Fully Implemented** - Complete psychiatry examination module with comprehensive Mental Status Examination (9 domains), structured risk assessment (suicide/homicide), standardized screening scales (PHQ-9, GAD-7, YMRS), and clinical formulation integrated into clinical documentation.

### 11. SPECIALTY (Generic)

- **Universal Requirements:**  Symptom, Treatment History, Vitals, Diagnosis, Treatment, Follow-up.
- **Enabled Modules:** All Core Modules.
- **Specific Fields:** Configurable/Flexible. Uses Superset approach for maximum flexibility.
- **Implementation Status:**  Fully Implemented.

---

## 3. Implementation Gap Analysis

### Critical Priority (Affects All Types)

| Component                                                              | Status         | Impact                                              |
| ---------------------------------------------------------------------- | -------------- | --------------------------------------------------- |
| **Treatment History Summary** field in Chief Complaint/History section |  Implemented | All clinic types need this for continuity of care   |
| **Symptom Severity Tracking** (1-10 scale)                             |  Implemented | Available in enhanced chief complaint (OPQRST mode) |

### High Priority (Specialty-Specific)

| Clinic Type       | Critical Missing UI/Data Fields                   | Current Workaround             | Status                                             |
| ----------------- | ------------------------------------------------- | ------------------------------ | -------------------------------------------------- |
| **DENTAL**        | Odontogram (Tooth Chart), Periodontal Chart       | Using free-text notes          |  Odontogram Implemented                          |
| **PEDIATRIC**     | Growth Chart (WHO percentiles)                    | Manual height/weight in vitals |  Growth Chart Implemented                        |
| **CARDIOLOGY**    | ECG data entry, Echo parameters                   | CVS examination notes          |  ECG/Echo/Stress Test Implemented                |
| **OPHTHALMOLOGY** | Visual acuity grid, Refraction form, IOP          | General eye exam notes         |  Visual Acuity/Refraction/IOP Implemented        |
| **GYNECOLOGY**    | GTPAL, LMP/EDD calculator, Antenatal record       | Free-text obstetric history    |  GTPAL/LMP-EDD/Antenatal Implemented             |
| **DERMATOLOGY**   | Lesion tracking, Body map, Fitzpatrick scale      | Free-text skin exam            |  Lesion Tracker/Body Map/Fitzpatrick Implemented |
| **PSYCHIATRY**    | MSE form, Risk assessment tools, Screening scales | Generic exam fields            |  MSE/Risk Assessment/Scales Implemented          |
| **PEDIATRIC**     | Growth Charts (Visual), Immunization Tracker      | Manual entry in notes          |  Growth Chart Implemented                        |
| **OPHTHALMOLOGY** | Refraction/Spectacle Rx Form, Visual Acuity Grid  | Free-text in examination       |  Eye Exam Implemented                            |
| **CARDIOLOGY**    | ECG Data Entry, Echo Parameters                   | Free-text in investigations    |  Pending                                         |

### Medium Priority (Enhanced Features)

| Clinic Type     | Missing Features                           | Impact                     |
| --------------- | ------------------------------------------ | -------------------------- |
| **GYNECOLOGY**  | LMP/EDD Calculator, GTPAL Structuring      | Manual calculation needed  |
| **DERMATOLOGY** | Body Map, Before/After Image Tracking      | Images uploaded separately |
| **PSYCHIATRY**  | Structured MSE Form, Risk Assessment Tools | Using generic exam fields  |
| **ORTHOPEDIC**  | ROM Measurement UI, DICOM Viewer           | Manual entry               |
| **ENT**         | Audiogram Plotting                         | Uploaded as image          |

## 4. Implementation Roadmap

### Phase 1: Universal Requirements (All Types)  COMPLETED

1.  **Treatment History Summary Field**: Added to schema and UI in Chief Complaint tab.
   - Schema: `treatmentHistory: z.string().optional()` in `clinicalNoteSchema`
   - Database: Added `treatmentHistory String?` field to Appointment model
   - API: Updated DTOs and service selects to include treatmentHistory
   - UI: Prominent amber-styled card with guidance and examples
2.  **Enhanced Symptom Tracking**: Severity (1-10) and duration available in structured OPQRST mode.
   - Visual slider with color-coded severity indicator
   - Duration tracking with flexible units (minutes/hours/days/weeks/months/years)
   - Associated symptoms and red flag detection

### Phase 2: High-Impact Specialty Modules

1.  **Dental Module**:
   - Created `DentalChart` component (Odontogram) with tooth-by-tooth status tracking.
   - Schema: `dentalChart: Json?` in Appointment model (stores DentalChartData)
   - Features:
     - Adult (32 teeth) and Primary (20 teeth) dentition support
     - FDI and Universal numbering systems
     - 10 tooth conditions (Healthy, Caries, Filled, Missing, Crown, RCT, Implant, Bridge, Extracted, Impacted)
     - Surface-specific documentation (M/O/D/L/B)
     - Clinical notes and proposed treatment per tooth
     - Visual odontogram with color-coded status
     - Findings summary with delete functionality
   - Database: Migrated and ready
2.  **Pediatric Module**:
   - Created `GrowthChart` component with WHO standards tracking.
   - Schema: `growthData: Json?` in Appointment model (stores GrowthChartData)
   - Features:
     - Track weight, height, head circumference, and calculated BMI over time
     - Automatic age calculation from date of birth
     - Multiple measurement history with edit/delete functionality
     - Gender-specific tracking (Male/Female)
     - WHO growth standards reference information
     - Visual latest measurements summary
     - Clinical notes per measurement
     - General growth & development notes
   - Database: Migrated (20260107164223_add_growth_data_field)
   - UI: Conditional tab ("Growth Chart") for PEDIATRIC clinic type
3.  **Ophthalmology Module**:
   - Created `OphthalmologyExam` component with comprehensive eye examination tools.
   - Schema: `ophthalmologyExam: Json?` in Appointment model (stores OphthalmologyExamData)
   - Features:
     - **Visual Acuity Assessment**: OD/OS/OU with Snellen chart values (20/20, CF, HM, LP, etc.)
     - **Refraction Form**: Sphere, Cylinder, Axis, Add for spectacle prescription
     - **Intraocular Pressure (IOP)**: Measurement with method tracking (NCT, Applanation, iCare)
     - **Anterior Segment**: Slit lamp examination findings (OD/OS separate)
     - **Posterior Segment**: Fundoscopy findings with disc, macula, vessels documentation
     - Pupillary distance measurement
     - Diagnosis and plan fields
     - Tabbed interface for organized data entry
   - Database: Migrated (20260107171330_add_ophthalmology_exam_field)
   - UI: Conditional tab ("Eye Exam") for OPHTHALMOLOGY clinic type
4.  **Cardiology Module**:
   - Created `CardiologyExam` component with comprehensive cardiac examination documentation.
   - Schema: `cardiologyExam: Json?` in Appointment model (stores CardiologyExamData)
   - Features:
     - **ECG Tab**: Heart rate, rhythm, intervals (PR, QRS, QT), auto-calculated QTc, axis deviation, ECG findings
     - **Echocardiography Tab**: LVEF, LV dimensions (IVSd, LVIDd, LVPWd, IVSs, LVIDs, LVPWs), valve assessments (Mitral/Aortic/Tricuspid with stenosis/regurgitation grading), Doppler findings
     - **Stress Test Tab**: Protocol selection (Treadmill/Pharmacological), METs achieved, ST segment changes, BP response, symptoms during test, reason for termination
     - **Assessment Tab**: Clinical assessment, risk factors, current medications, treatment plan
     - Reference ranges displayed for all measurements
     - Tabbed interface for organized workflow
   - Database: Migrated (20260107172306_add_cardiology_exam_field)
   - UI: Conditional tab ("Cardiac Exam") for CARDIOLOGY clinic type
5.  **Gynecology Module**:
   - Created `GynecologyExam` component with comprehensive obstetric/gynecological examination.
   - Schema: `gynecologyExam: Json?` in Appointment model (stores GynecologyExamData)
   - Features:
     - **Menstrual History Tab**: LMP date, cycle length (days), cycle duration, regularity, flow volume, dysmenorrhea severity, notes
     - **Obstetric History Tab (GTPAL)**: Structured GTPAL fields (Gravida/Term/Preterm/Abortions/Living), auto-calculated EDD from LMP (Naegele's Rule), gestational age display (weeks+days), GTPAL summary visualization, previous pregnancy notes
     - **Antenatal Record Tab**: Fundal height (cm), fetal heart rate (bpm), presentation (cephalic/breech/transverse/oblique), engagement level (0/5-5/5), liquor volume assessment, placental location, fetal movements, cervical dilation/effacement for labor assessment
     - **Assessment Tab**: Clinical assessment and management plan
     - Auto-calculation features: EDD from LMP, current gestational age
     - Reference ranges and normal values provided throughout
   - Database: Migrated (20260107173211_add_gynecology_exam_field)
   - UI: Conditional tab ("Obstetric Exam") for GYNECOLOGY clinic type
6.  **Dermatology Module**:
   - Created `DermatologyExam` component with comprehensive skin and lesion documentation.
   - Schema: `dermatologyExam: Json?` in Appointment model (stores DermatologyExamData)
   - Features:
     - **Skin Assessment Tab**: Fitzpatrick skin type classification (I-VI for sun sensitivity and treatment planning), skin type (normal/dry/oily/combination/sensitive), general skin condition documentation
     - **Lesion Documentation Tab**: Multi-lesion tracking with detailed characteristics - location (free text + body region), size (mm), shape (round/oval/irregular/linear/annular), color, border (well-defined/ill-defined/irregular/raised), surface (smooth/rough/scaly/crusted/ulcerated/vesicular), elevation (flat/raised/depressed), consistency (soft/firm/hard/fluctuant), tenderness, detailed description, provisional diagnosis, treatment plan, follow-up schedule
     - **Body Map Tab**: Visual representation of lesion locations with body region categorization (Head & Neck, Chest, Back, Abdomen, Upper Limb, Lower Limb, Genitalia) - placeholder for future interactive body diagram
     - **Assessment Tab**: Overall dermatological assessment and management plan
     - ABCDE criteria support for melanoma screening
     - Add/remove lesions dynamically with unique IDs
   - Database: Migrated (20260107174401_add_dermatology_exam_field)
   - UI: Conditional tab ("Skin Exam") for DERMATOLOGY clinic type
7.  **Psychiatry Module**:
   - Created `PsychiatryExam` component with comprehensive mental status examination.
   - Schema: `psychiatryExam: Json?` in Appointment model (stores PsychiatryExamData)
   - Features:
     - **Mental Status Exam Tab**: Comprehensive 9-domain MSE - Appearance (grooming, dress, hygiene), Behavior (cooperation, psychomotor activity), Speech (rate, volume, quality), Mood & Affect (subjective mood, objective affect, range, congruence), Thought Process & Content (linear/tangential/loose, delusions, obsessions), Perception (hallucinations with type/description, illusions, depersonalization), Cognition (consciousness, orientation, attention, memory immediate/recent/remote), Insight & Judgment (awareness, decision-making)
     - **Risk Assessment Tab**: Structured suicide risk evaluation (thoughts/plan/intent/means/previous attempts, protective factors, overall risk: low/moderate/high/imminent), Homicide risk assessment (thoughts/plan/intent/means/identified target, duty to warn considerations), Risk management interventions and safety planning (crisis contacts, 988 hotline)
     - **Screening Scales Tab**: PHQ-9 (Depression 0-27 with severity levels), GAD-7 (Anxiety 0-21 with severity), YMRS (Mania 0-60 optional), Other scales documentation (CAGE, AUDIT, PCL-5, MMSE, MoCA)
     - **Assessment Tab**: Psychiatric assessment and formulation (diagnostic impression, differential diagnoses, biopsychosocial formulation), Treatment plan (medication management, psychotherapy modality, follow-up frequency)
     - Alert banners for critical risk assessment importance
     - Badge components for risk level visualization
   - Database: Migrated (20260107175817_add_psychiatry_exam_field)
   - UI: Conditional tab ("Mental Status") for PSYCHIATRY clinic type

### Phase 3: Enhanced Features

- Dermatology: Body map with lesion annotation
- Psychiatry: Structured MSE form with risk assessment
- Gynecology: LMP/EDD calculator widget
- Orthopedic: ROM measurement tools
- ENT: Audiogram plotting

---

## 5. Technical Notes

**Data Storage Strategy:**

- All specialty data stored in `clinicalNote.specialtyData` JSONB field in PostgreSQL.
- Type-safe access via discriminated unions in TypeScript.
- Backward compatibility maintained - existing notes unaffected.

**UI Component Architecture:**

- Specialty components conditionally rendered based on `clinicType` feature flags.
- Shared design system (shadcn/ui) for consistency.
- Progressive enhancement - specialty features optional, core features always available.
