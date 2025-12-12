import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Comprehensive ICD-10 codes from WHO ICD-10 classification
// Reference: https://icd.who.int/browse10/2019/en
const commonIcdCodes = [
  // A00-B99: Certain infectious and parasitic diseases
  {
    code: "A00",
    description: "Cholera",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "A09",
    description: "Infectious gastroenteritis and colitis, unspecified",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "A15.0",
    description: "Tuberculosis of lung",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "A41.9",
    description: "Sepsis, unspecified organism",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "A69.2",
    description: "Lyme disease",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "B00.9",
    description: "Herpesviral infection, unspecified",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "B01.9",
    description: "Varicella without complication",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "B02.9",
    description: "Zoster without complication",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "B15.9",
    description: "Hepatitis A without hepatic coma",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "B16.9",
    description: "Acute hepatitis B without delta-agent and without hepatic coma",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "B17.1",
    description: "Acute hepatitis C",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "B18.1",
    description: "Chronic viral hepatitis B without delta-agent",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "B20",
    description: "Human immunodeficiency virus [HIV] disease",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "B34.9",
    description: "Viral infection, unspecified",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "B37.0",
    description: "Candidal stomatitis",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "B50.9",
    description: "Plasmodium falciparum malaria, unspecified",
    category: "Certain infectious and parasitic diseases",
  },

  // C00-D49: Neoplasms
  {
    code: "C00.0",
    description: "Malignant neoplasm of external upper lip",
    category: "Neoplasms",
  },
  {
    code: "C15.9",
    description: "Malignant neoplasm of esophagus, unspecified",
    category: "Neoplasms",
  },
  {
    code: "C16.9",
    description: "Malignant neoplasm of stomach, unspecified",
    category: "Neoplasms",
  },
  {
    code: "C18.9",
    description: "Malignant neoplasm of colon, unspecified",
    category: "Neoplasms",
  },
  {
    code: "C20",
    description: "Malignant neoplasm of rectum",
    category: "Neoplasms",
  },
  {
    code: "C22.0",
    description: "Liver cell carcinoma",
    category: "Neoplasms",
  },
  {
    code: "C25.9",
    description: "Malignant neoplasm of pancreas, unspecified",
    category: "Neoplasms",
  },
  {
    code: "C34.90",
    description: "Malignant neoplasm of unspecified part of bronchus or lung",
    category: "Neoplasms",
  },
  {
    code: "C43.9",
    description: "Malignant melanoma of skin, unspecified",
    category: "Neoplasms",
  },
  {
    code: "C44.9",
    description: "Other malignant neoplasm of skin, unspecified",
    category: "Neoplasms",
  },
  {
    code: "C50.919",
    description: "Malignant neoplasm of unspecified site of unspecified female breast",
    category: "Neoplasms",
  },
  {
    code: "C53.9",
    description: "Malignant neoplasm of cervix uteri, unspecified",
    category: "Neoplasms",
  },
  {
    code: "C54.1",
    description: "Malignant neoplasm of endometrium",
    category: "Neoplasms",
  },
  {
    code: "C56",
    description: "Malignant neoplasm of ovary",
    category: "Neoplasms",
  },
  {
    code: "C61",
    description: "Malignant neoplasm of prostate",
    category: "Neoplasms",
  },
  {
    code: "C64.9",
    description: "Malignant neoplasm of unspecified kidney, except renal pelvis",
    category: "Neoplasms",
  },
  {
    code: "C67.9",
    description: "Malignant neoplasm of bladder, unspecified",
    category: "Neoplasms",
  },
  {
    code: "C71.9",
    description: "Malignant neoplasm of brain, unspecified",
    category: "Neoplasms",
  },
  {
    code: "C73",
    description: "Malignant neoplasm of thyroid gland",
    category: "Neoplasms",
  },
  {
    code: "C78.00",
    description: "Secondary malignant neoplasm of unspecified lung",
    category: "Neoplasms",
  },
  {
    code: "C79.51",
    description: "Secondary malignant neoplasm of bone",
    category: "Neoplasms",
  },
  {
    code: "C80.1",
    description: "Malignant neoplasm, unspecified",
    category: "Neoplasms",
  },
  {
    code: "C81.90",
    description: "Hodgkin lymphoma, unspecified",
    category: "Neoplasms",
  },
  {
    code: "C85.90",
    description: "Non-Hodgkin lymphoma, unspecified",
    category: "Neoplasms",
  },
  {
    code: "C91.00",
    description: "Acute lymphoblastic leukemia not having achieved remission",
    category: "Neoplasms",
  },
  {
    code: "C92.00",
    description: "Acute myeloblastic leukemia, not having achieved remission",
    category: "Neoplasms",
  },
  {
    code: "D01.0",
    description: "Carcinoma in situ of colon",
    category: "Neoplasms",
  },
  {
    code: "D05.90",
    description: "Unspecified type of carcinoma in situ of unspecified breast",
    category: "Neoplasms",
  },
  {
    code: "D22.9",
    description: "Melanocytic nevi, unspecified",
    category: "Neoplasms",
  },
  {
    code: "D32.0",
    description: "Benign neoplasm of cerebral meninges",
    category: "Neoplasms",
  },
  {
    code: "D33.2",
    description: "Benign neoplasm of brain, unspecified",
    category: "Neoplasms",
  },
  {
    code: "D34",
    description: "Benign neoplasm of thyroid gland",
    category: "Neoplasms",
  },
  {
    code: "D48.0",
    description: "Neoplasm of uncertain behavior of bone and articular cartilage",
    category: "Neoplasms",
  },
  {
    code: "D49.0",
    description: "Neoplasm of unspecified behavior of digestive system",
    category: "Neoplasms",
  },

  // D50-D89: Diseases of the blood and blood-forming organs
  {
    code: "D50.0",
    description: "Iron deficiency anemia secondary to blood loss (chronic)",
    category: "Diseases of the blood and blood-forming organs",
  },
  {
    code: "D50.9",
    description: "Iron deficiency anemia, unspecified",
    category: "Diseases of the blood and blood-forming organs",
  },
  {
    code: "D51.0",
    description: "Vitamin B12 deficiency anemia due to intrinsic factor deficiency",
    category: "Diseases of the blood and blood-forming organs",
  },
  {
    code: "D52.0",
    description: "Dietary folate deficiency anemia",
    category: "Diseases of the blood and blood-forming organs",
  },
  {
    code: "D64.9",
    description: "Anemia, unspecified",
    category: "Diseases of the blood and blood-forming organs",
  },
  {
    code: "D68.9",
    description: "Coagulation defect, unspecified",
    category: "Diseases of the blood and blood-forming organs",
  },
  {
    code: "D69.6",
    description: "Thrombocytopenia, unspecified",
    category: "Diseases of the blood and blood-forming organs",
  },

  // E00-E89: Endocrine, nutritional and metabolic diseases
  {
    code: "E03.9",
    description: "Hypothyroidism, unspecified",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E05.90",
    description: "Thyrotoxicosis, unspecified without thyrotoxic crisis",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E10.9",
    description: "Type 1 diabetes mellitus without complications",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E10.65",
    description: "Type 1 diabetes mellitus with hyperglycemia",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E11.9",
    description: "Type 2 diabetes mellitus without complications",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E11.21",
    description: "Type 2 diabetes mellitus with diabetic nephropathy",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E11.40",
    description: "Type 2 diabetes mellitus with diabetic neuropathy, unspecified",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E11.65",
    description: "Type 2 diabetes mellitus with hyperglycemia",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E66.9",
    description: "Obesity, unspecified",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E78.0",
    description: "Pure hypercholesterolemia",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E78.1",
    description: "Pure hyperglyceridemia",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E78.2",
    description: "Mixed hyperlipidemia",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E78.5",
    description: "Hyperlipidemia, unspecified",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E83.50",
    description: "Unspecified disorder of calcium metabolism",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E86.0",
    description: "Dehydration",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E87.6",
    description: "Hypokalemia",
    category: "Endocrine, nutritional and metabolic diseases",
  },

  // F00-F99: Mental and behavioral disorders
  {
    code: "F01.50",
    description: "Vascular dementia without behavioral disturbance",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F03.90",
    description: "Unspecified dementia without behavioral disturbance",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F10.10",
    description: "Alcohol abuse, uncomplicated",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F10.20",
    description: "Alcohol dependence, uncomplicated",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F17.200",
    description: "Nicotine dependence, unspecified, uncomplicated",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F20.9",
    description: "Schizophrenia, unspecified",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F31.9",
    description: "Bipolar disorder, unspecified",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F32.0",
    description: "Major depressive disorder, single episode, mild",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F32.1",
    description: "Major depressive disorder, single episode, moderate",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F32.2",
    description: "Major depressive disorder, single episode, severe without psychotic features",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F32.9",
    description: "Major depressive disorder, single episode, unspecified",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F33.0",
    description: "Major depressive disorder, recurrent, mild",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F33.1",
    description: "Major depressive disorder, recurrent, moderate",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F33.9",
    description: "Major depressive disorder, recurrent, unspecified",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F40.00",
    description: "Agoraphobia, unspecified",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F40.10",
    description: "Social phobia, unspecified",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F41.0",
    description: "Panic disorder [episodic paroxysmal anxiety]",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F41.1",
    description: "Generalized anxiety disorder",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F41.9",
    description: "Anxiety disorder, unspecified",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F43.10",
    description: "Post-traumatic stress disorder, unspecified",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F43.20",
    description: "Adjustment disorder, unspecified",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F50.00",
    description: "Anorexia nervosa, unspecified",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F50.2",
    description: "Bulimia nervosa",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F51.01",
    description: "Primary insomnia",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F84.0",
    description: "Autistic disorder",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F90.0",
    description: "Attention-deficit hyperactivity disorder, predominantly inattentive type",
    category: "Mental and behavioral disorders",
  },
  {
    code: "F90.2",
    description: "Attention-deficit hyperactivity disorder, combined type",
    category: "Mental and behavioral disorders",
  },

  // G00-G99: Diseases of the nervous system
  {
    code: "G00.9",
    description: "Bacterial meningitis, unspecified",
    category: "Diseases of the nervous system",
  },
  {
    code: "G03.9",
    description: "Meningitis, unspecified",
    category: "Diseases of the nervous system",
  },
  {
    code: "G20",
    description: "Parkinson's disease",
    category: "Diseases of the nervous system",
  },
  {
    code: "G30.9",
    description: "Alzheimer's disease, unspecified",
    category: "Diseases of the nervous system",
  },
  {
    code: "G35",
    description: "Multiple sclerosis",
    category: "Diseases of the nervous system",
  },
  {
    code: "G40.909",
    description: "Epilepsy, unspecified, not intractable, without status epilepticus",
    category: "Diseases of the nervous system",
  },
  {
    code: "G43.909",
    description: "Migraine, unspecified, not intractable, without status migrainosus",
    category: "Diseases of the nervous system",
  },
  {
    code: "G44.1",
    description: "Vascular headache, not elsewhere classified",
    category: "Diseases of the nervous system",
  },
  {
    code: "G47.00",
    description: "Insomnia, unspecified",
    category: "Diseases of the nervous system",
  },
  {
    code: "G47.33",
    description: "Obstructive sleep apnea (adult) (pediatric)",
    category: "Diseases of the nervous system",
  },
  {
    code: "G56.00",
    description: "Carpal tunnel syndrome, unspecified upper limb",
    category: "Diseases of the nervous system",
  },
  {
    code: "G89.29",
    description: "Other chronic pain",
    category: "Diseases of the nervous system",
  },

  // H00-H59: Diseases of the eye and adnexa
  {
    code: "H00.019",
    description: "Hordeolum externum unspecified eye, unspecified eyelid",
    category: "Diseases of the eye and adnexa",
  },
  {
    code: "H10.9",
    description: "Conjunctivitis, unspecified",
    category: "Diseases of the eye and adnexa",
  },
  {
    code: "H25.9",
    description: "Unspecified age-related cataract",
    category: "Diseases of the eye and adnexa",
  },
  {
    code: "H40.9",
    description: "Unspecified glaucoma",
    category: "Diseases of the eye and adnexa",
  },
  {
    code: "H52.4",
    description: "Presbyopia",
    category: "Diseases of the eye and adnexa",
  },
  {
    code: "H53.9",
    description: "Visual disturbance, unspecified",
    category: "Diseases of the eye and adnexa",
  },

  // H60-H95: Diseases of the ear and mastoid process
  {
    code: "H60.90",
    description: "Unspecified otitis externa, unspecified ear",
    category: "Diseases of the ear and mastoid process",
  },
  {
    code: "H65.90",
    description: "Unspecified nonsuppurative otitis media, unspecified ear",
    category: "Diseases of the ear and mastoid process",
  },
  {
    code: "H66.90",
    description: "Otitis media, unspecified, unspecified ear",
    category: "Diseases of the ear and mastoid process",
  },
  {
    code: "H81.10",
    description: "Benign paroxysmal vertigo, unspecified ear",
    category: "Diseases of the ear and mastoid process",
  },
  {
    code: "H91.90",
    description: "Unspecified hearing loss, unspecified ear",
    category: "Diseases of the ear and mastoid process",
  },

  // I00-I99: Diseases of the circulatory system
  {
    code: "I10",
    description: "Essential (primary) hypertension",
    category: "Diseases of the circulatory system",
  },
  // I00-I99: Diseases of the circulatory system
  {
    code: "I10",
    description: "Essential (primary) hypertension",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I11.9",
    description: "Hypertensive heart disease without heart failure",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I20.0",
    description: "Unstable angina",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I20.9",
    description: "Angina pectoris, unspecified",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I21.3",
    description: "ST elevation (STEMI) myocardial infarction of unspecified site",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I21.4",
    description: "Non-ST elevation (NSTEMI) myocardial infarction",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I21.9",
    description: "Acute myocardial infarction, unspecified",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I25.10",
    description: "Atherosclerotic heart disease of native coronary artery without angina pectoris",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I48.0",
    description: "Paroxysmal atrial fibrillation",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I48.91",
    description: "Unspecified atrial fibrillation",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I50.9",
    description: "Heart failure, unspecified",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I63.9",
    description: "Cerebral infarction, unspecified",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I64",
    description: "Stroke, not specified as hemorrhage or infarction",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I70.0",
    description: "Atherosclerosis of aorta",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I73.9",
    description: "Peripheral vascular disease, unspecified",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I80.3",
    description: "Phlebitis and thrombophlebitis of lower extremities, unspecified",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I83.90",
    description: "Asymptomatic varicose veins of unspecified lower extremity",
    category: "Diseases of the circulatory system",
  },

  // J00-J99: Diseases of the respiratory system
  {
    code: "J00",
    description: "Acute nasopharyngitis [common cold]",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J01.90",
    description: "Acute sinusitis, unspecified",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J02.9",
    description: "Acute pharyngitis, unspecified",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J03.90",
    description: "Acute tonsillitis, unspecified",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J04.10",
    description: "Acute tracheitis without obstruction",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J06.9",
    description: "Acute upper respiratory infection, unspecified",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J10.1",
    description: "Influenza due to other identified influenza virus with other respiratory manifestations",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J11.1",
    description: "Influenza due to unidentified influenza virus with other respiratory manifestations",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J12.89",
    description: "Other viral pneumonia",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J18.9",
    description: "Pneumonia, unspecified organism",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J20.9",
    description: "Acute bronchitis, unspecified",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J32.9",
    description: "Chronic sinusitis, unspecified",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J40",
    description: "Bronchitis, not specified as acute or chronic",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J42",
    description: "Unspecified chronic bronchitis",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J44.0",
    description: "Chronic obstructive pulmonary disease with acute lower respiratory infection",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J44.1",
    description: "Chronic obstructive pulmonary disease with (acute) exacerbation",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J44.9",
    description: "Chronic obstructive pulmonary disease, unspecified",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J45.20",
    description: "Mild intermittent asthma, uncomplicated",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J45.30",
    description: "Mild persistent asthma, uncomplicated",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J45.40",
    description: "Moderate persistent asthma, uncomplicated",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J45.50",
    description: "Severe persistent asthma, uncomplicated",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J45.909",
    description: "Unspecified asthma, uncomplicated",
    category: "Diseases of the respiratory system",
  },

  // K00-K95: Diseases of the digestive system
  {
    code: "K21.0",
    description: "Gastro-esophageal reflux disease with esophagitis",
    category: "Diseases of the digestive system",
  },
  {
    code: "K21.9",
    description: "Gastro-esophageal reflux disease without esophagitis",
    category: "Diseases of the digestive system",
  },
  {
    code: "K25.9",
    description: "Gastric ulcer, unspecified as acute or chronic, without hemorrhage or perforation",
    category: "Diseases of the digestive system",
  },
  {
    code: "K26.9",
    description: "Duodenal ulcer, unspecified as acute or chronic, without hemorrhage or perforation",
    category: "Diseases of the digestive system",
  },
  {
    code: "K29.20",
    description: "Alcoholic gastritis without bleeding",
    category: "Diseases of the digestive system",
  },
  {
    code: "K29.70",
    description: "Gastritis, unspecified, without bleeding",
    category: "Diseases of the digestive system",
  },
  {
    code: "K30",
    description: "Functional dyspepsia",
    category: "Diseases of the digestive system",
  },
  {
    code: "K35.80",
    description: "Unspecified acute appendicitis",
    category: "Diseases of the digestive system",
  },
  {
    code: "K40.90",
    description: "Unilateral inguinal hernia, without obstruction or gangrene, not specified as recurrent",
    category: "Diseases of the digestive system",
  },
  {
    code: "K50.90",
    description: "Crohn's disease, unspecified, without complications",
    category: "Diseases of the digestive system",
  },
  {
    code: "K51.90",
    description: "Ulcerative colitis, unspecified, without complications",
    category: "Diseases of the digestive system",
  },
  {
    code: "K52.9",
    description: "Noninfective gastroenteritis and colitis, unspecified",
    category: "Diseases of the digestive system",
  },
  {
    code: "K58.0",
    description: "Irritable bowel syndrome with diarrhea",
    category: "Diseases of the digestive system",
  },
  {
    code: "K58.9",
    description: "Irritable bowel syndrome without diarrhea",
    category: "Diseases of the digestive system",
  },
  {
    code: "K59.00",
    description: "Constipation, unspecified",
    category: "Diseases of the digestive system",
  },
  {
    code: "K64.9",
    description: "Unspecified hemorrhoids",
    category: "Diseases of the digestive system",
  },
  {
    code: "K70.30",
    description: "Alcoholic cirrhosis of liver without ascites",
    category: "Diseases of the digestive system",
  },
  {
    code: "K74.60",
    description: "Unspecified cirrhosis of liver",
    category: "Diseases of the digestive system",
  },
  {
    code: "K80.20",
    description: "Calculus of gallbladder without cholecystitis without obstruction",
    category: "Diseases of the digestive system",
  },

  // L00-L99: Diseases of the skin and subcutaneous tissue
  {
    code: "L00",
    description: "Staphylococcal scalded skin syndrome",
    category: "Diseases of the skin and subcutaneous tissue",
  },
  {
    code: "L01.00",
    description: "Impetigo, unspecified",
    category: "Diseases of the skin and subcutaneous tissue",
  },
  {
    code: "L02.91",
    description: "Cutaneous abscess, unspecified",
    category: "Diseases of the skin and subcutaneous tissue",
  },
  {
    code: "L03.90",
    description: "Cellulitis, unspecified",
    category: "Diseases of the skin and subcutaneous tissue",
  },
  {
    code: "L20.9",
    description: "Atopic dermatitis, unspecified",
    category: "Diseases of the skin and subcutaneous tissue",
  },
  {
    code: "L23.9",
    description: "Allergic contact dermatitis, unspecified cause",
    category: "Diseases of the skin and subcutaneous tissue",
  },
  {
    code: "L30.9",
    description: "Dermatitis, unspecified",
    category: "Diseases of the skin and subcutaneous tissue",
  },
  {
    code: "L40.0",
    description: "Psoriasis vulgaris",
    category: "Diseases of the skin and subcutaneous tissue",
  },
  {
    code: "L50.9",
    description: "Urticaria, unspecified",
    category: "Diseases of the skin and subcutaneous tissue",
  },
  {
    code: "L60.0",
    description: "Ingrowing nail",
    category: "Diseases of the skin and subcutaneous tissue",
  },
  {
    code: "L70.0",
    description: "Acne vulgaris",
    category: "Diseases of the skin and subcutaneous tissue",
  },
  {
    code: "L98.9",
    description: "Disorder of the skin and subcutaneous tissue, unspecified",
    category: "Diseases of the skin and subcutaneous tissue",
  },

  // M00-M99: Diseases of the musculoskeletal system and connective tissue
  {
    code: "M05.9",
    description: "Rheumatoid arthritis with rheumatoid factor, unspecified",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M06.9",
    description: "Rheumatoid arthritis, unspecified",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M10.9",
    description: "Gout, unspecified",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M15.9",
    description: "Polyarthrosis, unspecified",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M16.9",
    description: "Osteoarthritis of hip, unspecified",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M17.9",
    description: "Osteoarthritis of knee, unspecified",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M19.90",
    description: "Unspecified osteoarthritis, unspecified site",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M25.50",
    description: "Pain in unspecified joint",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M32.9",
    description: "Systemic lupus erythematosus, unspecified",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M35.3",
    description: "Polymyalgia rheumatica",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M41.9",
    description: "Scoliosis, unspecified",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M47.816",
    description: "Spondylosis without myelopathy or radiculopathy, lumbar region",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M51.26",
    description: "Other intervertebral disc displacement, lumbar region",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M54.2",
    description: "Cervicalgia",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M54.5",
    description: "Low back pain",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M62.830",
    description: "Muscle spasm of back",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M79.3",
    description: "Panniculitis, unspecified",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M79.7",
    description: "Fibromyalgia",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M80.00XA",
    description: "Age-related osteoporosis with current pathological fracture, unspecified site, initial encounter",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M81.0",
    description: "Age-related osteoporosis without current pathological fracture",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },

  // N00-N99: Diseases of the genitourinary system
  {
    code: "N10",
    description: "Acute pyelonephritis",
    category: "Diseases of the genitourinary system",
  },
  {
    code: "N18.3",
    description: "Chronic kidney disease, stage 3 (moderate)",
    category: "Diseases of the genitourinary system",
  },
  {
    code: "N18.6",
    description: "End stage renal disease",
    category: "Diseases of the genitourinary system",
  },
  {
    code: "N18.9",
    description: "Chronic kidney disease, unspecified",
    category: "Diseases of the genitourinary system",
  },
  {
    code: "N20.0",
    description: "Calculus of kidney",
    category: "Diseases of the genitourinary system",
  },
  {
    code: "N39.0",
    description: "Urinary tract infection, site not specified",
    category: "Diseases of the genitourinary system",
  },
  {
    code: "N40.0",
    description: "Benign prostatic hyperplasia without lower urinary tract symptoms",
    category: "Diseases of the genitourinary system",
  },
  {
    code: "N64.4",
    description: "Mastodynia",
    category: "Diseases of the genitourinary system",
  },
  {
    code: "N76.0",
    description: "Acute vaginitis",
    category: "Diseases of the genitourinary system",
  },
  {
    code: "N92.0",
    description: "Excessive and frequent menstruation with regular cycle",
    category: "Diseases of the genitourinary system",
  },
  {
    code: "N94.6",
    description: "Dysmenorrhea, unspecified",
    category: "Diseases of the genitourinary system",
  },
  {
    code: "N95.1",
    description: "Menopausal and female climacteric states",
    category: "Diseases of the genitourinary system",
  },

  // O00-O99: Pregnancy, childbirth and the puerperium
  {
    code: "O00.9",
    description: "Ectopic pregnancy, unspecified",
    category: "Pregnancy, childbirth and the puerperium",
  },
  {
    code: "O09.90",
    description: "Supervision of high risk pregnancy, unspecified, unspecified trimester",
    category: "Pregnancy, childbirth and the puerperium",
  },
  {
    code: "O21.0",
    description: "Mild hyperemesis gravidarum",
    category: "Pregnancy, childbirth and the puerperium",
  },
  {
    code: "O24.419",
    description: "Gestational diabetes mellitus in pregnancy, unspecified control",
    category: "Pregnancy, childbirth and the puerperium",
  },
  {
    code: "O80",
    description: "Encounter for full-term uncomplicated delivery",
    category: "Pregnancy, childbirth and the puerperium",
  },

  // R00-R99: Symptoms, signs and abnormal clinical and laboratory findings
  {
    code: "R00.0",
    description: "Tachycardia, unspecified",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R05",
    description: "Cough",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R06.00",
    description: "Dyspnea, unspecified",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R06.02",
    description: "Shortness of breath",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R07.9",
    description: "Chest pain, unspecified",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R10.0",
    description: "Acute abdomen",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R10.9",
    description: "Unspecified abdominal pain",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R11.0",
    description: "Nausea",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R11.2",
    description: "Nausea with vomiting, unspecified",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R19.7",
    description: "Diarrhea, unspecified",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R42",
    description: "Dizziness and giddiness",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R50.9",
    description: "Fever, unspecified",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R51",
    description: "Headache",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R53.1",
    description: "Weakness",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R53.83",
    description: "Other fatigue",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R55",
    description: "Syncope and collapse",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R63.4",
    description: "Abnormal weight loss",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R73.03",
    description: "Prediabetes",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },

  // S00-T88: Injury, poisoning and certain other consequences of external causes
  {
    code: "S06.0X0A",
    description: "Concussion without loss of consciousness, initial encounter",
    category: "Injury, poisoning and certain other consequences of external causes",
  },
  {
    code: "S13.4XXA",
    description: "Sprain of ligaments of cervical spine, initial encounter",
    category: "Injury, poisoning and certain other consequences of external causes",
  },
  {
    code: "S22.32XA",
    description: "Fracture of one rib, left side, initial encounter for closed fracture",
    category: "Injury, poisoning and certain other consequences of external causes",
  },
  {
    code: "S42.001A",
    description: "Fracture of unspecified part of right clavicle, initial encounter for closed fracture",
    category: "Injury, poisoning and certain other consequences of external causes",
  },
  {
    code: "S52.501A",
    description: "Unspecified fracture of the lower end of right radius, initial encounter for closed fracture",
    category: "Injury, poisoning and certain other consequences of external causes",
  },
  {
    code: "S72.001A",
    description: "Fracture of unspecified part of neck of right femur, initial encounter for closed fracture",
    category: "Injury, poisoning and certain other consequences of external causes",
  },
  {
    code: "S82.001A",
    description: "Unspecified fracture of right patella, initial encounter for closed fracture",
    category: "Injury, poisoning and certain other consequences of external causes",
  },
  {
    code: "S93.401A",
    description: "Sprain of unspecified ligament of right ankle, initial encounter",
    category: "Injury, poisoning and certain other consequences of external causes",
  },
  {
    code: "T14.90",
    description: "Injury, unspecified",
    category: "Injury, poisoning and certain other consequences of external causes",
  },
  {
    code: "T40.1X1A",
    description: "Poisoning by heroin, accidental (unintentional), initial encounter",
    category: "Injury, poisoning and certain other consequences of external causes",
  },
  {
    code: "T50.901A",
    description: "Poisoning by unspecified drugs, medicaments and biological substances, accidental (unintentional), initial encounter",
    category: "Injury, poisoning and certain other consequences of external causes",
  },
  {
    code: "T78.40XA",
    description: "Allergy, unspecified, initial encounter",
    category: "Injury, poisoning and certain other consequences of external causes",
  },

  // U00-U99: Codes for special purposes
  {
    code: "U07.1",
    description: "COVID-19",
    category: "Codes for special purposes",
  },

  // Z00-Z99: Factors influencing health status and contact with health services
  {
    code: "Z00.00",
    description: "Encounter for general adult medical examination without abnormal findings",
    category: "Factors influencing health status and contact with health services",
  },
  {
    code: "Z01.00",
    description: "Encounter for examination of eyes and vision without abnormal findings",
    category: "Factors influencing health status and contact with health services",
  },
  {
    code: "Z12.11",
    description: "Encounter for screening for malignant neoplasm of colon",
    category: "Factors influencing health status and contact with health services",
  },
  {
    code: "Z13.1",
    description: "Encounter for screening for diabetes mellitus",
    category: "Factors influencing health status and contact with health services",
  },
  {
    code: "Z23",
    description: "Encounter for immunization",
    category: "Factors influencing health status and contact with health services",
  },
  {
    code: "Z51.11",
    description: "Encounter for antineoplastic chemotherapy",
    category: "Factors influencing health status and contact with health services",
  },
  {
    code: "Z51.12",
    description: "Encounter for antineoplastic immunotherapy",
    category: "Factors influencing health status and contact with health services",
  },
  {
    code: "Z72.0",
    description: "Tobacco use",
    category: "Factors influencing health status and contact with health services",
  },
  {
    code: "Z79.4",
    description: "Long term (current) use of insulin",
    category: "Factors influencing health status and contact with health services",
  },
  {
    code: "Z79.84",
    description: "Long term (current) use of oral hypoglycemic drugs",
    category: "Factors influencing health status and contact with health services",
  },
  {
    code: "Z86.73",
    description: "Personal history of transient ischemic attack (TIA), and cerebral infarction without residual deficits",
    category: "Factors influencing health status and contact with health services",
  },
  {
    code: "Z87.891",
    description: "Personal history of nicotine dependence",
    category: "Factors influencing health status and contact with health services",
  },
];

async function main() {
  console.log("Start seeding ICD-10 codes...");

  for (const icd of commonIcdCodes) {
    const code = await prisma.icdCode.upsert({
      where: { code: icd.code },
      update: {},
      create: icd,
    });
    console.log(`Created/Updated ICD code: ${code.code}`);
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
