/**
 * Phase-5 Preview DB Adapter
 * SQLite-based implementations for Phase-5 features:
 * - Advanced Reporting
 * - System Alerts
 * - Daily Summaries
 * - Audit Log enhancements
 */
import { getPreviewDb } from "./previewDb";

function db() {
  return getPreviewDb();
}

// ─── SYSTEM ALERTS ────────────────────────────────────────────────────────────

export function previewGetSystemAlerts(opts: {
  alertType?: string;
  severity?: string;
  branchId?: number;
  isResolved?: boolean;
  limit?: number;
} = {}): any[] {
  let query = `
    SELECT sa.*, b.name as branchName
    FROM system_alerts sa
    LEFT JOIN branches b ON sa.branchId = b.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (opts.alertType) { query += " AND sa.alertType = ?"; params.push(opts.alertType); }
  if (opts.severity) { query += " AND sa.severity = ?"; params.push(opts.severity); }
  if (opts.branchId !== undefined) { query += " AND sa.branchId = ?"; params.push(opts.branchId); }
  if (opts.isResolved !== undefined) { query += " AND sa.isResolved = ?"; params.push(opts.isResolved ? 1 : 0); }
  query += " ORDER BY sa.createdAt DESC";
  if (opts.limit) { query += ` LIMIT ${opts.limit}`; }
  return db().prepare(query).all(...params) as any[];
}

export function previewGetUnresolvedAlertCount(): number {
  const result = db().prepare(
    "SELECT COUNT(*) as count FROM system_alerts WHERE isResolved = 0"
  ).get() as any;
  return result?.count ?? 0;
}

export function previewCreateSystemAlert(data: {
  alertType: string;
  severity: string;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: number;
  branchId?: number;
  metadata?: any;
}): number {
  const result = db().prepare(`
    INSERT INTO system_alerts (alertType, severity, title, message, referenceType, referenceId, branchId, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.alertType,
    data.severity,
    data.title,
    data.message,
    data.referenceType ?? null,
    data.referenceId ?? null,
    data.branchId ?? null,
    data.metadata ? JSON.stringify(data.metadata) : null
  );
  return Number(result.lastInsertRowid);
}

export function previewResolveSystemAlert(id: number, resolvedByUserId: number): void {
  db().prepare(`
    UPDATE system_alerts
    SET isResolved = 1, resolvedAt = datetime('now'), resolvedByUserId = ?
    WHERE id = ?
  `).run(resolvedByUserId, id);
}

export function previewMarkAlertRead(id: number): void {
  db().prepare("UPDATE system_alerts SET isRead = 1 WHERE id = ?").run(id);
}

export function previewMarkAllAlertsRead(): void {
  db().prepare("UPDATE system_alerts SET isRead = 1 WHERE isRead = 0").run();
}

// ─── DAILY SUMMARIES ──────────────────────────────────────────────────────────

export function previewGetDailySummaries(opts: {
  from?: string;
  to?: string;
  limit?: number;
} = {}): any[] {
  let query = "SELECT * FROM daily_summaries WHERE 1=1";
  const params: any[] = [];
  if (opts.from) { query += " AND summaryDate >= ?"; params.push(opts.from); }
  if (opts.to) { query += " AND summaryDate <= ?"; params.push(opts.to); }
  query += " ORDER BY summaryDate DESC";
  if (opts.limit) { query += ` LIMIT ${opts.limit}`; }
  const rows = db().prepare(query).all(...params) as any[];
  return rows.map(row => ({
    ...row,
    branchPerformance: safeJsonParse(row.branchPerformance, []),
    lowStockItems: safeJsonParse(row.lowStockItems, []),
    overduePayments: safeJsonParse(row.overduePayments, []),
    topProducts: safeJsonParse(row.topProducts, []),
  }));
}

export function previewGetDailySummaryByDate(date: string): any | null {
  const row = db().prepare("SELECT * FROM daily_summaries WHERE summaryDate = ?").get(date) as any;
  if (!row) return null;
  return {
    ...row,
    branchPerformance: safeJsonParse(row.branchPerformance, []),
    lowStockItems: safeJsonParse(row.lowStockItems, []),
    overduePayments: safeJsonParse(row.overduePayments, []),
    topProducts: safeJsonParse(row.topProducts, []),
  };
}

export function previewUpsertDailySummary(data: {
  summaryDate: string;
  totalSales: string;
  totalProfit: string;
  totalTransactions: number;
  branchPerformance: any[];
  lowStockItems: any[];
  overduePayments: any[];
  topProducts: any[];
}): void {
  db().prepare(`
    INSERT OR REPLACE INTO daily_summaries
      (summaryDate, totalSales, totalProfit, totalTransactions, branchPerformance, lowStockItems, overduePayments, topProducts, generatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    data.summaryDate,
    data.totalSales,
    data.totalProfit,
    data.totalTransactions,
    JSON.stringify(data.branchPerformance),
    JSON.stringify(data.lowStockItems),
    JSON.stringify(data.overduePayments),
    JSON.stringify(data.topProducts)
  );
}

// ─── ADVANCED REPORTING ───────────────────────────────────────────────────────

export function previewGetDailySalesReport(opts: {
  branchId?: number;
  from?: string;
  to?: string;
}): any[] {
  let query = `
    SELECT
      s.id,
      s.receiptNo,
      s.branchId,
      b.name as branchName,
      s.customerName,
      s.customerPhone,
      s.subtotal,
      s.discount,
      s.totalAmount,
      s.paymentType,
      s.status,
      s.createdAt,
      COALESCE(SUM(CAST(si.profit AS REAL)), 0) as totalProfit
    FROM sales s
    LEFT JOIN branches b ON s.branchId = b.id
    LEFT JOIN sale_items si ON si.saleId = s.id
    WHERE s.status = 'Completed'
  `;
  const params: any[] = [];
  if (opts.branchId) { query += " AND s.branchId = ?"; params.push(opts.branchId); }
  if (opts.from) { query += " AND date(s.createdAt) >= ?"; params.push(opts.from); }
  if (opts.to) { query += " AND date(s.createdAt) <= ?"; params.push(opts.to); }
  query += " GROUP BY s.id ORDER BY s.createdAt DESC";
  return db().prepare(query).all(...params) as any[];
}

export function previewGetMonthlyRevenueReport(opts: {
  branchId?: number;
  year?: number;
}): any[] {
  const year = opts.year ?? new Date().getFullYear();
  let query = `
    SELECT
      strftime('%m', s.createdAt) as month,
      strftime('%Y', s.createdAt) as year,
      COUNT(*) as transactionCount,
      SUM(CAST(s.totalAmount AS REAL)) as totalRevenue,
      COALESCE(SUM(CAST(si.profit AS REAL)), 0) as totalProfit
    FROM sales s
    LEFT JOIN sale_items si ON si.saleId = s.id
    WHERE s.status = 'Completed' AND strftime('%Y', s.createdAt) = ?
  `;
  const params: any[] = [String(year)];
  if (opts.branchId) { query += " AND s.branchId = ?"; params.push(opts.branchId); }
  query += " GROUP BY strftime('%Y-%m', s.createdAt) ORDER BY month ASC";
  return db().prepare(query).all(...params) as any[];
}

export function previewGetProfitBreakdownReport(opts: {
  branchId?: number;
  from?: string;
  to?: string;
}): any {
  let saleItemsQuery = `
    SELECT
      COALESCE(SUM(CAST(si.profit AS REAL)), 0) as companyProfit,
      COALESCE(SUM(CAST(si.investor70 AS REAL)), 0) as investorPool,
      COALESCE(SUM(CAST(si.master30 AS REAL)), 0) as masterShare,
      COALESCE(SUM(CAST(si.cashDueHO AS REAL)), 0) as cashDueHO
    FROM sale_items si
    INNER JOIN sales s ON si.saleId = s.id
    WHERE s.status = 'Completed'
  `;
  const params: any[] = [];
  if (opts.branchId) { saleItemsQuery += " AND s.branchId = ?"; params.push(opts.branchId); }
  if (opts.from) { saleItemsQuery += " AND date(s.createdAt) >= ?"; params.push(opts.from); }
  if (opts.to) { saleItemsQuery += " AND date(s.createdAt) <= ?"; params.push(opts.to); }
  const totals = db().prepare(saleItemsQuery).get(...params) as any;

  // Branch-level profit breakdown
  let branchQuery = `
    SELECT
      s.branchId,
      b.name as branchName,
      COALESCE(SUM(CAST(si.profit AS REAL)), 0) as companyProfit,
      COALESCE(SUM(CAST(si.investor70 AS REAL)), 0) as investorPool,
      COALESCE(SUM(CAST(si.master30 AS REAL)), 0) as masterShare,
      COALESCE(SUM(CAST(si.cashDueHO AS REAL)), 0) as cashDueHO,
      COUNT(DISTINCT s.id) as transactionCount
    FROM sale_items si
    INNER JOIN sales s ON si.saleId = s.id
    LEFT JOIN branches b ON s.branchId = b.id
    WHERE s.status = 'Completed'
  `;
  const branchParams: any[] = [];
  if (opts.branchId) { branchQuery += " AND s.branchId = ?"; branchParams.push(opts.branchId); }
  if (opts.from) { branchQuery += " AND date(s.createdAt) >= ?"; branchParams.push(opts.from); }
  if (opts.to) { branchQuery += " AND date(s.createdAt) <= ?"; branchParams.push(opts.to); }
  branchQuery += " GROUP BY s.branchId, b.name ORDER BY companyProfit DESC";
  const branchBreakdown = db().prepare(branchQuery).all(...branchParams) as any[];

  // Investor distribution
  const investors = db().prepare(`
    SELECT
      i.id as investorId,
      i.name as investorName,
      COALESCE(SUM(CAST(ic.amount AS REAL)), 0) as totalCapital
    FROM investors i
    LEFT JOIN investor_capital ic ON ic.investorId = i.id
    WHERE i.isActive = 1
    GROUP BY i.id, i.name
  `).all() as any[];

  const totalCapital = investors.reduce((sum: number, inv: any) => sum + (inv.totalCapital ?? 0), 0);
  const investorPool = totals?.investorPool ?? 0;
  const investorDistribution = investors.map((inv: any) => ({
    ...inv,
    sharePercent: totalCapital > 0 ? ((inv.totalCapital / totalCapital) * 100).toFixed(2) : "0.00",
    distributedAmount: totalCapital > 0 ? ((inv.totalCapital / totalCapital) * investorPool).toFixed(2) : "0.00",
  }));

  return {
    summary: {
      companyProfit: totals?.companyProfit ?? 0,
      investorPool: totals?.investorPool ?? 0,
      masterShare: totals?.masterShare ?? 0,
      cashDueHO: totals?.cashDueHO ?? 0,
    },
    branchBreakdown,
    investorDistribution,
  };
}

export function previewGetSupplierPayablesReport(): any[] {
  return db().prepare(`
    SELECT
      sl.supplierId,
      s.name as supplierName,
      s.phone as supplierPhone,
      s.email as supplierEmail,
      COALESCE(SUM(CAST(sl.debit AS REAL)), 0) as totalPurchases,
      COALESCE(SUM(CAST(sl.credit AS REAL)), 0) as totalPaid,
      COALESCE(SUM(CAST(sl.debit AS REAL) - CAST(sl.credit AS REAL)), 0) as outstandingBalance,
      MAX(sl.transactionDate) as lastTransactionDate
    FROM supplier_ledger sl
    LEFT JOIN suppliers s ON sl.supplierId = s.id
    GROUP BY sl.supplierId, s.name, s.phone, s.email
    ORDER BY outstandingBalance DESC
  `).all() as any[];
}

export function previewGetBranchOutstandingReport(): any[] {
  return db().prepare(`
    SELECT
      hp.branchId,
      b.name as branchName,
      COUNT(*) as pendingCount,
      SUM(CAST(hp.amount AS REAL)) as totalPending,
      MAX(hp.createdAt) as latestPaymentDate
    FROM ho_payments hp
    LEFT JOIN branches b ON hp.branchId = b.id
    WHERE hp.status = 'Pending'
    GROUP BY hp.branchId, b.name
    ORDER BY totalPending DESC
  `).all() as any[];
}

export function previewGetBranchPerformanceReport(opts: {
  from?: string;
  to?: string;
}): any[] {
  let query = `
    SELECT
      s.branchId,
      b.name as branchName,
      COUNT(DISTINCT s.id) as transactionCount,
      SUM(CAST(s.totalAmount AS REAL)) as totalSales,
      COALESCE(SUM(CAST(si.profit AS REAL)), 0) as totalProfit,
      COALESCE(SUM(CAST(si.investor70 AS REAL)), 0) as investorPool,
      COALESCE(SUM(CAST(si.master30 AS REAL)), 0) as masterShare
    FROM sales s
    LEFT JOIN branches b ON s.branchId = b.id
    LEFT JOIN sale_items si ON si.saleId = s.id
    WHERE s.status = 'Completed'
  `;
  const params: any[] = [];
  if (opts.from) { query += " AND date(s.createdAt) >= ?"; params.push(opts.from); }
  if (opts.to) { query += " AND date(s.createdAt) <= ?"; params.push(opts.to); }
  query += " GROUP BY s.branchId, b.name ORDER BY totalSales DESC";
  return db().prepare(query).all(...params) as any[];
}

export function previewGetTopCustomers(opts: {
  branchId?: number;
  limit?: number;
}): any[] {
  let query = `
    SELECT
      c.id as customerId,
      c.name as customerName,
      c.phone as customerPhone,
      c.email as customerEmail,
      COUNT(DISTINCT s.id) as purchaseCount,
      SUM(CAST(s.totalAmount AS REAL)) as totalSpent
    FROM customers c
    INNER JOIN sales s ON (s.customerName = c.name OR s.customerPhone = c.phone)
    WHERE s.status = 'Completed' AND c.isActive = 1
  `;
  const params: any[] = [];
  if (opts.branchId) { query += " AND s.branchId = ?"; params.push(opts.branchId); }
  query += " GROUP BY c.id, c.name, c.phone, c.email ORDER BY totalSpent DESC";
  if (opts.limit) { query += ` LIMIT ${opts.limit}`; }
  return db().prepare(query).all(...params) as any[];
}

// ─── DAILY SNAPSHOT GENERATION ────────────────────────────────────────────────

export function previewGenerateDailySnapshot(targetDate?: string): any {
  const date = targetDate ?? new Date().toISOString().split('T')[0];

  // Sales totals for the date
  const salesTotals = db().prepare(`
    SELECT
      COUNT(*) as transactionCount,
      COALESCE(SUM(CAST(totalAmount AS REAL)), 0) as totalSales,
      COALESCE(SUM(CAST(si.profit AS REAL)), 0) as totalProfit
    FROM sales s
    LEFT JOIN sale_items si ON si.saleId = s.id
    WHERE s.status = 'Completed' AND date(s.createdAt) = ?
  `).get(date) as any;

  // Branch performance
  const branchPerformance = db().prepare(`
    SELECT
      s.branchId,
      b.name as branchName,
      COUNT(DISTINCT s.id) as transactionCount,
      SUM(CAST(s.totalAmount AS REAL)) as totalSales,
      COALESCE(SUM(CAST(si.profit AS REAL)), 0) as totalProfit
    FROM sales s
    LEFT JOIN branches b ON s.branchId = b.id
    LEFT JOIN sale_items si ON si.saleId = s.id
    WHERE s.status = 'Completed' AND date(s.createdAt) = ?
    GROUP BY s.branchId, b.name
    ORDER BY totalSales DESC
  `).all(date) as any[];

  // Low stock items
  const lowStockItems = db().prepare(`
    SELECT
      ii.productId,
      p.name as productName,
      ii.branchId,
      b.name as branchName,
      COUNT(*) as currentStock,
      p.reorderLevel
    FROM inventory_items ii
    INNER JOIN products p ON ii.productId = p.id
    INNER JOIN branches b ON ii.branchId = b.id
    WHERE ii.status = 'Available'
    GROUP BY ii.productId, ii.branchId
    HAVING currentStock <= p.reorderLevel
    ORDER BY currentStock ASC
    LIMIT 20
  `).all() as any[];

  // Overdue payments (pending HO payments older than 7 days)
  const overduePayments = db().prepare(`
    SELECT
      'Branch' as type,
      hp.branchId as id,
      b.name as name,
      hp.amount,
      CAST((julianday('now') - julianday(hp.createdAt)) AS INTEGER) as daysOverdue
    FROM ho_payments hp
    LEFT JOIN branches b ON hp.branchId = b.id
    WHERE hp.status = 'Pending'
      AND julianday('now') - julianday(hp.createdAt) > 7
    ORDER BY daysOverdue DESC
    LIMIT 10
  `).all() as any[];

  // Top products for the date
  const topProducts = db().prepare(`
    SELECT
      si.productId,
      p.name as productName,
      COUNT(*) as unitsSold,
      SUM(CAST(si.retailPrice AS REAL)) as totalRevenue
    FROM sale_items si
    INNER JOIN sales s ON si.saleId = s.id
    INNER JOIN products p ON si.productId = p.id
    WHERE s.status = 'Completed' AND date(s.createdAt) = ?
    GROUP BY si.productId, p.name
    ORDER BY unitsSold DESC
    LIMIT 10
  `).all(date) as any[];

  const summary = {
    summaryDate: date,
    totalSales: (salesTotals?.totalSales ?? 0).toFixed(2),
    totalProfit: (salesTotals?.totalProfit ?? 0).toFixed(2),
    totalTransactions: salesTotals?.transactionCount ?? 0,
    branchPerformance,
    lowStockItems,
    overduePayments,
    topProducts,
  };

  previewUpsertDailySummary(summary);
  return summary;
}

// ─── HELPER ───────────────────────────────────────────────────────────────────

function safeJsonParse(value: any, fallback: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value ?? fallback;
}
