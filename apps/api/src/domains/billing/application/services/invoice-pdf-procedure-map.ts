export function buildProcedureCptMap(
  procedures:
    | Array<{
        description: string;
        cptCode: { code: string; description: string } | null;
      }>
    | null
    | undefined,
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!procedures) return map;
  for (const procedure of procedures) {
    if (procedure.cptCode?.code) {
      map[procedure.description] = procedure.cptCode.code;
    }
  }
  return map;
}
