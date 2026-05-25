import type { SystemLogEntry } from '@workspace/types';

export interface InternalLogFilters {
  level?: SystemLogEntry['level'];
  module?: string;
  q?: string;
}

export interface InternalLogQueryResult {
  data: SystemLogEntry[];
  total: number;
}
