/**
 * Phase-4 Financial Control Layer — tRPC Router
 *
 * Covers:
 * 1. Supplier Accounting Ledger
 * 2. Branch → Head Office Payment Approval
 * 3. Company vs Branch Profit Tracking
 * 4. Investor Pool + Master Share Automation
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { isPreviewMode } from "../_core/previewDb";
import { hasGlobalAccess, requirePermission } from "../_core/permissions";
import {
  previewGetSupplierBalance,
  previewGetSupplierLedger,
  previewAddSupplierEntry,
  previewGetAllSupplierBalances,
  previewGetHOPayments,
  previewCreateHOPaymentRequest,
  previewApproveHOPayment,
  previewRejectHOPayment,
  previewGetCompanyProfitSummary,
  previewGetBranchProfitSummary,
  previewGetAllInvestors,
  previewCreateInvestor,
  previewAddInvestorCapital,
  previewGetInvestorCapitalHistory,
  previewPreviewDistribution,
  previewFinalizeDistribution,
  previewGetDistributionHistory,
  previewGetDistributionDetails,
} from "../_core/previewDbAdapterPhase4";

// ─── HELPER: Require Admin Role ───────────────────────────────────────────────
function requireAdmin(user: any) {
  if (!hasGlobalAccess(user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This action requires Admin or SuperAdmin access",
    });
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// SUPPLIER LEDGER ROUTER
// ═════════════════════════════════════════════════════════════════════════════════════════════
export const supplierLedgerRouter = router({
  /**
   * Get the full ledger for a specific supplier
   */
  getLedger: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canViewFinancials");
      if (isPreviewMode()) {
        return previewGetSupplierLedger(input.supplierId);
      }
      const { getSupplierLedger } = await import("../db.phase4");
      return getSupplierLedger(input.supplierId);
    }),

  /**
   * Get the outstanding balance for a specific supplier
   */
  getBalance: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canViewFinancials");
      if (isPreviewMode()) {
        return { balance: previewGetSupplierBalance(input.supplierId) };
      }
      const { getSupplierBalance } = await import("../db.phase4");
      return { balance: await getSupplierBalance(input.supplierId) };
    }),

  /**
   * Get outstanding balances for all suppliers
   */
  getAllBalances: protectedProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx.user, "canViewFinancials");
    if (isPreviewMode()) {
      return previewGetAllSupplierBalances();
    }
    const { getAllSupplierOutstandingBalances } = await import("../db.phase4");
    return getAllSupplierOutstandingBalances();
  }),

  /**
   * Record a payment to a supplier
   */
  recordPayment: protectedProcedure
    .input(
      z.object({
        supplierId: z.number(),
        amount: z.string().min(1),
        referenceId: z.number().optional().default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user);
      const amount = parseFloat(input.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid payment amount" });
      }
      if (isPreviewMode()) {
        previewAddSupplierEntry({
          supplierId: input.supplierId,
          transactionType: "Payment",
          referenceId: input.referenceId,
          debit: "0.00",
          credit: amount.toFixed(2),
        });
        return { success: true };
      }
      const { recordSupplierPayment } = await import("../db.phase4");
      await recordSupplierPayment(input.supplierId, input.referenceId, amount);
      return { success: true };
    }),
});

// ═════════════════════════════════════════════════════════════════════════════════════════════
// HO PAYMENTS ROUTER
// ═════════════════════════════════════════════════════════════════════════════════════════════
export const hoPaymentsRouter = router({
  /**
   * List all HO payment requests
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["Pending", "Approved", "Rejected", "all"]).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      // 'all' is a UI convenience — treat it as no filter
      const statusFilter = input?.status === "all" ? undefined : input?.status;
      // Branch users can only see their own branch's payments
      if (isPreviewMode()) {
        const payments = previewGetHOPayments(statusFilter);
        if (hasGlobalAccess(ctx.user.role)) return payments;
        return payments.filter((p: any) => p.branchId === ctx.user.branchId);
      }
      const { getHOPayments } = await import("../db.phase4");
      const payments = await getHOPayments(statusFilter);
      if (hasGlobalAccess(ctx.user.role)) return payments;
      return payments.filter((p: any) => p.branchId === ctx.user.branchId);
    }),

  /**
   * Create a new payment request to Head Office
   */
  request: protectedProcedure
    .input(
      z.object({
        branchId: z.number(),
        amount: z.string().min(1),
        paymentMethod: z.string().optional(),
        reference: z.string().optional(),
        notes: z.string().optional(),
        paymentDate: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validate branch access
      if (!hasGlobalAccess(ctx.user.role) && ctx.user.branchId !== input.branchId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only submit payments for your own branch",
        });
      }
      const amount = parseFloat(input.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid payment amount" });
      }
      if (isPreviewMode()) {
        const paymentId = previewCreateHOPaymentRequest({
          branchId: input.branchId,
          userId: ctx.user.id,
          amount: amount.toFixed(2),
          paymentMethod: input.paymentMethod,
          reference: input.reference,
          notes: input.notes,
          paymentDate: input.paymentDate,
        });
        return { success: true, paymentId };
      }
      const { createHOPaymentRequest } = await import("../db.phase4");
      await createHOPaymentRequest({
        branchId: input.branchId,
        userId: ctx.user.id,
        amount: amount.toFixed(2),
        paymentMethod: input.paymentMethod,
        reference: input.reference,
        notes: input.notes,
        paymentDate: new Date(input.paymentDate),
      });
      return { success: true };
    }),

  /**
   * Approve a payment request (Admin only)
   */
  approve: protectedProcedure
    .input(z.object({ paymentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user);
      if (isPreviewMode()) {
        previewApproveHOPayment(input.paymentId, ctx.user.id);
        return { success: true };
      }
      const { approveHOPayment } = await import("../db.phase4");
      return approveHOPayment(input.paymentId, ctx.user.id);
    }),

  /**
   * Reject a payment request (Admin only)
   */
  reject: protectedProcedure
    .input(
      z.object({
        paymentId: z.number(),
        rejectionReason: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user);
      if (isPreviewMode()) {
        previewRejectHOPayment(input.paymentId, ctx.user.id, input.rejectionReason);
        return { success: true };
      }
      const { rejectHOPayment } = await import("../db.phase4");
      return rejectHOPayment(input.paymentId, ctx.user.id, input.rejectionReason);
    }),
});

// ═════════════════════════════════════════════════════════════════════════════════════════════
// PROFIT TRACKING ROUTER
// ═════════════════════════════════════════════════════════════════════════════════════════════
export const profitRouter = router({
  /**
   * Get company-wide profit summary
   */
  companySummary: protectedProcedure
    .input(
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canViewFinancials");
      if (isPreviewMode()) {
        return previewGetCompanyProfitSummary(input?.from, input?.to);
      }
      const { getCompanyProfitSummary } = await import("../db.phase4");
      return getCompanyProfitSummary(
        input?.from ? new Date(input.from) : undefined,
        input?.to ? new Date(input.to) : undefined
      );
    }),

  /**
   * Get per-branch profit summary
   */
  branchSummary: protectedProcedure
    .input(
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canViewFinancials");
      if (isPreviewMode()) {
        return previewGetBranchProfitSummary(input?.from, input?.to);
      }
      const { getBranchProfitSummary } = await import("../db.phase4");
      return getBranchProfitSummary(
        input?.from ? new Date(input.from) : undefined,
        input?.to ? new Date(input.to) : undefined
      );
    }),
});

// ═════════════════════════════════════════════════════════════════════════════════════════════
// INVESTORS ROUTER
// ═════════════════════════════════════════════════════════════════════════════════════════════
export const investorsRouter = router({
  /**
   * List all investors with their total capital
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx.user, "canViewFinancials");
    if (isPreviewMode()) {
      return previewGetAllInvestors();
    }
    const { getAllInvestors } = await import("../db.phase4");
    return getAllInvestors();
  }),

  /**
   * Create a new investor
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        contactInfo: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user);
      if (isPreviewMode()) {
        const id = previewCreateInvestor(input);
        return { success: true, id };
      }
      const { createInvestor } = await import("../db.phase4");
      await createInvestor(input);
      return { success: true };
    }),

  /**
   * Add a capital contribution for an investor
   */
  addCapital: protectedProcedure
    .input(
      z.object({
        investorId: z.number(),
        amount: z.string().min(1),
        contributionDate: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user);
      const amount = parseFloat(input.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid capital amount" });
      }
      if (isPreviewMode()) {
        previewAddInvestorCapital({
          investorId: input.investorId,
          amount: amount.toFixed(2),
          contributionDate: input.contributionDate,
          notes: input.notes,
        });
        return { success: true };
      }
      const { addInvestorCapital } = await import("../db.phase4");
      await addInvestorCapital({
        investorId: input.investorId,
        amount: amount.toFixed(2),
        contributionDate: new Date(input.contributionDate),
        notes: input.notes,
      });
      return { success: true };
    }),

  /**
   * Get capital history for an investor
   */
  capitalHistory: protectedProcedure
    .input(z.object({ investorId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canViewFinancials");
      if (isPreviewMode()) {
        return previewGetInvestorCapitalHistory(input.investorId);
      }
      const { getInvestorCapitalHistory } = await import("../db.phase4");
      return getInvestorCapitalHistory(input.investorId);
    }),
});

// ═════════════════════════════════════════════════════════════════════════════════════════════
// PROFIT DISTRIBUTION ROUTER
// ═════════════════════════════════════════════════════════════════════════════════════════════
export const distributionRouter = router({
  /**
   * Preview the distribution for a period without saving
   */
  preview: protectedProcedure
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM format") }))
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canViewFinancials");
      if (isPreviewMode()) {
        return previewPreviewDistribution(input.period);
      }
      const { previewDistribution } = await import("../db.phase4");
      return previewDistribution(input.period);
    }),

  /**
   * Finalize and save the distribution for a period
   */
  finalize: protectedProcedure
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM format") }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user);
      if (isPreviewMode()) {
        return previewFinalizeDistribution(input.period);
      }
      const { finalizeDistribution } = await import("../db.phase4");
      return finalizeDistribution(input.period);
    }),

  /**
   * Get all past finalized distributions
   */
  history: protectedProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx.user, "canViewFinancials");
    if (isPreviewMode()) {
      return previewGetDistributionHistory();
    }
    const { getProfitDistributionHistory } = await import("../db.phase4");
    return getProfitDistributionHistory();
  }),

  /**
   * Get the details of a specific distribution
   */
  details: protectedProcedure
    .input(z.object({ distributionId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canViewFinancials");
      if (isPreviewMode()) {
        return previewGetDistributionDetails(input.distributionId);
      }
      const { getDistributionDetails } = await import("../db.phase4");
      return getDistributionDetails(input.distributionId);
    }),
});

// ═════════════════════════════════════════════════════════════════════════════════════════════
// MAIN FINANCIALS ROUTER
// ═════════════════════════════════════════════════════════════════════════════════════════════
export const financialsRouter = router({
  supplierLedger: supplierLedgerRouter,
  hoPayments: hoPaymentsRouter,
  profit: profitRouter,
  investors: investorsRouter,
  distribution: distributionRouter,
});
