import { Injectable, Logger } from '@nestjs/common';
import { IcdCode, CptCode } from '@workspace/db';

type NlmSearchResponse = [number, string[], null, string[][]];

const ICD_CATEGORY_MAP: Record<string, string> = {
  A: 'Infectious Diseases',
  B: 'Infectious Diseases',
  C: 'Neoplasms',
  D: 'Neoplasms',
  E: 'Endocrine',
  F: 'Mental Health',
  G: 'Nervous System',
  H: 'Eye and Ear',
  I: 'Circulatory',
  J: 'Respiratory',
  K: 'Digestive',
  L: 'Skin',
  M: 'Musculoskeletal',
  N: 'Genitourinary',
  O: 'Pregnancy',
  P: 'Perinatal',
  Q: 'Congenital',
  R: 'Symptoms',
  S: 'Injury',
  T: 'Injury',
  V: 'External Causes',
  W: 'External Causes',
  X: 'External Causes',
  Y: 'External Causes',
  Z: 'Health Factors',
};

function cptCategory(code: string): string {
  const num = parseInt(code, 10);
  if (num >= 99202 && num <= 99499) return 'Evaluation and Management';
  if (num >= 10004 && num <= 69990) return 'Surgery';
  if (num >= 70010 && num <= 79999) return 'Radiology';
  if (num >= 80047 && num <= 89398) return 'Laboratory';
  if (num >= 90281 && num <= 99199) return 'Medicine';
  if (num >= 100 && num <= 1999) return 'Anesthesia';
  return 'Other';
}

const NLM_ICD_URL = 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search';
const NLM_CPT_URL = 'https://clinicaltables.nlm.nih.gov/api/cpt/v3/search';

const SYNTHETIC_DATE = new Date(0).toISOString();

@Injectable()
export class NlmCodingService {
  private readonly logger = new Logger(NlmCodingService.name);

  async searchIcdCodes(query: string): Promise<IcdCode[]> {
    if (!query?.trim()) return [];
    try {
      const url = new URL(NLM_ICD_URL);
      url.searchParams.set('terms', query.trim());
      url.searchParams.set('maxList', '20');
      url.searchParams.set('df', 'code,name');
      const res = await fetch(url.toString());
      if (!res.ok) {
        this.logger.warn(`NLM ICD search returned ${res.status}`);
        return [];
      }
      const data = (await res.json()) as NlmSearchResponse;
      const displayStrings = data[3] ?? [];
      return displayStrings.map(([code, name]) => ({
        id: code,
        code,
        description: name,
        category: ICD_CATEGORY_MAP[code[0].toUpperCase()] ?? 'Other',
        version: 'ICD-10',
        isCommon: false,
        createdAt: SYNTHETIC_DATE,
        updatedAt: SYNTHETIC_DATE,
      })) as unknown as IcdCode[];
    } catch (err) {
      this.logger.error(
        'NLM ICD search failed',
        err instanceof Error ? err.stack : String(err),
      );
      return [];
    }
  }

  async searchCptCodes(query: string): Promise<CptCode[]> {
    if (!query?.trim()) return [];
    try {
      const url = new URL(NLM_CPT_URL);
      url.searchParams.set('terms', query.trim());
      url.searchParams.set('maxList', '20');
      url.searchParams.set('df', 'code,name');
      const res = await fetch(url.toString());
      if (!res.ok) {
        this.logger.warn(`NLM CPT search returned ${res.status}`);
        return [];
      }
      const data = (await res.json()) as NlmSearchResponse;
      const displayStrings = data[3] ?? [];
      return displayStrings.map(([code, name]) => ({
        id: code,
        code,
        description: name,
        category: cptCategory(code),
        isCommon: false,
        price: 0,
        createdAt: SYNTHETIC_DATE,
        updatedAt: SYNTHETIC_DATE,
      })) as unknown as CptCode[];
    } catch (err) {
      this.logger.error(
        'NLM CPT search failed',
        err instanceof Error ? err.stack : String(err),
      );
      return [];
    }
  }
}
