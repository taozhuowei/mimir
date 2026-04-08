/**
 * Scales Tarot API Server entry point
 * Imports the configured Express app and starts listening.
 * See app.ts for route/middleware setup.
 */

import app from './app'

const PORT = Number(process.env.PORT ?? 3000)

app.listen(PORT, () => {
  console.log(`[server] Scales Tarot API running on http://localhost:${PORT}`)
})

export default app
