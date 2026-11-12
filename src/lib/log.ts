export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string | null;
  route?: string;
  durationMs?: number;
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function minimumLevel(): number {
  const configured = process.env.LOG_LEVEL?.toLowerCase();
  if (configured && configured in LEVEL_ORDER) {
    return LEVEL_ORDER[configured as LogLevel];
  }
  return LEVEL_ORDER.info;
}

function emit(level: LogLevel, message: string, context: LogContext = {}): void {
  if (LEVEL_ORDER[level] < minimumLevel()) return;

  const record: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
  };

  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined) record[key] = value;
  }

  let line: string;
  try {
    line = JSON.stringify(record);
  } catch {
    line = JSON.stringify({
      ts: record.ts,
      level,
      msg: message,
      logError: "context could not be serialized",
    });
  }

  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const log = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown";
}
