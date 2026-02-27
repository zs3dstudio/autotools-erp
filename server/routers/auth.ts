/**
 * Auth Router — Phase-3 Email/Password Authentication
 * Handles login, logout, and session management.
 * Replaces the preview auto-login with real email/password auth.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { isPreviewMode } from "../_core/previewDb";
import {
  previewGetUserByEmail,
  previewGetUserPermissions,
  previewGetUserByOpenId,
  getDefaultPermissionsForRole,
} from "../_core/previewDbAdapter";
import { sdk } from "../_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

export const authRouter = router({
  /**
   * Login with email and password
   * Returns user info and sets session cookie
   */
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // Use SQLite (preview mode) for local development
      if (isPreviewMode()) {
        // SQLite mode: look up user by email in local database
        const user = previewGetUserByEmail(input.email);

        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        if (!user.isActive) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Your account has been disabled. Please contact your administrator." });
        }

        // Verify password
        let passwordValid = false;
        try {
          const bcrypt = await import("bcryptjs");
          passwordValid = await bcrypt.compare(input.password, user.passwordHash ?? "");
        } catch (error) {
          console.error("[Auth] Password comparison error:", error);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        if (!passwordValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        // Create session token
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name ?? "User",
          expiresInMs: ONE_YEAR_MS,
        });

        // Set cookie
        const cookieOptions = getSessionCookieOptions((ctx as any).req);
        (ctx as any).res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        // Get permissions
        const permissions = previewGetUserPermissions(user.id) ?? getDefaultPermissionsForRole(user.role);

        const { passwordHash, ...safeUser } = user;
        return {
          success: true,
          user: { ...safeUser, permissions },
          redirectTo: getRoleRedirect(user.role),
        };
      }

      // Production MySQL path
      const { getUserByEmail, addAuditLog } = await import("../db");
      const user = await getUserByEmail(input.email);

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      if (!user.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your account has been disabled. Please contact your administrator." });
      }

      const bcrypt = await import("bcryptjs");
      const passwordValid = await bcrypt.compare(input.password, user.passwordHash ?? "");
      if (!passwordValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name ?? "User",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions((ctx as any).req);
      (ctx as any).res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      await addAuditLog({
        userId: user.id,
        userName: user.name ?? undefined,
        userEmail: user.email ?? undefined,
        action: "LOGIN",
        entityType: "User",
        entityId: String(user.id),
        details: "User logged in",
      });

      const { getUserPermissions } = await import("../db");
      const permissions = await getUserPermissions(user.id) ?? getDefaultPermissionsForRole(user.role);
      const { passwordHash, ...safeUser } = user as any;
      return {
        success: true,
        user: { ...safeUser, permissions },
        redirectTo: getRoleRedirect(user.role),
      };
    }),

  /**
   * Logout — clears session cookie
   */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    (ctx as any).res.clearCookie(COOKIE_NAME);
    return { success: true };
  }),

  /**
   * Get current user from session.
   * Uses publicProcedure (not protectedProcedure) so it returns null when
   * unauthenticated instead of throwing a 401 error. This prevents React Query
   * from entering an error/retry loop on the login page, and allows App.tsx
   * to render the login form when user is null.
   */
  me: publicProcedure.query(async ({ ctx }) => {
    return (ctx as any).user ?? null;
  }),
});

function getRoleRedirect(role: string): string {
  switch (role) {
    case "SuperAdmin":
    case "Admin":
      return "/dashboard";
    case "BranchManager":
      return "/branch-dashboard";
    case "POSUser":
      return "/pos";
    default:
      return "/dashboard";
  }
}
