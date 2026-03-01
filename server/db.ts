import {
  and,
  desc,
  eq,
  gte,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import {
  auditLogs,
  branches,
  branchLedgerEntries,
  categories,
  companySettings,
  customers,
  expenses,
  hoPayments,
  InsertUser,
  inventoryItems,
  ledgerEntries,
  products,
  reorderAlerts,
  saleItems,
  sales,
  stockTransferItems,
  stockTransfers,
  suppliers,
  userBranches,
  userPermissions,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import * as path from "path";
import * as fs from "fs";

// In preview/local mode (no DATABASE_URL set), use preview.db which has the
// full schema and seeded demo data. In production, DATABASE_URL points to MySQL.
import { isPreviewMode } from "./_core/previewDb";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const SUPERADMIN_EMAIL = "meshcraftstudio@gmail.com";
const TEMP_PASSWORD = "TempPassword123!"; // User must change this immediately

async function ensureSuperAdminExists(db: any) {
  const existingUser = await db.select().from(users).where(eq(users.email, SUPERADMIN_EMAIL)).limit(1);

  if (existingUser.length === 0) {
    // User does not exist, create them
    const hashedPassword = await bcrypt.hash(TEMP_PASSWORD, 10);
    await db.insert(users).values({
      openId: `auth0|${Math.random().toString(36).substring(2, 15)}`, // Placeholder, will be updated on first login
      name: "Meshcraft Studio Admin",
      email: SUPERADMIN_EMAIL,
      passwordHash: hashedPassword,
      role: "SuperAdmin",
      isActive: 1,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
      lastSignedIn: Math.floor(Date.now() / 1000),
    });
    console.log(`Created SuperAdmin user: ${SUPERADMIN_EMAIL} with temporary password.`);
  } else if (existingUser[0].role !== "SuperAdmin") {
    // User exists but is not SuperAdmin, update their role
    await db.update(users).set({ role: "SuperAdmin" }).where(eq(users.email, SUPERADMIN_EMAIL));
    console.log(`Updated user ${SUPERADMIN_EMAIL} to SuperAdmin role.`);
  }
}
import { fileURLToPath as _fileURLToPath } from "url";
import { dirname as _dirname } from "path";
const _dbFile = (() => {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("file:")) {
    // Production MySQL — db.ts is not used directly, but keep a fallback
    return process.env.DATABASE_URL.replace("file:", "");
  }
  if (process.env.DATABASE_URL?.startsWith("file:")) {
    return process.env.DATABASE_URL.replace("file:", "");
  }
  // Default: use preview.db which has the full schema
  const _here = _dirname(_fileURLToPath(import.meta.url));
  return _here + "/../../preview.db";
})();
const DATABASE_PATH = _dbFile;
const sqlite = new Database(DATABASE_PATH);
const _db = drizzle(sqlite);

export async function getDb() {
  return _db;
}

// ─── INITIALIZATION & SEEDING ────────────────────────────────────────────────

export async function initializeDatabase() {
  const db = await getDb();
  
  // First, ensure all tables exist by running migrations
  try {
    // Enable foreign keys
    sqlite.pragma("foreign_keys = ON");
    
    // Create all tables using Drizzle's schema
    // We'll use raw SQL to ensure tables are created
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        city TEXT,
        address TEXT,
        phone TEXT,
        isWarehouse INTEGER DEFAULT 0 NOT NULL,
        isActive INTEGER DEFAULT 1 NOT NULL,
        createdAt INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        openId TEXT NOT NULL UNIQUE,
        name TEXT,
        email TEXT,
        passwordHash TEXT,
        loginMethod TEXT,
        role TEXT DEFAULT 'POSUser' NOT NULL,
        branchId INTEGER,
        isActive INTEGER DEFAULT 1 NOT NULL,
        createdAt INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
        lastSignedIn INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS user_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        userId INTEGER NOT NULL UNIQUE,
        canSell INTEGER DEFAULT 0 NOT NULL,
        canTransferRequest INTEGER DEFAULT 0 NOT NULL,
        canReceiveStock INTEGER DEFAULT 0 NOT NULL,
        canViewLedger INTEGER DEFAULT 0 NOT NULL,
        canViewGlobalStock INTEGER DEFAULT 0 NOT NULL,
        canViewFinancials INTEGER DEFAULT 0 NOT NULL,
        createdAt INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
  } catch (error) {
    // Tables might already exist, that's okay
    console.log("[Database] Tables already exist or error creating them:", (error as any).message);
  }
  
  // Ensure SuperAdmin exists or is created
  try {
    await ensureSuperAdminExists(db);
  } catch (error) {
    console.error("[Database] SuperAdmin setup failed:", error);
  }

  // Check if we have any users, if not, seed demo users
  try {
    const userCountResult = sqlite.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    
    if (userCountResult.count === 0) {
      console.log("[Database] No users found. Seeding demo users...");
      
      const bcrypt = await import("bcryptjs");
      
      // Seed main branch
      sqlite.prepare(`
        INSERT INTO branches (name, code, address, phone, isWarehouse, isActive)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run("Main Branch", "MAIN", "123 ERP Street", "555-0100", 0, 1);

      // Hash the demo password
      const demoPasswordHash = await bcrypt.hash("DEMO1234", 10);

      // Demo users to seed
      const demoUsers = [
        {
          openId: "preview-superadmin-001",
          name: "Super Admin",
          email: "superadmin@autotools.demo",
          passwordHash: demoPasswordHash,
          role: "SuperAdmin",
          loginMethod: "local",
          branchId: 1,
        },
        {
          openId: "preview-admin-001",
          name: "Admin (HO)",
          email: "admin@autotools.demo",
          passwordHash: demoPasswordHash,
          role: "Admin",
          loginMethod: "local",
          branchId: 1,
        },
        {
          openId: "preview-manager-001",
          name: "Branch Manager",
          email: "manager@autotools.demo",
          passwordHash: demoPasswordHash,
          role: "BranchManager",
          loginMethod: "local",
          branchId: 1,
        },
        {
          openId: "preview-cashier-001",
          name: "POS Cashier",
          email: "cashier@autotools.demo",
          passwordHash: demoPasswordHash,
          role: "POSUser",
          loginMethod: "local",
          branchId: 1,
        },
      ];

      // Insert all demo users
      const insertUserStmt = sqlite.prepare(`
        INSERT INTO users (openId, name, email, passwordHash, role, loginMethod, branchId, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const user of demoUsers) {
        insertUserStmt.run(user.openId, user.name, user.email, user.passwordHash, user.role, user.loginMethod, user.branchId, 1);
      }

      // Create permissions for each user based on role
      const insertPermStmt = sqlite.prepare(`
        INSERT INTO user_permissions (userId, canSell, canTransferRequest, canReceiveStock, canViewLedger, canViewGlobalStock, canViewFinancials)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const users_list = sqlite.prepare("SELECT id, role FROM users WHERE email IN (?, ?, ?, ?)").all(
        "superadmin@autotools.demo",
        "admin@autotools.demo",
        "manager@autotools.demo",
        "cashier@autotools.demo"
      ) as Array<{ id: number; role: string }>;

      for (const user of users_list) {
        let perms = {
          canSell: 0,
          canTransferRequest: 0,
          canReceiveStock: 0,
          canViewLedger: 0,
          canViewGlobalStock: 0,
          canViewFinancials: 0,
        };

        switch (user.role) {
          case "SuperAdmin":
          case "Admin":
            perms = {
              canSell: 1,
              canTransferRequest: 1,
              canReceiveStock: 1,
              canViewLedger: 1,
              canViewGlobalStock: 1,
              canViewFinancials: 1,
            };
            break;
          case "BranchManager":
            perms = {
              canSell: 1,
              canTransferRequest: 1,
              canReceiveStock: 1,
              canViewLedger: 1,
              canViewGlobalStock: 0,
              canViewFinancials: 0,
            };
            break;
          case "POSUser":
            perms = {
              canSell: 1,
              canTransferRequest: 0,
              canReceiveStock: 0,
              canViewLedger: 0,
              canViewGlobalStock: 0,
              canViewFinancials: 0,
            };
            break;
        }

        insertPermStmt.run(user.id, perms.canSell, perms.canTransferRequest, perms.canReceiveStock, perms.canViewLedger, perms.canViewGlobalStock, perms.canViewFinancials);
      }

      console.log("[Database] Seeding complete. Demo users created:");
      console.log("  - superadmin@autotools.demo (DEMO1234)");
      console.log("  - admin@autotools.demo (DEMO1234)");
      console.log("  - manager@autotools.demo (DEMO1234)");
      console.log("  - cashier@autotools.demo (DEMO1234)");
    }
  } catch (error) {
    console.error("[Database] Seeding failed:", error);
    throw error;
  }
}

// ─── USERS ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();

  const existing = await getUserByOpenId(user.openId);
  if (existing) {
    const updateData: any = { ...user };
    delete updateData.openId;
    await db.update(users).set(updateData).where(eq(users.openId, user.openId));
  } else {
    await db.insert(users).values(user);
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "manager") {
  const db = await getDb();
  await db.update(users).set({ role: role as any }).where(eq(users.id, userId));
}

export async function getUserBranches(userId: number) {
  const db = await getDb();
  return db.select().from(userBranches).where(eq(userBranches.userId, userId));
}

export async function setUserBranches(userId: number, branchIds: number[]) {
  const db = await getDb();
  await db.delete(userBranches).where(eq(userBranches.userId, userId));
  if (branchIds.length > 0) {
    await db.insert(userBranches).values(branchIds.map((branchId) => ({ userId, branchId })));
  }
}

// ─── BRANCHES ────────────────────────────────────────────────────────────────

export async function getAllBranches(includeInactive = false) {
  const db = await getDb();
  if (includeInactive) return db.select().from(branches).orderBy(branches.name);
  return db.select().from(branches).where(eq(branches.isActive, true)).orderBy(branches.name);
}

export async function getBranchById(id: number) {
  const db = await getDb();
  const result = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return result[0];
}

export async function createBranch(data: {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isWarehouse?: boolean;
}) {
  const db = await getDb();
  const result = await db.insert(branches).values(data);
  return result;
}

export async function updateBranch(
  id: number,
  data: Partial<{ name: string; address: string; phone: string; isActive: boolean }>
) {
  const db = await getDb();
  await db.update(branches).set(data).where(eq(branches.id, id));
}

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

export async function getAllCategories() {
  const db = await getDb();
  return db.select().from(categories).orderBy(categories.name);
}

export async function createCategory(data: { name: string; description?: string }) {
  const db = await getDb();
  await db.insert(categories).values(data);
}

// ─── SUPPLIERS ───────────────────────────────────────────────────────────────

export async function getAllSuppliers() {
  const db = await getDb();
  return db.select().from(suppliers).where(eq(suppliers.isActive, true)).orderBy(suppliers.name);
}

export async function createSupplier(data: {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  const db = await getDb();
  await db.insert(suppliers).values(data);
}

export async function updateSupplier(
  id: number,
  data: Partial<{
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    isActive: boolean;
  }>
) {
  const db = await getDb();
  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

export async function getAllProducts(includeInactive = false) {
  const db = await getDb();
  if (includeInactive) return db.select().from(products).orderBy(products.name);
  return db.select().from(products).where(eq(products.isActive, true)).orderBy(products.name);
}

export async function getProductById(id: number) {
  const db = await getDb();
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function getProductBySku(sku: string) {
  const db = await getDb();
  const result = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
  return result[0];
}

export async function createProduct(data: {
  sku: string;
  name: string;
  description?: string;
  categoryId?: number;
  supplierId?: number;
  landingCost?: string;
  branchCost?: string;
  retailPrice?: string;
  reorderLevel?: number;
  imageUrl?: string;
  barcode?: string;
}) {
  const db = await getDb();
  await db.insert(products).values(data);
}

export async function updateProduct(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    categoryId: number;
    supplierId: number;
    landingCost: string;
    branchCost: string;
    retailPrice: string;
    reorderLevel: number;
    imageUrl: string;
    barcode: string;
    isActive: boolean;
  }>
) {
  const db = await getDb();
  await db.update(products).set(data).where(eq(products.id, id));
}

// ─── INVENTORY ───────────────────────────────────────────────────────────────

export async function getInventoryByBranch(branchId: number) {
  const db = await getDb();
  return db.select().from(inventoryItems).where(eq(inventoryItems.branchId, branchId));
}

export async function getInventoryBySerial(serialNo: string) {
  const db = await getDb();
  const result = await db.select().from(inventoryItems).where(eq(inventoryItems.serialNo, serialNo)).limit(1);
  return result[0];
}

export async function createInventoryItem(data: {
  serialNo: string;
  batchId?: string;
  productId: number;
  branchId: number;
  landingCost: string;
  branchCost: string;
  status?: string;
  notes?: string;
}) {
  const db = await getDb();
  await db.insert(inventoryItems).values(data);
}

export async function updateInventoryItemStatus(itemId: number, status: string) {
  const db = await getDb();
  await db.update(inventoryItems).set({ status }).where(eq(inventoryItems.id, itemId));
}

// ─── SALES ───────────────────────────────────────────────────────────────────

export async function getSalesByBranch(branchId: number) {
  const db = await getDb();
  return db.select().from(sales).where(eq(sales.branchId, branchId)).orderBy(desc(sales.createdAt));
}

export async function getSaleById(id: number) {
  const db = await getDb();
  const result = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  return result[0];
}

export async function getSaleByReceiptNo(receiptNo: string) {
  const db = await getDb();
  const result = await db.select().from(sales).where(eq(sales.receiptNo, receiptNo)).limit(1);
  return result[0];
}

export async function createSale(data: {
  receiptNo: string;
  branchId: number;
  userId: number;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  subtotal: string;
  discount?: string;
  totalAmount: string;
  paymentType: string;
  status?: string;
  notes?: string;
  isOfflineSale?: boolean;
}) {
  const db = await getDb();
  await db.insert(sales).values(data);
}

export async function updateSaleStatus(saleId: number, status: string) {
  const db = await getDb();
  await db.update(sales).set({ status }).where(eq(sales.id, saleId));
}

export async function getSaleItems(saleId: number) {
  const db = await getDb();
  return db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
}

export async function createSaleItem(data: {
  saleId: number;
  inventoryItemId: number;
  productId: number;
  serialNo: string;
  landingCost: string;
  branchCost: string;
  retailPrice: string;
  profit: string;
  investor70: string;
  master30: string;
  cashDueHO: string;
}) {
  const db = await getDb();
  await db.insert(saleItems).values(data);
}

// ─── STOCK TRANSFERS ─────────────────────────────────────────────────────────

export async function getStockTransfers(branchId?: number) {
  const db = await getDb();
  if (branchId) {
    return db
      .select()
      .from(stockTransfers)
      .where(or(eq(stockTransfers.fromBranchId, branchId), eq(stockTransfers.toBranchId, branchId)))
      .orderBy(desc(stockTransfers.requestedAt));
  }
  return db.select().from(stockTransfers).orderBy(desc(stockTransfers.requestedAt));
}

export async function getStockTransferById(id: number) {
  const db = await getDb();
  const result = await db.select().from(stockTransfers).where(eq(stockTransfers.id, id)).limit(1);
  return result[0];
}

export async function createStockTransfer(data: {
  transferNo: string;
  fromBranchId: number;
  toBranchId: number;
  requestedByUserId: number;
  status?: string;
  notes?: string;
}) {
  const db = await getDb();
  await db.insert(stockTransfers).values(data);
}

export async function updateStockTransferStatus(transferId: number, status: string, approvedByUserId?: number) {
  const db = await getDb();
  const updateData: any = { status };
  if (approvedByUserId) updateData.approvedByUserId = approvedByUserId;
  if (status === "Completed") updateData.completedAt = new Date();
  await db.update(stockTransfers).set(updateData).where(eq(stockTransfers.id, transferId));
}

export async function getStockTransferItems(transferId: number) {
  const db = await getDb();
  return db.select().from(stockTransferItems).where(eq(stockTransferItems.transferId, transferId));
}

export async function createStockTransferItem(data: {
  transferId: number;
  inventoryItemId: number;
  serialNo: string;
  productId: number;
}) {
  const db = await getDb();
  await db.insert(stockTransferItems).values(data);
}

// ─── LEDGER ──────────────────────────────────────────────────────────────────

export async function getLedgerEntries(branchId?: number) {
  const db = await getDb();
  if (branchId) {
    return db.select().from(ledgerEntries).where(eq(ledgerEntries.branchId, branchId)).orderBy(desc(ledgerEntries.createdAt));
  }
  return db.select().from(ledgerEntries).orderBy(desc(ledgerEntries.createdAt));
}

export async function addLedgerEntry(data: {
  branchId: number;
  entryType: string;
  referenceId?: number;
  referenceType?: string;
  description: string;
  debit?: string;
  credit?: string;
  runningBalance: string;
}) {
  const db = await getDb();
  await db.insert(ledgerEntries).values(data);
}

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────

export async function addAuditLog(data: {
  userId?: number;
  userName?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  branchId?: number;
  details?: string;
  ipAddress?: string;
}) {
  const db = await getDb();
  await db.insert(auditLogs).values(data);
}

export async function getAuditLogs(branchId?: number, limit = 100) {
  const db = await getDb();
  if (branchId) {
    return db.select().from(auditLogs).where(eq(auditLogs.branchId, branchId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────

export async function getExpensesByBranch(branchId: number) {
  const db = await getDb();
  return db.select().from(expenses).where(eq(expenses.branchId, branchId)).orderBy(desc(expenses.createdAt));
}

export async function getExpenses(opts: any = {}) {
  if (opts.branchId) {
    return getExpensesByBranch(opts.branchId);
  }
  const db = await getDb();
  return db.select().from(expenses).orderBy(desc(expenses.createdAt));
}

export async function createExpense(data: {
  branchId: number;
  userId: number;
  category: string;
  description?: string;
  amount: string;
  expenseDate: Date;
}) {
  const db = await getDb();
  await db.insert(expenses).values(data);
}

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────

export async function getAllCustomers() {
  const db = await getDb();
  return db.select().from(customers).where(eq(customers.isActive, true)).orderBy(customers.name);
}

export async function getCustomers() {
  return getAllCustomers();
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0];
}

export async function createCustomer(data: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}) {
  const db = await getDb();
  await db.insert(customers).values(data);
}

export async function updateCustomer(
  id: number,
  data: Partial<{
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    isActive: boolean;
  }>
) {
  const db = await getDb();
  await db.update(customers).set(data).where(eq(customers.id, id));
}

// ─── COMPANY SETTINGS ────────────────────────────────────────────────────────

export async function getCompanySettings() {
  const db = await getDb();
  const result = await db.select().from(companySettings).limit(1);
  return result[0] || null;
}

export async function updateCompanySettings(data: any) {
  const db = await getDb();
  const existing = await getCompanySettings();
  if (existing) {
    await db.update(companySettings).set(data).where(eq(companySettings.id, existing.id));
  } else {
    await db.insert(companySettings).values(data);
  }
}

// ─── USER PERMISSIONS ────────────────────────────────────────────────────────

export async function getUserPermissions(userId: number) {
  const db = await getDb();
  const result = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId)).limit(1);
  return result[0];
}

export async function updateUserPermissions(userId: number, data: any) {
  const db = await getDb();
  const existing = await getUserPermissions(userId);
  if (existing) {
    await db.update(userPermissions).set(data).where(eq(userPermissions.userId, userId));
  } else {
    await db.insert(userPermissions).values({ userId, ...data });
  }
}

// ─── REORDER ALERTS ──────────────────────────────────────────────────────────

export async function getReorderAlerts(branchId?: number) {
  const db = await getDb();
  if (branchId) {
    return db.select().from(reorderAlerts).where(and(eq(reorderAlerts.branchId, branchId), eq(reorderAlerts.isResolved, false)));
  }
  return db.select().from(reorderAlerts).where(eq(reorderAlerts.isResolved, false));
}

export async function createReorderAlert(data: {
  productId: number;
  branchId: number;
  currentStock: number;
  reorderLevel: number;
}) {
  const db = await getDb();
  await db.insert(reorderAlerts).values(data);
}

export async function resolveReorderAlert(alertId: number) {
  const db = await getDb();
  await db.update(reorderAlerts).set({ isResolved: true, resolvedAt: new Date() }).where(eq(reorderAlerts.id, alertId));
}

// ─── BRANCH LEDGER ───────────────────────────────────────────────────────────

export async function getBranchLedger(branchId: number) {
  const db = await getDb();
  return db.select().from(branchLedgerEntries).where(eq(branchLedgerEntries.branchId, branchId)).orderBy(desc(branchLedgerEntries.createdAt));
}

export async function addBranchLedgerEntry(data: {
  branchId: number;
  saleId?: number;
  type: string;
  amount: string;
  description?: string;
}) {
  const db = await getDb();
  await db.insert(branchLedgerEntries).values(data);
}

// ─── HO PAYMENTS ─────────────────────────────────────────────────────────────

export async function getHoPayments(branchId?: number) {
  const db = await getDb();
  if (branchId) {
    return db.select().from(hoPayments).where(eq(hoPayments.branchId, branchId)).orderBy(desc(hoPayments.paymentDate));
  }
  return db.select().from(hoPayments).orderBy(desc(hoPayments.paymentDate));
}

export async function createHoPayment(data: {
  branchId: number;
  userId: number;
  amount: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  paymentDate: Date;
  status?: string;
}) {
  const db = await getDb();
  await db.insert(hoPayments).values(data);
}

export async function updateHoPaymentStatus(paymentId: number, status: string, approvedByUserId?: number) {
  const db = await getDb();
  const updateData: any = { status };
  if (approvedByUserId) updateData.approvedByUserId = approvedByUserId;
  if (status === "Approved") updateData.approvedAt = new Date();
  await db.update(hoPayments).set(updateData).where(eq(hoPayments.id, paymentId));
}

// ─── GET USER BY EMAIL ───────────────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  const db = await getDb();
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

// ─── ADDITIONAL PRODUCT FUNCTIONS ───────────────────────────────────────────

export async function getProducts(opts: any = {}) {
  const db = await getDb();
  let query = db.select().from(products);
  if (!opts.includeInactive) {
    query = query.where(eq(products.isActive, true));
  }
  return query.orderBy(products.name);
}

export async function getProductByBarcode(barcode: string) {
  const db = await getDb();
  const result = await db.select().from(products).where(eq(products.barcode, barcode)).limit(1);
  return result[0];
}

// ─── REPORT FUNCTIONS ───────────────────────────────────────────────────────

export async function getSales(opts: any = {}) {
  const db = await getDb();
  let query = db.select().from(sales);
  if (opts.branchId) {
    query = query.where(eq(sales.branchId, opts.branchId));
  }
  return await query.orderBy(desc(sales.createdAt));
}

export async function getTopProducts(opts: any = {}) {
  const db = await getDb();
  const limit = opts.limit || 10;
  return await db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.retailPrice)).limit(limit);
}

export async function getDashboardStats(branchId?: number) {
  const db = await getDb();
  try {
    const whereClause = branchId ? eq(sales.branchId, branchId) : undefined;
    const invWhereClause = branchId ? eq(inventoryItems.branchId, branchId) : undefined;

    const totalSalesResult = db.select({ total: sql<string>`COALESCE(SUM(totalAmount), 0)` }).from(sales).where(whereClause).get() as { total: string };
    const totalCostResult = db.select({ total: sql<string>`COALESCE(SUM(CAST(landingCost AS REAL)), 0)` }).from(saleItems).where(whereClause ? sql`saleId IN (SELECT id FROM sales WHERE branchId = ${branchId})` : undefined).get() as { total: string };
    const totalTransactionsResult = db.select({ count: sql<number>`COUNT(*)` }).from(sales).where(whereClause).get() as { count: number };
    const availableStockResult = db.select({ count: sql<number>`COUNT(*)` }).from(inventoryItems).where(invWhereClause ? and(invWhereClause, eq(inventoryItems.status, "available")) : eq(inventoryItems.status, "available")).get() as { count: number };
    const pendingTransfersResult = db.select({ count: sql<number>`COUNT(*)` }).from(stockTransfers).where(eq(stockTransfers.status, "pending")).get() as { count: number };

    const totalSales = parseFloat(totalSalesResult?.total ?? "0") || 0;
    const totalCost = parseFloat(totalCostResult?.total ?? "0") || 0;
    const totalProfit = totalSales - totalCost;
    const investor70Pool = totalProfit * 0.7;
    const master30 = totalProfit * 0.3;

    return {
      totalSales,
      totalSalesCount: totalTransactionsResult?.count ?? 0,
      totalProfit,
      investor70Pool,
      master30,
      availableStock: availableStockResult?.count ?? 0,
      pendingTransfers: pendingTransfersResult?.count ?? 0,
      topProducts: [],
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    return {
      totalSales: 0,
      totalSalesCount: 0,
      totalProfit: 0,
      investor70Pool: 0,
      master30: 0,
      availableStock: 0,
      pendingTransfers: 0,
      topProducts: [],
    };
  }
}

export async function getMonthlySalesReport(opts: any = {}) {
  const db = await getDb();
  try {
    const branchId = opts.branchId;
    let query = db.select().from(sales);
    if (branchId) {
      query = query.where(eq(sales.branchId, branchId));
    }
    const results = await query.orderBy(desc(sales.createdAt));
    return results || [];
  } catch (error) {
    console.error("Error getting monthly sales report:", error);
    return [];
  }
}

export async function upsertCompanySettings(data: any) {
  const db = await getDb();
  const existing = await getCompanySettings();
  if (existing) {
    await db.update(companySettings).set(data).where(eq(companySettings.id, existing.id));
  } else {
    await db.insert(companySettings).values(data);
  }
}
