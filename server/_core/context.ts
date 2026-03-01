/**
 * tRPC Context — Phase-3 Multi-Branch Access Control with Preview Auto-Login
 * 
 * In preview mode, automatically authenticate as SuperAdmin for demo purposes.
 * Users can still log in with email/password if desired.
 */
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../db";
import { sdk } from "./sdk";
import { isPreviewMode } from "./previewDb";
import { previewGetUserByOpenId } from "./previewDbAdapter";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: (User & { branchId?: number | null; permissions?: any }) | null;
};



export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {


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
        const { getUserByOpenId } = await import("../db");
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
