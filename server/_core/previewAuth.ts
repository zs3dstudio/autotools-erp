/**
 * Preview Auth — provides automatic login for Manus preview mode.
 * When DATABASE_URL is not set, this module:
 * 1. Adds a /api/preview-login endpoint that auto-creates a session
 * 2. Patches the context to return the preview admin user directly
 *
 * ONLY active when DATABASE_URL is not set. Never affects production.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express } from "express";
import { getPreviewDb, isPreviewMode } from "./previewDb";
import { previewGetUserByOpenId, previewUpsertUser } from "./previewDbAdapter";
import { sdk } from "./sdk";
import { getSessionCookieOptions } from "./cookies";

const PREVIEW_OPEN_ID = "preview-admin-001";
const PREVIEW_NAME = "Preview Admin";

export function registerPreviewAuthRoutes(app: Express) {
  if (!isPreviewMode()) return;

  console.log("[Preview] Preview auth routes registered");

  // Auto-login endpoint — redirects to / with a valid session cookie
  app.get("/api/preview-login", async (req, res) => {
    try {
      // Ensure preview user exists in SQLite
      let user = previewGetUserByOpenId(PREVIEW_OPEN_ID);
      if (!user) {
        previewUpsertUser({
          openId: PREVIEW_OPEN_ID,
          name: PREVIEW_NAME,
          email: "admin@autotools.demo",
          loginMethod: "preview",
          role: "admin",
          lastSignedIn: new Date(),
        });
        user = previewGetUserByOpenId(PREVIEW_OPEN_ID);
      }

      const sessionToken = await sdk.createSessionToken(PREVIEW_OPEN_ID, {
        name: PREVIEW_NAME,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Preview] Auto-login failed:", error);
      res.status(500).json({ error: "Preview login failed", details: String(error) });
    }
  });
}

/**
 * Authenticate a request in preview mode.
 * Returns the preview admin user if no valid session exists.
 */
export async function previewAuthenticateRequest(req: any): Promise<any | null> {
  if (!isPreviewMode()) return null;

  // Try to get user from preview DB based on session cookie
  try {
    const user = await sdk.authenticateRequest(req);
    if (user) return user;
  } catch {
    // No valid session — return preview admin automatically
  }

  // Auto-return preview admin for preview mode
  let user = previewGetUserByOpenId(PREVIEW_OPEN_ID);
  if (!user) {
    previewUpsertUser({
      openId: PREVIEW_OPEN_ID,
      name: PREVIEW_NAME,
      email: "admin@autotools.demo",
      loginMethod: "preview",
      role: "admin",
      lastSignedIn: new Date(),
    });
    user = previewGetUserByOpenId(PREVIEW_OPEN_ID);
  }
  return user;
}
