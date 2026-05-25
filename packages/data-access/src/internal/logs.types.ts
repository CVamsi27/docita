export interface InternalSystemLog {
  id: string;
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR" | "DEBUG";
  module: string;
  message: string;
  details?: string;
}

export interface InternalSystemLogsResult {
  logs: InternalSystemLog[];
  total: number;
}
