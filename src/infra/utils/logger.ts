import { createLogger, format, transports } from 'winston';

const { combine, timestamp, colorize, printf, json, errors } = format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, requestId, userId, method, path, statusCode, durationMs, stack, ...rest }) => {
    const reqId  = requestId  ? ` [${(requestId as string).slice(0, 8)}]` : '';
    const user   = userId     ? ` uid=${userId}`                          : '';
    const route  = method && path ? ` ${method} ${path}`                  : '';
    const status = statusCode ? ` → ${statusCode}`                        : '';
    const dur    = durationMs !== undefined ? ` ${durationMs}ms`          : '';

    const skip = new Set(['service']);
    const extra = Object.entries(rest)
      .filter(([k, v]) => !skip.has(k) && v !== undefined)
      .map(([k, v]) => ` ${k}=${JSON.stringify(v)}`)
      .join('');

    let line = `[${ts}] ${level}${reqId}${user}${route}${status}${dur} — ${message}${extra}`;
    if (stack) line += `\n${stack}`;
    return line;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

export const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  defaultMeta: { service: 'financial-api' },
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new transports.Console()],
});
