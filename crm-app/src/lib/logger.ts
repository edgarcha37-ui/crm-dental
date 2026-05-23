import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  base: { service: 'crm-dental' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service' },
        },
      }),
});

export function logApiError(route: string, err: unknown, extra?: Record<string, unknown>) {
  const error = err instanceof Error ? { msg: err.message, stack: err.stack } : { msg: String(err) };
  logger.error({ route, ...extra, err: error });
}

export function logApiInfo(route: string, msg: string, extra?: Record<string, unknown>) {
  logger.info({ route, ...extra }, msg);
}
