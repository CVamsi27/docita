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

// Common medicines database
const COMMON_MEDICINES: Medicine[] = [
  { name: "Paracetamol", commonDosage: "500mg", category: "Analgesic" },
  { name: "Ibuprofen", commonDosage: "400mg", category: "NSAID" },
  { name: "Amoxicillin", commonDosage: "500mg", category: "Antibiotic" },
  { name: "Azithromycin", commonDosage: "500mg", category: "Antibiotic" },
  { name: "Metformin", commonDosage: "500mg", category: "Antidiabetic" },
  { name: "Amlodipine", commonDosage: "5mg", category: "Antihypertensive" },
  { name: "Atorvastatin", commonDosage: "10mg", category: "Statin" },
  { name: "Omeprazole", commonDosage: "20mg", category: "PPI" },
  { name: "Cetirizine", commonDosage: "10mg", category: "Antihistamine" },
  { name: "Salbutamol", commonDosage: "100mcg", category: "Bronchodilator" },
  { name: "Aspirin", commonDosage: "75mg", category: "Antiplatelet" },
  { name: "Losartan", commonDosage: "50mg", category: "ARB" },
  { name: "Levothyroxine", commonDosage: "50mcg", category: "Thyroid" },
  { name: "Pantoprazole", commonDosage: "40mg", category: "PPI" },
  { name: "Clopidogrel", commonDosage: "75mg", category: "Antiplatelet" },
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
