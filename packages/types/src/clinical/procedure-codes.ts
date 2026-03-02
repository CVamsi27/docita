

export interface ProcedureCode {
  code: string;
  description: string;
  category: string;
  specialty?: string;
}

export const CDT_CODES: Record<string, ProcedureCode> = {

  D0120: {
    code: "D0120",
    description: "Periodic oral evaluation - established patient",
    category: "Diagnostic",
    specialty: "DENTAL",
  },
  D0140: {
    code: "D0140",
    description: "Limited oral evaluation - problem focused",
    category: "Diagnostic",
    specialty: "DENTAL",
  },
  D0150: {
    code: "D0150",
    description: "Comprehensive oral evaluation - new or established patient",
    category: "Diagnostic",
    specialty: "DENTAL",
  },
  D0180: {
    code: "D0180",
    description:
      "Comprehensive periodontal evaluation - new or established patient",
    category: "Diagnostic",
    specialty: "DENTAL",
  },

  D0210: {
    code: "D0210",
    description: "Intraoral - complete series of radiographic images",
    category: "Diagnostic - Radiographs",
    specialty: "DENTAL",
  },
  D0220: {
    code: "D0220",
    description: "Intraoral - periapical first radiographic image",
    category: "Diagnostic - Radiographs",
    specialty: "DENTAL",
  },
  D0230: {
    code: "D0230",
    description: "Intraoral - periapical each additional radiographic image",
    category: "Diagnostic - Radiographs",
    specialty: "DENTAL",
  },
  D0270: {
    code: "D0270",
    description: "Bitewing - single radiographic image",
    category: "Diagnostic - Radiographs",
    specialty: "DENTAL",
  },
  D0272: {
    code: "D0272",
    description: "Bitewings - two radiographic images",
    category: "Diagnostic - Radiographs",
    specialty: "DENTAL",
  },
  D0274: {
    code: "D0274",
    description: "Bitewings - four radiographic images",
    category: "Diagnostic - Radiographs",
    specialty: "DENTAL",
  },
  D0330: {
    code: "D0330",
    description: "Panoramic radiographic image",
    category: "Diagnostic - Radiographs",
    specialty: "DENTAL",
  },
  D0367: {
    code: "D0367",
    description: "Cone beam CT capture and interpretation - maxillofacial area",
    category: "Diagnostic - Radiographs",
    specialty: "DENTAL",
  },

  D1110: {
    code: "D1110",
    description: "Prophylaxis - adult",
    category: "Preventive",
    specialty: "DENTAL",
  },
  D1120: {
    code: "D1120",
    description: "Prophylaxis - child",
    category: "Preventive",
    specialty: "DENTAL",
  },
  D1206: {
    code: "D1206",
    description: "Topical application of fluoride varnish",
    category: "Preventive",
    specialty: "DENTAL",
  },
  D1208: {
    code: "D1208",
    description: "Topical application of fluoride - excluding varnish",
    category: "Preventive",
    specialty: "DENTAL",
  },
  D1351: {
    code: "D1351",
    description: "Sealant - per tooth",
    category: "Preventive",
    specialty: "DENTAL",
  },

  D2140: {
    code: "D2140",
    description: "Amalgam - one surface, primary or permanent",
    category: "Restorative - Amalgam",
    specialty: "DENTAL",
  },
  D2150: {
    code: "D2150",
    description: "Amalgam - two surfaces, primary or permanent",
    category: "Restorative - Amalgam",
    specialty: "DENTAL",
  },
  D2160: {
    code: "D2160",
    description: "Amalgam - three surfaces, primary or permanent",
    category: "Restorative - Amalgam",
    specialty: "DENTAL",
  },
  D2161: {
    code: "D2161",
    description: "Amalgam - four or more surfaces, primary or permanent",
    category: "Restorative - Amalgam",
    specialty: "DENTAL",
  },

  D2330: {
    code: "D2330",
    description: "Resin-based composite - one surface, anterior",
    category: "Restorative - Composite",
    specialty: "DENTAL",
  },
  D2331: {
    code: "D2331",
    description: "Resin-based composite - two surfaces, anterior",
    category: "Restorative - Composite",
    specialty: "DENTAL",
  },
  D2332: {
    code: "D2332",
    description: "Resin-based composite - three surfaces, anterior",
    category: "Restorative - Composite",
    specialty: "DENTAL",
  },
  D2335: {
    code: "D2335",
    description:
      "Resin-based composite - four or more surfaces or involving incisal angle",
    category: "Restorative - Composite",
    specialty: "DENTAL",
  },
  D2391: {
    code: "D2391",
    description: "Resin-based composite - one surface, posterior",
    category: "Restorative - Composite",
    specialty: "DENTAL",
  },
  D2392: {
    code: "D2392",
    description: "Resin-based composite - two surfaces, posterior",
    category: "Restorative - Composite",
    specialty: "DENTAL",
  },
  D2393: {
    code: "D2393",
    description: "Resin-based composite - three surfaces, posterior",
    category: "Restorative - Composite",
    specialty: "DENTAL",
  },
  D2394: {
    code: "D2394",
    description: "Resin-based composite - four or more surfaces, posterior",
    category: "Restorative - Composite",
    specialty: "DENTAL",
  },

  D3310: {
    code: "D3310",
    description:
      "Endodontic therapy, anterior tooth (excluding final restoration)",
    category: "Endodontics",
    specialty: "DENTAL",
  },
  D3320: {
    code: "D3320",
    description:
      "Endodontic therapy, premolar tooth (excluding final restoration)",
    category: "Endodontics",
    specialty: "DENTAL",
  },
  D3330: {
    code: "D3330",
    description:
      "Endodontic therapy, molar tooth (excluding final restoration)",
    category: "Endodontics",
    specialty: "DENTAL",
  },

  D4210: {
    code: "D4210",
    description:
      "Gingivectomy or gingivoplasty - four or more contiguous teeth",
    category: "Periodontics",
    specialty: "DENTAL",
  },
  D4341: {
    code: "D4341",
    description:
      "Periodontal scaling and root planing - four or more teeth per quadrant",
    category: "Periodontics",
    specialty: "DENTAL",
  },
  D4342: {
    code: "D4342",
    description:
      "Periodontal scaling and root planing - one to three teeth per quadrant",
    category: "Periodontics",
    specialty: "DENTAL",
  },

  D2740: {
    code: "D2740",
    description: "Crown - porcelain/ceramic substrate",
    category: "Prosthodontics - Crowns",
    specialty: "DENTAL",
  },
  D2750: {
    code: "D2750",
    description: "Crown - porcelain fused to high noble metal",
    category: "Prosthodontics - Crowns",
    specialty: "DENTAL",
  },
  D2751: {
    code: "D2751",
    description: "Crown - porcelain fused to predominantly base metal",
    category: "Prosthodontics - Crowns",
    specialty: "DENTAL",
  },
  D2752: {
    code: "D2752",
    description: "Crown - porcelain fused to noble metal",
    category: "Prosthodontics - Crowns",
    specialty: "DENTAL",
  },
  D2780: {
    code: "D2780",
    description: "Crown - 3/4 cast metallic",
    category: "Prosthodontics - Crowns",
    specialty: "DENTAL",
  },
  D2790: {
    code: "D2790",
    description: "Crown - full cast metallic",
    category: "Prosthodontics - Crowns",
    specialty: "DENTAL",
  },
  D2791: {
    code: "D2791",
    description: "Crown - full cast noble metal",
    category: "Prosthodontics - Crowns",
    specialty: "DENTAL",
  },
  D2792: {
    code: "D2792",
    description: "Crown - full cast high noble metal",
    category: "Prosthodontics - Crowns",
    specialty: "DENTAL",
  },

  D6010: {
    code: "D6010",
    description: "Surgical placement of implant body: endosteal implant",
    category: "Prosthodontics - Implants",
    specialty: "DENTAL",
  },
  D6056: {
    code: "D6056",
    description: "Prefabricated abutment - includes placement",
    category: "Prosthodontics - Implants",
    specialty: "DENTAL",
  },
  D6058: {
    code: "D6058",
    description: "Abutment supported porcelain/ceramic crown",
    category: "Prosthodontics - Implants",
    specialty: "DENTAL",
  },
  D6059: {
    code: "D6059",
    description: "Abutment supported porcelain fused to metal crown",
    category: "Prosthodontics - Implants",
    specialty: "DENTAL",
  },
  D6060: {
    code: "D6060",
    description: "Abutment supported cast metal crown",
    category: "Prosthodontics - Implants",
    specialty: "DENTAL",
  },

  D7111: {
    code: "D7111",
    description: "Extraction, coronal remnants - primary tooth",
    category: "Oral Surgery",
    specialty: "DENTAL",
  },
  D7140: {
    code: "D7140",
    description: "Extraction, erupted tooth or exposed root",
    category: "Oral Surgery",
    specialty: "DENTAL",
  },
  D7210: {
    code: "D7210",
    description:
      "Extraction, erupted tooth requiring removal of bone and/or sectioning",
    category: "Oral Surgery",
    specialty: "DENTAL",
  },
  D7220: {
    code: "D7220",
    description: "Removal of impacted tooth - soft tissue",
    category: "Oral Surgery",
    specialty: "DENTAL",
  },
  D7230: {
    code: "D7230",
    description: "Removal of impacted tooth - partially bony",
    category: "Oral Surgery",
    specialty: "DENTAL",
  },
  D7240: {
    code: "D7240",
    description: "Removal of impacted tooth - completely bony",
    category: "Oral Surgery",
    specialty: "DENTAL",
  },
  D7241: {
    code: "D7241",
    description:
      "Removal of impacted tooth - completely bony, with unusual surgical complications",
    category: "Oral Surgery",
    specialty: "DENTAL",
  },
  D7250: {
    code: "D7250",
    description: "Removal of residual tooth roots (cutting procedure)",
    category: "Oral Surgery",
    specialty: "DENTAL",
  },
};

export const CPT_CODES: Record<string, ProcedureCode> = {

  99201: {
    code: "99201",
    description: "Office/Outpatient Visit - New Patient, 10 min",
    category: "Evaluation & Management",
  },
  99202: {
    code: "99202",
    description: "Office/Outpatient Visit - New Patient, 20 min",
    category: "Evaluation & Management",
  },
  99203: {
    code: "99203",
    description: "Office/Outpatient Visit - New Patient, 30 min",
    category: "Evaluation & Management",
  },
  99204: {
    code: "99204",
    description: "Office/Outpatient Visit - New Patient, 45 min",
    category: "Evaluation & Management",
  },
  99205: {
    code: "99205",
    description: "Office/Outpatient Visit - New Patient, 60 min",
    category: "Evaluation & Management",
  },

  99211: {
    code: "99211",
    description: "Office/Outpatient Visit - Established Patient, 5 min",
    category: "Evaluation & Management",
  },
  99212: {
    code: "99212",
    description: "Office/Outpatient Visit - Established Patient, 10 min",
    category: "Evaluation & Management",
  },
  99213: {
    code: "99213",
    description: "Office/Outpatient Visit - Established Patient, 15 min",
    category: "Evaluation & Management",
  },
  99214: {
    code: "99214",
    description: "Office/Outpatient Visit - Established Patient, 25 min",
    category: "Evaluation & Management",
  },
  99215: {
    code: "99215",
    description: "Office/Outpatient Visit - Established Patient, 40 min",
    category: "Evaluation & Management",
  },

  99221: {
    code: "99221",
    description: "Initial Hospital Care - Low Complexity",
    category: "Hospital Care",
  },
  99222: {
    code: "99222",
    description: "Initial Hospital Care - Moderate Complexity",
    category: "Hospital Care",
  },
  99223: {
    code: "99223",
    description: "Initial Hospital Care - High Complexity",
    category: "Hospital Care",
  },
  99231: {
    code: "99231",
    description: "Subsequent Hospital Care - Low Complexity",
    category: "Hospital Care",
  },
  99232: {
    code: "99232",
    description: "Subsequent Hospital Care - Moderate Complexity",
    category: "Hospital Care",
  },
  99233: {
    code: "99233",
    description: "Subsequent Hospital Care - High Complexity",
    category: "Hospital Care",
  },

  99281: {
    code: "99281",
    description: "Emergency Department Visit - Self-limited/minor",
    category: "Emergency Department",
  },
  99282: {
    code: "99282",
    description: "Emergency Department Visit - Low to moderate severity",
    category: "Emergency Department",
  },
  99283: {
    code: "99283",
    description: "Emergency Department Visit - Moderate severity",
    category: "Emergency Department",
  },
  99284: {
    code: "99284",
    description: "Emergency Department Visit - High severity",
    category: "Emergency Department",
  },
  99285: {
    code: "99285",
    description:
      "Emergency Department Visit - High severity with threat to life",
    category: "Emergency Department",
  },

  99381: {
    code: "99381",
    description:
      "Initial Comprehensive Preventive Medicine - Infant (under 1 year)",
    category: "Preventive Medicine",
  },
  99382: {
    code: "99382",
    description:
      "Initial Comprehensive Preventive Medicine - Child (1-4 years)",
    category: "Preventive Medicine",
  },
  99383: {
    code: "99383",
    description:
      "Initial Comprehensive Preventive Medicine - Child (5-11 years)",
    category: "Preventive Medicine",
  },
  99384: {
    code: "99384",
    description:
      "Initial Comprehensive Preventive Medicine - Adolescent (12-17 years)",
    category: "Preventive Medicine",
  },
  99385: {
    code: "99385",
    description:
      "Initial Comprehensive Preventive Medicine - Adult (18-39 years)",
    category: "Preventive Medicine",
  },
  99386: {
    code: "99386",
    description:
      "Initial Comprehensive Preventive Medicine - Adult (40-64 years)",
    category: "Preventive Medicine",
  },
  99387: {
    code: "99387",
    description:
      "Initial Comprehensive Preventive Medicine - Adult (65+ years)",
    category: "Preventive Medicine",
  },
  99391: {
    code: "99391",
    description:
      "Periodic Comprehensive Preventive Medicine - Infant (under 1 year)",
    category: "Preventive Medicine",
  },
  99392: {
    code: "99392",
    description:
      "Periodic Comprehensive Preventive Medicine - Child (1-4 years)",
    category: "Preventive Medicine",
  },
  99393: {
    code: "99393",
    description:
      "Periodic Comprehensive Preventive Medicine - Child (5-11 years)",
    category: "Preventive Medicine",
  },
  99394: {
    code: "99394",
    description:
      "Periodic Comprehensive Preventive Medicine - Adolescent (12-17 years)",
    category: "Preventive Medicine",
  },
  99395: {
    code: "99395",
    description:
      "Periodic Comprehensive Preventive Medicine - Adult (18-39 years)",
    category: "Preventive Medicine",
  },
  99396: {
    code: "99396",
    description:
      "Periodic Comprehensive Preventive Medicine - Adult (40-64 years)",
    category: "Preventive Medicine",
  },
  99397: {
    code: "99397",
    description:
      "Periodic Comprehensive Preventive Medicine - Adult (65+ years)",
    category: "Preventive Medicine",
  },

  29580: {
    code: "29580",
    description: "Strapping; Unna boot",
    category: "Procedures",
  },
  36415: {
    code: "36415",
    description: "Collection of venous blood by venipuncture",
    category: "Procedures",
  },
  90471: {
    code: "90471",
    description: "Immunization administration (first vaccine/toxoid)",
    category: "Procedures - Immunization",
  },
  90472: {
    code: "90472",
    description: "Immunization administration (each additional vaccine/toxoid)",
    category: "Procedures - Immunization",
  },
  93000: {
    code: "93000",
    description:
      "Electrocardiogram, routine ECG with at least 12 leads; with interpretation and report",
    category: "Procedures - Diagnostic",
  },
  71045: {
    code: "71045",
    description: "Radiologic examination, chest; single view",
    category: "Procedures - Radiology",
  },
  71046: {
    code: "71046",
    description: "Radiologic examination, chest; 2 views",
    category: "Procedures - Radiology",
  },
  80053: {
    code: "80053",
    description: "Comprehensive metabolic panel",
    category: "Laboratory",
  },
};

export function getAllCDTCodes(): ProcedureCode[] {
  return Object.values(CDT_CODES);
}

export function getAllCPTCodes(): ProcedureCode[] {
  return Object.values(CPT_CODES);
}

export function getAllProcedureCodes(): ProcedureCode[] {
  return [...getAllCDTCodes(), ...getAllCPTCodes()];
}

export function getCDTCodesByCategory(category: string): ProcedureCode[] {
  return getAllCDTCodes().filter((code) => code.category === category);
}

export function getCPTCodesByCategory(category: string): ProcedureCode[] {
  return getAllCPTCodes().filter((code) => code.category === category);
}

export function searchProcedureCodes(query: string): ProcedureCode[] {
  const lowerQuery = query.toLowerCase();
  return getAllProcedureCodes().filter(
    (code) =>
      code.code.toLowerCase().includes(lowerQuery) ||
      code.description.toLowerCase().includes(lowerQuery),
  );
}

export function getCDTCategories(): string[] {
  const categories = new Set(getAllCDTCodes().map((code) => code.category));
  return Array.from(categories).sort();
}

export function getCPTCategories(): string[] {
  const categories = new Set(getAllCPTCodes().map((code) => code.category));
  return Array.from(categories).sort();
}
