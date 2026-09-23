import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const REDIS_URL = process.env.REDIS_URL

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Managed Postgres (Render, Neon, …) requires TLS; local Docker does not
    databaseDriverOptions:
      process.env.DATABASE_SSL === 'true'
        ? { connection: { ssl: { rejectUnauthorized: false } } }
        : {},
    redisUrl: REDIS_URL,
    // "shared" runs API and background jobs in one service (fine for a single Render instance)
    workerMode: (process.env.MEDUSA_WORKER_MODE as 'shared' | 'worker' | 'server') || 'shared',
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  admin: {
    // The admin dashboard is served by this same service at /app
    disable: process.env.DISABLE_MEDUSA_ADMIN === 'true',
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },
  // With Redis available, use it for events, job scheduling and the workflow engine
  // (the in-memory defaults do not survive a restart and cannot scale past one instance)
  modules: REDIS_URL
    ? [
        { resolve: '@medusajs/medusa/event-bus-redis', options: { redisUrl: REDIS_URL } },
        { resolve: '@medusajs/medusa/workflow-engine-redis', options: { redis: { url: REDIS_URL } } },
        {
          resolve: '@medusajs/medusa/locking',
          options: {
            providers: [
              { resolve: '@medusajs/medusa/locking-redis', id: 'locking-redis', is_default: true, options: { redisUrl: REDIS_URL } },
            ],
          },
        },
      ]
    : [],
})
