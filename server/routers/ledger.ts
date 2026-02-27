/**
 * Ledger Router — Phase-3 Branch Data Isolation
 * 
 * canViewLedger permission required for all ledger access.
 * canViewFinancials required for profit/financial data.
 * Branch users can only see their own branch's ledger.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { isPreviewMode } from "../_core/previewDb";
import {
  enforceBranchAccess,
  hasGlobalAccess,
  requirePermission,
  getEffectiveBranchFilter,
} from "../_core/permissions";

export const ledgerRouter = router({
  /**
   * Ledger entries — requires canViewLedger permission
   */
  entries: protectedProcedure
    .input(z.object({
      branchId: z.number().optional(),
      from: z.date().optional(),
      to: z.date().optional(),
    }))
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canViewLedger", "You do not have permission to view the ledger");

      const effectiveBranchId = input.branchId ?? getEffectiveBranchFilter(ctx.user);
      if (input.branchId) enforceBranchAccess(ctx.user, input.branchId);

      if (isPreviewMode()) {
        const { previewGetLedgerEntries } = await import("../_core/previewDbAdapter");
        if (!effectiveBranchId) throw new TRPCError({ code: "BAD_REQUEST", message: "Branch ID required" });
        return previewGetLedgerEntries(effectiveBranchId, input.from, input.to);
      }

      const { getLedgerEntries } = await import("../db");
      if (!effectiveBranchId) throw new TRPCError({ code: "BAD_REQUEST", message: "Branch ID required" });
      return getLedgerEntries(effectiveBranchId, input.from, input.to);
    }),

  /**
   * Ledger summary — requires canViewLedger permission
   */
  summary: protectedProcedure
    .input(z.object({ branchId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canViewLedger", "You do not have permission to view the ledger");

      const effectiveBranchId = input.branchId ?? getEffectiveBranchFilter(ctx.user);
      if (input.branchId) enforceBranchAccess(ctx.user, input.branchId);

      if (isPreviewMode()) {
        const { previewGetBranchLedgerSummary, previewGetBranchLedgerEntries } = await import("../_core/previewDbAdapter");
        const standardSummary = previewGetBranchLedgerSummary(effectiveBranchId ?? undefined);
        const branchEntries = effectiveBranchId ? previewGetBranchLedgerEntries(effectiveBranchId) : [];

        let totalStockReceived = 0, totalPaymentsSent = 0, totalBranchProfit = 0;
        for (const entry of branchEntries) {
          const amount = parseFloat(String(entry.amount));
          if (entry.type === "stock_received") totalStockReceived += amount;
          else if (entry.type === "payment_sent") totalPaymentsSent += amount;
          else if (entry.type === "sale_profit") totalBranchProfit += amount;
        }

        const result: any = { ...standardSummary, totalStockReceived, totalPaymentsSent, totalBranchProfit, remainingBalance: totalStockReceived - totalPaymentsSent };

        // Hide financial details from non-financial users
        if (!hasGlobalAccess(ctx.user.role)) {
          const canViewFinancials = await import("../_core/permissions").then(m => m.getUserPermissions(ctx.user.id, ctx.user.role));
          if (!(await canViewFinancials).canViewFinancials) {
            delete result.totalBranchProfit;
          }
        }

        return result;
      }

      const { getBranchLedgerSummary, getBranchLedgerEntries } = await import("../db");
      if (!effectiveBranchId) return { totalCredit: 0, totalDebit: 0, balance: 0, totalStockReceived: 0, totalPaymentsSent: 0, totalBranchProfit: 0, remainingBalance: 0 };
      const standardSummary = await getBranchLedgerSummary(effectiveBranchId);
      const branchEntries = await getBranchLedgerEntries(effectiveBranchId);

      let totalStockReceived = 0, totalPaymentsSent = 0, totalBranchProfit = 0;
      for (const entry of branchEntries) {
        const amount = parseFloat(String(entry.amount));
        if (entry.type === "stock_received") totalStockReceived += amount;
        else if (entry.type === "payment_sent") totalPaymentsSent += amount;
        else if (entry.type === "sale_profit") totalBranchProfit += amount;
      }

      return { ...standardSummary, totalStockReceived, totalPaymentsSent, totalBranchProfit, remainingBalance: totalStockReceived - totalPaymentsSent };
    }),

  /**
   * Branch ledger — requires canViewLedger permission
   */
  branchLedger: protectedProcedure
    .input(z.object({ branchId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canViewLedger", "You do not have permission to view the ledger");

      const effectiveBranchId = input.branchId ?? getEffectiveBranchFilter(ctx.user);
      if (input.branchId) enforceBranchAccess(ctx.user, input.branchId);

      if (isPreviewMode()) {
        const { previewGetBranchLedgerEntries } = await import("../_core/previewDbAdapter");
        if (!effectiveBranchId) return [];
        return previewGetBranchLedgerEntries(effectiveBranchId);
      }

      const { getBranchLedgerEntries } = await import("../db");
      if (!effectiveBranchId) return [];
      return getBranchLedgerEntries(effectiveBranchId);
    }),

  /**
   * Add expense — requires canViewLedger and branch access
   */
  addExpense: protectedProcedure
    .input(z.object({
      branchId: z.number(),
      category: z.string().min(1),
      description: z.string().optional(),
      amount: z.string(),
      expenseDate: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canViewLedger", "You do not have permission to add expenses");
      enforceBranchAccess(ctx.user, input.branchId);

      if (isPreviewMode()) {
        const { previewCreateExpense, previewAddLedgerEntry } = await import("../_core/previewDbAdapter");
        previewCreateExpense({ ...input, userId: ctx.user.id });
        previewAddLedgerEntry({ branchId: input.branchId, entryType: "Expense", description: `Expense: ${input.category} - ${input.description ?? ""}`, debit: parseFloat(input.amount) });
        return { success: true };
      }

      const { createExpense, addLedgerEntry, addAuditLog } = await import("../db");
      await createExpense({ ...input, userId: ctx.user.id });
      await addLedgerEntry({ branchId: input.branchId, entryType: "Expense", description: `Expense: ${input.category} - ${input.description ?? ""}`, debit: parseFloat(input.amount) });
      await addAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "ADD_EXPENSE", entityType: "Expense", branchId: input.branchId, details: `Expense ${input.category}: ${input.amount}` });
      return { success: true };
    }),

  /**
   * List expenses — filtered by branch
   */
  listExpenses: protectedProcedure
    .input(z.object({ branchId: z.number().optional(), from: z.date().optional(), to: z.date().optional() }).optional())
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canViewLedger", "You do not have permission to view expenses");

      const effectiveBranchId = input?.branchId ?? getEffectiveBranchFilter(ctx.user);
      if (input?.branchId) enforceBranchAccess(ctx.user, input.branchId);

      if (isPreviewMode()) {
        const { previewGetExpenses } = await import("../_core/previewDbAdapter");
        return previewGetExpenses(effectiveBranchId, input?.from, input?.to);
      }

      const { getExpenses } = await import("../db");
      return getExpenses(effectiveBranchId, input?.from, input?.to);
    }),

  /**
   * Add HO payment — Admin only
   */
  addHOPayment: protectedProcedure
    .input(z.object({
      branchId: z.number(),
      amount: z.string(),
      paymentMethod: z.string().optional(),
      reference: z.string().optional(),
      notes: z.string().optional(),
      paymentDate: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required to record HO payments" });
      }

      if (isPreviewMode()) {
        const { previewCreateHOPayment, previewAddBranchLedgerEntry, previewAddLedgerEntry } = await import("../_core/previewDbAdapter");
        previewCreateHOPayment({ ...input, userId: ctx.user.id });
        previewAddBranchLedgerEntry({ branchId: input.branchId, type: "payment_sent", amount: input.amount, description: `HO Payment - Ref: ${input.reference ?? "N/A"}` });
        previewAddLedgerEntry({ branchId: input.branchId, entryType: "Payment", description: `HO Payment - Ref: ${input.reference ?? "N/A"}`, debit: parseFloat(input.amount) });
        return { success: true };
      }

      const { createHOPayment, addBranchLedgerEntry, addLedgerEntry, addAuditLog } = await import("../db");
      await createHOPayment({ ...input, userId: ctx.user.id });
      await addBranchLedgerEntry({ branchId: input.branchId, type: "payment_sent", amount: input.amount, description: `HO Payment - Ref: ${input.reference ?? "N/A"}` });
      await addLedgerEntry({ branchId: input.branchId, entryType: "Payment", description: `HO Payment - Ref: ${input.reference ?? "N/A"}`, debit: parseFloat(input.amount) });
      await addAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "ADD_HO_PAYMENT", entityType: "HOPayment", branchId: input.branchId, details: `HO Payment: ${input.amount}` });
      return { success: true };
    }),

  /**
   * List HO payments — filtered by branch
   */
  listHOPayments: protectedProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canViewFinancials", "You do not have permission to view HO payments");

      const effectiveBranchId = input?.branchId ?? getEffectiveBranchFilter(ctx.user);

      if (isPreviewMode()) {
        const { previewGetHOPayments } = await import("../_core/previewDbAdapter");
        return previewGetHOPayments(effectiveBranchId);
      }

      const { getHOPayments } = await import("../db");
      return getHOPayments(effectiveBranchId);
    }),
});
