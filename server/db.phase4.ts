/**
 * Phase-4 Database Helper Functions
 * Financial Control Layer:
 * - Supplier Accounting Ledger
 * - Branch → Head Office Payment Approval
 * - Company vs Branch Profit Tracking
 * - Investor Pool + Master Share Automation
 */
import { eq, and, sql, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  supplierLedger,
  investors,
  investorCapital,
  profitDistributions,
  profitDistributionDetails,
  hoPayments,
  saleItems,
  ledgerEntries,
  branches,
  suppliers,
} from "../drizzle/schema";

// ═════════════════════════════════════════════════════════════════════════════════════════════
// SUPPLIER LEDGER
// ═════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Get the current outstanding balance for a supplier
 */
export async function getSupplierBalance(supplierId: number): Promise<number> {
  const db = await getDb();
  const result = await db
    .select({ balance: sql<string>`COALESCE(SUM(CAST(debit AS REAL) - CAST(credit AS REAL)), 0)` })
    .from(supplierLedger)
    .where(eq(supplierLedger.supplierId, supplierId));
  return parseFloat(result[0]?.balance ?? "0");
}

/**
 * Get the full ledger history for a supplier
 */
export async function getSupplierLedger(supplierId: number) {
  const db = await getDb();
  return db
    .select()
    .from(supplierLedger)
    .where(eq(supplierLedger.supplierId, supplierId))
    .orderBy(desc(supplierLedger.transactionDate));
}

/**
 * Add a purchase entry to the supplier ledger (debit = amount owed to supplier)
 */
export async function addSupplierPurchaseEntry(
  supplierId: number,
  referenceId: number,
  amount: number
) {
  const db = await getDb();
  const currentBalance = await getSupplierBalance(supplierId);
  const newBalance = currentBalance + amount;
  return db.insert(supplierLedger).values({
    supplierId,
    transactionType: "Purchase",
    referenceId,
    debit: amount.toFixed(2),
    credit: "0.00",
    runningBalance: newBalance.toFixed(2),
    transactionDate: new Date(),
  });
}

/**
 * Record a payment to a supplier (credit = amount paid)
 */
export async function recordSupplierPayment(
  supplierId: number,
  referenceId: number,
  amount: number
) {
  const db = await getDb();
  const currentBalance = await getSupplierBalance(supplierId);
  const newBalance = currentBalance - amount;
  return db.insert(supplierLedger).values({
    supplierId,
    transactionType: "Payment",
    referenceId,
    debit: "0.00",
    credit: amount.toFixed(2),
    runningBalance: newBalance.toFixed(2),
    transactionDate: new Date(),
  });
}

/**
 * Get outstanding balances for all suppliers
 */
export async function getAllSupplierOutstandingBalances() {
  const db = await getDb();
  return db
    .select({
      supplierId: supplierLedger.supplierId,
      supplierName: suppliers.name,
      totalDebit: sql<string>`COALESCE(SUM(CAST(${supplierLedger.debit} AS REAL)), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(CAST(${supplierLedger.credit} AS REAL)), 0)`,
      outstandingBalance: sql<string>`COALESCE(SUM(CAST(${supplierLedger.debit} AS REAL) - CAST(${supplierLedger.credit} AS REAL)), 0)`,
    })
    .from(supplierLedger)
    .leftJoin(suppliers, eq(supplierLedger.supplierId, suppliers.id))
    .groupBy(supplierLedger.supplierId, suppliers.name)
    .orderBy(desc(sql`outstandingBalance`));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// HEAD OFFICE PAYMENT APPROVAL
// ═════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Get all HO payment requests, optionally filtered by status
 */
export async function getHOPayments(status?: "Pending" | "Approved" | "Rejected") {
  const db = await getDb();
  const query = db
    .select({
      id: hoPayments.id,
      branchId: hoPayments.branchId,
      branchName: branches.name,
      userId: hoPayments.userId,
      amount: hoPayments.amount,
      paymentMethod: hoPayments.paymentMethod,
      reference: hoPayments.reference,
      notes: hoPayments.notes,
      paymentDate: hoPayments.paymentDate,
      status: hoPayments.status,
      approvedByUserId: hoPayments.approvedByUserId,
      rejectionReason: hoPayments.rejectionReason,
      approvedAt: hoPayments.approvedAt,
      createdAt: hoPayments.createdAt,
    })
    .from(hoPayments)
    .leftJoin(branches, eq(hoPayments.branchId, branches.id))
    .orderBy(desc(hoPayments.createdAt));

  if (status) {
    return query.where(eq(hoPayments.status, status));
  }
  return query;
}

/**
 * Create a new HO payment request (from a branch)
 */
export async function createHOPaymentRequest(data: {
  branchId: number;
  userId: number;
  amount: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  paymentDate: Date;
}) {
  const db = await getDb();
  return db.insert(hoPayments).values({
    ...data,
    status: "Pending",
  });
}

/**
 * Approve an HO payment request
 */
export async function approveHOPayment(paymentId: number, approvedByUserId: number) {
  const db = await getDb();
  const payment = await db.select().from(hoPayments).where(eq(hoPayments.id, paymentId)).limit(1);
  if (!payment[0]) throw new Error("Payment not found");
  if (payment[0].status !== "Pending") throw new Error("Payment is not in Pending status");

  await db
    .update(hoPayments)
    .set({
      status: "Approved",
      approvedByUserId,
      approvedAt: new Date(),
    })
    .where(eq(hoPayments.id, paymentId));

  const lastBranchBalance = await db
    .select({ balance: ledgerEntries.runningBalance })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.branchId, payment[0].branchId))
    .orderBy(desc(ledgerEntries.id))
    .limit(1);
  const branchBalance = parseFloat(lastBranchBalance[0]?.balance ?? "0");
  const amount = parseFloat(payment[0].amount);
  await db.insert(ledgerEntries).values({
    branchId: payment[0].branchId,
    entryType: "Payment",
    referenceId: paymentId,
    referenceType: "HOPayment",
    description: `Payment to Head Office — Ref: ${payment[0].reference ?? paymentId}`,
    debit: amount.toFixed(2),
    credit: "0.00",
    runningBalance: (branchBalance - amount).toFixed(2),
  });

  return { success: true };
}

/**
 * Reject an HO payment request
 */
export async function rejectHOPayment(
  paymentId: number,
  approvedByUserId: number,
  rejectionReason: string
) {
  const db = await getDb();
  const payment = await db.select().from(hoPayments).where(eq(hoPayments.id, paymentId)).limit(1);
  if (!payment[0]) throw new Error("Payment not found");
  if (payment[0].status !== "Pending") throw new Error("Payment is not in Pending status");
  await db
    .update(hoPayments)
    .set({
      status: "Rejected",
      approvedByUserId,
      rejectionReason,
      approvedAt: new Date(),
    })
    .where(eq(hoPayments.id, paymentId));
  return { success: true };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// PROFIT TRACKING
// ═════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Get company-wide profit summary
 */
export async function getCompanyProfitSummary(from?: Date, to?: Date) {
  const db = await getDb();
  const conditions = [];
  if (from) conditions.push(sql`${saleItems.createdAt} >= ${from}`);
  if (to) conditions.push(sql`${saleItems.createdAt} <= ${to}`);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(CAST(${saleItems.retailPrice} AS REAL)), 0)`,
      totalLandingCost: sql<string>`COALESCE(SUM(CAST(${saleItems.landingCost} AS REAL)), 0)`,
      totalBranchCost: sql<string>`COALESCE(SUM(CAST(${saleItems.branchCost} AS REAL)), 0)`,
      totalCompanyProfit: sql<string>`COALESCE(SUM(CAST(${saleItems.profit} AS REAL)), 0)`,
      totalInvestorPool: sql<string>`COALESCE(SUM(CAST(${saleItems.investor70} AS REAL)), 0)`,
      totalMasterShare: sql<string>`COALESCE(SUM(CAST(${saleItems.master30} AS REAL)), 0)`,
      totalCashDueHO: sql<string>`COALESCE(SUM(CAST(${saleItems.cashDueHO} AS REAL)), 0)`,
      itemCount: sql<number>`COUNT(*)`,
    })
    .from(saleItems)
    .where(whereClause);

  return result[0] ?? null;
}

/**
 * Get branch-level profit summary
 */
export async function getBranchProfitSummary(from?: Date, to?: Date) {
  const db = await getDb();
  const conditions = [];
  if (from) conditions.push(sql`${saleItems.createdAt} >= ${from}`);
  if (to) conditions.push(sql`${saleItems.createdAt} <= ${to}`);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      branchId: sql<number>`s.branchId`,
      branchName: branches.name,
      totalRevenue: sql<string>`COALESCE(SUM(CAST(${saleItems.retailPrice} AS REAL)), 0)`,
      totalBranchCost: sql<string>`COALESCE(SUM(CAST(${saleItems.branchCost} AS REAL)), 0)`,
      totalCompanyProfit: sql<string>`COALESCE(SUM(CAST(${saleItems.profit} AS REAL)), 0)`,
      totalCashDueHO: sql<string>`COALESCE(SUM(CAST(${saleItems.cashDueHO} AS REAL)), 0)`,
      itemCount: sql<number>`COUNT(*)`,
    })
    .from(saleItems)
    .innerJoin(sql`sales s`, eq(saleItems.saleId, sql`s.id`))
    .leftJoin(branches, eq(sql`s.branchId`, branches.id))
    .where(whereClause)
    .groupBy(sql`s.branchId`, branches.name)
    .orderBy(desc(sql`totalCompanyProfit`));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// INVESTORS & DISTRIBUTIONS
// ═════════════════════════════════════════════════════════════════════════════════════════════

export async function getAllInvestors() {
  const db = await getDb();
  return db
    .select({
      id: investors.id,
      name: investors.name,
      contactInfo: investors.contactInfo,
      isActive: investors.isActive,
      createdAt: investors.createdAt,
      totalCapital: sql<string>`COALESCE(SUM(CAST(${investorCapital.amount} AS REAL)), 0)`,
    })
    .from(investors)
    .leftJoin(investorCapital, eq(investors.id, investorCapital.investorId))
    .groupBy(investors.id, investors.name, investors.contactInfo, investors.isActive, investors.createdAt)
    .orderBy(investors.name);
}

export async function createInvestor(data: { name: string; contactInfo?: string }) {
  const db = await getDb();
  return db.insert(investors).values(data);
}

export async function addInvestorCapital(data: {
  investorId: number;
  amount: string;
  contributionDate: Date;
  notes?: string;
}) {
  const db = await getDb();
  return db.insert(investorCapital).values(data);
}

export async function getInvestorCapitalHistory(investorId: number) {
  const db = await getDb();
  return db
    .select()
    .from(investorCapital)
    .where(eq(investorCapital.investorId, investorId))
    .orderBy(desc(investorCapital.contributionDate));
}

export async function getDistributionHistory() {
  const db = await getDb();
  return db.select().from(profitDistributions).orderBy(desc(profitDistributions.distributionPeriod));
}

export async function getDistributionDetails(distributionId: number) {
  const db = await getDb();
  return db
    .select({
      id: profitDistributionDetails.id,
      distributionId: profitDistributionDetails.distributionId,
      investorId: profitDistributionDetails.investorId,
      investorName: investors.name,
      capitalSharePercent: profitDistributionDetails.capitalSharePercent,
      distributedAmount: profitDistributionDetails.distributedAmount,
      createdAt: profitDistributionDetails.createdAt,
    })
    .from(profitDistributionDetails)
    .leftJoin(investors, eq(profitDistributionDetails.investorId, investors.id))
    .where(eq(profitDistributionDetails.distributionId, distributionId));
}

export async function finalizeDistribution(data: {
  distributionPeriod: string;
  totalInvestorPool: string;
  details: {
    investorId: number;
    capitalSharePercent: string;
    distributedAmount: string;
  }[];
}) {
  const db = await getDb();
  const result = await db.insert(profitDistributions).values({
    distributionPeriod: data.distributionPeriod,
    totalInvestorPool: data.totalInvestorPool,
    isFinalized: true,
    finalizedAt: new Date(),
  });
  
  const distributionId = Number((result as any).lastInsertRowid);

  if (data.details.length > 0) {
    await db.insert(profitDistributionDetails).values(
      data.details.map((d) => ({ distributionId, ...d }))
    );
  }

  return { success: true, distributionId };
}
