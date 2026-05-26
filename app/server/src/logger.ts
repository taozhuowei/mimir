/**
 * Structured logger (pino)
 *
 * - prod  emits newline-delimited JSON to stdout; captured by systemd journald
 *         and consumable by log aggregators as-is.
 * - dev   pipes through pino-pretty for human-readable colorized output.
 *
 * pino-pretty is loaded lazily inside a try/catch: if the package isn't
 * present (e.g. in a slim prod image that only installed production deps),
 * we fall back to raw JSON rather than crashing.
 */

import pino, { type Logger, type LoggerOptions } from 'pino'
import { config } from './config'

function buildOptions(): LoggerOptions {
  const base: LoggerOptions = {
    level: config.logLevel,
    // Strip pino defaults that aren't useful in our deploy (pid/hostname
    // duplicate what journald already records).
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  }

  if (config.isProd) return base

  try {
    require.resolve('pino-pretty')
    return {
      ...base,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, singleLine: true, translateTime: 'HH:MM:ss.l' },
      },
    }
  } catch {
    return base
  }
}

export const logger: Logger = pino(buildOptions())
