export interface ParsedRecipient {
  phoneNumber: string;
  name?: string;
}

export interface ParseCsvResult {
  recipients: ParsedRecipient[];
  skipped: { row: number; reason: string }[];
  totalRows: number;
}

const PHONE_HEADERS = ["phone", "phonenumber", "mobile", "number", "contact"];
const NAME_HEADERS = ["name", "fullname", "contactname", "businessname"];

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function parseRecipientsCsv(text: string): ParseCsvResult {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { recipients: [], skipped: [], totalRows: 0 };
  }

  const firstLine = lines[0];
  if (!firstLine) {
    return { recipients: [], skipped: [], totalRows: 0 };
  }

  const firstCells = splitCsvLine(firstLine);
  const headerCells = firstCells.map((cell) => normalizeHeader(cell));
  const hasHeader = headerCells.some((cell) =>
    [...PHONE_HEADERS, ...NAME_HEADERS].includes(cell),
  );

  let phoneIndex = 0;
  let nameIndex = -1;
  let dataStart = 0;

  if (hasHeader) {
    phoneIndex = headerCells.findIndex((cell) => PHONE_HEADERS.includes(cell));
    if (phoneIndex < 0) {
      phoneIndex = 0;
    }
    nameIndex = headerCells.findIndex((cell) => NAME_HEADERS.includes(cell));
    dataStart = 1;
  }

  const recipients: ParsedRecipient[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const seen = new Set<string>();

  for (let rowIndex = dataStart; rowIndex < lines.length; rowIndex += 1) {
    const line = lines[rowIndex];
    if (!line) continue;
    const cells = splitCsvLine(line);
    const phoneRaw = cells[phoneIndex];
    if (!phoneRaw) {
      skipped.push({ row: rowIndex + 1, reason: "Missing phone number" });
      continue;
    }

    if (!isValidPhone(phoneRaw)) {
      skipped.push({
        row: rowIndex + 1,
        reason: `Invalid phone: ${phoneRaw}`,
      });
      continue;
    }

    const digits = phoneRaw.replace(/\D/g, "");
    const normalized = digits.length === 10 ? `91${digits}` : digits;

    if (seen.has(normalized)) {
      skipped.push({
        row: rowIndex + 1,
        reason: `Duplicate phone: ${normalized}`,
      });
      continue;
    }

    seen.add(normalized);

    const name =
      nameIndex >= 0 ? cells[nameIndex]?.trim() : undefined;

    recipients.push({
      phoneNumber: normalized,
      name: name && name.length > 0 ? name : undefined,
    });
  }

  return {
    recipients,
    skipped,
    totalRows: lines.length - dataStart,
  };
}
