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
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
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

async function ensureSuperAdmin() {
  try {
    const db = await getDb();
    const adminEmail = "meshcraftstudio@gmail.com";
    const adminPassword = "Meshcraft123";
    
    console.log(`[SuperAdmin] Checking for user: ${adminEmail}`);
    
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    if (existingAdmin.length === 0) {
      console.log("[SuperAdmin] Creating new SuperAdmin user...");
      // Use a deterministic openId based on email to avoid constraint violations
      const deterministicOpenId = `superadmin-meshcraft-${adminEmail.split('@')[0]}`;
      await db.insert(users).values({
        openId: deterministicOpenId,
        email: adminEmail,
        passwordHash: hashedPassword,
        role: "SuperAdmin",
        name: "Meshcraft Studio Admin",
        isActive: 1,
        branchId: 1,
        loginMethod: "local",
        createdAt: new Date().toISOString() as any,
        updatedAt: new Date().toISOString() as any,
        lastSignedIn: new Date().toISOString() as any,
      });
      console.log("[SuperAdmin] SuperAdmin user created successfully.");
    } else {
      console.log("[SuperAdmin] SuperAdmin user already exists. Updating password and role...");
      await db.update(users)
        .set({ 
          passwordHash: hashedPassword,
          role: "SuperAdmin",
          updatedAt: new Date().toISOString() as any
        })
        .where(eq(users.email, adminEmail));
      console.log("[SuperAdmin] SuperAdmin user updated successfully.");
    }
  } catch (error) {
    console.error("[SuperAdmin] Error ensuring SuperAdmin user:", error);
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Initialize database and ensure SuperAdmin
  try {
    await initializeDatabase();
    await ensureSuperAdmin();
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }

  // Health check endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      const db = await getDb();
      const dbOk = !!db;
      res.json({
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
