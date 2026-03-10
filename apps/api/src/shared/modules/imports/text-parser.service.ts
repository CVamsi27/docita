import { Injectable, Logger } from '@nestjs/common';
import {
  ParsedMedicalFields,
  OCRMedication as Medication,
} from '@workspace/types';

@Injectable()
export class TextParserService {
  private readonly logger = new Logger(TextParserService.name);

  parseExtractedText(text: string): ParsedMedicalFields {
    const fields: ParsedMedicalFields = {
      firstName: '',
      lastName: '',
      mrn: '',
      preferredName: '',
      pronouns: '',
      address: '',
      race: '',
      ethnicity: '',
      maritalStatus: '',
      preferredLanguage: '',
      age: '',
      gender: 'MALE',
      phoneNumber: '',
      email: '',
      bloodType: '',
      emergencyContact: null,
      dateOfBirth: '',
      visitDate: '',
      invoiceDate: '',
      admissionDate: '',
      clinicName: '',
      doctorName: '',
      diagnosis: '',
      symptoms: [],
      allergies: [],
      medicalHistory: [],
      medications: [],
      vitals: {
        bp: '',
        temp: '',
        pulse: '',
        respiratoryRate: '',
        spO2: '',
        glucose: '',
      },
      labValues: {
        glucose: '',
        hemoglobin: '',
        creatinine: '',
      },
      invoice: {
        total: null,
        tax: null,
        discount: null,
        subtotal: null,
        items: [],
      },
    };

    const lines = text.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const _trimmedLine = line.trim();

      const clinicMatch = line.match(
        /(?:hospital|clinic|center)[:\s]+([a-z\s.]+)/i,
      );
      if (clinicMatch && !fields.clinicName)
        fields.clinicName = clinicMatch[1].trim();

      const doctorMatch = line.match(/(?:doctor|dr.?)[:\s]+([a-z\s.]+)/i);
      if (doctorMatch && !fields.doctorName)
        fields.doctorName = doctorMatch[1].trim();

      const dateRegex = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/;
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        if (lowerLine.includes('dob') || lowerLine.includes('birth')) {
          fields.dateOfBirth = dateMatch[1];
        } else if (
          lowerLine.includes('invoice') ||
          lowerLine.includes('bill')
        ) {
          fields.invoiceDate = dateMatch[1];
        } else if (
          lowerLine.includes('admission') ||
          lowerLine.includes('admit')
        ) {
          fields.admissionDate = dateMatch[1];
        } else if (
          (lowerLine.includes('visit') || lowerLine.includes('date')) &&
          !fields.visitDate
        ) {
          fields.visitDate = dateMatch[1];
        }
      }

      const mrnMatch = line.match(
        /(?:mrn|medical record number)[:\s]+([a-z0-9-.]+)/i,
      );
      if (mrnMatch) fields.mrn = mrnMatch[1].trim();

      const prefNameMatch = line.match(
        /(?:preferred name|alias)[:\s]+([a-z\s]+)/i,
      );
      if (prefNameMatch) fields.preferredName = prefNameMatch[1].trim();

      const pronounsMatch = line.match(/(?:pronouns)[:\s]+([a-z/]+)/i);
      if (pronounsMatch) fields.pronouns = pronounsMatch[1].trim();

      const addressMatch = line.match(/(?:address)[:\s]+([a-z0-9\s,.-]+)/i);
      if (addressMatch && addressMatch[1].length > 5)
        fields.address = addressMatch[1].trim();

      const maritalMatch = line.match(/(?:marital status)[:\s]+([a-z]+)/i);
      if (maritalMatch) fields.maritalStatus = maritalMatch[1].trim();

      const langMatch = line.match(/(?:language)[:\s]+([a-z]+)/i);
      if (langMatch) fields.preferredLanguage = langMatch[1].trim();

      const raceMatch = line.match(/(?:race)[:\s]+([a-z]+)/i);
      if (raceMatch) fields.race = raceMatch[1].trim();

      const ethnicityMatch = line.match(/(?:ethnicity)[:\s]+([a-z\s]+)/i);
      if (ethnicityMatch) fields.ethnicity = ethnicityMatch[1].trim();

      const ecMatch = line.match(
        /(?:emergency contact|emergency)[:\s]+([a-z\s]+)(?:[:\s-]+)?(\d+)?/i,
      );
      if (ecMatch) {
        fields.emergencyContact = {
          name: ecMatch[1].trim(),
          phoneNumber: ecMatch[2] ? ecMatch[2].trim() : '',
          relation: '',
        };
      }

      const totalMatch = line.match(
        /(?:total|grand total|amount due)[:\s]+(?:[$€£₹]|rs.?)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/i,
      );
      if (totalMatch)
        fields.invoice.total = parseFloat(totalMatch[1].replace(/,/g, ''));

      const taxMatch = line.match(
        /(?:tax|vat|gst)[:\s]+(?:[$€£₹]|rs.?)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/i,
      );
      if (taxMatch)
        fields.invoice.tax = parseFloat(taxMatch[1].replace(/,/g, ''));

      const discountMatch = line.match(
        /(?:discount)[:\s]+(?:[$€£₹]|rs.?)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/i,
      );
      if (discountMatch)
        fields.invoice.discount = parseFloat(
          discountMatch[1].replace(/,/g, ''),
        );

      const subtotalMatch = line.match(
        /(?:subtotal)[:\s]+(?:[$€£₹]|rs.?)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/i,
      );
      if (subtotalMatch)
        fields.invoice.subtotal = parseFloat(
          subtotalMatch[1].replace(/,/g, ''),
        );

      const simpleItemMatch = line.match(
        /^([a-zA-Z0-9\s-.]+?)\s+(?:[$€£₹]|rs.?)?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)$/i,
      );

      if (
        simpleItemMatch &&
        ![
          'total',
          'subtotal',
          'tax',
          'discount',
          'amount',
          'balance',
          'grand',
        ].some((k) => lowerLine.includes(k))
      ) {
        fields.invoice.items.push({
          description: simpleItemMatch[1].trim(),
          quantity: 1,
          unitPrice: parseFloat(simpleItemMatch[2].replace(/,/g, '')),
          total: parseFloat(simpleItemMatch[2].replace(/,/g, '')),
        });
      }

      const phoneMatch = line.match(
        /(?:(?:\+|0{0,2})91(\s*[-]\s*)?|[0]?)?[6789]\d{9}\b/,
      );
      if (phoneMatch && !fields.phoneNumber) {
        fields.phoneNumber = phoneMatch[0].replace(/\D/g, '').slice(-10);
      }

      const emailMatch = line.match(
        /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
      );
      if (emailMatch && !fields.email) {
        fields.email = emailMatch[1];
      }

      const ageMatch = line.match(/(?:age|yrs|years)[:\s]*(\d{1,3})/i);
      if (ageMatch && !fields.age) {
        fields.age = ageMatch[1];
      }

      const bloodMatch = line.match(
        /\b(O|A|B|AB)\s*[+-]\s*(?:ve)?\b|\bBlood\s*Group\s*[:-]\s*(O|A|B|AB)[\s-]*([+-])/i,
      );
      if (bloodMatch && !fields.bloodType) {
        if (bloodMatch[1]) {
          fields.bloodType = bloodMatch[0].replace('ve', '').replace(/\s/g, '');
        } else if (bloodMatch[2] && bloodMatch[3]) {
          fields.bloodType = `${bloodMatch[2]}${bloodMatch[3]}`;
        }
      }

      const bpMatch = line.match(/(\d{2,3})\s*[/]\s*(\d{2,3})\s*(?:mmhg)?/i);
      if (bpMatch && !fields.vitals.bp) {
        fields.vitals.bp = `${bpMatch[1]}/${bpMatch[2]}`;
      }

      const tempMatch = line.match(
        /(?:temp|t).?\s*[:-]?\s*(\d+.?\d*)\s*(?:°|c|f)?/i,
      );
      if (tempMatch && !fields.vitals.temp) {
        const val = parseFloat(tempMatch[1]);
        if (val > 35 && val < 105) {
          fields.vitals.temp = tempMatch[1];
        }
      }

      const pulseMatch = line.match(
        /(?:pulse|hr|heart\s*rate|p).?\s*[:-]?\s*(\d{2,3})/i,
      );
      if (pulseMatch && !fields.vitals.pulse) {
        const val = parseInt(pulseMatch[1]);
        if (val > 40 && val < 200) {
          fields.vitals.pulse = pulseMatch[1];
        }
      }

      const spo2Match = line.match(/(?:spo2|sat).?\s*[:-]?\s*(\d{2,3})\s*%/i);
      if (spo2Match && !fields.vitals.spO2) {
        fields.vitals.spO2 = spo2Match[1];
      }

      const medMatch = line.match(
        /(?:^\d+.?\s*)?([a-zA-Z\s]+?)\s*[-:]?\s*(\d+\s*(?:mg|ml|tabs?|units?|caps?|gm))/i,
      );
      if (
        medMatch &&
        lowerLine.includes('medication') === false &&
        lowerLine.includes('temp') === false &&
        fields.medications.length < 10
      ) {
        const med: Medication = {
          name: medMatch[1].trim(),
          dosage: medMatch[2].trim(),
          frequency: '',
          route: '',
          duration: '',
        };

        const freqMatch = line.match(
          /(?:once|twice|thrice|1x|2x|3x|bd|tid|qid|qd|hs|sos)\s*(?:daily)?/i,
        );
        if (freqMatch) {
          med.frequency = freqMatch[0];
        }

        fields.medications.push(med);
      }

      if (lowerLine.includes('hemoglobin') || lowerLine.includes('hb')) {
        const valueMatch = line.match(/(\d+.?\d*)\s*(?:g\/dl|gm\/dl)?/i);
        if (valueMatch) {
          fields.labValues.hemoglobin = valueMatch[1];
        }
      }

      if (
        lowerLine.includes('glucose') ||
        lowerLine.includes('blood sugar') ||
        lowerLine.includes('bsl') ||
        lowerLine.includes('rbs') ||
        lowerLine.includes('fbs')
      ) {
        const valueMatch = line.match(/(\d+.?\d*)\s*(?:mg\/dl)?/i);
        if (valueMatch) {
          fields.labValues.glucose = valueMatch[1];
        }
      }

      if (lowerLine.includes('creatinine')) {
        const valueMatch = line.match(/(\d+.?\d*)\s*(?:mg\/dl)?/i);
        if (valueMatch) {
          fields.labValues.creatinine = valueMatch[1];
        }
      }

      if (
        (lowerLine.includes('diagnosis') ||
          lowerLine.includes('diagnosed') ||
          lowerLine.includes('imp:')) &&
        !fields.diagnosis
      ) {
        const diagMatch = line.match(/(?:diagnosis|imp)[:\s]+([^,]+)/i);
        if (diagMatch) {
          fields.diagnosis = diagMatch[1].trim();
        }
      }

      const namePrefixMatch = line.match(
        /(?:name|patient|pt)[:\s]+([a-z\s.]+)/i,
      );
      if (namePrefixMatch && !fields.firstName) {
        const fullName = namePrefixMatch[1].trim();
        const parts = fullName.split(' ');
        if (parts.length >= 1) fields.firstName = parts[0];
        if (parts.length >= 2) fields.lastName = parts.slice(1).join(' ');
      } else if (!fields.firstName && line.match(/^[A-Z][a-z]+\s[A-Z][a-z]+/)) {
        const commonHeaders = [
          'hospital',
          'clinic',
          'doctor',
          'dr.',
          'date',
          'age',
          'sex',
          'gender',
        ];
        if (!commonHeaders.some((h) => lowerLine.startsWith(h))) {
          const names = line.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
          if (names) {
            fields.firstName = names[1];
            fields.lastName = names[2];
          }
        }
      }

      if (!fields.gender || fields.gender === 'MALE') {
        if (
          lowerLine.match(/\b(?:sex|gender)[:\s]*f/i) ||
          lowerLine.match(/\bfemale\b/)
        ) {
          fields.gender = 'FEMALE';
        } else if (
          lowerLine.match(/\b(?:sex|gender)[:\s]*m/i) ||
          lowerLine.match(/\bmale\b/)
        ) {
          fields.gender = 'MALE';
        }
      }
    }

    return fields;
  }
}
