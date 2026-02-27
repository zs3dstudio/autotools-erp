/**
 * Phase-5 Database Helper Functions
 * Reporting, Automation, Alerts & Business Intelligence:
 * - System Alerts Engine
 * - Daily Summary Snapshots
 * - Advanced Reporting Queries
 */
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { getDb } from "./db";
import {
  systemAlerts,
  dailySummaries,
  sales,
  saleItems,
  branches,
} from "../drizzle/schema";

// ═════════════════════════════════════════════════════════════════════════════════════════════
// SYSTEM ALERTS
// ═════════════════════════════════════════════════════════════════════════════════════════════

export async function getSystemAlerts(opts: {
  alertType?: string;
  severity?: string;
  branchId?: number;
  isResolved?: boolean;
  limit?: number;
} = {}) {
  const db = await getDb();
  const conditions = [];
  if (opts.alertType) conditions.push(eq(systemAlerts.alertType, opts.alertType as any));
  if (opts.severity) conditions.push(eq(systemAlerts.severity, opts.severity as any));
  if (opts.branchId !== undefined) conditions.push(eq(systemAlerts.branchId, opts.branchId));
  if (opts.isResolved !== undefined) conditions.push(eq(systemAlerts.isResolved, opts.isResolved));
  const query = db
    .select()
    .from(systemAlerts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(systemAlerts.createdAt));
  if (opts.limit) return query.limit(opts.limit);
  return query;
}

export async function getUnresolvedAlertCount(): Promise<number> {
  const db = await getDb();
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(systemAlerts)
    .where(eq(systemAlerts.isResolved, false));
  return Number(result[0]?.count ?? 0);
}

export async function createSystemAlert(data: {
  alertType: "LowStock" | "OverdueSupplierPayment" | "OverdueBranchPayment" | "LargeSale" | "StockAdjustment";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: number;
  branchId?: number;
  metadata?: any;
}) {
  const db = await getDb();
  return db.insert(systemAlerts).values({
    ...data,
    metadata: data.metadata ? data.metadata : null,
  });
}

export async function resolveSystemAlert(id: number, resolvedByUserId: number) {
  const db = await getDb();
  return db
    .update(systemAlerts)
    .set({ isResolved: true, resolvedAt: new Date(), resolvedByUserId })
    .where(eq(systemAlerts.id, id));
}

export async function markAlertRead(id: number) {
  const db = await getDb();
  return db.update(systemAlerts).set({ isRead: true }).where(eq(systemAlerts.id, id));
}

export async function markAllAlertsRead() {
  const db = await getDb();
  return db.update(systemAlerts).set({ isRead: true }).where(eq(systemAlerts.isRead, false));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// DAILY SUMMARIES
// ═════════════════════════════════════════════════════════════════════════════════════════════

export async function getDailySummaries(opts: {
  from?: string;
  to?: string;
  limit?: number;
} = {}) {
  const db = await getDb();
  const conditions = [];
  if (opts.from) conditions.push(gte(dailySummaries.summaryDate, opts.from));
  if (opts.to) conditions.push(lte(dailySummaries.summaryDate, opts.to));
  const query = db
    .select()
    .from(dailySummaries)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(dailySummaries.summaryDate));
  if (opts.limit) return query.limit(opts.limit);
  return query;
}

export async function getDailySummaryByDate(date: string) {
  const db = await getDb();
  const result = await db
    .select()
    .from(dailySummaries)
    .where(eq(dailySummaries.summaryDate, date))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertDailySummary(data: {
  summaryDate: string;
  totalSales: string;
  totalProfit: string;
  totalTransactions: number;
  branchPerformance: any[];
  lowStockItems: any[];
  overduePayments: any[];
  topProducts: any[];
}) {
  const db = await getDb();
  const existing = await getDailySummaryByDate(data.summaryDate);
  if (existing) {
    return db
      .update(dailySummaries)
      .set({ 
        ...data, 
        branchPerformance: JSON.stringify(data.branchPerformance),
        lowStockItems: JSON.stringify(data.lowStockItems),
        overduePayments: JSON.stringify(data.overduePayments),
        topProducts: JSON.stringify(data.topProducts),
        generatedAt: new Date() 
      })
      .where(eq(dailySummaries.summaryDate, data.summaryDate));
  }
  return db.insert(dailySummaries).values({ 
    ...data, 
    branchPerformance: JSON.stringify(data.branchPerformance),
    lowStockItems: JSON.stringify(data.lowStockItems),
    overduePayments: JSON.stringify(data.overduePayments),
    topProducts: JSON.stringify(data.topProducts),
    generatedAt: new Date() 
  });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// ADVANCED REPORTING
// ═════════════════════════════════════════════════════════════════════════════════════════════

export async function getDailySalesReport(opts: {
  branchId?: number;
  from?: Date;
  to?: Date;
}) {
  const db = await getDb();
  try {
    const result = await db
      .select({
        id: sales.id,
        receiptNo: sales.receiptNo,
        branchId: sales.branchId,
        branchName: branches.name,
        customerName: sales.customerName,
        customerPhone: sales.customerPhone,
        subtotal: sales.subtotal,
        discount: sales.discount,
        totalAmount: sales.totalAmount,
        paymentType: sales.paymentType,
        status: sales.status,
        createdAt: sales.createdAt,
        totalProfit: sql<string>`COALESCE(SUM(CAST(${saleItems.profit} AS REAL)), 0)`
      })
      .from(sales)
      .leftJoin(branches, eq(sales.branchId, branches.id))
      .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
      .where(and(
        eq(sales.status, 'Completed'),
        opts.branchId ? eq(sales.branchId, opts.branchId) : sql`1=1`,
        opts.from ? gte(sales.createdAt, opts.from) : sql`1=1`,
        opts.to ? lte(sales.createdAt, opts.to) : sql`1=1`
      ))
      .groupBy(sales.id)
      .orderBy(desc(sales.createdAt));
    return result;
  } catch (err) {
    console.error("getDailySalesReport error:", err);
    return [];
  }
}

export async function getMonthlyRevenueReport(opts: {
  branchId?: number;
  year?: number;
}) {
  const db = await getDb();
  const year = opts.year ?? new Date().getFullYear();
  try {
    const result = await db
      .select({
        month: sql<number>`strftime('%m', ${sales.createdAt})`,
        year: sql<number>`strftime('%Y', ${sales.createdAt})`,
        transactionCount: sql<number>`COUNT(DISTINCT ${sales.id})`,
        totalRevenue: sql<string>`SUM(CAST(${sales.totalAmount} AS REAL))`,
        totalProfit: sql<string>`COALESCE(SUM(CAST(${saleItems.profit} AS REAL)), 0)`
      })
      .from(sales)
      .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
      .where(and(
        eq(sales.status, 'Completed'),
        sql`strftime('%Y', ${sales.createdAt}) = ${String(year)}`,
        opts.branchId ? eq(sales.branchId, opts.branchId) : sql`1=1`
      ))
      .groupBy(sql`strftime('%m', ${sales.createdAt})`, sql`strftime('%Y', ${sales.createdAt})`)
      .orderBy(sql`month ASC`);
    return result;
  } catch (err) {
    console.error("getMonthlyRevenueReport error:", err);
    return [];
  }
}

export async function getProfitBreakdownReport(opts: {
  branchId?: number;
  from?: Date;
  to?: Date;
}) {
  const db = await getDb();
  try {
    const summary = await db
      .select({
        companyProfit: sql<string>`COALESCE(SUM(CAST(${saleItems.profit} AS REAL)), 0)`,
        investorPool: sql<string>`COALESCE(SUM(CAST(${saleItems.investor70} AS REAL)), 0)`,
        masterShare: sql<string>`COALESCE(SUM(CAST(${saleItems.master30} AS REAL)), 0)`,
        cashDueHO: sql<string>`COALESCE(SUM(CAST(${saleItems.cashDueHO} AS REAL)), 0)`
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(and(
        eq(sales.status, 'Completed'),
        opts.branchId ? eq(sales.branchId, opts.branchId) : sql`1=1`,
        opts.from ? gte(sales.createdAt, opts.from) : sql`1=1`,
        opts.to ? lte(sales.createdAt, opts.to) : sql`1=1`
      ));

    const branchBreakdown = await db
      .select({
        branchId: sales.branchId,
        branchName: branches.name,
        transactionCount: sql<number>`COUNT(DISTINCT ${sales.id})`,
        totalSales: sql<string>`SUM(CAST(${sales.totalAmount} AS REAL))`,
        companyProfit: sql<string>`COALESCE(SUM(CAST(${saleItems.profit} AS REAL)), 0)`,
        investorPool: sql<string>`COALESCE(SUM(CAST(${saleItems.investor70} AS REAL)), 0)`,
        masterShare: sql<string>`COALESCE(SUM(CAST(${saleItems.master30} AS REAL)), 0)`
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .leftJoin(branches, eq(sales.branchId, branches.id))
      .where(and(
        eq(sales.status, 'Completed'),
        opts.branchId ? eq(sales.branchId, opts.branchId) : sql`1=1`,
        opts.from ? gte(sales.createdAt, opts.from) : sql`1=1`,
        opts.to ? lte(sales.createdAt, opts.to) : sql`1=1`
      ))
      .groupBy(sales.branchId, branches.name)
      .orderBy(desc(sql`companyProfit`));

    return { 
      summary: summary[0] || {}, 
      branchBreakdown, 
      investorDistribution: [] // Investor distribution handled in router/frontend
    };
  } catch (err) {
    console.error("getProfitBreakdownReport error:", err);
    return { summary: {}, branchBreakdown: [], investorDistribution: [] };
  }
}
