"use client";

import { useState } from "react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

interface MedicineAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (medicine: Medicine) => void;
  placeholder?: string;
  label?: string;
  id?: string;
}

interface Medicine {
  name: string;
  commonDosage?: string;
  category?: string;
}

// Common medicines database - Expanded list
const COMMON_MEDICINES: Medicine[] = [
  // Analgesics & Antipyretics
  { name: "Paracetamol", commonDosage: "500mg", category: "Analgesic" },
  { name: "Acetaminophen", commonDosage: "500mg", category: "Analgesic" },
  { name: "Ibuprofen", commonDosage: "400mg", category: "NSAID" },
  { name: "Diclofenac", commonDosage: "50mg", category: "NSAID" },
  { name: "Naproxen", commonDosage: "500mg", category: "NSAID" },
  { name: "Aspirin", commonDosage: "75mg", category: "Antiplatelet/Analgesic" },
  { name: "Tramadol", commonDosage: "50mg", category: "Opioid Analgesic" },
  { name: "Ketorolac", commonDosage: "10mg", category: "NSAID" },

  // Antibiotics
  { name: "Amoxicillin", commonDosage: "500mg", category: "Antibiotic" },
  { name: "Azithromycin", commonDosage: "500mg", category: "Antibiotic" },
  { name: "Ciprofloxacin", commonDosage: "500mg", category: "Antibiotic" },
  { name: "Doxycycline", commonDosage: "100mg", category: "Antibiotic" },
  { name: "Cefixime", commonDosage: "200mg", category: "Antibiotic" },
  { name: "Clarithromycin", commonDosage: "500mg", category: "Antibiotic" },
  { name: "Levofloxacin", commonDosage: "500mg", category: "Antibiotic" },
  { name: "Metronidazole", commonDosage: "400mg", category: "Antibiotic" },
  { name: "Cephalexin", commonDosage: "500mg", category: "Antibiotic" },
  { name: "Ampicillin", commonDosage: "500mg", category: "Antibiotic" },

  // Antidiabetic
  { name: "Metformin", commonDosage: "500mg", category: "Antidiabetic" },
  { name: "Glimepiride", commonDosage: "2mg", category: "Antidiabetic" },
  { name: "Gliclazide", commonDosage: "80mg", category: "Antidiabetic" },
  { name: "Sitagliptin", commonDosage: "100mg", category: "DPP-4 Inhibitor" },
  { name: "Insulin Glargine", commonDosage: "10U", category: "Insulin" },
  { name: "Empagliflozin", commonDosage: "10mg", category: "SGLT2 Inhibitor" },

  // Antihypertensive
  { name: "Amlodipine", commonDosage: "5mg", category: "CCB" },
  { name: "Losartan", commonDosage: "50mg", category: "ARB" },
  { name: "Enalapril", commonDosage: "5mg", category: "ACE Inhibitor" },
  { name: "Metoprolol", commonDosage: "50mg", category: "Beta Blocker" },
  { name: "Atenolol", commonDosage: "50mg", category: "Beta Blocker" },
  { name: "Telmisartan", commonDosage: "40mg", category: "ARB" },
  { name: "Ramipril", commonDosage: "5mg", category: "ACE Inhibitor" },
  { name: "Hydrochlorothiazide", commonDosage: "12.5mg", category: "Diuretic" },

  // Statins & Lipid Lowering
  { name: "Atorvastatin", commonDosage: "10mg", category: "Statin" },
  { name: "Rosuvastatin", commonDosage: "10mg", category: "Statin" },
  { name: "Simvastatin", commonDosage: "20mg", category: "Statin" },
  { name: "Fenofibrate", commonDosage: "145mg", category: "Fibrate" },

  // GI Medications
  { name: "Omeprazole", commonDosage: "20mg", category: "PPI" },
  { name: "Pantoprazole", commonDosage: "40mg", category: "PPI" },
  { name: "Rabeprazole", commonDosage: "20mg", category: "PPI" },
  { name: "Ranitidine", commonDosage: "150mg", category: "H2 Blocker" },
  { name: "Domperidone", commonDosage: "10mg", category: "Prokinetic" },
  { name: "Ondansetron", commonDosage: "4mg", category: "Antiemetic" },
  { name: "Loperamide", commonDosage: "2mg", category: "Antidiarrheal" },

  // Antihistamines & Allergy
  { name: "Cetirizine", commonDosage: "10mg", category: "Antihistamine" },
  { name: "Loratadine", commonDosage: "10mg", category: "Antihistamine" },
  { name: "Fexofenadine", commonDosage: "120mg", category: "Antihistamine" },
  { name: "Chlorpheniramine", commonDosage: "4mg", category: "Antihistamine" },
  {
    name: "Montelukast",
    commonDosage: "10mg",
    category: "Leukotriene Antagonist",
  },

  // Respiratory
  { name: "Salbutamol", commonDosage: "100mcg", category: "Bronchodilator" },
  { name: "Budesonide", commonDosage: "200mcg", category: "Corticosteroid" },
  { name: "Theophylline", commonDosage: "200mg", category: "Bronchodilator" },
  { name: "Ipratropium", commonDosage: "20mcg", category: "Anticholinergic" },
  { name: "Fluticasone", commonDosage: "250mcg", category: "Corticosteroid" },

  // Antiplatelet & Anticoagulants
  { name: "Clopidogrel", commonDosage: "75mg", category: "Antiplatelet" },
  { name: "Warfarin", commonDosage: "5mg", category: "Anticoagulant" },
  { name: "Rivaroxaban", commonDosage: "10mg", category: "Anticoagulant" },

  // Thyroid
  { name: "Levothyroxine", commonDosage: "50mcg", category: "Thyroid" },
  { name: "Carbimazole", commonDosage: "5mg", category: "Antithyroid" },

  // Vitamins & Supplements
  { name: "Vitamin D3", commonDosage: "60000IU", category: "Vitamin" },
  { name: "Vitamin B12", commonDosage: "1000mcg", category: "Vitamin" },
  { name: "Folic Acid", commonDosage: "5mg", category: "Vitamin" },
  { name: "Calcium Carbonate", commonDosage: "500mg", category: "Supplement" },
  {
    name: "Iron Ferrous Sulfate",
    commonDosage: "200mg",
    category: "Supplement",
  },
  { name: "Multivitamin", commonDosage: "1 tablet", category: "Supplement" },

  // Antidepressants & Anxiolytics
  { name: "Escitalopram", commonDosage: "10mg", category: "SSRI" },
  { name: "Sertraline", commonDosage: "50mg", category: "SSRI" },
  { name: "Alprazolam", commonDosage: "0.5mg", category: "Benzodiazepine" },
  { name: "Clonazepam", commonDosage: "0.5mg", category: "Benzodiazepine" },

  // Antacids
  { name: "Aluminium Hydroxide", commonDosage: "500mg", category: "Antacid" },
  { name: "Magnesium Hydroxide", commonDosage: "400mg", category: "Antacid" },
  { name: "Sucralfate", commonDosage: "1g", category: "Mucosal Protectant" },

  // Miscellaneous
  { name: "Prednisone", commonDosage: "5mg", category: "Corticosteroid" },
  { name: "Dexamethasone", commonDosage: "4mg", category: "Corticosteroid" },
  {
    name: "Methylprednisolone",
    commonDosage: "16mg",
    category: "Corticosteroid",
  },
  { name: "Amitriptyline", commonDosage: "25mg", category: "TCA" },
  { name: "Gabapentin", commonDosage: "300mg", category: "Anticonvulsant" },
  { name: "Pregabalin", commonDosage: "75mg", category: "Anticonvulsant" },
];

function getInitialRecentMedicines(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const recent = localStorage.getItem("recentMedicines");
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
}

export function MedicineAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search medicine...",
  label,
  id = "medicine-autocomplete",
}: MedicineAutocompleteProps) {
  // Lazy initialization from localStorage
  const [recentMedicines, setRecentMedicines] = useState<string[]>(
    getInitialRecentMedicines,
  );

  const handleChange = (newValue: string) => {
    onChange(newValue);

    // Check if selected from list
    const medicine = COMMON_MEDICINES.find((m) => m.name === newValue);
    if (medicine) {
      onSelect?.(medicine);

      // Add to recent medicines
      const updated = [
        medicine.name,
        ...recentMedicines.filter((m) => m !== medicine.name),
      ].slice(0, 5);
      setRecentMedicines(updated);
      localStorage.setItem("recentMedicines", JSON.stringify(updated));
    }
  };

  const allMedicines = [
    ...recentMedicines
      .map((name) => COMMON_MEDICINES.find((m) => m.name === name))
      .filter(Boolean),
    ...COMMON_MEDICINES.filter((m) => !recentMedicines.includes(m.name)),
  ] as Medicine[];

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input
        id={id}
        list={`${id}-list`}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
      />
      <datalist id={`${id}-list`}>
        {allMedicines.map((med) => (
          <option key={med.name} value={med.name}>
            {med.commonDosage &&
              med.category &&
              `${med.commonDosage} - ${med.category}`}
          </option>
        ))}
      </datalist>
    </div>
  );
}
