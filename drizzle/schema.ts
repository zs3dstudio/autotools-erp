import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────
// BRANCHES
// ─────────────────────────────────────────────
export const branches = sqliteTable("branches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  city: text("city"),
  address: text("address"),
  phone: text("phone"),
  isWarehouse: integer("isWarehouse", { mode: "boolean" }).default(false).notNull(),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type Branch = typeof branches.$inferSelect;

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  passwordHash: text("passwordHash"),
  loginMethod: text("loginMethod"),
  role: text("role").default("POSUser").notNull(), // SQLite doesn't have native Enum, use text
  branchId: integer("branchId"),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─────────────────────────────────────────────
// USER PERMISSIONS
// ─────────────────────────────────────────────
export const userPermissions = sqliteTable("user_permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().unique(),
  canSell: integer("canSell", { mode: "boolean" }).default(false).notNull(),
  canTransferRequest: integer("canTransferRequest", { mode: "boolean" }).default(false).notNull(),
  canReceiveStock: integer("canReceiveStock", { mode: "boolean" }).default(false).notNull(),
  canViewLedger: integer("canViewLedger", { mode: "boolean" }).default(false).notNull(),
  canViewGlobalStock: integer("canViewGlobalStock", { mode: "boolean" }).default(false).notNull(),
  canViewFinancials: integer("canViewFinancials", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type UserPermissions = typeof userPermissions.$inferSelect;

// ─────────────────────────────────────────────
// USER-BRANCH ASSIGNMENTS
// ─────────────────────────────────────────────
export const userBranches = sqliteTable("user_branches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  branchId: integer("branchId").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// SUPPLIERS
// ─────────────────────────────────────────────
export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  contactPerson: text("contactPerson"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("categoryId"),
  supplierId: integer("supplierId"),
  landingCost: text("landingCost").notNull().default("0.00"),
  branchCost: text("branchCost").notNull().default("0.00"),
  retailPrice: text("retailPrice").notNull().default("0.00"),
  reorderLevel: integer("reorderLevel").default(5).notNull(),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  imageUrl: text("imageUrl"),
  barcode: text("barcode"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type Product = typeof products.$inferSelect;

// ─────────────────────────────────────────────
// INVENTORY ITEMS
// ─────────────────────────────────────────────
export const inventoryItems = sqliteTable(
  "inventory_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    serialNo: text("serialNo").notNull().unique(),
    batchId: text("batchId"),
    productId: integer("productId").notNull(),
    branchId: integer("branchId").notNull(),
    landingCost: text("landingCost").notNull(),
    branchCost: text("branchCost").notNull(),
    status: text("status").default("Available").notNull(),
    transitToBranchId: integer("transitToBranchId"),
    notes: text("notes"),
    createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (t) => [index("idx_inv_branch").on(t.branchId), index("idx_inv_product").on(t.productId)]
);

export type InventoryItem = typeof inventoryItems.$inferSelect;

// ─────────────────────────────────────────────
// SALES
// ─────────────────────────────────────────────
export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  receiptNo: text("receiptNo").notNull().unique(),
  branchId: integer("branchId").notNull(),
  userId: integer("userId").notNull(),
  customerId: integer("customerId"),
  customerName: text("customerName"),
  customerPhone: text("customerPhone"),
  subtotal: text("subtotal").notNull(),
  discount: text("discount").default("0.00").notNull(),
  totalAmount: text("totalAmount").notNull(),
  paymentType: text("paymentType").notNull(),
  status: text("status").default("Completed").notNull(),
  notes: text("notes"),
  syncedAt: integer("syncedAt", { mode: "timestamp" }),
  isOfflineSale: integer("isOfflineSale", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type Sale = typeof sales.$inferSelect;

// ─────────────────────────────────────────────
// SALE LINE ITEMS
// ─────────────────────────────────────────────
export const saleItems = sqliteTable("sale_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("saleId").notNull(),
  inventoryItemId: integer("inventoryItemId").notNull(),
  productId: integer("productId").notNull(),
  serialNo: text("serialNo").notNull(),
  landingCost: text("landingCost").notNull(),
  branchCost: text("branchCost").notNull(),
  retailPrice: text("retailPrice").notNull(),
  profit: text("profit").notNull(),
  investor70: text("investor70").notNull(),
  master30: text("master30").notNull(),
  cashDueHO: text("cashDueHO").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type SaleItem = typeof saleItems.$inferSelect;

// ─────────────────────────────────────────────
// STOCK TRANSFERS
// ─────────────────────────────────────────────
export const stockTransfers = sqliteTable("stock_transfers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transferNo: text("transferNo").notNull().unique(),
  fromBranchId: integer("fromBranchId").notNull(),
  toBranchId: integer("toBranchId").notNull(),
  requestedByUserId: integer("requestedByUserId").notNull(),
  approvedByUserId: integer("approvedByUserId"),
  status: text("status").default("Pending").notNull(),
  notes: text("notes"),
  rejectionReason: text("rejectionReason"),
  requestedAt: integer("requestedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  approvedAt: integer("approvedAt", { mode: "timestamp" }),
  completedAt: integer("completedAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type StockTransfer = typeof stockTransfers.$inferSelect;

// ─────────────────────────────────────────────
// STOCK TRANSFER ITEMS
// ─────────────────────────────────────────────
export const stockTransferItems = sqliteTable("stock_transfer_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transferId: integer("transferId").notNull(),
  inventoryItemId: integer("inventoryItemId").notNull(),
  serialNo: text("serialNo").notNull(),
  productId: integer("productId").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// LEDGER ENTRIES
// ─────────────────────────────────────────────
export const ledgerEntries = sqliteTable("ledger_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branchId").notNull(),
  entryType: text("entryType").notNull(),
  referenceId: integer("referenceId"),
  referenceType: text("referenceType"),
  description: text("description").notNull(),
  debit: text("debit").default("0.00").notNull(),
  credit: text("credit").default("0.00").notNull(),
  runningBalance: text("runningBalance").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// BRANCH LEDGER ENTRIES
// ─────────────────────────────────────────────
export const branchLedgerEntries = sqliteTable("branch_ledger_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branchId").notNull(),
  saleId: integer("saleId"),
  type: text("type").notNull(),
  amount: text("amount").notNull(),
  description: text("description"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branchId").notNull(),
  userId: integer("userId").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  amount: text("amount").notNull(),
  expenseDate: integer("expenseDate", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// HO PAYMENTS
// ─────────────────────────────────────────────
export const hoPayments = sqliteTable("ho_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branchId").notNull(),
  userId: integer("userId").notNull(),
  amount: text("amount").notNull(),
  paymentMethod: text("paymentMethod"),
  reference: text("reference"),
  notes: text("notes"),
  paymentDate: integer("paymentDate", { mode: "timestamp" }).notNull(),
  status: text("status").default("Pending").notNull(),
  approvedByUserId: integer("approvedByUserId"),
  rejectionReason: text("rejectionReason"),
  approvedAt: integer("approvedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId"),
  userEmail: text("userEmail"),
  userName: text("userName"),
  action: text("action").notNull(),
  entityType: text("entityType").notNull(),
  entityId: text("entityId"),
  branchId: integer("branchId"),
  details: text("details"),
  ipAddress: text("ipAddress"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// REORDER ALERTS
// ─────────────────────────────────────────────
export const reorderAlerts = sqliteTable("reorder_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("productId").notNull(),
  branchId: integer("branchId").notNull(),
  currentStock: integer("currentStock").notNull(),
  reorderLevel: integer("reorderLevel").notNull(),
  isResolved: integer("isResolved", { mode: "boolean" }).default(false).notNull(),
  resolvedAt: integer("resolvedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// COMPANY SETTINGS
// ─────────────────────────────────────────────
export const companySettings = sqliteTable("company_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyName: text("companyName").notNull(),
  tagline: text("tagline"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  currency: text("currency").default("USD").notNull(),
  currencySymbol: text("currencySymbol").default("$").notNull(),
  logoUrl: text("logoUrl"),
  primaryColor: text("primaryColor").default("#3b82f6").notNull(),
  taxRate: text("taxRate").default("0.00").notNull(),
  receiptFooter: text("receiptFooter"),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  totalPurchases: text("totalPurchases").default("0.00").notNull(),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// PHASE-2: STOCK RESERVATIONS
// ─────────────────────────────────────────────
export const stockReservations = sqliteTable("stock_reservations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inventoryItemId: integer("inventoryItemId"),
  invoiceId: integer("invoiceId").notNull(),
  invoiceType: text("invoiceType").notNull(),
  branchId: integer("branchId").notNull(),
  productId: integer("productId").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  status: text("status").default("Active").notNull(),
  releasedAt: integer("releasedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// PHASE-2: PURCHASE ORDERS
// ─────────────────────────────────────────────
export const purchaseOrders = sqliteTable("purchase_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  poNo: text("poNo").notNull().unique(),
  supplierId: integer("supplierId").notNull(),
  warehouseBranchId: integer("warehouseBranchId").notNull(),
  createdByUserId: integer("createdByUserId").notNull(),
  status: text("status").default("Draft").notNull(),
  totalAmount: text("totalAmount").notNull(),
  notes: text("notes"),
  submittedAt: integer("submittedAt", { mode: "timestamp" }),
  approvedAt: integer("approvedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const purchaseOrderItems = sqliteTable("purchase_order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  poId: integer("poId").notNull(),
  productId: integer("productId").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: text("unitPrice").notNull(),
  totalPrice: text("totalPrice").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// PHASE-2: GOODS RECEIVED NOTES (GRN)
// ─────────────────────────────────────────────
export const goodsReceivedNotes = sqliteTable("goods_received_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  grnNo: text("grnNo").notNull().unique(),
  poId: integer("poId").notNull(),
  supplierId: integer("supplierId").notNull(),
  warehouseBranchId: integer("warehouseBranchId").notNull(),
  receivedByUserId: integer("receivedByUserId").notNull(),
  status: text("status").default("Pending").notNull(),
  totalReceivedAmount: text("totalReceivedAmount").notNull(),
  notes: text("notes"),
  receivedAt: integer("receivedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const grnItems = sqliteTable("grn_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  grnId: integer("grnId").notNull(),
  poItemId: integer("poItemId").notNull(),
  productId: integer("productId").notNull(),
  quantityReceived: integer("quantityReceived").notNull(),
  unitPrice: text("unitPrice").notNull(),
  totalPrice: text("totalPrice").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const landingCosts = sqliteTable("landing_costs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  grnId: integer("grnId").notNull(),
  costType: text("costType").notNull(),
  amount: text("amount").notNull(),
  description: text("description"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// PHASE-2: PURCHASE FINALIZATIONS
// ─────────────────────────────────────────────
export const purchaseFinalizations = sqliteTable("purchase_finalizations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  grnId: integer("grnId").notNull(),
  poId: integer("poId").notNull(),
  supplierId: integer("supplierId").notNull(),
  warehouseBranchId: integer("warehouseBranchId").notNull(),
  finalizedByUserId: integer("finalizedByUserId").notNull(),
  baseAmount: text("baseAmount").notNull(),
  totalLandingCosts: text("totalLandingCosts").notNull(),
  finalAmount: text("finalAmount").notNull(),
  payableEntryId: integer("payableEntryId"),
  status: text("status").default("Finalized").notNull(),
  finalizedAt: integer("finalizedAt", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// PHASE-2: INVOICES & PAYMENTS
// ─────────────────────────────────────────────
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNo: text("invoiceNo").notNull().unique(),
  invoiceType: text("invoiceType").notNull(),
  referenceId: integer("referenceId").notNull(),
  supplierId: integer("supplierId"),
  customerId: integer("customerId"),
  branchId: integer("branchId").notNull(),
  totalAmount: text("totalAmount").notNull(),
  paidAmount: text("paidAmount").default("0.00").notNull(),
  outstandingAmount: text("outstandingAmount").notNull(),
  creditAmount: text("creditAmount").default("0.00").notNull(),
  status: text("status").default("Draft").notNull(),
  dueDate: integer("dueDate", { mode: "timestamp" }),
  issuedAt: integer("issuedAt", { mode: "timestamp" }),
  paidAt: integer("paidAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const invoicePayments = sqliteTable("invoice_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoiceId").notNull(),
  paymentAmount: text("paymentAmount").notNull(),
  paymentMethod: text("paymentMethod").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  createdByUserId: integer("createdByUserId").notNull(),
  paymentDate: integer("paymentDate", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const paymentAllocations = sqliteTable("payment_allocations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoiceId").notNull(),
  paymentId: integer("paymentId").notNull(),
  allocatedAmount: text("allocatedAmount").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const invoiceAging = sqliteTable("invoice_aging", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoiceId").notNull().unique(),
  invoiceNo: text("invoiceNo").notNull(),
  supplierId: integer("supplierId"),
  customerId: integer("customerId"),
  branchId: integer("branchId").notNull(),
  totalAmount: text("totalAmount").notNull(),
  outstandingAmount: text("outstandingAmount").notNull(),
  dueDate: integer("dueDate", { mode: "timestamp" }),
  daysOverdue: integer("daysOverdue").default(0).notNull(),
  agingBucket: text("agingBucket").default("Current").notNull(),
  lastPaymentDate: integer("lastPaymentDate", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// PHASE-4: SUPPLIER LEDGER
// ─────────────────────────────────────────────
export const supplierLedger = sqliteTable("supplier_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplierId").notNull(),
  transactionType: text("transactionType").notNull(),
  referenceId: integer("referenceId"),
  debit: text("debit").default("0.00").notNull(),
  credit: text("credit").default("0.00").notNull(),
  runningBalance: text("runningBalance").notNull(),
  transactionDate: integer("transactionDate", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// PHASE-4: INVESTORS & CAPITAL
// ─────────────────────────────────────────────
export const investors = sqliteTable("investors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  contactInfo: text("contactInfo"),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const investorCapital = sqliteTable("investor_capital", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  investorId: integer("investorId").notNull(),
  amount: text("amount").notNull(),
  contributionDate: integer("contributionDate", { mode: "timestamp" }).notNull(),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// PHASE-4: PROFIT DISTRIBUTIONS
// ─────────────────────────────────────────────
export const profitDistributions = sqliteTable("profit_distributions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  distributionPeriod: text("distributionPeriod").notNull(),
  totalInvestorPool: text("totalInvestorPool").notNull(),
  isFinalized: integer("isFinalized", { mode: "boolean" }).default(false).notNull(),
  finalizedAt: integer("finalizedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const profitDistributionDetails = sqliteTable("profit_distribution_details", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  distributionId: integer("distributionId").notNull(),
  investorId: integer("investorId").notNull(),
  capitalSharePercent: text("capitalSharePercent").notNull(),
  distributedAmount: text("distributedAmount").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// PHASE-5: SYSTEM ALERTS
// ─────────────────────────────────────────────
export const systemAlerts = sqliteTable("system_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  alertType: text("alertType").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  referenceType: text("referenceType"),
  referenceId: integer("referenceId"),
  branchId: integer("branchId"),
  isRead: integer("isRead", { mode: "boolean" }).default(false).notNull(),
  isResolved: integer("isResolved", { mode: "boolean" }).default(false).notNull(),
  resolvedAt: integer("resolvedAt", { mode: "timestamp" }),
  resolvedByUserId: integer("resolvedByUserId"),
  metadata: text("metadata"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─────────────────────────────────────────────
// PHASE-5: DAILY SUMMARIES
// ─────────────────────────────────────────────
export const dailySummaries = sqliteTable("daily_summaries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  summaryDate: text("summaryDate").notNull().unique(),
  totalSales: text("totalSales").notNull(),
  totalProfit: text("totalProfit").notNull(),
  totalTransactions: integer("totalTransactions").notNull(),
  branchPerformance: text("branchPerformance"),
  lowStockItems: text("lowStockItems"),
  overduePayments: text("overduePayments"),
  topProducts: text("topProducts"),
  generatedAt: integer("generatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});
