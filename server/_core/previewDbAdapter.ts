/**
 * Preview DB Adapter — provides the same interface as server/db.ts
 * but executes queries against the SQLite preview database.
 * Only active when DATABASE_URL is not set.
 */
import { getPreviewDb } from "./previewDb";

function db() {
  return getPreviewDb();
}

// ─── USERS ───────────────────────────────────────────────────────────────────
export function previewUpsertUser(user: any): void {
  const existing = db().prepare("SELECT * FROM users WHERE openId = ?").get(user.openId) as any;
  if (existing) {
    const fields: string[] = [];
    const vals: any[] = [];
    if (user.name !== undefined) { fields.push("name = ?"); vals.push(user.name); }
    if (user.email !== undefined) { fields.push("email = ?"); vals.push(user.email); }
    if (user.loginMethod !== undefined) { fields.push("loginMethod = ?"); vals.push(user.loginMethod); }
    if (user.role !== undefined) { fields.push("role = ?"); vals.push(user.role); }
    if (user.branchId !== undefined) { fields.push("branchId = ?"); vals.push(user.branchId); }
    if (user.lastSignedIn !== undefined) { fields.push("lastSignedIn = ?"); vals.push(new Date(user.lastSignedIn).toISOString()); }
    fields.push("updatedAt = ?"); vals.push(new Date().toISOString());
    vals.push(user.openId);
    if (fields.length > 1) {
      db().prepare(`UPDATE users SET ${fields.join(", ")} WHERE openId = ?`).run(...vals);
    }
  } else {
    db().prepare(`
      INSERT INTO users (openId, name, email, passwordHash, loginMethod, role, branchId, lastSignedIn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.openId,
      user.name ?? null,
      user.email ?? null,
      user.passwordHash ?? null,
      user.loginMethod ?? null,
      user.role ?? "POSUser",
      user.branchId ?? null,
      user.lastSignedIn ? new Date(user.lastSignedIn).toISOString() : new Date().toISOString()
    );
  }
}

export function previewGetUserByOpenId(openId: string): any | null {
  return db().prepare("SELECT * FROM users WHERE openId = ?").get(openId) ?? null;
}

export function previewGetUserByEmail(email: string): any | null {
  return db().prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get(email) ?? null;
}

export function previewGetUserById(id: number): any | null {
  return db().prepare("SELECT * FROM users WHERE id = ?").get(id) ?? null;
}

export function previewGetUsers(opts: { branchId?: number } = {}): any[] {
  let query = `
    SELECT u.*, b.name as branchName
    FROM users u
    LEFT JOIN branches b ON u.branchId = b.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (opts.branchId) { query += " AND u.branchId = ?"; params.push(opts.branchId); }
  query += " ORDER BY u.createdAt DESC";
  return db().prepare(query).all(...params) as any[];
}

export function previewCreateUser(data: any): { userId: number } {
  const result = db().prepare(`
    INSERT INTO users (openId, name, email, passwordHash, loginMethod, role, branchId, isActive)
    VALUES (?, ?, ?, ?, 'local', ?, ?, 1)
  `).run(
    data.openId ?? `local-${Date.now()}`,
    data.name,
    data.email,
    data.passwordHash,
    data.role ?? 'POSUser',
    data.branchId ?? null
  );
  const userId = Number(result.lastInsertRowid);
  // Create default permissions based on role
  const perms = getDefaultPermissionsForRole(data.role);
  db().prepare(`
    INSERT INTO user_permissions (userId, canSell, canTransferRequest, canReceiveStock, canViewLedger, canViewGlobalStock, canViewFinancials)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, perms.canSell ? 1 : 0, perms.canTransferRequest ? 1 : 0, perms.canReceiveStock ? 1 : 0, perms.canViewLedger ? 1 : 0, perms.canViewGlobalStock ? 1 : 0, perms.canViewFinancials ? 1 : 0);
  return { userId };
}

export function previewUpdateUser(id: number, data: any): void {
  const fields: string[] = [];
  const vals: any[] = [];
  if (data.role !== undefined) { fields.push("role = ?"); vals.push(data.role); }
  if (data.isActive !== undefined) { fields.push("isActive = ?"); vals.push(data.isActive ? 1 : 0); }
  if (data.name !== undefined) { fields.push("name = ?"); vals.push(data.name); }
  if (data.email !== undefined) { fields.push("email = ?"); vals.push(data.email); }
  if (data.branchId !== undefined) { fields.push("branchId = ?"); vals.push(data.branchId); }
  if (data.passwordHash !== undefined) { fields.push("passwordHash = ?"); vals.push(data.passwordHash); }
  fields.push("updatedAt = ?"); vals.push(new Date().toISOString());
  vals.push(id);
  if (fields.length > 1) {
    db().prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...vals);
  }
}

// ─── USER PERMISSIONS ────────────────────────────────────────────────────────
export function previewGetUserPermissions(userId: number): any | null {
  return db().prepare("SELECT * FROM user_permissions WHERE userId = ?").get(userId) ?? null;
}

export function previewUpdateUserPermissions(userId: number, perms: any): void {
  const existing = db().prepare("SELECT id FROM user_permissions WHERE userId = ?").get(userId);
  if (existing) {
    db().prepare(`
      UPDATE user_permissions SET
        canSell = ?, canTransferRequest = ?, canReceiveStock = ?,
        canViewLedger = ?, canViewGlobalStock = ?, canViewFinancials = ?,
        updatedAt = ?
      WHERE userId = ?
    `).run(
      perms.canSell ? 1 : 0, perms.canTransferRequest ? 1 : 0, perms.canReceiveStock ? 1 : 0,
      perms.canViewLedger ? 1 : 0, perms.canViewGlobalStock ? 1 : 0, perms.canViewFinancials ? 1 : 0,
      new Date().toISOString(), userId
    );
  } else {
    db().prepare(`
      INSERT INTO user_permissions (userId, canSell, canTransferRequest, canReceiveStock, canViewLedger, canViewGlobalStock, canViewFinancials)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, perms.canSell ? 1 : 0, perms.canTransferRequest ? 1 : 0, perms.canReceiveStock ? 1 : 0, perms.canViewLedger ? 1 : 0, perms.canViewGlobalStock ? 1 : 0, perms.canViewFinancials ? 1 : 0);
  }
}

export function getDefaultPermissionsForRole(role: string) {
  switch (role) {
    case 'SuperAdmin':
    case 'Admin':
      return { canSell: true, canTransferRequest: true, canReceiveStock: true, canViewLedger: true, canViewGlobalStock: true, canViewFinancials: true };
    case 'BranchManager':
      return { canSell: true, canTransferRequest: true, canReceiveStock: true, canViewLedger: true, canViewGlobalStock: false, canViewFinancials: false };
    case 'POSUser':
    default:
      return { canSell: true, canTransferRequest: false, canReceiveStock: false, canViewLedger: false, canViewGlobalStock: false, canViewFinancials: false };
  }
}

// ─── BRANCHES ────────────────────────────────────────────────────────────────
export function previewGetBranches(includeInactive = false): any[] {
  if (includeInactive) return db().prepare("SELECT * FROM branches ORDER BY name").all() as any[];
  return db().prepare("SELECT * FROM branches WHERE isActive = 1 ORDER BY name").all() as any[];
}

export function previewGetBranchById(id: number): any | null {
  return db().prepare("SELECT * FROM branches WHERE id = ?").get(id) ?? null;
}

export function previewCreateBranch(data: any): { branchId: number } {
  const result = db().prepare(`
    INSERT INTO branches (name, code, city, address, phone, isWarehouse)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data.name, data.code, data.city ?? null, data.address ?? null, data.phone ?? null, data.isWarehouse ? 1 : 0);
  return { branchId: Number(result.lastInsertRowid) };
}

export function previewUpdateBranch(id: number, data: any): void {
  const fields: string[] = [];
  const vals: any[] = [];
  if (data.name !== undefined) { fields.push("name = ?"); vals.push(data.name); }
  if (data.code !== undefined) { fields.push("code = ?"); vals.push(data.code); }
  if (data.city !== undefined) { fields.push("city = ?"); vals.push(data.city); }
  if (data.address !== undefined) { fields.push("address = ?"); vals.push(data.address); }
  if (data.phone !== undefined) { fields.push("phone = ?"); vals.push(data.phone); }
  if (data.isActive !== undefined) { fields.push("isActive = ?"); vals.push(data.isActive ? 1 : 0); }
  if (data.isWarehouse !== undefined) { fields.push("isWarehouse = ?"); vals.push(data.isWarehouse ? 1 : 0); }
  fields.push("updatedAt = ?"); vals.push(new Date().toISOString());
  vals.push(id);
  if (fields.length > 1) {
    db().prepare(`UPDATE branches SET ${fields.join(", ")} WHERE id = ?`).run(...vals);
  }
}

// ─── CATEGORIES ──────────────────────────────────────────────────────────────
export function previewGetCategories(): any[] {
  return db().prepare("SELECT * FROM categories ORDER BY name").all() as any[];
}

export function previewCreateCategory(data: any): void {
  db().prepare("INSERT INTO categories (name, description) VALUES (?, ?)").run(data.name, data.description ?? null);
}

// ─── SUPPLIERS ───────────────────────────────────────────────────────────────
export function previewGetSuppliers(includeInactive = false): any[] {
  if (includeInactive) return db().prepare("SELECT * FROM suppliers ORDER BY name").all() as any[];
  return db().prepare("SELECT * FROM suppliers WHERE isActive = 1 ORDER BY name").all() as any[];
}

export function previewCreateSupplier(data: any): void {
  db().prepare(`
    INSERT INTO suppliers (name, contactPerson, phone, email, address)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.name, data.contactPerson ?? null, data.phone ?? null, data.email ?? null, data.address ?? null);
}

export function previewUpdateSupplier(id: number, data: any): void {
  const fields: string[] = [];
  const vals: any[] = [];
  if (data.name !== undefined) { fields.push("name = ?"); vals.push(data.name); }
  if (data.contactPerson !== undefined) { fields.push("contactPerson = ?"); vals.push(data.contactPerson); }
  if (data.phone !== undefined) { fields.push("phone = ?"); vals.push(data.phone); }
  if (data.email !== undefined) { fields.push("email = ?"); vals.push(data.email); }
  if (data.address !== undefined) { fields.push("address = ?"); vals.push(data.address); }
  if (data.isActive !== undefined) { fields.push("isActive = ?"); vals.push(data.isActive ? 1 : 0); }
  fields.push("updatedAt = ?"); vals.push(new Date().toISOString());
  vals.push(id);
  if (fields.length > 1) {
    db().prepare(`UPDATE suppliers SET ${fields.join(", ")} WHERE id = ?`).run(...vals);
  }
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────
export function previewGetProducts(opts: any = {}): any[] {
  let query = "SELECT p.*, c.name as categoryName, s.name as supplierName FROM products p LEFT JOIN categories c ON p.categoryId = c.id LEFT JOIN suppliers s ON p.supplierId = s.id WHERE 1=1";
  const params: any[] = [];
  if (!opts.includeInactive) { query += " AND p.isActive = 1"; }
  if (opts.search) { query += " AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)"; const s = `%${opts.search}%`; params.push(s, s, s); }
  if (opts.categoryId) { query += " AND p.categoryId = ?"; params.push(opts.categoryId); }
  query += " ORDER BY p.name";
  return db().prepare(query).all(...params) as any[];
}

export function previewGetProductById(id: number): any | null {
  return db().prepare("SELECT * FROM products WHERE id = ?").get(id) ?? null;
}

export function previewCreateProduct(data: any): any {
  const result = db().prepare(`
    INSERT INTO products (sku, name, description, categoryId, supplierId, landingCost, branchCost, retailPrice, reorderLevel, imageUrl, barcode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.sku, data.name, data.description ?? null,
    data.categoryId ?? null, data.supplierId ?? null,
    data.landingCost ?? "0.00", data.branchCost ?? "0.00", data.retailPrice ?? "0.00",
    data.reorderLevel ?? 5, data.imageUrl ?? null, data.barcode ?? null
  );
  return { id: result.lastInsertRowid };
}

export function previewUpdateProduct(id: number, data: any): void {
  const fields: string[] = [];
  const vals: any[] = [];
  const updatable = ['name','description','categoryId','supplierId','landingCost','branchCost','retailPrice','reorderLevel','imageUrl','barcode','isActive','sku'];
  for (const key of updatable) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      vals.push(key === 'isActive' ? (data[key] ? 1 : 0) : data[key]);
    }
  }
  fields.push("updatedAt = ?"); vals.push(new Date().toISOString());
  vals.push(id);
  if (fields.length > 1) {
    db().prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(...vals);
  }
}

// ─── INVENTORY ───────────────────────────────────────────────────────────────
export function previewGetInventory(opts: any = {}): any[] {
  let query = `
    SELECT i.*, p.name as productName, p.sku, p.retailPrice, p.barcode, b.name as branchName
    FROM inventory_items i
    JOIN products p ON i.productId = p.id
    JOIN branches b ON i.branchId = b.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (opts.branchId) { query += " AND i.branchId = ?"; params.push(opts.branchId); }
  if (opts.status) { query += " AND i.status = ?"; params.push(opts.status); }
  if (opts.search) { query += " AND (p.name LIKE ? OR i.serialNo LIKE ? OR p.sku LIKE ?)"; const s = `%${opts.search}%`; params.push(s, s, s); }
  query += " ORDER BY i.createdAt DESC";
  if (opts.limit) { query += " LIMIT ?"; params.push(opts.limit); }
  return db().prepare(query).all(...params) as any[];
}

export function previewGetInventoryBySerial(serialNo: string): any | null {
  return db().prepare(`
    SELECT i.*, p.name as productName, p.sku, p.retailPrice, p.barcode, b.name as branchName
    FROM inventory_items i
    JOIN products p ON i.productId = p.id
    JOIN branches b ON i.branchId = b.id
    WHERE i.serialNo = ?
  `).get(serialNo) ?? null;
}

export function previewCreateInventoryItem(data: any): void {
  db().prepare(`
    INSERT INTO inventory_items (serialNo, batchId, productId, branchId, landingCost, branchCost, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, 'Available', ?)
  `).run(data.serialNo, data.batchId ?? null, data.productId, data.branchId, data.landingCost, data.branchCost, data.notes ?? null);
}

export function previewUpdateInventoryItem(id: number, data: any): void {
  const fields: string[] = [];
  const vals: any[] = [];
  if (data.status !== undefined) { fields.push("status = ?"); vals.push(data.status); }
  if (data.branchId !== undefined) { fields.push("branchId = ?"); vals.push(data.branchId); }
  if (data.transitToBranchId !== undefined) { fields.push("transitToBranchId = ?"); vals.push(data.transitToBranchId); }
  if (data.notes !== undefined) { fields.push("notes = ?"); vals.push(data.notes); }
  fields.push("updatedAt = ?"); vals.push(new Date().toISOString());
  vals.push(id);
  if (fields.length > 1) {
    db().prepare(`UPDATE inventory_items SET ${fields.join(", ")} WHERE id = ?`).run(...vals);
  }
}

export function previewGetStockSummary(branchId?: number): any[] {
  let query = `
    SELECT p.id as productId, p.name as productName, p.sku, p.retailPrice, p.reorderLevel,
           b.id as branchId, b.name as branchName,
           COUNT(CASE WHEN i.status = 'Available' THEN 1 END) as availableCount,
           COUNT(CASE WHEN i.status = 'Sold' THEN 1 END) as soldCount,
           COUNT(*) as totalCount
    FROM products p
    CROSS JOIN branches b
    LEFT JOIN inventory_items i ON i.productId = p.id AND i.branchId = b.id
    WHERE p.isActive = 1 AND b.isActive = 1
  `;
  const params: any[] = [];
  if (branchId) { query += " AND b.id = ?"; params.push(branchId); }
  query += " GROUP BY p.id, b.id ORDER BY p.name, b.name";
  return db().prepare(query).all(...params) as any[];
}

// ─── POS / SALES ─────────────────────────────────────────────────────────────
export function previewLookupSerial(serialNo: string, branchId: number): any | null {
  return db().prepare(`
    SELECT i.*, p.name as productName, p.sku, p.retailPrice, p.barcode
    FROM inventory_items i
    JOIN products p ON i.productId = p.id
    WHERE i.serialNo = ? AND i.branchId = ? AND i.status = 'Available'
  `).get(serialNo, branchId) ?? null;
}

export function previewCreateSale(data: any): { saleId: number; receiptNo: string } {
  const receiptNo = `RCP-${Date.now()}`;
  const result = db().prepare(`
    INSERT INTO sales (receiptNo, branchId, userId, customerName, customerPhone, subtotal, discount, totalAmount, paymentType, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?)
  `).run(
    receiptNo, data.branchId, data.userId,
    data.customerName ?? null, data.customerPhone ?? null,
    data.subtotal, data.discount ?? "0.00", data.totalAmount,
    data.paymentType, data.notes ?? null
  );
  const saleId = Number(result.lastInsertRowid);

  let totalBranchProfit = 0;
  for (const item of data.items) {
    db().prepare(`
      INSERT INTO sale_items (saleId, inventoryItemId, productId, serialNo, landingCost, branchCost, retailPrice, profit, investor70, master30, cashDueHO)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(saleId, item.inventoryItemId, item.productId, item.serialNo, item.landingCost, item.branchCost, item.retailPrice, item.profit, item.investor70, item.master30, item.cashDueHO);
    db().prepare("UPDATE inventory_items SET status = 'Sold', updatedAt = ? WHERE id = ?").run(new Date().toISOString(), item.inventoryItemId);
    totalBranchProfit += (parseFloat(item.retailPrice) - parseFloat(item.branchCost));
  }

  if (totalBranchProfit > 0) {
    previewAddBranchLedgerEntry({
      branchId: data.branchId,
      saleId,
      type: "sale_profit",
      amount: totalBranchProfit.toFixed(2),
      description: `Profit from sale ${receiptNo}`,
    });
  }

  // Ledger credit
  const lastBalance = (db().prepare("SELECT runningBalance FROM ledger_entries WHERE branchId = ? ORDER BY id DESC LIMIT 1").get(data.branchId) as any)?.runningBalance ?? "0.00";
  const newBalance = (parseFloat(lastBalance) + parseFloat(data.totalAmount)).toFixed(2);
  db().prepare(`
    INSERT INTO ledger_entries (branchId, entryType, referenceId, referenceType, description, debit, credit, runningBalance)
    VALUES (?, 'Sale', ?, 'Sale', ?, '0.00', ?, ?)
  `).run(data.branchId, saleId, `Sale ${receiptNo}`, data.totalAmount, newBalance);

  return { saleId, receiptNo };
}

export function previewGetSales(opts: any = {}): any[] {
  let query = "SELECT s.*, b.name as branchName FROM sales s JOIN branches b ON s.branchId = b.id WHERE 1=1";
  const params: any[] = [];
  if (opts.branchId) { query += " AND s.branchId = ?"; params.push(opts.branchId); }
  if (opts.status) { query += " AND s.status = ?"; params.push(opts.status); }
  if (opts.from) { query += " AND s.createdAt >= ?"; params.push(new Date(opts.from).toISOString()); }
  if (opts.to) { query += " AND s.createdAt <= ?"; params.push(new Date(opts.to).toISOString()); }
  query += " ORDER BY s.createdAt DESC";
  if (opts.limit) { query += " LIMIT ?"; params.push(opts.limit); }
  return db().prepare(query).all(...params) as any[];
}

export function previewGetSaleById(id: number): any | null {
  const sale = db().prepare("SELECT * FROM sales WHERE id = ?").get(id) as any;
  if (!sale) return null;
  sale.items = db().prepare(`
    SELECT si.*, p.name as productName, p.sku
    FROM sale_items si JOIN products p ON si.productId = p.id
    WHERE si.saleId = ?
  `).all(id);
  return sale;
}

// ─── TRANSFERS ───────────────────────────────────────────────────────────────
export function previewGetTransfers(opts: any = {}): any[] {
  let query = `
    SELECT t.*, fb.name as fromBranchName, tb.name as toBranchName, u.name as requestedByName
    FROM stock_transfers t
    JOIN branches fb ON t.fromBranchId = fb.id
    JOIN branches tb ON t.toBranchId = tb.id
    JOIN users u ON t.requestedByUserId = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (opts.branchId) { query += " AND (t.fromBranchId = ? OR t.toBranchId = ?)"; params.push(opts.branchId, opts.branchId); }
  if (opts.status) { query += " AND t.status = ?"; params.push(opts.status); }
  query += " ORDER BY t.requestedAt DESC";
  return db().prepare(query).all(...params) as any[];
}

export function previewCreateTransfer(data: any): { transferId: number; transferNo: string } {
  const transferNo = `TRF-${Date.now()}`;
  const result = db().prepare(`
    INSERT INTO stock_transfers (transferNo, fromBranchId, toBranchId, requestedByUserId, status, notes)
    VALUES (?, ?, ?, ?, 'Pending', ?)
  `).run(transferNo, data.fromBranchId, data.toBranchId, data.requestedByUserId, data.notes ?? null);
  const transferId = Number(result.lastInsertRowid);

  for (const item of data.items) {
    db().prepare(`
      INSERT INTO stock_transfer_items (transferId, inventoryItemId, serialNo, productId)
      VALUES (?, ?, ?, ?)
    `).run(transferId, item.inventoryItemId, item.serialNo, item.productId);
    db().prepare("UPDATE inventory_items SET status = 'InTransit', transitToBranchId = ?, updatedAt = ? WHERE id = ?")
      .run(data.toBranchId, new Date().toISOString(), item.inventoryItemId);
  }
  return { transferId, transferNo };
}

export function previewUpdateTransferStatus(id: number, status: string, approvedByUserId?: number): void {
  const now = new Date().toISOString();
  if (status === 'Completed') {
    const items = db().prepare("SELECT * FROM stock_transfer_items WHERE transferId = ?").all(id) as any[];
    const transfer = db().prepare("SELECT * FROM stock_transfers WHERE id = ?").get(id) as any;
    for (const item of items) {
      db().prepare("UPDATE inventory_items SET status = 'Available', branchId = ?, transitToBranchId = NULL, updatedAt = ? WHERE id = ?")
        .run(transfer.toBranchId, now, item.inventoryItemId);
    }
    db().prepare("UPDATE stock_transfers SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?").run(status, now, now, id);
  } else {
    const fields: string[] = ["status = ?", "updatedAt = ?"];
    const vals: any[] = [status, now];
    if (approvedByUserId) { fields.push("approvedByUserId = ?", "approvedAt = ?"); vals.push(approvedByUserId, now); }
    if (status === 'Rejected' || status === 'Cancelled') {
      const items = db().prepare("SELECT * FROM stock_transfer_items WHERE transferId = ?").all(id) as any[];
      for (const item of items) {
        db().prepare("UPDATE inventory_items SET status = 'Available', transitToBranchId = NULL, updatedAt = ? WHERE id = ?").run(now, item.inventoryItemId);
      }
    }
    vals.push(id);
    db().prepare(`UPDATE stock_transfers SET ${fields.join(", ")} WHERE id = ?`).run(...vals);
  }
}

// ─── LEDGER ───────────────────────────────────────────────────────────────────
export function previewGetLedger(branchId?: number, from?: Date, to?: Date): any[] {
  let query = "SELECT l.*, b.name as branchName FROM ledger_entries l JOIN branches b ON l.branchId = b.id WHERE 1=1";
  const params: any[] = [];
  if (branchId) { query += " AND l.branchId = ?"; params.push(branchId); }
  if (from) { query += " AND l.createdAt >= ?"; params.push(from.toISOString()); }
  if (to) { query += " AND l.createdAt <= ?"; params.push(to.toISOString()); }
  query += " ORDER BY l.createdAt DESC LIMIT 500";
  return db().prepare(query).all(...params) as any[];
}

export function previewAddLedgerEntry(data: any): void {
  const lastBalance = (db().prepare("SELECT runningBalance FROM ledger_entries WHERE branchId = ? ORDER BY id DESC LIMIT 1").get(data.branchId) as any)?.runningBalance ?? "0.00";
  const newBalance = (parseFloat(lastBalance) + parseFloat(data.credit ?? "0") - parseFloat(data.debit ?? "0")).toFixed(2);
  db().prepare(`
    INSERT INTO ledger_entries (branchId, entryType, description, debit, credit, runningBalance)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data.branchId, data.entryType, data.description ?? null, data.debit ?? "0.00", data.credit ?? "0.00", newBalance);
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────
export function previewGetExpenses(branchId?: number, from?: Date, to?: Date): any[] {
  let query = "SELECT * FROM expenses WHERE 1=1";
  const params: any[] = [];
  if (branchId) { query += " AND branchId = ?"; params.push(branchId); }
  if (from) { query += " AND expenseDate >= ?"; params.push(from.toISOString()); }
  if (to) { query += " AND expenseDate <= ?"; params.push(to.toISOString()); }
  query += " ORDER BY expenseDate DESC";
  return db().prepare(query).all(...params) as any[];
}

export function previewCreateExpense(data: any): void {
  db().prepare(`
    INSERT INTO expenses (branchId, userId, category, description, amount, expenseDate)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data.branchId, data.userId, data.category, data.description ?? null, data.amount, new Date(data.expenseDate).toISOString());
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────
export function previewGetDashboardStats(branchId?: number): any {
  let filter = branchId ? "AND s.branchId = ?" : "";
  const params = branchId ? [branchId] : [];

  const salesStats = db().prepare(`
    SELECT
      COALESCE(SUM(CAST(s.totalAmount AS REAL)), 0) as totalSales,
      COUNT(*) as totalSalesCount,
      COALESCE(SUM(CAST(si.profit AS REAL)), 0) as totalProfit,
      COALESCE(SUM(CAST(si.investor70 AS REAL)), 0) as investor70Pool,
      COALESCE(SUM(CAST(si.master30 AS REAL)), 0) as master30,
      COALESCE(SUM(CAST(si.cashDueHO AS REAL)), 0) as totalCashDueHO
    FROM sales s
    LEFT JOIN sale_items si ON si.saleId = s.id
    WHERE s.status = 'Completed' ${filter}
  `).get(...params) as any;

  let invFilter = branchId ? "WHERE branchId = ?" : "";
  const invParams = branchId ? [branchId] : [];
  const invStats = db().prepare(`
    SELECT
      COUNT(CASE WHEN status = 'Available' THEN 1 END) as availableStock,
      COUNT(CASE WHEN status = 'InTransit' THEN 1 END) as pendingTransfers
    FROM inventory_items ${invFilter}
  `).get(...invParams) as any;

  // Today's Company Profit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCompanyProfit = db().prepare(`
    SELECT COALESCE(SUM(CAST(profit AS REAL)), 0) as profit
    FROM sale_items
    WHERE createdAt >= ?
  `).get(today.toISOString()) as any;

  // Today's Branch Profit
  const todayBranchProfit = db().prepare(`
    SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as profit
    FROM branch_ledger_entries
    WHERE type = 'sale_profit' AND createdAt >= ?
  `).get(today.toISOString()) as any;

  // Outstanding Branch Balances
  const branchBalances = db().prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'stock_received' THEN CAST(amount AS REAL) ELSE 0 END), 0) as totalReceived,
      COALESCE(SUM(CASE WHEN type = 'payment_sent' THEN CAST(amount AS REAL) ELSE 0 END), 0) as totalPaid
    FROM branch_ledger_entries
  `).get() as any;
  const totalOutstanding = (branchBalances?.totalReceived ?? 0) - (branchBalances?.totalPaid ?? 0);

  // Recent Product Sales
  const recentSales = db().prepare(`
    SELECT p.name as productName, b.name as branchName, 1 as quantity,
           si.landingCost, si.branchCost, si.retailPrice as sellingPrice, si.profit
    FROM sale_items si
    JOIN products p ON si.productId = p.id
    JOIN sales s ON si.saleId = s.id
    JOIN branches b ON s.branchId = b.id
    ORDER BY si.createdAt DESC
    LIMIT 10
  `).all() as any[];

  return {
    totalSales: salesStats?.totalSales ?? 0,
    totalSalesCount: salesStats?.totalSalesCount ?? 0,
    totalProfit: salesStats?.totalProfit ?? 0,
    investor70Pool: salesStats?.investor70Pool ?? 0,
    master30: salesStats?.master30 ?? 0,
    totalCashDueHO: salesStats?.totalCashDueHO ?? 0,
    availableStock: invStats?.availableStock ?? 0,
    pendingTransfers: invStats?.pendingTransfers ?? 0,
    todayCompanyProfit: todayCompanyProfit?.profit ?? 0,
    todayBranchProfit: todayBranchProfit?.profit ?? 0,
    totalOutstandingBalance: totalOutstanding,
    recentProductSales: recentSales,
  };
}

export function previewGetMonthlySales(branchId?: number, year?: number): any[] {
  const y = year ?? new Date().getFullYear();
  let query = `
    SELECT
      CAST(strftime('%m', createdAt) AS INTEGER) as month,
      COALESCE(SUM(CAST(totalAmount AS REAL)), 0) as totalSales,
      COUNT(*) as count
    FROM sales
    WHERE status = 'Completed' AND strftime('%Y', createdAt) = ?
  `;
  const params: any[] = [String(y)];
  if (branchId) { query += " AND branchId = ?"; params.push(branchId); }
  query += " GROUP BY month ORDER BY month";
  return db().prepare(query).all(...params) as any[];
}

export function previewGetTopProducts(branchId?: number, limit = 10): any[] {
  let filter = branchId ? "AND s.branchId = ?" : "";
  const params: any[] = branchId ? [branchId, limit] : [limit];
  return db().prepare(`
    SELECT p.name as productName, p.sku,
           SUM(1) as unitsSold,
           SUM(CAST(si.retailPrice AS REAL)) as totalRevenue,
           SUM(CAST(si.profit AS REAL)) as totalProfit
    FROM sale_items si
    JOIN products p ON si.productId = p.id
    JOIN sales s ON si.saleId = s.id
    WHERE s.status = 'Completed' ${filter}
    GROUP BY p.id
    ORDER BY unitsSold DESC
    LIMIT ?
  `).all(...params) as any[];
}

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
export function previewAddAuditLog(data: any): void {
  db().prepare(`
    INSERT INTO audit_logs (userId, userEmail, userName, action, entityType, entityId, branchId, details, ipAddress)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.userId ?? null, data.userEmail ?? null, data.userName ?? null,
    data.action, data.entityType, data.entityId ?? null,
    data.branchId ?? null, data.details ?? null, data.ipAddress ?? null
  );
}

export function previewGetAuditLogs(opts: any = {}): any[] {
  let query = "SELECT * FROM audit_logs WHERE 1=1";
  const params: any[] = [];
  if (opts.userId) { query += " AND userId = ?"; params.push(opts.userId); }
  if (opts.entityType) { query += " AND entityType = ?"; params.push(opts.entityType); }
  query += " ORDER BY createdAt DESC LIMIT 200";
  return db().prepare(query).all(...params) as any[];
}

// ─── COMPANY SETTINGS ────────────────────────────────────────────────────────
export function previewGetCompanySettings(): any | null {
  return db().prepare("SELECT * FROM company_settings LIMIT 1").get() ?? null;
}

export function previewUpsertCompanySettings(data: any): void {
  const existing = db().prepare("SELECT id FROM company_settings LIMIT 1").get() as any;
  if (existing) {
    const fields: string[] = [];
    const vals: any[] = [];
    const keys = ['companyName','tagline','address','phone','email','website','currency','currencySymbol','logoUrl','primaryColor','taxRate','receiptFooter'];
    for (const key of keys) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); vals.push(data[key]); }
    }
    fields.push("updatedAt = ?"); vals.push(new Date().toISOString());
    vals.push(existing.id);
    if (fields.length > 1) {
      db().prepare(`UPDATE company_settings SET ${fields.join(", ")} WHERE id = ?`).run(...vals);
    }
  } else {
    db().prepare(`
      INSERT INTO company_settings (companyName, tagline, address, phone, email, website, currency, currencySymbol, logoUrl, primaryColor, taxRate, receiptFooter)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.companyName ?? 'AutoTools ERP', data.tagline ?? null,
      data.address ?? null, data.phone ?? null, data.email ?? null, data.website ?? null,
      data.currency ?? 'USD', data.currencySymbol ?? '$',
      data.logoUrl ?? null, data.primaryColor ?? '#f97316',
      data.taxRate ?? '0.00', data.receiptFooter ?? null
    );
  }
}

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────
export function previewGetCustomers(opts: any = {}): any[] {
  let query = "SELECT * FROM customers WHERE isActive = 1";
  const params: any[] = [];
  if (opts.search) { query += " AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)"; const s = `%${opts.search}%`; params.push(s, s, s); }
  query += " ORDER BY name";
  return db().prepare(query).all(...params) as any[];
}

export function previewGetCustomerById(id: number): any | null {
  return db().prepare("SELECT * FROM customers WHERE id = ?").get(id) ?? null;
}

export function previewCreateCustomer(data: any): void {
  db().prepare(`
    INSERT INTO customers (name, phone, email, address, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.name, data.phone ?? null, data.email ?? null, data.address ?? null, data.notes ?? null);
}

export function previewUpdateCustomer(id: number, data: any): void {
  const fields: string[] = [];
  const vals: any[] = [];
  const keys = ['name','phone','email','address','notes','isActive'];
  for (const key of keys) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      vals.push(key === 'isActive' ? (data[key] ? 1 : 0) : data[key]);
    }
  }
  fields.push("updatedAt = ?"); vals.push(new Date().toISOString());
  vals.push(id);
  if (fields.length > 1) {
    db().prepare(`UPDATE customers SET ${fields.join(", ")} WHERE id = ?`).run(...vals);
  }
}

// ─── REORDER ALERTS ──────────────────────────────────────────────────────────
export function previewGetReorderAlerts(branchId?: number): any[] {
  let query = `
    SELECT r.*, p.name as productName, p.sku, b.name as branchName
    FROM reorder_alerts r
    JOIN products p ON r.productId = p.id
    JOIN branches b ON r.branchId = b.id
    WHERE r.isResolved = 0
  `;
  const params: any[] = [];
  if (branchId) { query += " AND r.branchId = ?"; params.push(branchId); }
  query += " ORDER BY r.createdAt DESC";
  return db().prepare(query).all(...params) as any[];
}

// ─── LEDGER (ADDITIONAL) ─────────────────────────────────────────────────────
export function previewGetLastLedgerBalance(branchId: number): number {
  const row = db().prepare("SELECT runningBalance FROM ledger_entries WHERE branchId = ? ORDER BY id DESC LIMIT 1").get(branchId) as any;
  return row ? parseFloat(row.runningBalance) : 0;
}

export function previewGetLedgerEntries(branchId: number, from?: Date, to?: Date): any[] {
  let query = "SELECT * FROM ledger_entries WHERE branchId = ?";
  const params: any[] = [branchId];
  if (from) { query += " AND createdAt >= ?"; params.push(from.toISOString()); }
  if (to) { query += " AND createdAt <= ?"; params.push(to.toISOString()); }
  query += " ORDER BY id DESC";
  return db().prepare(query).all(...params) as any[];
}

export function previewGetLedgerSummary(branchId: number): { totalSales: number; totalExpenses: number; totalPayments: number; balance: number } {
  const rows = db().prepare("SELECT SUM(CAST(credit AS REAL)) as totalCredit, SUM(CAST(debit AS REAL)) as totalDebit FROM ledger_entries WHERE branchId = ?").get(branchId) as any;
  const credit = rows?.totalCredit ?? 0;
  const debit = rows?.totalDebit ?? 0;
  return { totalSales: credit, totalExpenses: debit, totalPayments: 0, balance: credit - debit };
}

// ─── TRANSFERS (ADDITIONAL) ──────────────────────────────────────────────────
export function previewGetTransferById(id: number): any | null {
  return db().prepare("SELECT * FROM stock_transfers WHERE id = ?").get(id) ?? null;
}

export function previewGetTransferItems(transferId: number): any[] {
  return db().prepare("SELECT * FROM stock_transfer_items WHERE transferId = ?").all(transferId) as any[];
}

export function previewUpdateTransfer(id: number, data: any): void {
  const fields: string[] = [];
  const vals: any[] = [];
  if (data.status !== undefined) {
    fields.push("status = ?");
    vals.push(data.status);
  }
  if (data.approvedByUserId !== undefined) {
    fields.push("approvedByUserId = ?");
    vals.push(data.approvedByUserId);
  }
  if (data.rejectionReason !== undefined) {
    fields.push("rejectionReason = ?");
    vals.push(data.rejectionReason);
  }
  if (data.status === "InTransit" || data.status === "Rejected") {
    fields.push("approvedAt = ?");
    vals.push(new Date().toISOString());
  }
  if (data.status === "Completed") {
    fields.push("completedAt = ?");
    vals.push(new Date().toISOString());

    // Record ledger entry for branch: stock_received
    const transfer = db()
      .prepare("SELECT * FROM stock_transfers WHERE id = ?")
      .get(id) as any;
    const items = db()
      .prepare("SELECT * FROM stock_transfer_items WHERE transferId = ?")
      .all(id) as any[];
    let totalBranchCost = 0;
    for (const item of items) {
      const invItem = db()
        .prepare("SELECT branchCost FROM inventory_items WHERE id = ?")
        .get(item.inventoryItemId) as any;
      if (invItem) totalBranchCost += parseFloat(invItem.branchCost);
    }
    previewAddBranchLedgerEntry({
      branchId: transfer.toBranchId,
      type: "stock_received",
      amount: totalBranchCost.toFixed(2),
      description: `Stock received from transfer ${transfer.transferNo}`,
    });
  }
  fields.push("updatedAt = ?");
  vals.push(new Date().toISOString());
  vals.push(id);
  if (fields.length > 1) {
    db().prepare(`UPDATE stock_transfers SET ${fields.join(", ")} WHERE id = ?`)
      .run(...vals);
  }
}

export function previewAddBranchLedgerEntry(data: any): void {
  db().prepare(`
    INSERT INTO branch_ledger_entries (branchId, saleId, type, amount, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.branchId, data.saleId ?? null, data.type, data.amount, data.description ?? null);
}

export function previewGetBranchLedgerEntries(branchId: number): any[] {
  return db().prepare("SELECT * FROM branch_ledger_entries WHERE branchId = ? ORDER BY createdAt DESC").all(branchId) as any[];
}

export function previewUpdateInventoryStatus(id: number, status: string): void {
  db().prepare("UPDATE inventory_items SET status = ?, updatedAt = ? WHERE id = ?").run(status, new Date().toISOString(), id);
}

export function previewResolveReorderAlert(id: number): void {
  db().prepare("UPDATE reorder_alerts SET isResolved = 1, resolvedAt = ?, updatedAt = ? WHERE id = ?").run(new Date().toISOString(), new Date().toISOString(), id);
}

// ─── ADDITIONAL HELPERS (Phase-3) ────────────────────────────────────────────

export function previewGetInventoryItemBySerial(serialNo: string): any | null {
  return db().prepare("SELECT * FROM inventory_items WHERE serialNo = ?").get(serialNo) ?? null;
}

export function previewVoidSale(saleId: number): void {
  db().prepare("UPDATE sales SET status = 'Voided', updatedAt = ? WHERE id = ?").run(new Date().toISOString(), saleId);
  // Restore inventory items
  const items = db().prepare("SELECT inventoryItemId FROM sale_items WHERE saleId = ?").all(saleId) as any[];
  for (const item of items) {
    db().prepare("UPDATE inventory_items SET status = 'Available', updatedAt = ? WHERE id = ?").run(new Date().toISOString(), item.inventoryItemId);
  }
}

export function previewApproveTransfer(transferId: number, approvedByUserId: number): void {
  const now = new Date().toISOString();
  db().prepare("UPDATE stock_transfers SET status = 'InTransit', approvedByUserId = ?, approvedAt = ?, updatedAt = ? WHERE id = ?")
    .run(approvedByUserId, now, now, transferId);
}

export function previewRejectTransfer(transferId: number, rejectedByUserId: number, reason: string): void {
  const now = new Date().toISOString();
  db().prepare("UPDATE stock_transfers SET status = 'Rejected', approvedByUserId = ?, rejectionReason = ?, approvedAt = ?, updatedAt = ? WHERE id = ?")
    .run(rejectedByUserId, reason, now, now, transferId);
  // Restore inventory items
  const items = db().prepare("SELECT inventoryItemId FROM stock_transfer_items WHERE transferId = ?").all(transferId) as any[];
  for (const item of items) {
    db().prepare("UPDATE inventory_items SET status = 'Available', transitToBranchId = NULL, updatedAt = ? WHERE id = ?").run(now, item.inventoryItemId);
  }
}

export function previewCompleteTransfer(transferId: number): void {
  const now = new Date().toISOString();
  const transfer = db().prepare("SELECT * FROM stock_transfers WHERE id = ?").get(transferId) as any;
  if (!transfer) return;
  const items = db().prepare("SELECT * FROM stock_transfer_items WHERE transferId = ?").all(transferId) as any[];
  for (const item of items) {
    db().prepare("UPDATE inventory_items SET status = 'Available', branchId = ?, transitToBranchId = NULL, updatedAt = ? WHERE id = ?")
      .run(transfer.toBranchId, now, item.inventoryItemId);
  }
  db().prepare("UPDATE stock_transfers SET status = 'Completed', completedAt = ?, updatedAt = ? WHERE id = ?").run(now, now, transferId);
  // Record stock_received in branch ledger
  let totalBranchCost = 0;
  for (const item of items) {
    const invItem = db().prepare("SELECT branchCost FROM inventory_items WHERE id = ?").get(item.inventoryItemId) as any;
    if (invItem) totalBranchCost += parseFloat(invItem.branchCost);
  }
  previewAddBranchLedgerEntry({ branchId: transfer.toBranchId, type: "stock_received", amount: totalBranchCost.toFixed(2), description: `Stock received from transfer ${transfer.transferNo}` });
}

export function previewResolveInventoryItemBySerial(serialNo: string, branchId: number): any | null {
  return db().prepare("SELECT * FROM inventory_items WHERE serialNo = ? AND branchId = ?").get(serialNo, branchId) ?? null;
}

export function previewGetBranchLedgerSummary(branchId?: number): any {
  const filter = branchId ? "WHERE branchId = ?" : "";
  const params = branchId ? [branchId] : [];
  const row = db().prepare(`SELECT SUM(CAST(credit AS REAL)) as totalCredit, SUM(CAST(debit AS REAL)) as totalDebit FROM ledger_entries ${filter}`).get(...params) as any;
  return { totalCredit: row?.totalCredit ?? 0, totalDebit: row?.totalDebit ?? 0, balance: (row?.totalCredit ?? 0) - (row?.totalDebit ?? 0) };
}

export function previewGetHOPayments(branchId?: number): any[] {
  let query = "SELECT * FROM ho_payments WHERE 1=1";
  const params: any[] = [];
  if (branchId) { query += " AND branchId = ?"; params.push(branchId); }
  query += " ORDER BY paymentDate DESC";
  return db().prepare(query).all(...params) as any[];
}

export function previewCreateHOPayment(data: any): void {
  db().prepare(`
    INSERT INTO ho_payments (branchId, userId, amount, paymentMethod, reference, notes, paymentDate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(data.branchId, data.userId, data.amount, data.paymentMethod ?? null, data.reference ?? null, data.notes ?? null, new Date(data.paymentDate).toISOString());
}
