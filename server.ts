import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { dbStore } from "./server/store";
import { checkDatabase, flushStore, initializeDatabase, persistStore } from "./server/database";
import { authConfigured, authStatus, authTableReady, initializeAuth, requireAuth } from "./server/auth";
import { emitChange } from "./server/events";
import { logIntegrationsStatus } from "./server/integrations";
import { initSettings } from "./server/settings";
import { ensureAuditSchema, recordAudit } from "./server/audit";
import { startReminderScheduler, registerReminderRoutes } from "./server/reminders";
import { registerPublicRoutes } from "./server/routes/public";
import { registerSystemRoutes } from "./server/routes/system";
import { registerInboxRoutes } from "./server/routes/inbox";
import { registerCollectionRoutes } from "./server/routes/collections";
import { registerPatientRoutes } from "./server/routes/patients";
import { registerAppointmentRoutes } from "./server/routes/appointments";
import { registerCareRoutes } from "./server/routes/care";
import { registerSalesRoutes } from "./server/routes/sales";
import { registerBillingRoutes } from "./server/routes/billing";
import { registerCommsRoutes } from "./server/routes/comms";
import { registerAiRoutes } from "./server/routes/ai";
import { registerExportRoutes } from "./server/routes/export";
import { registerNotificationRoutes } from "./server/routes/notifications";

dotenv.config();

/**
 * Builds the Express application (all middleware + routes) WITHOUT binding a
 * port, initialising the database, or printing startup diagnostics — those live
 * in `startServer()`. Tests import this directly with `{ serveClient: false }`
 * so no Vite dev server / static handler is attached.
 *
 * Route handlers live in `server/routes/*` and are wired up here in order:
 * public (pre-auth) → `requireAuth` → audit → authenticated groups → client.
 */
export async function createApp(opts: { serveClient?: boolean } = {}): Promise<express.Express> {
  const serveClient = opts.serveClient !== false;
  const app = express();

  // Running behind nginx/one reverse proxy: use X-Forwarded-For so req.ip is the
  // real client (rate limiting + audit logs) instead of 127.0.0.1.
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

  // CSP: allows what the app actually uses (Google Fonts, VietQR/QR images,
  // same-origin API + SSE, Vite HMR ws in dev) and blocks the rest.
  const devCsp = process.env.NODE_ENV !== 'production';
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", ...(devCsp ? ["'unsafe-eval'"] : [])],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: devCsp ? null : [],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1200,
    standardHeaders: true,
    legacyHeaders: false,
    // The realtime stream is one long-lived connection that reconnects on drop —
    // don't let it burn the per-IP budget for the rest of the app.
    skip: (req) => req.path === '/api/stream',
  }));
  // Keep the raw body around so webhook HMAC signatures can be verified.
  app.use(express.json({ limit: '2mb', verify: (req: any, _res, buf) => { req.rawBody = buf; } }));

  // Persist every successful write request after handlers complete, and notify
  // connected CRM clients so their views refresh in real time.
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') || req.method === 'GET') return next();
    res.on('finish', () => {
      if (res.statusCode < 400) {
        void persistStore();
        emitChange({ type: 'store', path: req.path, method: req.method });
      }
    });
    next();
  });

  // Lightweight in-memory request log (headers only — spoofable, kept for the
  // legacy /api/system/audit-logs memory fallback).
  app.use((req, _res, next) => {
    if (req.path.startsWith("/api") && req.method !== "GET") {
      const userHeader = req.headers["x-user-id"] as string || "system";
      const userNameHeader = decodeURIComponent(req.headers["x-user-name"] as string || "Nhân viên VitHospital");
      const roleHeader = decodeURIComponent(req.headers["x-user-role"] as string || "Staff");
      const safeBody = { ...req.body };
      for (const key of ['password', 'password_hash', 'token', 'accessToken', 'secret', 'apiKey']) delete safeBody[key];
      dbStore.addAuditLog(userHeader, userNameHeader, roleHeader, `${req.method} ${req.path}`, "API Gateway", `Payload: ${JSON.stringify(safeBody).slice(0, 100)}...`);
    }
    next();
  });

  // ---- Public routes (no staff bearer token) ----
  registerPublicRoutes(app);

  // ---- Everything below requires a valid staff session ----
  app.use('/api', requireAuth);

  // Persist every authenticated write to the append-only audit_log table, keyed
  // by the VERIFIED session user (not spoofable headers).
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api') && req.method !== 'GET' && req.authUser) {
      const safeBody = { ...(req.body || {}) };
      for (const k of ['password', 'password_hash', 'token', 'accessToken', 'secret', 'apiKey', 'value', 'values']) delete safeBody[k];
      recordAudit({
        userId: req.authUser.id, userName: req.authUser.name, role: req.authUser.role,
        action: `${req.method} ${req.path}`, module: 'API',
        details: JSON.stringify(safeBody).slice(0, 300),
        ip: req.ip,
      });
    }
    next();
  });

  registerSystemRoutes(app);
  registerInboxRoutes(app);
  registerCollectionRoutes(app);
  registerPatientRoutes(app);
  registerAppointmentRoutes(app);
  registerCareRoutes(app);
  registerSalesRoutes(app);
  registerBillingRoutes(app);
  registerCommsRoutes(app);
  registerAiRoutes(app);
  registerExportRoutes(app);
  registerNotificationRoutes(app);
  registerReminderRoutes(app);

  startReminderScheduler();

  // ---- Vite dev middleware / static client ----
  if (serveClient && process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (serveClient) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

async function startServer() {
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';
  const authState = authStatus();
  console.log('=======================================================');
  console.log('VitCRM startup diagnostics');
  console.log(`  NODE_ENV              : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  DATABASE_URL          : ${process.env.DATABASE_URL ? 'set' : 'MISSING'}`);
  console.log(`  DATABASE_SSL          : ${process.env.DATABASE_SSL || '(unset → no SSL)'}`);
  console.log(`  JWT_SECRET            : ${process.env.JWT_SECRET ? 'set' : 'MISSING'}`);
  console.log(`  AUTH_BOOTSTRAP_EMAIL  : ${process.env.AUTH_BOOTSTRAP_EMAIL ? 'set' : 'MISSING'}`);
  console.log(`  AUTH_BOOTSTRAP_PASSWORD: ${process.env.AUTH_BOOTSTRAP_PASSWORD ? 'set' : 'MISSING'}`);
  if (authState.missing.length) {
    console.log(`  ⚠ Missing for full auth : ${authState.missing.join(', ')}`);
  }
  console.log('=======================================================');

  if (isProd && authState.missing.length) {
    throw new Error(
      `Production requires these environment variables but they are missing: ${authState.missing.join(', ')}. ` +
      `Set them (e.g. in the VPS .env / systemd unit) and restart.`
    );
  }

  try {
    await initializeDatabase();
  } catch (error: any) {
    console.error('[startup] Database initialization failed:', error.message);
    console.error('[startup] Common causes: wrong DATABASE_URL credentials/host, or the database requires TLS — set DATABASE_SSL="true".');
    throw error;
  }
  try {
    await initializeAuth();
  } catch (error: any) {
    console.error('[startup] initializeAuth failed — auth_users / bootstrap admin NOT ready:', error.message);
    console.error('[startup] Fix the DB error above, or run `npm run init:auth` against the same DATABASE_URL, then restart.');
    throw error;
  }

  try {
    await initSettings();
  } catch (error: any) {
    console.error('[startup] initSettings failed (app_settings table) — using .env only:', error.message);
  }
  try {
    await ensureAuditSchema();
  } catch (error: any) {
    console.error('[startup] ensureAuditSchema failed — audit_log not persisted:', error.message);
  }

  const dbState = await checkDatabase();
  const tableReady = await authTableReady();
  console.log(`[startup] Database: configured=${dbState.configured} connected=${dbState.connected}${dbState.error ? ` error="${dbState.error}"` : ''}`);
  console.log(`[startup] Authentication: ${authConfigured ? 'ENABLED' : 'DISABLED (login will 503)'} | auth_users table: ${tableReady ? 'present' : 'MISSING'}`);
  console.log('=======================================================');
  logIntegrationsStatus();
  console.log('=======================================================');

  const app = await createApp();
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`=======================================================`);
    console.log(`VitHospital Healthcare Management Server running on port ${PORT}`);
    console.log(`Live Backend Endpoints ready on http://0.0.0.0:${PORT}/api/health`);
    console.log(`=======================================================`);
  });

  // Graceful shutdown: on PM2 reload / deploy, stop accepting connections and
  // make sure the last store write reaches Postgres before exiting.
  let shuttingDown = false;
  for (const sig of ['SIGTERM', 'SIGINT'] as const) {
    process.on(sig, () => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[shutdown] ${sig} received — draining...`);
      // Hard-exit backstop if connections don't drain (keep-alive, slow client).
      const kill = setTimeout(() => { console.warn('[shutdown] forced exit'); process.exit(0); }, 8000);
      server.close(async () => {
        try { await flushStore(); } catch { /* logged in database.ts */ }
        clearTimeout(kill);
        process.exit(0);
      });
    });
  }
}

// Don't auto-boot when imported by the test runner (Vitest sets VITEST=true).
if (!process.env.VITEST) {
  startServer().catch(error => {
    console.error('VitCRM startup failed:', error);
    process.exit(1);
  });
}
