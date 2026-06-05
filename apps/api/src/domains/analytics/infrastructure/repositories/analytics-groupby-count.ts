import { isRecord } from '@workspace/utils';

export function readGroupCount(
  row: Record<string, unknown>,
  key: 'id' | '_all',
): number {
  const countBlock = row._count;
  return isRecord(countBlock) && typeof countBlock[key] === 'number'
    ? countBlock[key]
    : 0;
}
