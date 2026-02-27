/**
 * Phase-5 Daily Summary Router
 *
 * Manages automated daily business snapshots:
 * - List historical summaries
 * - Get a specific date's summary
 * - Manually trigger snapshot generation (admin only)
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { isPreviewMode } from "../_core/previewDb";
import { hasGlobalAccess } from "../_core/permissions";
import {
  previewGetDailySummaries,
  previewGetDailySummaryByDate,
  previewGenerateDailySnapshot,
} from "../_core/previewDbAdapterPhase5";

export const dailySummaryRouter = router({
  /**
   * List historical daily summaries
   */
  list: protectedProcedure
    .input(
      z.object({
        from: z.string().optional(), // YYYY-MM-DD
        to: z.string().optional(),
        limit: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      if (isPreviewMode()) {
        return previewGetDailySummaries({
          from: input?.from,
          to: input?.to,
          limit: input?.limit ?? 30,
        });
      }
      const { getDailySummaries } = await import("../db.phase5");
      return getDailySummaries({
        from: input?.from,
        to: input?.to,
        limit: input?.limit ?? 30,
      });
    }),

  /**
   * Get a specific date's summary
   */
  byDate: protectedProcedure
    .input(z.object({ date: z.string() })) // YYYY-MM-DD
    .query(async ({ input, ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      if (isPreviewMode()) {
        return previewGetDailySummaryByDate(input.date);
      }
      const { getDailySummaryByDate } = await import("../db.phase5");
      return getDailySummaryByDate(input.date);
    }),

  /**
   * Manually trigger daily snapshot generation for a specific date
   * Admin only — useful for backfilling or testing
   */
  generate: protectedProcedure
    .input(
      z.object({
        date: z.string().optional(), // YYYY-MM-DD, defaults to today
      }).optional()
    )
    .mutation(async ({ input, ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      if (isPreviewMode()) {
        const result = previewGenerateDailySnapshot(input?.date);
        return { success: true, summary: result };
      }
      const { generateDailySnapshot } = await import("../db.phase5");
      const result = await generateDailySnapshot(input?.date);
      return { success: true, summary: result };
    }),
});
