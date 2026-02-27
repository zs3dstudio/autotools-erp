/**
 * Phase-2 Database Helper Functions
 * Stock Integrity Engine, Purchase Workflow, Payment Allocation, and Reporting
 */

import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { getDb, addBranchLedgerEntry } from "./db";
import {
  stockReservations,
  purchaseOrders,
  purchaseOrderItems,
  goodsReceivedNotes,
  grnItems,
  landingCosts,
  purchaseFinalizations,
  invoices,
  invoicePayments,
  paymentAllocations,
  invoiceAging,
  inventoryItems,
  ledgerEntries,
} from "../drizzle/schema";

// ═════════════════════════════════════════════════════════════════════════════════════════════
// STOCK INTEGRITY ENGINE
// ═════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Create a stock reservation when an invoice is created
 */
export async function createStockReservation(
  inventoryItemId: number,
  invoiceId: number,
  invoiceType: "Sale" | "Transfer" | "PurchaseOrder",
  branchId: number,
  productId: number,
  quantity: number = 1
) {
  const db = await getDb();
  return await db.insert(stockReservations).values({
    inventoryItemId,
    invoiceId,
    invoiceType,
    branchId,
    productId,
    quantity,
    status: "Active",
  });
}

/**
 * Release a stock reservation (when invoice is cancelled)
 */
export async function releaseStockReservation(invoiceId: number) {
  const db = await getDb();
  return await db
    .update(stockReservations)
    .set({
      status: "Released",
      releasedAt: new Date(),
    })
    .where(and(eq(stockReservations.invoiceId, invoiceId), eq(stockReservations.status, "Active")));
}

/**
 * Mark stock reservation as consumed (when sale is completed)
 */
export async function consumeStockReservation(invoiceId: number) {
  const db = await getDb();
  return await db
    .update(stockReservations)
    .set({
      status: "Consumed",
    })
    .where(eq(stockReservations.invoiceId, invoiceId));
}

/**
 * Get available stock count for a product at a branch
 */
export async function getAvailableStock(productId: number, branchId: number) {
  const db = await getDb();

  // Count available items
  const availableItems = await db
    .select()
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.productId, productId),
        eq(inventoryItems.branchId, branchId),
        eq(inventoryItems.status, "Available")
      )
    );

  // Count active reservations
  const reservedItems = await db
    .select()
    .from(stockReservations)
    .where(
      and(
        eq(stockReservations.productId, productId),
        eq(stockReservations.branchId, branchId),
        eq(stockReservations.status, "Active")
      )
    );

  const available = availableItems.length;
  const reserved = reservedItems.reduce((sum, r) => sum + r.quantity, 0);

  return {
    total: available,
    reserved,
    available: available - reserved,
  };
}

/**
 * Check if sufficient stock exists for a sale or transfer
 */
export async function checkSufficientStock(
  productId: number,
  branchId: number,
  requiredQuantity: number
): Promise<boolean> {
  const stock = await getAvailableStock(productId, branchId);
  return stock.available >= requiredQuantity;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// PURCHASE WORKFLOW PIPELINE
// ═════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Create a purchase order
 */
export async function createPurchaseOrder(
  poNo: string,
  supplierId: number,
  warehouseBranchId: number,
  createdByUserId: number,
  notes?: string
) {
  const db = await getDb();
  return await db.insert(purchaseOrders).values({
    poNo: poNo,
    supplierId: supplierId,
    warehouseBranchId: warehouseBranchId,
    createdByUserId: createdByUserId,
    status: "Draft",
    totalAmount: "0",
    notes: notes,
  });
}

/**
 * Add items to a purchase order
 */
export async function addPurchaseOrderItem(
  poId: number,
  productId: number,
  quantity: number,
  unitPrice: number
) {
  const db = await getDb();
  const totalPrice = quantity * unitPrice;

  // Insert item
  await db.insert(purchaseOrderItems).values({
    poId: poId,
    productId: productId,
    quantity: quantity,
    unitPrice: unitPrice.toString(),
    totalPrice: totalPrice.toString(),
  });

  // Update PO total
  const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
  const total = items.reduce((sum, item) => sum + parseFloat(item.totalPrice.toString()), 0);

  await db
    .update(purchaseOrders)
    .set({ totalAmount: total.toString() })
    .where(eq(purchaseOrders.id, poId));
}

/**
 * Submit a purchase order
 */
export async function submitPurchaseOrder(poId: number) {
  const db = await getDb();
  return await db
    .update(purchaseOrders)
    .set({
      status: "Submitted",
      submittedAt: new Date(),
    })
    .where(eq(purchaseOrders.id, poId));
}

/**
 * Approve a purchase order
 */
export async function approvePurchaseOrder(poId: number) {
  const db = await getDb();
  return await db
    .update(purchaseOrders)
    .set({
      status: "Approved",
      approvedAt: new Date(),
    })
    .where(eq(purchaseOrders.id, poId));
}

/**
 * Create a Goods Received Note (GRN)
 */
export async function createGRN(
  grnNo: string,
  poId: number,
  supplierId: number,
  warehouseBranchId: number,
  receivedByUserId: number,
  notes?: string
) {
  const db = await getDb();
  return await db.insert(goodsReceivedNotes).values({
    grnNo: grnNo,
    poId: poId,
    supplierId: supplierId,
    warehouseBranchId: warehouseBranchId,
    receivedByUserId: receivedByUserId,
    status: "Pending",
    totalReceivedAmount: "0.00",
    notes: notes,
  });
}

/**
 * Add items to a GRN
 */
export async function addGRNItem(
  grnId: number,
  poItemId: number,
  productId: number,
  quantityReceived: number,
  unitPrice: number
) {
  const db = await getDb();
  const totalPrice = quantityReceived * unitPrice;

  // Insert GRN item
  await db.insert(grnItems).values({
    grnId: grnId,
    poItemId: poItemId,
    productId: productId,
    quantityReceived: quantityReceived,
    unitPrice: unitPrice.toString(),
    totalPrice: totalPrice.toString(),
  });

  // Update GRN total
  const items = await db.select().from(grnItems).where(eq(grnItems.grnId, grnId));
  const total = items.reduce((sum, item) => sum + parseFloat(item.totalPrice.toString()), 0);

  await db
    .update(goodsReceivedNotes)
    .set({ totalReceivedAmount: total.toString() })
    .where(eq(goodsReceivedNotes.id, grnId));
}

/**
 * Add a landing cost to a GRN
 */
export async function addLandingCost(grnId: number, costType: string, amount: number, description?: string) {
  const db = await getDb();
  return await db.insert(landingCosts).values({
    grnId: grnId,
    costType: costType,
    amount: amount.toString(),
    description: description,
  });
}

/**
 * Receive a GRN (mark as Received and create inventory items)
 */
export async function receiveGRN(grnId: number) {
  const db = await getDb();

  // Get GRN and items
  const grn = await db.select().from(goodsReceivedNotes).where(eq(goodsReceivedNotes.id, grnId));
  if (!grn.length) throw new Error("GRN not found");

  const grnItemsList = await db.select().from(grnItems).where(eq(grnItems.grnId, grnId));

  // Create inventory items for each GRN item
  for (const grnItem of grnItemsList) {
    for (let i = 0; i < grnItem.quantityReceived; i++) {
      await db.insert(inventoryItems).values({
        serialNo: `GRN-${grnId}-${grnItem.productId}-${i}-${Date.now()}`,
        productId: grnItem.productId,
        branchId: grn[0].warehouseBranchId,
        landingCost: grnItem.unitPrice,
        branchCost: grnItem.unitPrice,
        status: "Available",
      });
    }
  }

  // Mark GRN as Received
  return await db
    .update(goodsReceivedNotes)
    .set({
      status: "Received",
      receivedAt: new Date(),
    })
    .where(eq(goodsReceivedNotes.id, grnId));
}

/**
 * Finalize a purchase (create supplier payable ledger entry)
 */
export async function finalizePurchase(
  grnId: number,
  poId: number,
  supplierId: number,
  warehouseBranchId: number,
  finalizedByUserId: number,
  notes?: string
) {
  const db = await getDb();

  // Get GRN and calculate total with landing costs
  const grn = await db.select().from(goodsReceivedNotes).where(eq(goodsReceivedNotes.id, grnId));
  if (!grn.length) throw new Error("GRN not found");

  const costs = await db.select().from(landingCosts).where(eq(landingCosts.grnId, grnId));
  const totalLandingCosts = costs.reduce((sum, cost) => sum + parseFloat(cost.amount.toString()), 0);
  const baseAmount = parseFloat(grn[0].totalReceivedAmount.toString());
  const finalAmount = baseAmount + totalLandingCosts;

  // Create ledger entry for supplier payable
  const ledgerResult = await db.insert(ledgerEntries).values({
    branchId: warehouseBranchId,
    entryType: "Payment", // Using Payment as a general type since PurchasePayable isn't in the enum
    referenceId: poId,
    referenceType: "PurchaseOrder",
    description: `Purchase from supplier ${supplierId}`,
    credit: finalAmount.toString(),
    debit: "0.00",
    runningBalance: finalAmount.toString(),
  });

  const payableEntryId = Number((ledgerResult as any).lastInsertRowid);

  // Create purchase finalization record
  return await db.insert(purchaseFinalizations).values({
    grnId: grnId,
    poId: poId,
    supplierId: supplierId,
    warehouseBranchId: warehouseBranchId,
    finalizedByUserId: finalizedByUserId,
    baseAmount: baseAmount.toString(),
    totalLandingCosts: totalLandingCosts.toString(),
    finalAmount: finalAmount.toString(),
    payableEntryId: payableEntryId,
    status: "Finalized",
    finalizedAt: new Date(),
    notes: notes,
  });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// PAYMENT ALLOCATION ENGINE
// ═════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Create an invoice
 */
export async function createInvoice(
  invoiceNo: string,
  invoiceType: "Sales" | "Purchase" | "CreditNote" | "DebitNote",
  referenceId: number,
  branchId: number,
  totalAmount: number,
  supplierId?: number,
  customerId?: number,
  dueDate?: Date
) {
  const db = await getDb();
  return await db.insert(invoices).values({
    invoiceNo: invoiceNo,
    invoiceType: invoiceType,
    referenceId: referenceId,
    supplierId: supplierId,
    customerId: customerId,
    branchId: branchId,
    totalAmount: totalAmount.toString(),
    paidAmount: "0.00",
    outstandingAmount: totalAmount.toString(),
    creditAmount: "0.00",
    status: "Draft",
    dueDate: dueDate,
  });
}

/**
 * Issue an invoice
 */
export async function issueInvoice(invoiceId: number) {
  const db = await getDb();
  const result = await db
    .update(invoices)
    .set({
      status: "Issued",
      issuedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  // Create invoice aging record
  const invoice = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (invoice.length) {
    await db.insert(invoiceAging).values({
      invoiceId: invoiceId,
      invoiceNo: invoice[0].invoiceNo,
      supplierId: invoice[0].supplierId,
      customerId: invoice[0].customerId,
      branchId: invoice[0].branchId,
      totalAmount: invoice[0].totalAmount.toString(),
      outstandingAmount: invoice[0].outstandingAmount.toString(),
      dueDate: invoice[0].dueDate,
    });
  }

  return result;
}

/**
 * Record a payment for an invoice
 */
export async function recordInvoicePayment(
  invoiceId: number,
  paymentAmount: number,
  paymentMethod: string,
  createdByUserId: number,
  reference?: string,
  notes?: string
) {
  const db = await getDb();

  // Create payment record
  const paymentResult = await db.insert(invoicePayments).values({
    invoiceId: invoiceId,
    paymentAmount: paymentAmount.toString(),
    paymentMethod: paymentMethod,
    createdByUserId: createdByUserId,
    reference: reference,
    notes: notes,
    paymentDate: new Date(),
  });

  const paymentId = Number((paymentResult as any).lastInsertRowid);

  // Create payment allocation
  if (paymentId) {
    await db.insert(paymentAllocations).values({
      invoiceId: invoiceId,
      paymentId: paymentId,
      allocatedAmount: paymentAmount.toString(),
    });
  }

  // Update invoice
  const invoice = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (invoice.length) {
    const inv = invoice[0];
    const newPaidAmount = parseFloat(inv.paidAmount.toString()) + paymentAmount;
    const outstandingAmount = Math.max(0, parseFloat(inv.totalAmount.toString()) - newPaidAmount);
    const creditAmount = Math.max(0, newPaidAmount - parseFloat(inv.totalAmount.toString()));

    let newStatus: "PartiallyPaid" | "Paid" = "PartiallyPaid";
    if (outstandingAmount === 0 && creditAmount === 0) {
      newStatus = "Paid";
    }

    const updateData: any = {
      paidAmount: newPaidAmount.toString(),
      outstandingAmount: outstandingAmount.toString(),
      creditAmount: creditAmount.toString(),
      status: newStatus,
    };
    if (outstandingAmount === 0) {
      updateData.paidAt = new Date();
    }

    await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, invoiceId));

    // Update invoice aging
    await db
      .update(invoiceAging)
      .set({
        outstandingAmount: outstandingAmount.toString(),
        lastPaymentDate: new Date(),
      })
      .where(eq(invoiceAging.invoiceId, invoiceId));
  }

  return paymentResult;
}

/**
 * Get invoice details with payment history
 */
export async function getInvoiceDetails(invoiceId: number) {
  const db = await getDb();
  const invoice = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice.length) return null;

  const payments = await db.select().from(invoicePayments).where(eq(invoicePayments.invoiceId, invoiceId));
  const allocations = await db.select().from(paymentAllocations).where(eq(paymentAllocations.invoiceId, invoiceId));

  return {
    invoice: invoice[0],
    payments,
    allocations,
  };
}

/**
 * Calculate invoice aging and update aging bucket
 */
export async function updateInvoiceAging(invoiceId: number) {
  const db = await getDb();
  const invoice = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice.length) return;

  const inv = invoice[0];
  const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
  const today = new Date();
  let daysOverdue = 0;
  let agingBucket: "Current" | "30Days" | "60Days" | "90Days" | "Over90Days" = "Current";

  if (dueDate && dueDate < today) {
    daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 30) agingBucket = "30Days";
    else if (daysOverdue <= 60) agingBucket = "60Days";
    else if (daysOverdue <= 90) agingBucket = "90Days";
    else agingBucket = "Over90Days";
  }

  const updateData: any = {
    daysOverdue,
    agingBucket,
  };

  await db
    .update(invoiceAging)
    .set(updateData)
    .where(eq(invoiceAging.invoiceId, invoiceId));
}

/**
 * Get outstanding invoices for a supplier
 */
export async function getSupplierOutstandingInvoices(supplierId: number) {
  const db = await getDb();
  const allInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.supplierId, supplierId));

  return allInvoices.filter(
    (inv) =>
      parseFloat(inv.outstandingAmount.toString()) > 0 &&
      ["Issued", "PartiallyPaid", "Overdue"].includes(inv.status)
  );
}

/**
 * Get outstanding invoices for a customer
 */
export async function getCustomerOutstandingInvoices(customerId: number) {
  const db = await getDb();
  const allInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.customerId, customerId));

  return allInvoices.filter(
    (inv) =>
      parseFloat(inv.outstandingAmount.toString()) > 0 &&
      ["Issued", "PartiallyPaid", "Overdue"].includes(inv.status)
  );
}

/**
 * Get all outstanding purchase invoices grouped by supplier
 */
export async function getSupplierOutstandingBalances() {
  const db = await getDb();
  const allInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.invoiceType, "Purchase"));

  const outstandingInvoices = allInvoices.filter(
    (inv) =>
      parseFloat(inv.outstandingAmount.toString()) > 0 &&
      ["Issued", "PartiallyPaid", "Overdue"].includes(inv.status)
  );

  // Group by supplier
  const grouped: Record<string, { count: number; total: number }> = {};
  for (const inv of outstandingInvoices) {
    const supplierId = inv.supplierId ? String(inv.supplierId) : "null";
    if (!grouped[supplierId]) {
      grouped[supplierId] = { count: 0, total: 0 };
    }
    grouped[supplierId].count++;
    grouped[supplierId].total += parseFloat(inv.outstandingAmount.toString());
  }

  return Object.entries(grouped).map(([supplierId, data]) => ({
    supplierId: supplierId === "null" ? null : parseInt(supplierId),
    totalOutstanding: data.total,
    invoiceCount: data.count,
  }));
}

/**
 * Get invoice aging summary
 */
export async function getInvoiceAgingSummary(supplierId?: number) {
  const db = await getDb();
  let whereClause = undefined;
  if (supplierId) {
    whereClause = eq(invoiceAging.supplierId, supplierId);
  }

  const agingRecords = whereClause
    ? await db.select().from(invoiceAging).where(whereClause)
    : await db.select().from(invoiceAging);

  // Group by aging bucket
  const grouped: Record<string, { count: number; total: number }> = {};
  for (const record of agingRecords) {
    const bucket = record.agingBucket;
    if (!grouped[bucket]) {
      grouped[bucket] = { count: 0, total: 0 };
    }
    grouped[bucket].count++;
    grouped[bucket].total += parseFloat(record.outstandingAmount.toString());
  }

  return Object.entries(grouped).map(([agingBucket, data]) => ({
    agingBucket,
    count: data.count,
    totalOutstanding: data.total,
  }));
}

/**
 * Get stock valuation by location
 */
export async function getStockValuationByLocation(branchId?: number) {
  const db = await getDb();
  const whereConditions: any[] = [eq(inventoryItems.status, "Available")];
  if (branchId) {
    whereConditions.push(eq(inventoryItems.branchId, branchId));
  }

  const items = await db
    .select()
    .from(inventoryItems)
    .where(and(...whereConditions));

  // Group by branch and product
  const grouped: Record<string, { branchId: number; productId: number; quantity: number; totalValue: number }> = {};
  for (const item of items) {
    const key = `${item.branchId}-${item.productId}`;
    if (!grouped[key]) {
      grouped[key] = {
        branchId: item.branchId,
        productId: item.productId,
        quantity: 0,
        totalValue: 0,
      };
    }
    grouped[key].quantity++;
    grouped[key].totalValue += parseFloat(item.landingCost.toString());
  }

  return Object.values(grouped);
}
