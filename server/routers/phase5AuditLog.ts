/**
 * Phase-5: Enhanced Audit Log Router
 *
 * Extends the existing audit trail with:
 * - Module-based filtering (Inventory, Sales, Transfers, Payments, etc.)
 * - Action type filtering (stock_change, transfer_approval, payment_approval, cost_modification)
 * - Record ID lookup
 * - Summary stats
 *
 * NOTE: Uses the existing addAuditLog / getAuditLogs from db.ts — no schema changes.
 */
import { z } from "zod";
import { getAuditLogs, addAuditLog } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { isPreviewMode, getPreviewDb } from "../_core/previewDb";

// ─── MODULE MAPPING ───────────────────────────────────────────────────────────
// Maps Phase-5 module names to entityType values used in the existing audit log
const MODULE_TO_ENTITY: Record<string, string[]> = {
  inventory: ["InventoryItem", "StockAdjustment", "Product"],
  sales: ["Sale", "SaleItem"],
  transfers: ["StockTransfer", "TransferRequest"],
  payments: ["HOPayment", "SupplierPayment", "PaymentAllocation"],
  financials: ["ProfitDistribution", "InvestorCapital", "SupplierLedger"],
  users: ["User", "UserPermission"],
  branches: ["Branch"],
  system: ["System", "CompanySettings"],
};

// Maps Phase-5 action categories to action prefixes in the existing audit log
const ACTION_CATEGORY_PREFIXES: Record<string, string[]> = {
  stock_change: ["CREATE_INVENTORY", "UPDATE_INVENTORY", "STOCK_ADJUST", "RECEIVE_STOCK", "TRANSFER"],
  transfer_approval: ["APPROVE_TRANSFER", "REJECT_TRANSFER", "COMPLETE_TRANSFER", "CREATE_TRANSFER"],
  payment_approval: ["APPROVE_PAYMENT", "REJECT_PAYMENT", "CREATE_HO_PAYMENT", "APPROVE_HO_PAYMENT"],
  cost_modification: ["UPDATE_PRODUCT", "UPDATE_COST", "UPDATE_PRICE", "MODIFY_COST"],
  sale: ["CREATE_SALE", "VOID_SALE", "COMPLETE_SALE"],
  user_management: ["CREATE_USER", "UPDATE_USER", "DELETE_USER", "ASSIGN_BRANCH"],
};

export const phase5AuditLogRouter = router({
  /**
   * Enhanced audit log list with Phase-5 module/action filters
   */
  list: protectedProcedure
    .input(
      z.object({
        module: z.string().optional(),       // e.g. "inventory", "sales", "transfers"
        actionCategory: z.string().optional(), // e.g. "stock_change", "transfer_approval"
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        userId: z.number().optional(),
        branchId: z.number().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().min(1).max(500).optional(),
        offset: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const role = ctx.user.role;
      if (role !== "admin" && role !== "Admin" && role !== "SuperAdmin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      if (isPreviewMode()) {
        const db = getPreviewDb();
        const limit = input?.limit ?? 200;
        const offset = input?.offset ?? 0;

        let query = "SELECT * FROM audit_logs WHERE 1=1";
        const params: any[] = [];

        if (input?.entityType) {
          query += " AND entityType = ?";
          params.push(input.entityType);
        } else if (input?.module) {
          const entities = MODULE_TO_ENTITY[input.module] ?? [];
          if (entities.length > 0) {
            query += ` AND entityType IN (${entities.map(() => "?").join(",")})`;
            params.push(...entities);
          }
        }

        if (input?.entityId) {
          query += " AND entityId = ?";
          params.push(input.entityId);
        }
        if (input?.userId) {
          query += " AND userId = ?";
          params.push(input.userId);
        }
        if (input?.branchId) {
          query += " AND branchId = ?";
          params.push(input.branchId);
        }
        if (input?.from) {
          query += " AND createdAt >= ?";
          params.push(input.from);
        }
        if (input?.to) {
          query += " AND createdAt <= ?";
          params.push(input.to + "T23:59:59");
        }
        if (input?.actionCategory) {
          const prefixes = ACTION_CATEGORY_PREFIXES[input.actionCategory] ?? [];
          if (prefixes.length > 0) {
            query += ` AND (${prefixes.map(() => "action LIKE ?").join(" OR ")})`;
            params.push(...prefixes.map(p => `${p}%`));
          }
        }

        query += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        return db.prepare(query).all(...params);
      }

      // MySQL mode: use existing getAuditLogs with entityType filter
      const entityType = input?.entityType ??
        (input?.module ? MODULE_TO_ENTITY[input.module]?.[0] : undefined);

      const logs = await getAuditLogs({
        entityType,
        userId: input?.userId,
        branchId: input?.branchId,
        from: input?.from ? new Date(input.from) : undefined,
        to: input?.to ? new Date(input.to + "T23:59:59") : undefined,
        limit: input?.limit ?? 200,
      });

      // Client-side filter by action category if specified
      if (input?.actionCategory) {
        const prefixes = ACTION_CATEGORY_PREFIXES[input.actionCategory] ?? [];
        return logs.filter((log: any) =>
          prefixes.some(p => (log.action ?? "").startsWith(p))
        );
      }

      // Filter by entityId if specified
      if (input?.entityId) {
        return logs.filter((log: any) => String(log.entityId) === String(input.entityId));
      }

      return logs;
    }),

  /**
   * Get audit summary stats for the admin dashboard
   */
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      const role = ctx.user.role;
      if (role !== "admin" && role !== "Admin" && role !== "SuperAdmin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (isPreviewMode()) {
        const db = getPreviewDb();
        const total = (db.prepare("SELECT COUNT(*) as count FROM audit_logs").get() as any)?.count ?? 0;
        const today = new Date().toISOString().split("T")[0];
        const todayCount = (db.prepare("SELECT COUNT(*) as count FROM audit_logs WHERE createdAt >= ?").get(today) as any)?.count ?? 0;
        const byModule = db.prepare(`
          SELECT entityType, COUNT(*) as count
          FROM audit_logs
          GROUP BY entityType
          ORDER BY count DESC
          LIMIT 10
        `).all() as any[];
        return { total, todayCount, byModule };
      }

      const allLogs = await getAuditLogs({ limit: 500 });
      const today = new Date().toISOString().split("T")[0];
      const todayCount = allLogs.filter((l: any) =>
        (l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt ?? "").startsWith(today)
      ).length;

      const moduleCount: Record<string, number> = {};
      for (const log of allLogs) {
        const et = (log as any).entityType ?? "Unknown";
        moduleCount[et] = (moduleCount[et] ?? 0) + 1;
      }
      const byModule = Object.entries(moduleCount)
        .map(([entityType, count]) => ({ entityType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return { total: allLogs.length, todayCount, byModule };
    }),

  /**
   * Manually write an audit log entry (for Phase-5 actions)
   */
  write: protectedProcedure
    .input(z.object({
      action: z.string(),
      entityType: z.string(),
      entityId: z.string().optional(),
      branchId: z.number().optional(),
      details: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await addAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email ?? undefined,
        userName: ctx.user.name ?? undefined,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        branchId: input.branchId,
        details: input.details,
      });
      return { ok: true };
    }),
});
