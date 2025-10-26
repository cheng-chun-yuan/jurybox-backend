/**
 * Logger Utility
 * Centralized logging with support for different levels and structured output
 */

import pino from 'pino'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LoggerConfig {
  level: LogLevel
  prettyPrint: boolean
}

class Logger {
  private logger: pino.Logger

  constructor(config: LoggerConfig) {
    this.logger = pino({
      level: config.level,
      ...(config.prettyPrint && {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }),
    })
  }

  debug(message: string, meta?: object) {
    this.logger.debug(meta, message)
  }

  info(message: string, meta?: object) {
    this.logger.info(meta, message)
  }

  warn(message: string, meta?: object) {
    this.logger.warn(meta, message)
  }

  error(message: string, error?: Error | unknown, meta?: object) {
    if (error instanceof Error) {
      this.logger.error({ ...meta, err: error }, message)
    } else {
      this.logger.error({ ...meta, error }, message)
    }
  }

  fatal(message: string, error?: Error | unknown, meta?: object) {
    if (error instanceof Error) {
      this.logger.fatal({ ...meta, err: error }, message)
    } else {
      this.logger.fatal({ ...meta, error }, message)
    }
  }

  child(bindings: object) {
    return new Logger({
      level: this.logger.level as LogLevel,
      prettyPrint: false,
    })
  }
}

// Singleton instance
let logger: Logger | null = null

export function createLogger(config: LoggerConfig): Logger {
  logger = new Logger(config)
  return logger
}

export function getLogger(): Logger {
  if (!logger) {
    // Default configuration if not initialized
    logger = new Logger({
      level: 'info',
      prettyPrint: process.env.NODE_ENV !== 'production',
    })
  }
  return logger
}

export { Logger }
