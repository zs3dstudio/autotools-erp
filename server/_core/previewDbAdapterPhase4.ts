/**
 * Phase-4 Preview DB Adapter
 * SQLite-based implementations for Phase-4 financial features.
 * These mirror the MySQL functions in db.phase4.ts for use in preview mode.
 */
import { getPreviewDb } from "./previewDb";

function db() {
  return getPreviewDb();
}

// ─── SUPPLIER LEDGER ─────────────────────────────────────────────────────────

export function previewGetSupplierBalance(supplierId: number): number {
  const result = db().prepare(
    "SELECT COALESCE(SUM(CAST(debit AS REAL) - CAST(credit AS REAL)), 0) as balance FROM supplier_ledger WHERE supplierId = ?"
  ).get(supplierId) as any;
  return result?.balance ?? 0;
}

export function previewGetSupplierLedger(supplierId: number): any[] {
  return db().prepare(
    "SELECT * FROM supplier_ledger WHERE supplierId = ? ORDER BY transactionDate DESC"
  ).all(supplierId) as any[];
}

export function previewAddSupplierEntry(data: {
  supplierId: number;
  transactionType: string;
  referenceId: number;
  debit: string;
  credit: string;
}): void {
  const currentBalance = previewGetSupplierBalance(data.supplierId);
  const newBalance = currentBalance + parseFloat(data.debit) - parseFloat(data.credit);
  db().prepare(`
    INSERT INTO supplier_ledger (supplierId, transactionType, referenceId, debit, credit, runningBalance, transactionDate)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    data.supplierId, data.transactionType, data.referenceId,
    data.debit, data.credit, newBalance.toFixed(2)
  );
}

export function previewGetAllSupplierBalances(): any[] {
  return db().prepare(`
    SELECT sl.supplierId, s.name as supplierName,
           COALESCE(SUM(CAST(sl.debit AS REAL)), 0) as totalDebit,
           COALESCE(SUM(CAST(sl.credit AS REAL)), 0) as totalCredit,
           COALESCE(SUM(CAST(sl.debit AS REAL) - CAST(sl.credit AS REAL)), 0) as outstandingBalance
    FROM supplier_ledger sl
    LEFT JOIN suppliers s ON sl.supplierId = s.id
    GROUP BY sl.supplierId, s.name
    ORDER BY outstandingBalance DESC
  `).all() as any[];
}

// ─── HO PAYMENTS ─────────────────────────────────────────────────────────────

export function previewGetHOPayments(status?: string): any[] {
  let query = `
    SELECT hp.*, b.name as branchName
    FROM ho_payments hp
    LEFT JOIN branches b ON hp.branchId = b.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (status) { query += " AND hp.status = ?"; params.push(status); }
  query += " ORDER BY hp.createdAt DESC";
  return db().prepare(query).all(...params) as any[];
}

export function previewCreateHOPaymentRequest(data: {
  branchId: number;
  userId: number;
  amount: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  paymentDate: string;
}): number {
  const result = db().prepare(`
    INSERT INTO ho_payments (branchId, userId, amount, paymentMethod, reference, notes, paymentDate, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
  `).run(
    data.branchId, data.userId, data.amount,
    data.paymentMethod ?? null, data.reference ?? null,
    data.notes ?? null, data.paymentDate
  );
  return Number(result.lastInsertRowid);
}

export function previewApproveHOPayment(paymentId: number, approvedByUserId: number): void {
  const payment = db().prepare("SELECT * FROM ho_payments WHERE id = ?").get(paymentId) as any;
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "Pending") throw new Error("Payment is not in Pending status");

  db().prepare(`
    UPDATE ho_payments SET status = 'Approved', approvedByUserId = ?, approvedAt = datetime('now')
    WHERE id = ?
  `).run(approvedByUserId, paymentId);

  // Create ledger entry for the branch
  const lastEntry = db().prepare(
    "SELECT runningBalance FROM ledger_entries WHERE branchId = ? ORDER BY id DESC LIMIT 1"
  ).get(payment.branchId) as any;
  const currentBalance = parseFloat(lastEntry?.runningBalance ?? "0");
  const amount = parseFloat(payment.amount);
  const newBalance = currentBalance - amount;

  db().prepare(`
    INSERT INTO ledger_entries (branchId, entryType, referenceId, referenceType, description, debit, credit, runningBalance)
    VALUES (?, 'Payment', ?, 'HOPayment', ?, ?, '0.00', ?)
  `).run(
    payment.branchId, paymentId,
    `Payment to Head Office — Ref: ${payment.reference ?? paymentId}`,
    amount.toFixed(2), newBalance.toFixed(2)
  );
}

export function previewRejectHOPayment(
  paymentId: number,
  approvedByUserId: number,
  rejectionReason: string
): void {
  const payment = db().prepare("SELECT * FROM ho_payments WHERE id = ?").get(paymentId) as any;
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "Pending") throw new Error("Payment is not in Pending status");
  db().prepare(`
    UPDATE ho_payments SET status = 'Rejected', approvedByUserId = ?, rejectionReason = ?, approvedAt = datetime('now')
    WHERE id = ?
  `).run(approvedByUserId, rejectionReason, paymentId);
}

// ─── PROFIT TRACKING ─────────────────────────────────────────────────────────

export function previewGetCompanyProfitSummary(from?: string, to?: string): any {
  let query = `
    SELECT
      COALESCE(SUM(CAST(retailPrice AS REAL)), 0) as totalRevenue,
      COALESCE(SUM(CAST(landingCost AS REAL)), 0) as totalLandingCost,
      COALESCE(SUM(CAST(branchCost AS REAL)), 0) as totalBranchCost,
      COALESCE(SUM(CAST(profit AS REAL)), 0) as totalCompanyProfit,
      COALESCE(SUM(CAST(investor70 AS REAL)), 0) as totalInvestorPool,
      COALESCE(SUM(CAST(master30 AS REAL)), 0) as totalMasterShare,
      COALESCE(SUM(CAST(cashDueHO AS REAL)), 0) as totalCashDueHO,
      COUNT(*) as itemCount
    FROM sale_items
    WHERE 1=1
  `;
  const params: any[] = [];
  if (from) { query += " AND createdAt >= ?"; params.push(from); }
  if (to) { query += " AND createdAt <= ?"; params.push(to); }
  return db().prepare(query).get(...params) as any;
}

export function previewGetBranchProfitSummary(from?: string, to?: string): any[] {
  let query = `
    SELECT
      s.branchId, b.name as branchName,
      COALESCE(SUM(CAST(si.retailPrice AS REAL)), 0) as totalRevenue,
      COALESCE(SUM(CAST(si.branchCost AS REAL)), 0) as totalBranchCost,
      COALESCE(SUM(CAST(si.profit AS REAL)), 0) as totalCompanyProfit,
      COALESCE(SUM(CAST(si.cashDueHO AS REAL)), 0) as totalCashDueHO,
      COUNT(*) as itemCount
    FROM sale_items si
    JOIN sales s ON si.saleId = s.id
    LEFT JOIN branches b ON s.branchId = b.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (from) { query += " AND si.createdAt >= ?"; params.push(from); }
  if (to) { query += " AND si.createdAt <= ?"; params.push(to); }
  query += " GROUP BY s.branchId, b.name ORDER BY totalCompanyProfit DESC";
  return db().prepare(query).all(...params) as any[];
}

// ─── INVESTORS ───────────────────────────────────────────────────────────────

export function previewGetAllInvestors(): any[] {
  return db().prepare(`
    SELECT i.*, COALESCE(SUM(CAST(ic.amount AS REAL)), 0) as totalCapital
    FROM investors i
    LEFT JOIN investor_capital ic ON i.id = ic.investorId
    GROUP BY i.id, i.name, i.contactInfo, i.isActive, i.createdAt
    ORDER BY i.name
  `).all() as any[];
}

export function previewCreateInvestor(data: { name: string; contactInfo?: string }): number {
  const result = db().prepare(
    "INSERT INTO investors (name, contactInfo) VALUES (?, ?)"
  ).run(data.name, data.contactInfo ?? null);
  return Number(result.lastInsertRowid);
}

export function previewAddInvestorCapital(data: {
  investorId: number;
  amount: string;
  contributionDate: string;
  notes?: string;
}): void {
  db().prepare(`
    INSERT INTO investor_capital (investorId, amount, contributionDate, notes)
    VALUES (?, ?, ?, ?)
  `).run(data.investorId, data.amount, data.contributionDate, data.notes ?? null);
}

export function previewGetInvestorCapitalHistory(investorId: number): any[] {
  return db().prepare(
    "SELECT * FROM investor_capital WHERE investorId = ? ORDER BY contributionDate DESC"
  ).all(investorId) as any[];
}

// ─── PROFIT DISTRIBUTIONS ────────────────────────────────────────────────────

export function previewCalculateInvestorPool(period: string): number {
  const [year, month] = period.split("-");
  const startDate = `${year}-${month}-01 00:00:00`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const endDate = `${year}-${month}-${String(lastDay).padStart(2, "0")} 23:59:59`;
  const result = db().prepare(`
    SELECT COALESCE(SUM(CAST(investor70 AS REAL)), 0) as total
    FROM sale_items
    WHERE createdAt >= ? AND createdAt <= ?
  `).get(startDate, endDate) as any;
  return result?.total ?? 0;
}

export function previewPreviewDistribution(period: string): any {
  const totalPool = previewCalculateInvestorPool(period);
  const capitalRows = db().prepare(`
    SELECT ic.investorId, i.name as investorName, COALESCE(SUM(CAST(ic.amount AS REAL)), 0) as totalCapital
    FROM investor_capital ic
    JOIN investors i ON ic.investorId = i.id
    WHERE i.isActive = 1
    GROUP BY ic.investorId, i.name
  `).all() as any[];

  const grandTotal = capitalRows.reduce((sum: number, row: any) => sum + row.totalCapital, 0);
  const breakdown = capitalRows.map((row: any) => {
    const sharePercent = grandTotal > 0 ? (row.totalCapital / grandTotal) * 100 : 0;
    const distributedAmount = (totalPool * sharePercent) / 100;
    return {
      investorId: row.investorId,
      investorName: row.investorName,
      totalCapital: row.totalCapital,
      capitalSharePercent: sharePercent.toFixed(2),
      distributedAmount: distributedAmount.toFixed(2),
    };
  });

  return { period, totalPool, grandTotalCapital: grandTotal, breakdown };
}

export function previewFinalizeDistribution(period: string): any {
  const existing = db().prepare(
    "SELECT * FROM profit_distributions WHERE distributionPeriod = ?"
  ).get(period) as any;
  if (existing?.isFinalized) throw new Error(`Distribution for ${period} is already finalized`);

  const preview = previewPreviewDistribution(period);
  let distributionId: number;

  if (existing) {
    distributionId = existing.id;
    db().prepare(`
      UPDATE profit_distributions SET totalInvestorPool = ?, isFinalized = 1, finalizedAt = datetime('now')
      WHERE id = ?
    `).run(preview.totalPool.toFixed(2), distributionId);
  } else {
    const result = db().prepare(`
      INSERT INTO profit_distributions (distributionPeriod, totalInvestorPool, isFinalized, finalizedAt)
      VALUES (?, ?, 1, datetime('now'))
    `).run(period, preview.totalPool.toFixed(2));
    distributionId = Number(result.lastInsertRowid);
  }

  for (const item of preview.breakdown) {
    db().prepare(`
      INSERT INTO profit_distribution_details (distributionId, investorId, capitalSharePercent, distributedAmount)
      VALUES (?, ?, ?, ?)
    `).run(distributionId, item.investorId, item.capitalSharePercent, item.distributedAmount);
  }

  return { success: true, distributionId, preview };
}

export function previewGetDistributionHistory(): any[] {
  return db().prepare(
    "SELECT * FROM profit_distributions ORDER BY distributionPeriod DESC"
  ).all() as any[];
}

export function previewGetDistributionDetails(distributionId: number): any[] {
  return db().prepare(`
    SELECT pdd.*, i.name as investorName
    FROM profit_distribution_details pdd
    LEFT JOIN investors i ON pdd.investorId = i.id
    WHERE pdd.distributionId = ?
  `).all(distributionId) as any[];
}
