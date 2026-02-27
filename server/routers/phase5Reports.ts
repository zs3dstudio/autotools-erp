/**
 * Phase-5 Advanced Reporting Router
 *
 * Covers:
 * 1. Daily Sales Report (per branch / all branches)
 * 2. Monthly Revenue Report
 * 3. Profit Breakdown Report (company, branch, master share, investor distribution)
 * 4. Supplier Payables Report
 * 5. Branch Outstanding Payments Report
 * 6. Branch Performance Comparison
 * 7. Top Customers Report
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { isPreviewMode } from "../_core/previewDb";
import { hasGlobalAccess } from "../_core/permissions";
import {
  previewGetDailySalesReport,
  previewGetMonthlyRevenueReport,
  previewGetProfitBreakdownReport,
  previewGetSupplierPayablesReport,
  previewGetBranchOutstandingReport,
  previewGetBranchPerformanceReport,
  previewGetTopCustomers,
} from "../_core/previewDbAdapterPhase5";

function requireAdmin(user: any) {
  if (!hasGlobalAccess(user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This action requires Admin or SuperAdmin access",
    });
  }
}

export const phase5ReportsRouter = router({
  /**
   * Daily Sales Report — filterable by date range and branch
   */
  dailySales: protectedProcedure
    .input(
      z.object({
        branchId: z.number().optional(),
        from: z.string().optional(), // YYYY-MM-DD
        to: z.string().optional(),   // YYYY-MM-DD
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      if (isPreviewMode()) {
        return previewGetDailySalesReport({
          branchId: input?.branchId,
          from: input?.from,
          to: input?.to,
        });
      }
      const { getDailySalesReport } = await import("../db.phase5");
      return getDailySalesReport({
        branchId: input?.branchId,
        from: input?.from ? new Date(input.from) : undefined,
        to: input?.to ? new Date(`${input.to}T23:59:59`) : undefined,
      });
    }),

  /**
   * Monthly Revenue Report — aggregates by month for a given year
   */
  monthlyRevenue: protectedProcedure
    .input(
      z.object({
        branchId: z.number().optional(),
        year: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      if (isPreviewMode()) {
        return previewGetMonthlyRevenueReport({
          branchId: input?.branchId,
          year: input?.year,
        });
      }
      const { getMonthlyRevenueReport } = await import("../db.phase5");
      return getMonthlyRevenueReport({
        branchId: input?.branchId,
        year: input?.year,
      });
    }),

  /**
   * Profit Breakdown Report — company profit, branch profit, master share, investor distribution
   */
  profitBreakdown: protectedProcedure
    .input(
      z.object({
        branchId: z.number().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      if (isPreviewMode()) {
        return previewGetProfitBreakdownReport({
          branchId: input?.branchId,
          from: input?.from,
          to: input?.to,
        });
      }
      const { getProfitBreakdownReport } = await import("../db.phase5");
      return getProfitBreakdownReport({
        branchId: input?.branchId,
        from: input?.from ? new Date(input.from) : undefined,
        to: input?.to ? new Date(`${input.to}T23:59:59`) : undefined,
      });
    }),

  /**
   * Supplier Payables Report — outstanding balances per supplier
   */
  supplierPayables: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      if (isPreviewMode()) {
        return previewGetSupplierPayablesReport();
      }
      const { getSupplierPayablesReport } = await import("../db.phase5");
      return getSupplierPayablesReport();
    }),

  /**
   * Branch Outstanding Payments Report — pending HO payments per branch
   */
  branchOutstanding: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      if (isPreviewMode()) {
        return previewGetBranchOutstandingReport();
      }
      const { getBranchOutstandingReport } = await import("../db.phase5");
      return getBranchOutstandingReport();
    }),

  /**
   * Branch Performance Comparison — sales, profit, transactions per branch
   */
  branchPerformance: protectedProcedure
    .input(
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      if (isPreviewMode()) {
        return previewGetBranchPerformanceReport({
          from: input?.from,
          to: input?.to,
        });
      }
      const { getBranchPerformanceReport } = await import("../db.phase5");
      return getBranchPerformanceReport({
        from: input?.from ? new Date(input.from) : undefined,
        to: input?.to ? new Date(`${input.to}T23:59:59`) : undefined,
      });
    }),

  /**
   * Top Customers Report
   */
  topCustomers: protectedProcedure
    .input(
      z.object({
        branchId: z.number().optional(),
        limit: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      if (isPreviewMode()) {
        return previewGetTopCustomers({
          branchId: input?.branchId,
          limit: input?.limit ?? 10,
        });
      }
      const { getTopCustomers } = await import("../db.phase5");
      return getTopCustomers({
        branchId: input?.branchId,
        limit: input?.limit ?? 10,
      });
    }),
});
