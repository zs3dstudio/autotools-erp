/**
 * tRPC Context — Phase-3 Multi-Branch Access Control with Preview Auto-Login
 * 
 * In preview mode, automatically authenticate as SuperAdmin for demo purposes.
 * Users can still log in with email/password if desired.
 */
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { isPreviewMode } from "./previewDb";
import { previewGetUserByOpenId } from "./previewDbAdapter";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: (User & { branchId?: number | null; permissions?: any }) | null;
};

import { getDb, getUserByOpenId } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const SUPERADMIN_EMAIL = "meshcraftstudio@gmail.com";
const TEMP_PASSWORD = "Meshcraft123"; // User must change this immediately

async function ensureSuperAdminExists() {
  try {
    const db = await getDb();
    const existingUser = await db.select().from(users).where(eq(users.email, SUPERADMIN_EMAIL)).limit(1);

    if (existingUser.length === 0) {
      // User does not exist, create them
      const hashedPassword = await bcrypt.hash(TEMP_PASSWORD, 10);
      // Use a deterministic openId based on email to avoid constraint violations
      const deterministicOpenId = `superadmin-meshcraft-${SUPERADMIN_EMAIL.split('@')[0]}`;
      
      await db.insert(users).values({
        openId: deterministicOpenId,
        name: "Meshcraft Studio Admin",
        email: SUPERADMIN_EMAIL,
        passwordHash: hashedPassword,
        role: "SuperAdmin",
        isActive: 1,
        branchId: 1,
        loginMethod: "local",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      });
      console.log(`[SuperAdmin] Created SuperAdmin user: ${SUPERADMIN_EMAIL}`);
    } else if (existingUser[0].role !== "SuperAdmin") {
      // User exists but is not SuperAdmin, update their role
      await db.update(users).set({ role: "SuperAdmin" }).where(eq(users.email, SUPERADMIN_EMAIL));
      console.log(`[SuperAdmin] Updated user ${SUPERADMIN_EMAIL} to SuperAdmin role.`);
    } else {
      console.log(`[SuperAdmin] SuperAdmin user already exists: ${SUPERADMIN_EMAIL}`);
    }
  } catch (error) {
    console.error(`[SuperAdmin] Error ensuring SuperAdmin exists:`, error);
    throw error;
  }
}

// This flag ensures the SuperAdmin creation/update logic runs only once per application startup
let superAdminEnsured = false;

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  if (!superAdminEnsured) {
    await ensureSuperAdminExists();
    superAdminEnsured = true;
  }

  let user: any = null;

  if (isPreviewMode()) {
    // In preview mode, try to authenticate via session cookie first
    try {
      const sessionUser = await sdk.authenticateRequest(opts.req);
      if (sessionUser) {
        // Enrich with full user data from SQLite (includes branchId, role, etc.)
        const fullUser = previewGetUserByOpenId((sessionUser as any).openId ?? (sessionUser as any).id);
        user = fullUser ?? sessionUser;
      }
    } catch {
      // No valid session — fall through to auto-login
    }

    // Auto-login as SuperAdmin if no session exists
    // if (!user) {
    //   const superAdmin = previewGetUserByOpenId("preview-superadmin-001");
    //   if (superAdmin) {
    //     user = superAdmin;
    //   }
    // }
  } else {
    // Production: authenticate via session cookie
    try {
      const sessionUser = await sdk.authenticateRequest(opts.req);
      if (sessionUser) {
        // Enrich with full user data from MySQL
        // getUserByOpenId is already imported at the top
        user = await getUserByOpenId((sessionUser as any).openId ?? (sessionUser as any).id) ?? sessionUser;
      }
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

