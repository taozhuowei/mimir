/**
 * Server entry point
 *
 * Responsibilities beyond app.ts:
 *   - Bind to the configured host/port
 *   - In dev, fall forward to the next free port (3000 → 3001 → …) so
 *     concurrent watch builds don't collide with a stale instance.
 *   - In prod, fail loudly if the port is taken — systemd/k8s handle retry
 *     and we never want to silently drift to a different port in prod.
 *   - Handle SIGTERM / SIGINT with graceful shutdown: stop accepting new
 *     connections, let in-flight requests finish, then exit. Force-exit
 *     after SHUTDOWN_TIMEOUT_MS if any request hangs.
 */

import net from 'net'
import type { Server } from 'http'
import app from './app'
import { config } from './config'
import { logger } from './logger'

const SHUTDOWN_TIMEOUT_MS = 10_000
const DEV_PORT_RETRY = 3

function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise(resolve => {
    const probe = net.createServer()
    probe.once('error', () => resolve(false))
    probe.once('listening', () => probe.close(() => resolve(true)))
    probe.listen(port, host)
  })
}

async function resolveDevPort(preferred: number, host: string): Promise<number | null> {
  for (let i = 0; i <= DEV_PORT_RETRY; i++) {
    const port = preferred + i
    if (await isPortAvailable(port, host)) return port
    logger.warn({ port }, 'port occupied, trying next')
  }
  return null
}

function installShutdownHandlers(server: Server): void {
  let shuttingDown = false

  const handle = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, 'shutdown initiated')

    const force = setTimeout(() => {
      logger.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'shutdown timeout — forcing exit')
      process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)
    // Allow the process to exit naturally once the server closes.
    force.unref()

    server.close(err => {
      if (err) {
        logger.error({ err }, 'server close errored')
        process.exit(1)
      }
      logger.info('shutdown complete')
      process.exit(0)
    })
  }

  process.on('SIGTERM', handle)
  process.on('SIGINT', handle)
}

async function start(): Promise<void> {
  const { host, port: preferredPort, isProd, nodeEnv } = config

  let port = preferredPort
  if (!isProd) {
    const resolved = await resolveDevPort(preferredPort, host)
    if (resolved === null) {
      logger.error(
        { preferredPort, retries: DEV_PORT_RETRY },
        'no free port after retries',
      )
      process.exit(1)
    }
    port = resolved
  } else if (!(await isPortAvailable(preferredPort, host))) {
    // In prod: no retry dance. systemd restarts or the operator investigates.
    logger.error({ host, port: preferredPort }, 'port is occupied; aborting')
    process.exit(1)
  }

  const server = app.listen(port, host, () => {
    logger.info({ host, port, nodeEnv }, 'server listening')
  })

  server.on('error', err => {
    logger.error({ err }, 'server error')
    process.exit(1)
  })

  installShutdownHandlers(server)
}

start().catch(err => {
  logger.error({ err }, 'startup failed')
  process.exit(1)
})
