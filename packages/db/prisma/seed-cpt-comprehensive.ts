import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Comprehensive CPT codes organized by category
const cptCodes = [
  // ============================================================================
  // EVALUATION AND MANAGEMENT (99xxx)
  // ============================================================================

  // Office Visits - New Patient
  {
    code: "99201",
    description: "Office/outpatient visit new patient (problem focused)",
    category: "Evaluation and Management",
    isCommon: true,
  },
  {
    code: "99202",
    description: "Office/outpatient visit new patient (15-29 mins)",
    category: "Evaluation and Management",
    isCommon: true,
  },
  {
    code: "99203",
    description: "Office/outpatient visit new patient (30-44 mins)",
    category: "Evaluation and Management",
    isCommon: true,
  },
  {
    code: "99204",
    description: "Office/outpatient visit new patient (45-59 mins)",
    category: "Evaluation and Management",
    isCommon: true,
  },
  {
    code: "99205",
    description: "Office/outpatient visit new patient (60-74 mins)",
    category: "Evaluation and Management",
    isCommon: true,
  },

  // Office Visits - Established Patient
  {
    code: "99211",
    description: "Office/outpatient visit established (minimal)",
    category: "Evaluation and Management",
    isCommon: true,
  },
  {
    code: "99212",
    description: "Office/outpatient visit established (10-19 mins)",
    category: "Evaluation and Management",
    isCommon: true,
  },
  {
    code: "99213",
    description: "Office/outpatient visit established (20-29 mins)",
    category: "Evaluation and Management",
    isCommon: true,
  },
  {
    code: "99214",
    description: "Office/outpatient visit established (30-39 mins)",
    category: "Evaluation and Management",
    isCommon: true,
  },
  {
    code: "99215",
    description: "Office/outpatient visit established (40-54 mins)",
    category: "Evaluation and Management",
    isCommon: true,
  },

  // Emergency Department Visits
  {
    code: "99281",
    description: "Emergency department visit (straightforward)",
    category: "Evaluation and Management",
    isCommon: false,
  },
  {
    code: "99282",
    description: "Emergency department visit (low complexity)",
    category: "Evaluation and Management",
    isCommon: false,
  },
  {
    code: "99283",
    description: "Emergency department visit (moderate complexity)",
    category: "Evaluation and Management",
    isCommon: false,
  },
  {
    code: "99284",
    description: "Emergency department visit (high complexity)",
    category: "Evaluation and Management",
    isCommon: false,
  },
  {
    code: "99285",
    description: "Emergency department visit (high severity)",
    category: "Evaluation and Management",
    isCommon: false,
  },

  // Initial Hospital Care
  {
    code: "99221",
    description: "Initial hospital care (low severity)",
    category: "Evaluation and Management",
    isCommon: false,
  },
  {
    code: "99222",
    description: "Initial hospital care (moderate severity)",
    category: "Evaluation and Management",
    isCommon: false,
  },
  {
    code: "99223",
    description: "Initial hospital care (high severity)",
    category: "Evaluation and Management",
    isCommon: false,
  },

  // Subsequent Hospital Care
  {
    code: "99231",
    description: "Subsequent hospital care (stable)",
    category: "Evaluation and Management",
    isCommon: false,
  },
  {
    code: "99232",
    description: "Subsequent hospital care (moderate complexity)",
    category: "Evaluation and Management",
    isCommon: false,
  },
  {
    code: "99233",
    description: "Subsequent hospital care (high complexity)",
    category: "Evaluation and Management",
    isCommon: false,
  },

  // Consultation Services
  {
    code: "99241",
    description: "Office consultation (straightforward)",
    category: "Evaluation and Management",
    isCommon: false,
  },
  {
    code: "99242",
    description: "Office consultation (low complexity)",
    category: "Evaluation and Management",
    isCommon: false,
  },
  {
    code: "99243",
    description: "Office consultation (moderate complexity)",
    category: "Evaluation and Management",
    isCommon: false,
  },
  {
    code: "99244",
    description: "Office consultation (moderate to high complexity)",
    category: "Evaluation and Management",
    isCommon: false,
  },
  {
    code: "99245",
    description: "Office consultation (high complexity)",
    category: "Evaluation and Management",
    isCommon: false,
  },

  // ============================================================================
  // PREVENTIVE MEDICINE (99xxx)
  // ============================================================================

  // Preventive - New Patient
  {
    code: "99381",
    description: "Preventive visit new patient (infant, under 1 year)",
    category: "Preventive Medicine",
    isCommon: true,
  },
  {
    code: "99382",
    description: "Preventive visit new patient (1-4 years)",
    category: "Preventive Medicine",
    isCommon: true,
  },
  {
    code: "99383",
    description: "Preventive visit new patient (5-11 years)",
    category: "Preventive Medicine",
    isCommon: true,
  },
  {
    code: "99384",
    description: "Preventive visit new patient (12-17 years)",
    category: "Preventive Medicine",
    isCommon: true,
  },
  {
    code: "99385",
    description: "Preventive visit new patient (18-39 years)",
    category: "Preventive Medicine",
    isCommon: true,
  },
  {
    code: "99386",
    description: "Preventive visit new patient (40-64 years)",
    category: "Preventive Medicine",
    isCommon: true,
  },
  {
    code: "99387",
    description: "Preventive visit new patient (65+ years)",
    category: "Preventive Medicine",
    isCommon: true,
  },

  // Preventive - Established Patient
  {
    code: "99391",
    description: "Preventive visit established (infant, under 1 year)",
    category: "Preventive Medicine",
    isCommon: true,
  },
  {
    code: "99392",
    description: "Preventive visit established (1-4 years)",
    category: "Preventive Medicine",
    isCommon: true,
  },
  {
    code: "99393",
    description: "Preventive visit established (5-11 years)",
    category: "Preventive Medicine",
    isCommon: true,
  },
  {
    code: "99394",
    description: "Preventive visit established (12-17 years)",
    category: "Preventive Medicine",
    isCommon: true,
  },
  {
    code: "99395",
    description: "Preventive visit established (18-39 years)",
    category: "Preventive Medicine",
    isCommon: true,
  },
  {
    code: "99396",
    description: "Preventive visit established (40-64 years)",
    category: "Preventive Medicine",
    isCommon: true,
  },
  {
    code: "99397",
    description: "Preventive visit established (65+ years)",
    category: "Preventive Medicine",
    isCommon: true,
  },

  // ============================================================================
  // CARDIOVASCULAR (93xxx)
  // ============================================================================

  {
    code: "93000",
    description: "Electrocardiogram (ECG/EKG), routine with interpretation",
    category: "Cardiovascular",
    isCommon: true,
  },
  {
    code: "93005",
    description: "Electrocardiogram, tracing only",
    category: "Cardiovascular",
    isCommon: false,
  },
  {
    code: "93010",
    description: "Electrocardiogram, interpretation and report only",
    category: "Cardiovascular",
    isCommon: false,
  },
  {
    code: "93015",
    description: "Cardiovascular stress test",
    category: "Cardiovascular",
    isCommon: true,
  },
  {
    code: "93306",
    description: "Echocardiography, complete",
    category: "Cardiovascular",
    isCommon: true,
  },
  {
    code: "93350",
    description: "Echocardiography, stress test",
    category: "Cardiovascular",
    isCommon: false,
  },

  // ============================================================================
  // IMMUNIZATIONS (90xxx)
  // ============================================================================

  {
    code: "90471",
    description: "Immunization administration, 1 vaccine",
    category: "Immunizations",
    isCommon: true,
  },
  {
    code: "90472",
    description: "Immunization administration, each additional vaccine",
    category: "Immunizations",
    isCommon: true,
  },
  {
    code: "90658",
    description: "Influenza virus vaccine (injectable)",
    category: "Immunizations",
    isCommon: true,
  },
  {
    code: "90670",
    description: "Pneumococcal conjugate vaccine (PCV13)",
    category: "Immunizations",
    isCommon: true,
  },
  {
    code: "90680",
    description: "Rotavirus vaccine, 3 dose schedule",
    category: "Immunizations",
    isCommon: false,
  },
  {
    code: "90686",
    description: "Influenza virus vaccine (quadrivalent)",
    category: "Immunizations",
    isCommon: true,
  },
  {
    code: "90707",
    description: "Measles, mumps and rubella (MMR) vaccine",
    category: "Immunizations",
    isCommon: true,
  },
  {
    code: "90715",
    description: "Tetanus, diphtheria, pertussis (Tdap) vaccine",
    category: "Immunizations",
    isCommon: true,
  },
  {
    code: "90732",
    description: "Pneumococcal polysaccharide vaccine (PPSV23)",
    category: "Immunizations",
    isCommon: true,
  },
  {
    code: "90739",
    description: "Hepatitis B vaccine, adult dosage",
    category: "Immunizations",
    isCommon: true,
  },
  {
    code: "90746",
    description: "Hepatitis B vaccine, adult dosage, 3 dose schedule",
    category: "Immunizations",
    isCommon: true,
  },
  {
    code: "90750",
    description: "Zoster (shingles) vaccine (live)",
    category: "Immunizations",
    isCommon: true,
  },

  // ============================================================================
  // LABORATORY (8xxxx)
  // ============================================================================

  {
    code: "80053",
    description: "Comprehensive metabolic panel",
    category: "Pathology and Laboratory",
    isCommon: true,
  },
  {
    code: "80061",
    description: "Lipid panel",
    category: "Pathology and Laboratory",
    isCommon: true,
  },
  {
    code: "81000",
    description: "Urinalysis, by dip stick or tablet",
    category: "Pathology and Laboratory",
    isCommon: true,
  },
  {
    code: "81001",
    description: "Urinalysis, automated with microscopy",
    category: "Pathology and Laboratory",
    isCommon: true,
  },
  {
    code: "81003",
    description: "Urinalysis, automated without microscopy",
    category: "Pathology and Laboratory",
    isCommon: false,
  },
  {
    code: "82947",
    description: "Glucose, blood, quantitative",
    category: "Pathology and Laboratory",
    isCommon: true,
  },
  {
    code: "82962",
    description: "Glucose, blood by monitoring device",
    category: "Pathology and Laboratory",
    isCommon: true,
  },
  {
    code: "83036",
    description: "Hemoglobin A1c",
    category: "Pathology and Laboratory",
    isCommon: true,
  },
  {
    code: "84443",
    description: "Thyroid stimulating hormone (TSH)",
    category: "Pathology and Laboratory",
    isCommon: true,
  },
  {
    code: "85025",
    description: "Blood count, complete (CBC) with automated differential",
    category: "Pathology and Laboratory",
    isCommon: true,
  },
  {
    code: "85027",
    description: "Blood count, complete (CBC)",
    category: "Pathology and Laboratory",
    isCommon: true,
  },
  {
    code: "85610",
    description: "Prothrombin time (PT)",
    category: "Pathology and Laboratory",
    isCommon: false,
  },
  {
    code: "86580",
    description: "Tuberculosis (TB) skin test",
    category: "Pathology and Laboratory",
    isCommon: true,
  },
  {
    code: "87070",
    description: "Culture, bacterial, any source",
    category: "Pathology and Laboratory",
    isCommon: false,
  },
  {
    code: "87086",
    description: "Culture, bacterial, urine",
    category: "Pathology and Laboratory",
    isCommon: true,
  },
  {
    code: "87804",
    description: "Influenza virus, immunoassay, rapid",
    category: "Pathology and Laboratory",
    isCommon: true,
  },

  // ============================================================================
  // RADIOLOGY (7xxxx)
  // ============================================================================

  {
    code: "71045",
    description: "Radiologic examination, chest, single view",
    category: "Radiology",
    isCommon: true,
  },
  {
    code: "71046",
    description: "Radiologic examination, chest, 2 views",
    category: "Radiology",
    isCommon: true,
  },
  {
    code: "71047",
    description: "Radiologic examination, chest, 3 views",
    category: "Radiology",
    isCommon: false,
  },
  {
    code: "71048",
    description: "Radiologic examination, chest, 4+ views",
    category: "Radiology",
    isCommon: false,
  },
  {
    code: "72040",
    description: "Radiologic examination, spine, cervical, 2-3 views",
    category: "Radiology",
    isCommon: false,
  },
  {
    code: "72100",
    description: "Radiologic examination, spine, thoracic, 2 views",
    category: "Radiology",
    isCommon: false,
  },
  {
    code: "73000",
    description: "Radiologic examination, clavicle, complete",
    category: "Radiology",
    isCommon: false,
  },
  {
    code: "73030",
    description: "Radiologic examination, shoulder, complete",
    category: "Radiology",
    isCommon: false,
  },
  {
    code: "73060",
    description: "Radiologic examination, humerus, minimum 2 views",
    category: "Radiology",
    isCommon: false,
  },
  {
    code: "73130",
    description: "Radiologic examination, hand, minimum 3 views",
    category: "Radiology",
    isCommon: false,
  },
  {
    code: "76700",
    description: "Ultrasound, abdominal, complete",
    category: "Radiology",
    isCommon: true,
  },
  {
    code: "76805",
    description: "Ultrasound, obstetric, complete",
    category: "Radiology",
    isCommon: true,
  },

  // ============================================================================
  // SURGERY - MINOR PROCEDURES (1xxxx)
  // ============================================================================

  {
    code: "10060",
    description: "Incision and drainage of abscess, simple",
    category: "Surgery",
    isCommon: true,
  },
  {
    code: "10061",
    description: "Incision and drainage of abscess, complicated",
    category: "Surgery",
    isCommon: false,
  },
  {
    code: "11042",
    description: "Debridement, subcutaneous tissue",
    category: "Surgery",
    isCommon: false,
  },
  {
    code: "11055",
    description: "Paring or cutting of benign hyperkeratotic lesion",
    category: "Surgery",
    isCommon: false,
  },
  {
    code: "11200",
    description: "Removal of skin tags, multiple, up to 15",
    category: "Surgery",
    isCommon: true,
  },
  {
    code: "11400",
    description: "Excision, benign lesion, trunk/arms/legs, 0.5 cm or less",
    category: "Surgery",
    isCommon: false,
  },
  {
    code: "12001",
    description: "Simple repair of superficial wounds, 2.5 cm or less",
    category: "Surgery",
    isCommon: true,
  },
  {
    code: "12002",
    description: "Simple repair of superficial wounds, 2.6 to 7.5 cm",
    category: "Surgery",
    isCommon: true,
  },

  // ============================================================================
  // VENIPUNCTURE AND INJECTIONS (36xxx)
  // ============================================================================

  {
    code: "36415",
    description: "Collection of venous blood by venipuncture",
    category: "Surgery",
    isCommon: true,
  },
  {
    code: "36416",
    description:
      "Collection of capillary blood specimen (finger/heel/ear stick)",
    category: "Surgery",
    isCommon: true,
  },
  {
    code: "96372",
    description:
      "Therapeutic/diagnostic injection, subcutaneous or intramuscular",
    category: "Medicine",
    isCommon: true,
  },
  {
    code: "96374",
    description: "Therapeutic/diagnostic injection, intravenous push",
    category: "Medicine",
    isCommon: false,
  },

  // ============================================================================
  // NEBULIZER TREATMENTS (94xxx)
  // ============================================================================

  {
    code: "94640",
    description:
      "Pressurized or nonpressurized inhalation treatment for airway obstruction",
    category: "Medicine",
    isCommon: true,
  },
  {
    code: "94664",
    description:
      "Demonstration and/or evaluation of patient utilization of aerosol generator",
    category: "Medicine",
    isCommon: false,
  },

  // ============================================================================
  // PHYSICAL THERAPY (97xxx)
  // ============================================================================

  {
    code: "97110",
    description: "Therapeutic exercises",
    category: "Physical Therapy",
    isCommon: true,
  },
  {
    code: "97140",
    description: "Manual therapy techniques, 1 or more regions",
    category: "Physical Therapy",
    isCommon: true,
  },
];

async function main() {
  console.log("🏥 Start seeding comprehensive CPT codes...");
  console.log(`📊 Total codes to seed: ${cptCodes.length}`);

  let created = 0;
  let updated = 0;

  for (const cpt of cptCodes) {
    const existingCode = await prisma.cptCode.findUnique({
      where: { code: cpt.code },
    });

    await prisma.cptCode.upsert({
      where: { code: cpt.code },
      update: {
        description: cpt.description,
        category: cpt.category,
        isCommon: cpt.isCommon,
      },
      create: {
        code: cpt.code,
        description: cpt.description,
        category: cpt.category,
        isCommon: cpt.isCommon,
      },
    });

    if (existingCode) {
      updated++;
    } else {
      created++;
    }
  }

  console.log(`✅ Seeding finished!`);
  console.log(`   • Created: ${created} codes`);
  console.log(`   • Updated: ${updated} codes`);
  console.log(`   • Total: ${cptCodes.length} codes`);
  console.log(
    `   • Common codes: ${cptCodes.filter((c) => c.isCommon).length}`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Error seeding CPT codes:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
