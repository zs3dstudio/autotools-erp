/**
 * Phase-5 Daily Snapshot Cron Job
 *
 * Runs at midnight (00:00) every day to:
 * 1. Generate a daily business summary (sales, profit, branch performance, low stock, overdue payments)
 * 2. Run the alert check engine (low stock, overdue payments)
 * 3. Store results in the daily_summaries table
 *
 * This module is loaded by server/_core/index.ts on startup.
 * In preview mode, it uses the SQLite adapter.
 * In production mode, it uses the MySQL adapter.
 */

import { isPreviewMode } from "../_core/previewDb";

// ─── CRON SCHEDULER ──────────────────────────────────────────────────────────

let cronTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the daily snapshot cron job.
 * Schedules execution at midnight every day.
 */
export function startDailySnapshotCron(): void {
  if (cronTimer) {
    clearInterval(cronTimer);
  }

  // Calculate milliseconds until next midnight
  const scheduleNextRun = () => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    console.log(`[DailySnapshot] Next snapshot scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);

    cronTimer = setTimeout(async () => {
      await runDailySnapshot();
      // After first run, schedule recurring daily runs
      cronTimer = setInterval(async () => {
        await runDailySnapshot();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntilMidnight);
  };

  scheduleNextRun();
  console.log("[DailySnapshot] Cron job initialized");
}

/**
 * Stop the cron job (used for graceful shutdown)
 */
export function stopDailySnapshotCron(): void {
  if (cronTimer) {
    clearTimeout(cronTimer);
    clearInterval(cronTimer);
    cronTimer = null;
    console.log("[DailySnapshot] Cron job stopped");
  }
}

// ─── SNAPSHOT EXECUTION ───────────────────────────────────────────────────────

/**
 * Execute the daily snapshot for yesterday (called at midnight)
 */
export async function runDailySnapshot(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  console.log(`[DailySnapshot] Generating snapshot for ${dateStr}...`);

  try {
    if (isPreviewMode()) {
      await runPreviewSnapshot(dateStr);
    } else {
      await runMySQLSnapshot(dateStr);
    }
    console.log(`[DailySnapshot] Snapshot for ${dateStr} completed successfully`);
  } catch (err) {
    console.error(`[DailySnapshot] Error generating snapshot for ${dateStr}:`, err);
  }
}

// ─── PREVIEW MODE SNAPSHOT ────────────────────────────────────────────────────

async function runPreviewSnapshot(date: string): Promise<void> {
  const { previewGenerateDailySnapshot } = await import("../_core/previewDbAdapterPhase5");
  previewGenerateDailySnapshot(date);

  // Also run alert check
  const { getPreviewDb } = await import("../_core/previewDb");
  const { previewCreateSystemAlert } = await import("../_core/previewDbAdapterPhase5");
  const db = getPreviewDb();

  // Low stock check
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
    }
  }

  // Overdue branch payments check
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
    }
  }
}

// ─── MYSQL MODE SNAPSHOT ──────────────────────────────────────────────────────

async function runMySQLSnapshot(date: string): Promise<void> {
  const { generateDailySnapshot } = await import("../db.phase5");
  await generateDailySnapshot(date);

  // Run alert check
  const { getDb } = await import("../db");
  const { createSystemAlert, getSystemAlerts } = await import("../db.phase5");
  const { sql } = await import("drizzle-orm");
  const db = await getDb();
  if (!db) return;

  try {
    // Low stock check
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
          message: `${item.productName} at ${item.branchName} has ${item.currentStock} unit(s) remaining`,
          referenceType: "Product", referenceId: item.productId, branchId: item.branchId,
          metadata: { currentStock: item.currentStock, reorderLevel: item.reorderLevel },
        });
      }
    }

    // Overdue supplier payables check
    const supplierResult = await db.execute(sql`
      SELECT sl.supplierId, s.name as supplierName,
             COALESCE(SUM(CAST(sl.debit AS DECIMAL(12,2)) - CAST(sl.credit AS DECIMAL(12,2))), 0) as balance,
             MIN(sl.transactionDate) as oldestTransaction
      FROM supplier_ledger sl
      LEFT JOIN suppliers s ON sl.supplierId = s.id
      GROUP BY sl.supplierId, s.name
      HAVING balance > 0 AND DATEDIFF(NOW(), oldestTransaction) > 30
    `);
    const overdueSuppliers = (supplierResult[0] as any) ?? [];

    for (const supplier of overdueSuppliers) {
      const existing = await getSystemAlerts({ alertType: "OverdueSupplierPayment", isResolved: false });
      const alreadyExists = existing.some((a: any) => a.referenceId === supplier.supplierId);
      if (!alreadyExists) {
        await createSystemAlert({
          alertType: "OverdueSupplierPayment", severity: "critical",
          title: `Overdue Supplier Payment: ${supplier.supplierName}`,
          message: `${supplier.supplierName} has an outstanding balance of $${parseFloat(supplier.balance).toFixed(2)}`,
          referenceType: "Supplier", referenceId: supplier.supplierId,
          metadata: { balance: supplier.balance },
        });
      }
    }
  } catch (err) {
    console.error("[DailySnapshot] Alert check error:", err);
  }
}
