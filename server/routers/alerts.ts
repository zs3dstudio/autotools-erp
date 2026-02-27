/**
 * Phase-5 Alert & Notification Engine Router
 *
 * Manages system-generated alerts:
 * - LowStock: stock falls below reorder threshold
 * - OverdueSupplierPayment: supplier payable overdue
 * - OverdueBranchPayment: branch HO payment pending too long
 * - LargeSale: sale amount exceeds configured threshold
 * - StockAdjustment: manual stock changes
 *
 * Endpoints:
 * - alerts.list: Get all alerts with filters
 * - alerts.unresolvedCount: Count of unresolved alerts
 * - alerts.resolve: Mark an alert as resolved
 * - alerts.markRead: Mark alert(s) as read
 * - alerts.create: Manually create an alert (admin only)
 * - alerts.runAlertCheck: Trigger alert scan (admin only)
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { isPreviewMode } from "../_core/previewDb";
import { hasGlobalAccess } from "../_core/permissions";
import {
  previewGetSystemAlerts,
  previewGetUnresolvedAlertCount,
  previewCreateSystemAlert,
  previewResolveSystemAlert,
  previewMarkAlertRead,
  previewMarkAllAlertsRead,
} from "../_core/previewDbAdapterPhase5";

export const alertsRouter = router({
  /**
   * List all system alerts with optional filters
   */
  list: protectedProcedure
    .input(
      z.object({
        alertType: z.enum(["LowStock", "OverdueSupplierPayment", "OverdueBranchPayment", "LargeSale", "StockAdjustment"]).optional(),
        severity: z.enum(["info", "warning", "critical"]).optional(),
        branchId: z.number().optional(),
        isResolved: z.boolean().optional(),
        limit: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      // Branch managers can only see alerts for their branch
      const effectiveBranchId = hasGlobalAccess(ctx.user.role)
        ? input?.branchId
        : (ctx.user.branchId ?? undefined);

      if (isPreviewMode()) {
        return previewGetSystemAlerts({
          alertType: input?.alertType,
          severity: input?.severity,
          branchId: effectiveBranchId,
          isResolved: input?.isResolved,
          limit: input?.limit,
        });
      }
      const { getSystemAlerts } = await import("../db.phase5");
      return getSystemAlerts({
        alertType: input?.alertType,
        severity: input?.severity,
        branchId: effectiveBranchId,
        isResolved: input?.isResolved,
        limit: input?.limit,
      });
    }),

  /**
   * Count of unresolved alerts (for dashboard badge)
   */
  unresolvedCount: protectedProcedure
    .query(async ({ ctx }) => {
      if (isPreviewMode()) {
        return { count: previewGetUnresolvedAlertCount() };
      }
      const { getUnresolvedAlertCount } = await import("../db.phase5");
      return { count: await getUnresolvedAlertCount() };
    }),

  /**
   * Resolve an alert
   */
  resolve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (isPreviewMode()) {
        previewResolveSystemAlert(input.id, ctx.user.id);
        return { success: true };
      }
      const { resolveSystemAlert } = await import("../db.phase5");
      await resolveSystemAlert(input.id, ctx.user.id);
      return { success: true };
    }),

  /**
   * Mark a single alert as read
   */
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      if (isPreviewMode()) {
        previewMarkAlertRead(input.id);
        return { success: true };
      }
      const { markAlertRead } = await import("../db.phase5");
      await markAlertRead(input.id);
      return { success: true };
    }),

  /**
   * Mark all alerts as read
   */
  markAllRead: protectedProcedure
    .mutation(async () => {
      if (isPreviewMode()) {
        previewMarkAllAlertsRead();
        return { success: true };
      }
      const { markAllAlertsRead } = await import("../db.phase5");
      await markAllAlertsRead();
      return { success: true };
    }),

  /**
   * Manually create an alert (admin only)
   */
  create: protectedProcedure
    .input(
      z.object({
        alertType: z.enum(["LowStock", "OverdueSupplierPayment", "OverdueBranchPayment", "LargeSale", "StockAdjustment"]),
        severity: z.enum(["info", "warning", "critical"]),
        title: z.string(),
        message: z.string(),
        referenceType: z.string().optional(),
        referenceId: z.number().optional(),
        branchId: z.number().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      if (isPreviewMode()) {
        const id = previewCreateSystemAlert(input);
        return { success: true, id };
      }
      const { createSystemAlert } = await import("../db.phase5");
      await createSystemAlert(input);
      return { success: true };
    }),

  /**
   * Run alert check — scans for low stock, overdue payments, etc.
   * Admin only. Called by the cron job and can also be triggered manually.
   */
  runAlertCheck: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      if (isPreviewMode()) {
        return runPreviewAlertCheck();
      }
      return runMySQLAlertCheck();
    }),
});

// ─── PREVIEW MODE ALERT CHECK ─────────────────────────────────────────────────

function runPreviewAlertCheck(): { triggered: number; details: string[] } {
  const { getPreviewDb } = require("../_core/previewDb");
  const db = getPreviewDb();
  const details: string[] = [];
  let triggered = 0;

  // 1. Low Stock Check
  const lowStockItems = db.prepare(`
    SELECT ii.productId, p.name as productName, ii.branchId, b.name as branchName,
           COUNT(*) as currentStock, p.reorderLevel
    FROM inventory_items ii
    INNER JOIN products p ON ii.productId = p.id
    INNER JOIN branches b ON ii.branchId = b.id
    WHERE ii.status = 'Available'
    GROUP BY ii.productId, ii.branchId
    HAVING currentStock <= p.reorderLevel
  `).all() as any[];

  for (const item of lowStockItems) {
    const existing = db.prepare(`
      SELECT id FROM system_alerts
      WHERE alertType = 'LowStock' AND referenceId = ? AND branchId = ? AND isResolved = 0
    `).get(item.productId, item.branchId);
    if (!existing) {
      const severity = item.currentStock === 0 ? "critical" : "warning";
      previewCreateSystemAlert({
        alertType: "LowStock",
        severity,
        title: `${severity === "critical" ? "Critical" : "Low"} Stock: ${item.productName}`,
        message: `${item.productName} at ${item.branchName} has ${item.currentStock} unit(s) remaining (reorder level: ${item.reorderLevel})`,
        referenceType: "Product",
        referenceId: item.productId,
        branchId: item.branchId,
        metadata: { currentStock: item.currentStock, reorderLevel: item.reorderLevel },
      });
      triggered++;
      details.push(`LowStock: ${item.productName} @ ${item.branchName} (${item.currentStock} units)`);
    }
  }

  // 2. Overdue Branch Payments (pending > 7 days)
  const overdueHO = db.prepare(`
    SELECT hp.id, hp.branchId, b.name as branchName, hp.amount,
           CAST((julianday('now') - julianday(hp.createdAt)) AS INTEGER) as daysOverdue
    FROM ho_payments hp
    LEFT JOIN branches b ON hp.branchId = b.id
    WHERE hp.status = 'Pending' AND julianday('now') - julianday(hp.createdAt) > 7
  `).all() as any[];

  for (const payment of overdueHO) {
    const existing = db.prepare(`
      SELECT id FROM system_alerts
      WHERE alertType = 'OverdueBranchPayment' AND referenceId = ? AND isResolved = 0
    `).get(payment.id);
    if (!existing) {
      previewCreateSystemAlert({
        alertType: "OverdueBranchPayment",
        severity: "warning",
        title: `Pending HO Payment: ${payment.branchName}`,
        message: `${payment.branchName} has a pending HO payment of $${parseFloat(payment.amount).toFixed(2)} overdue by ${payment.daysOverdue} days`,
        referenceType: "Branch",
        referenceId: payment.branchId,
        branchId: payment.branchId,
        metadata: { paymentId: payment.id, amount: payment.amount, daysOverdue: payment.daysOverdue },
      });
      triggered++;
      details.push(`OverdueBranchPayment: ${payment.branchName} ($${payment.amount}, ${payment.daysOverdue} days)`);
    }
  }

  // 3. Overdue Supplier Payables (balance > 0 and oldest transaction > 30 days)
  const overdueSuppliers = db.prepare(`
    SELECT sl.supplierId, s.name as supplierName,
           COALESCE(SUM(CAST(sl.debit AS REAL) - CAST(sl.credit AS REAL)), 0) as balance,
           MIN(sl.transactionDate) as oldestTransaction
    FROM supplier_ledger sl
    LEFT JOIN suppliers s ON sl.supplierId = s.id
    GROUP BY sl.supplierId, s.name
    HAVING balance > 0 AND julianday('now') - julianday(oldestTransaction) > 30
  `).all() as any[];

  for (const supplier of overdueSuppliers) {
    const existing = db.prepare(`
      SELECT id FROM system_alerts
      WHERE alertType = 'OverdueSupplierPayment' AND referenceId = ? AND isResolved = 0
    `).get(supplier.supplierId);
    if (!existing) {
      previewCreateSystemAlert({
        alertType: "OverdueSupplierPayment",
        severity: "critical",
        title: `Overdue Supplier Payment: ${supplier.supplierName}`,
        message: `${supplier.supplierName} has an outstanding balance of $${parseFloat(supplier.balance).toFixed(2)}`,
        referenceType: "Supplier",
        referenceId: supplier.supplierId,
        metadata: { balance: supplier.balance },
      });
      triggered++;
      details.push(`OverdueSupplierPayment: ${supplier.supplierName} ($${supplier.balance})`);
    }
  }

  return { triggered, details };
}

// ─── MYSQL MODE ALERT CHECK ───────────────────────────────────────────────────

async function runMySQLAlertCheck(): Promise<{ triggered: number; details: string[] }> {
  const { getDb } = await import("../db");
  const { createSystemAlert, getSystemAlerts } = await import("../db.phase5");
  const { sql, eq, and } = await import("drizzle-orm");
  const db = await getDb();
  if (!db) return { triggered: 0, details: [] };

  const details: string[] = [];
  let triggered = 0;

  try {
    // 1. Low Stock Check
    const lowStockResult = await db.execute(sql`
      SELECT ii.productId, p.name as productName, ii.branchId, b.name as branchName,
             COUNT(*) as currentStock, p.reorderLevel
      FROM inventory_items ii
      INNER JOIN products p ON ii.productId = p.id
      INNER JOIN branches b ON ii.branchId = b.id
      WHERE ii.status = 'Available'
      GROUP BY ii.productId, ii.branchId
      HAVING currentStock <= p.reorderLevel
    `);
    const lowStockItems = (lowStockResult[0] as any) ?? [];

    for (const item of lowStockItems) {
      const existing = await getSystemAlerts({ alertType: "LowStock", branchId: item.branchId, isResolved: false });
      const alreadyExists = existing.some((a: any) => a.referenceId === item.productId);
      if (!alreadyExists) {
        const severity = item.currentStock === 0 ? "critical" : "warning";
        await createSystemAlert({
          alertType: "LowStock", severity,
          title: `${severity === "critical" ? "Critical" : "Low"} Stock: ${item.productName}`,
          message: `${item.productName} at ${item.branchName} has ${item.currentStock} unit(s) remaining (reorder level: ${item.reorderLevel})`,
          referenceType: "Product", referenceId: item.productId, branchId: item.branchId,
          metadata: { currentStock: item.currentStock, reorderLevel: item.reorderLevel },
        });
        triggered++;
        details.push(`LowStock: ${item.productName} @ ${item.branchName}`);
      }
    }
  } catch (err) {
    console.error("Alert check error:", err);
  }

  return { triggered, details };
}
