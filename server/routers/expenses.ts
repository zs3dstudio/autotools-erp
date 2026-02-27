import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createExpense,
  getExpenses,
  addLedgerEntry,
  addAuditLog,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const expensesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        branchId: z.number().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return getExpenses(input?.branchId, input?.from, input?.to);
    }),

  create: protectedProcedure
    .input(
      z.object({
        branchId: z.number(),
        category: z.string().min(1).max(64),
        description: z.string().optional(),
        amount: z.string().min(1),
        expenseDate: z.date(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const amount = parseFloat(input.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Amount must be a positive number" });
      }

      await createExpense({
        branchId: input.branchId,
        userId: ctx.user.id,
        category: input.category,
        description: input.description,
        amount: amount.toFixed(2),
        expenseDate: input.expenseDate,
      });

      // Record in ledger as debit
      await addLedgerEntry({
        branchId: input.branchId,
        entryType: "Expense",
        description: `Expense [${input.category}]${input.description ? ": " + input.description : ""}`,
        debit: amount,
      });

      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "CREATE_EXPENSE",
        entityType: "Expense",
        branchId: input.branchId,
        details: `Expense: ${input.category} - $${amount.toFixed(2)}`,
      });

      return { success: true };
    }),

  summary: protectedProcedure
    .input(
      z.object({
        branchId: z.number().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const expenses = await getExpenses(input?.branchId, input?.from, input?.to);
      const total = expenses.reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);
      const byCategory: Record<string, number> = {};
      for (const e of expenses) {
        byCategory[e.category] = (byCategory[e.category] ?? 0) + parseFloat(String(e.amount));
      }
      return { total, byCategory, count: expenses.length };
    }),
});
