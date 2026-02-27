import { z } from "zod";
import { getDashboardStats, getMonthlySalesReport, getSales, getTopProducts } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const reportsRouter = router({
  dashboardStats: protectedProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getDashboardStats(input?.branchId);
    }),

  monthlySales: protectedProcedure
    .input(z.object({ branchId: z.number().optional(), year: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getMonthlySalesReport(input?.branchId, input?.year);
    }),

  topProducts: protectedProcedure
    .input(z.object({ branchId: z.number().optional(), limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getTopProducts(input?.branchId, input?.limit ?? 10);
    }),

  salesList: protectedProcedure
    .input(
      z.object({
        branchId: z.number().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        status: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return getSales(input ?? {});
    }),
});
