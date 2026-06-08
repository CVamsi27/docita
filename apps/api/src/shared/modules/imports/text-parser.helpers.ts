// Facade that re-exports all 32 text-parser helpers from the per-category
// parsers folder. Consumers can either keep importing from this module
// (which preserves the previous surface) or import directly from the
// focused files under `./parsers/`:
//   - parsers/document-parsers      (clinic, doctor, dates, mrn)
//   - parsers/patient-field-parsers (name, gender, age, blood type, etc.)
//   - parsers/contact-parsers       (phone, email, emergency contact)
//   - parsers/clinical-parsers      (diagnosis, medications, vitals, labs)
//   - parsers/invoice-parsers       (total, tax, discount, subtotal, items)
export * from "./parsers";
