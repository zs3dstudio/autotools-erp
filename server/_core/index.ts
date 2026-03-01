import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerPreviewAuthRoutes } from "./previewAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getDb, initializeDatabase } from "../db";
// Phase-5: Daily snapshot cron job
import { startDailySnapshotCron } from "../cron/dailySnapshot";

function isPortAvailable(port: number ): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Initialize Database (SQLite auto-creation and seeding)
  try {
    await initializeDatabase();
    console.log("[Database] Initialized successfully");

    // Ensure SuperAdmin user exists
    const targetEmail = "meshcraftstudio@gmail.com";
    const db = await getDb();
    const { users } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const bcrypt = await import("bcryptjs");

    const existingUser = await db.select().from(users).where(eq(users.email, targetEmail)).limit(1);
    const temporaryPassword = "tempAdmin123!";
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    if (existingUser.length > 0) {
      console.log(`[SuperAdmin] Updating user ${targetEmail} to SuperAdmin role.`);
      await db.update(users)
        .set({ role: "SuperAdmin", passwordHash, name: "Meshcraft Studio Admin" })
        .where(eq(users.email, targetEmail));
    } else {
      console.log(`[SuperAdmin] Creating new SuperAdmin user: ${targetEmail}`);
      await db.insert(users).values({
        openId: `superadmin-${Date.now()}`,
        name: "Meshcraft Studio Admin",
        email: targetEmail,
        passwordHash,
        role: "SuperAdmin",
        isActive: 1 as any,
        loginMethod: "email",
      });
    }
    console.log(`[SuperAdmin] User ${targetEmail} is ready with temporary password: ${temporaryPassword}`);
  } catch (error) {
    console.error("[Database] Initialization or SuperAdmin setup failed:", error);
  }

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ─── Health check endpoint (used by Docker / load balancers) ───────────────
  app.get("/api/health", async (_req, res) => {
    try {
      const db = await getDb();
      const dbOk = db !== null;
      res.status(dbOk ? 200 : 503).json({
        status: dbOk ? "ok" : "degraded",
        db: dbOk ? "connected" : "unavailable",
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({ status: "error", timestamp: new Date().toISOString() });
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Preview auto-login under /api/preview-login
  registerPreviewAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[AutoTools ERP] Server running on http://localhost:${port}/` );
    console.log(`[AutoTools ERP] Environment: ${process.env.NODE_ENV ?? "development"}`);
    // Phase-5: Start daily snapshot cron job (runs at midnight every day)
    startDailySnapshotCron();
  });
}

startServer().catch(console.error);
