/**
 * Preview Database — SQLite database for local development.
 * This module is used when DATABASE_URL is not set or points to a file (SQLite).
 * For local Windows development, this is the primary database.
 */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../preview.db");

let _previewDb: any | null = null;

export function getPreviewDb(): any {
  if (_previewDb) return _previewDb;

  try {
    _previewDb = new Database(DB_PATH);
    _previewDb.pragma("journal_mode = WAL");
    _previewDb.pragma("foreign_keys = ON");
    initSchema(_previewDb);
    seedDemoData(_previewDb);
    console.log("[Preview DB] Initialized at", DB_PATH);
  } catch (err) {
    console.error("[Preview DB] Failed to initialize:", err);
    _previewDb = null;
  }
  return _previewDb;
}

export function isPreviewMode(): boolean {
  // Use SQLite if DATABASE_URL is not set or if it points to a file
  const dbUrl = process.env.DATABASE_URL;
  return !dbUrl || dbUrl.startsWith("file:");
}

function initSchema(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      city TEXT,
      address TEXT,
      phone TEXT,
      isWarehouse INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      contactPerson TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openId TEXT NOT NULL UNIQUE,
      name TEXT,
      email TEXT UNIQUE,
      passwordHash TEXT,
      loginMethod TEXT,
      role TEXT DEFAULT 'POSUser' NOT NULL,
      branchId INTEGER,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      lastSignedIn TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL UNIQUE,
      canSell INTEGER DEFAULT 0 NOT NULL,
      canTransferRequest INTEGER DEFAULT 0 NOT NULL,
      canReceiveStock INTEGER DEFAULT 0 NOT NULL,
      canViewLedger INTEGER DEFAULT 0 NOT NULL,
      canViewGlobalStock INTEGER DEFAULT 0 NOT NULL,
      canViewFinancials INTEGER DEFAULT 0 NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      categoryId INTEGER,
      supplierId INTEGER,
      landingCost TEXT NOT NULL DEFAULT '0.00',
      branchCost TEXT NOT NULL DEFAULT '0.00',
      retailPrice TEXT NOT NULL DEFAULT '0.00',
      reorderLevel INTEGER NOT NULL DEFAULT 5,
      isActive INTEGER NOT NULL DEFAULT 1,
      imageUrl TEXT,
      barcode TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serialNo TEXT NOT NULL UNIQUE,
      batchId TEXT,
      productId INTEGER NOT NULL,
      branchId INTEGER NOT NULL,
      landingCost TEXT NOT NULL,
      branchCost TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Available',
      transitToBranchId INTEGER,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receiptNo TEXT NOT NULL UNIQUE,
      branchId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      customerName TEXT,
      customerPhone TEXT,
      subtotal TEXT NOT NULL,
      discount TEXT NOT NULL DEFAULT '0.00',
      totalAmount TEXT NOT NULL,
      paymentType TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Completed',
      notes TEXT,
      syncedAt TEXT,
      isOfflineSale INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saleId INTEGER NOT NULL,
      inventoryItemId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      serialNo TEXT NOT NULL,
      landingCost TEXT NOT NULL,
      branchCost TEXT NOT NULL,
      retailPrice TEXT NOT NULL,
      profit TEXT NOT NULL,
      investor70 TEXT NOT NULL,
      master30 TEXT NOT NULL,
      cashDueHO TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transferNo TEXT NOT NULL UNIQUE,
      fromBranchId INTEGER NOT NULL,
      toBranchId INTEGER NOT NULL,
      requestedByUserId INTEGER NOT NULL,
      approvedByUserId INTEGER,
      status TEXT NOT NULL DEFAULT 'Pending',
      notes TEXT,
      rejectionReason TEXT,
      requestedAt TEXT NOT NULL DEFAULT (datetime('now')),
      approvedAt TEXT,
      completedAt TEXT,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_transfer_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transferId INTEGER NOT NULL,
      inventoryItemId INTEGER NOT NULL,
      serialNo TEXT NOT NULL,
      productId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branchId INTEGER NOT NULL,
      entryType TEXT NOT NULL,
      referenceId INTEGER,
      referenceType TEXT,
      description TEXT NOT NULL,
      debit TEXT,
      credit TEXT,
      runningBalance TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      userName TEXT,
      userEmail TEXT,
      action TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT,
      branchId INTEGER,
      details TEXT,
      ipAddress TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branchId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      amount TEXT NOT NULL,
      expenseDate TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      companyName TEXT,
      companyEmail TEXT,
      companyPhone TEXT,
      companyAddress TEXT,
      companyLogo TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS branch_ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branchId INTEGER NOT NULL,
      saleId INTEGER,
      type TEXT NOT NULL,
      amount TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ho_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branchId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      amount TEXT NOT NULL,
      paymentMethod TEXT,
      reference TEXT,
      notes TEXT,
      paymentDate TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      approvedByUserId INTEGER,
      approvedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reorder_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      branchId INTEGER NOT NULL,
      currentStock INTEGER NOT NULL,
      reorderLevel INTEGER NOT NULL,
      isResolved INTEGER NOT NULL DEFAULT 0,
      resolvedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      branchId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(userId, branchId)
    );
  `);
}

function seedDemoData(db: any) {
  // Only seed if empty
  const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
  if (userCount > 0) return;

  console.log("[Preview DB] Seeding demo data...");

  // Branches (seeded first so users can reference branchId)
  db.prepare(`INSERT INTO branches (name, code, city, address, phone, isWarehouse) VALUES ('Main Branch', 'MAIN', 'Karachi', '123 Main Street, City', '+1-555-0100', 0)`).run();
  db.prepare(`INSERT INTO branches (name, code, city, address, phone, isWarehouse) VALUES ('Warehouse', 'WH01', 'Karachi', '456 Industrial Ave', '+1-555-0200', 1)`).run();
  db.prepare(`INSERT INTO branches (name, code, city, address, phone, isWarehouse) VALUES ('Downtown Branch', 'DT01', 'Lahore', '789 Downtown Blvd', '+1-555-0300', 0)`).run();

  // Phase-3 Demo Users with roles and branch assignments
  // Password for all demo users: DEMO1234 (bcrypt hash: $2b$10$v9o0o9nVhHZJkvkyw43Zs.IqBhKeM9NWf2lA/b3GlInrevzdsU5kO)
  const demoHash = '$2b$10$v9o0o9nVhHZJkvkyw43Zs.IqBhKeM9NWf2lA/b3GlInrevzdsU5kO';
  
  // SuperAdmin - full system access, no branch restriction
  db.prepare(`
    INSERT INTO users (openId, name, email, passwordHash, loginMethod, role, branchId, isActive)
    VALUES ('preview-superadmin-001', 'Super Admin', 'superadmin@autotools.demo', ?, 'local', 'SuperAdmin', NULL, 1)
  `).run(demoHash);
  
  // Admin - HO operations, all branches
  db.prepare(`
    INSERT INTO users (openId, name, email, passwordHash, loginMethod, role, branchId, isActive)
    VALUES ('preview-admin-001', 'HO Admin', 'admin@autotools.demo', ?, 'local', 'Admin', NULL, 1)
  `).run(demoHash);
  
  // BranchManager - Main Branch only
  db.prepare(`
    INSERT INTO users (openId, name, email, passwordHash, loginMethod, role, branchId, isActive)
    VALUES ('preview-bm-001', 'Main Branch Manager', 'manager@autotools.demo', ?, 'local', 'BranchManager', 1, 1)
  `).run(demoHash);
  
  // POSUser - Main Branch, sales only
  db.prepare(`
    INSERT INTO users (openId, name, email, passwordHash, loginMethod, role, branchId, isActive)
    VALUES ('preview-pos-001', 'POS Cashier', 'cashier@autotools.demo', ?, 'local', 'POSUser', 1, 1)
  `).run(demoHash);

  // Seed user_permissions for each user
  // SuperAdmin: all permissions
  db.prepare(`INSERT INTO user_permissions (userId, canSell, canTransferRequest, canReceiveStock, canViewLedger, canViewGlobalStock, canViewFinancials) VALUES (1, 1, 1, 1, 1, 1, 1)`).run();
  // Admin: all permissions
  db.prepare(`INSERT INTO user_permissions (userId, canSell, canTransferRequest, canReceiveStock, canViewLedger, canViewGlobalStock, canViewFinancials) VALUES (2, 1, 1, 1, 1, 1, 1)`).run();
  // BranchManager: most permissions except global stock/financials
  db.prepare(`INSERT INTO user_permissions (userId, canSell, canTransferRequest, canReceiveStock, canViewLedger, canViewGlobalStock, canViewFinancials) VALUES (3, 1, 1, 1, 1, 0, 0)`).run();
  // POSUser: sell only
  db.prepare(`INSERT INTO user_permissions (userId, canSell, canTransferRequest, canReceiveStock, canViewLedger, canViewGlobalStock, canViewFinancials) VALUES (4, 1, 0, 0, 0, 0, 0)`).run();

  // Categories
  db.prepare(`INSERT INTO categories (name, description) VALUES ('Power Tools', 'Electric and battery-powered tools')`).run();
  db.prepare(`INSERT INTO categories (name, description) VALUES ('Hand Tools', 'Manual tools for everyday use')`).run();
  db.prepare(`INSERT INTO categories (name, description) VALUES ('Safety Equipment', 'PPE and safety gear')`).run();
  db.prepare(`INSERT INTO categories (name, description) VALUES ('Fasteners', 'Screws, bolts, and fixings')`).run();

  // Suppliers
  db.prepare(`INSERT INTO suppliers (name, contactPerson, phone, email, address) VALUES ('ToolMaster Inc', 'John Smith', '+1-555-1001', 'john@toolmaster.com', '100 Supplier Road')`).run();
  db.prepare(`INSERT INTO suppliers (name, contactPerson, phone, email, address) VALUES ('ProGear Supplies', 'Jane Doe', '+1-555-1002', 'jane@progear.com', '200 Trade Street')`).run();

  // Products
  const products = [
    { sku: 'DRL-001', name: 'Cordless Drill 18V', catId: 1, supId: 1, landing: '45.00', branch: '55.00', retail: '89.99', barcode: '1234567890001' },
    { sku: 'SAW-001', name: 'Circular Saw 7.25"', catId: 1, supId: 1, landing: '65.00', branch: '80.00', retail: '129.99', barcode: '1234567890002' },
    { sku: 'GRD-001', name: 'Angle Grinder 4.5"', catId: 1, supId: 1, landing: '35.00', branch: '45.00', retail: '74.99', barcode: '1234567890003' },
    { sku: 'HMR-001', name: 'Claw Hammer 16oz', catId: 2, supId: 2, landing: '8.00', branch: '12.00', retail: '19.99', barcode: '1234567890004' },
    { sku: 'WRN-001', name: 'Adjustable Wrench 10"', catId: 2, supId: 2, landing: '5.50', branch: '8.00', retail: '12.99', barcode: '1234567890005' },
    { sku: 'SAF-001', name: 'Safety Goggles', catId: 3, supId: 1, landing: '3.00', branch: '5.00', retail: '9.99', barcode: '1234567890006' },
    { sku: 'FAS-001', name: 'Stainless Steel Bolts (100pc)', catId: 4, supId: 2, landing: '12.00', branch: '18.00', retail: '29.99', barcode: '1234567890007' },
  ];

  for (const prod of products) {
    db.prepare(`
      INSERT INTO products (sku, name, categoryId, supplierId, landingCost, branchCost, retailPrice, barcode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(prod.sku, prod.name, prod.catId, prod.supId, prod.landing, prod.branch, prod.retail, prod.barcode);
  }

  // Inventory items for Main Branch
  const inventory = [
    { serial: 'DRL-001-001', productId: 1, branchId: 1, landing: '45.00', branch: '55.00' },
    { serial: 'DRL-001-002', productId: 1, branchId: 1, landing: '45.00', branch: '55.00' },
    { serial: 'SAW-001-001', productId: 2, branchId: 1, landing: '65.00', branch: '80.00' },
    { serial: 'HMR-001-001', productId: 4, branchId: 1, landing: '8.00', branch: '12.00' },
    { serial: 'HMR-001-002', productId: 4, branchId: 1, landing: '8.00', branch: '12.00' },
    { serial: 'WRN-001-001', productId: 5, branchId: 1, landing: '5.50', branch: '8.00' },
  ];

  for (const item of inventory) {
    db.prepare(`
      INSERT INTO inventory_items (serialNo, productId, branchId, landingCost, branchCost, status)
      VALUES (?, ?, ?, ?, ?, 'Available')
    `).run(item.serial, item.productId, item.branchId, item.landing, item.branch);
  }

  console.log("[Preview DB] Demo data seeded successfully");
}
