/**
 * Phase-2 tRPC Routers
 * Stock Integrity Engine, Purchase Workflow, Payment Allocation, and Reporting
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db.phase2";

// ═════════════════════════════════════════════════════════════════════════════════════════════
// STOCK INTEGRITY ENGINE ROUTER
// ═════════════════════════════════════════════════════════════════════════════════════════════

export const stockRouter = router({
  /**
   * Get available stock for a product at a branch
   */
  getAvailableStock: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        branchId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await db.getAvailableStock(input.productId, input.branchId);
    }),

  /**
   * Check if sufficient stock exists
   */
  checkSufficientStock: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        branchId: z.number(),
        requiredQuantity: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await db.checkSufficientStock(input.productId, input.branchId, input.requiredQuantity);
    }),

  /**
   * Create a stock reservation
   */
  createReservation: protectedProcedure
    .input(
      z.object({
        inventoryItemId: z.number(),
        invoiceId: z.number(),
        invoiceType: z.enum(["Sale", "Transfer", "PurchaseOrder"]),
        branchId: z.number(),
        productId: z.number(),
        quantity: z.number().default(1),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createStockReservation(
        input.inventoryItemId,
        input.invoiceId,
        input.invoiceType,
        input.branchId,
        input.productId,
        input.quantity
      );
    }),

  /**
   * Release a stock reservation
   */
  releaseReservation: protectedProcedure
    .input(z.object({ invoiceId: z.number() }))
    .mutation(async ({ input }) => {
      return await db.releaseStockReservation(input.invoiceId);
    }),

  /**
   * Consume a stock reservation
   */
  consumeReservation: protectedProcedure
    .input(z.object({ invoiceId: z.number() }))
    .mutation(async ({ input }) => {
      return await db.consumeStockReservation(input.invoiceId);
    }),

  /**
   * Get stock valuation by location
   */
  getStockValuation: protectedProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await db.getStockValuationByLocation(input?.branchId);
    }),
});

// ═════════════════════════════════════════════════════════════════════════════════════════════
// PURCHASE WORKFLOW ROUTER
// ═════════════════════════════════════════════════════════════════════════════════════════════

export const purchaseRouter = router({
  /**
   * Create a purchase order
   */
  createPO: protectedProcedure
    .input(
      z.object({
        poNo: z.string(),
        supplierId: z.number(),
        warehouseBranchId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.createPurchaseOrder(
        input.poNo,
        input.supplierId,
        input.warehouseBranchId,
        ctx.user.id,
        input.notes
      );
    }),

  /**
   * Add item to purchase order
   */
  addPOItem: protectedProcedure
    .input(
      z.object({
        poId: z.number(),
        productId: z.number(),
        quantity: z.number(),
        unitPrice: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.addPurchaseOrderItem(input.poId, input.productId, input.quantity, input.unitPrice);
    }),

  /**
   * Submit a purchase order
   */
  submitPO: protectedProcedure
    .input(z.object({ poId: z.number() }))
    .mutation(async ({ input }) => {
      return await db.submitPurchaseOrder(input.poId);
    }),

  /**
   * Approve a purchase order
   */
  approvePO: protectedProcedure
    .input(z.object({ poId: z.number() }))
    .mutation(async ({ input }) => {
      return await db.approvePurchaseOrder(input.poId);
    }),

  /**
   * Create a Goods Received Note
   */
  createGRN: protectedProcedure
    .input(
      z.object({
        grnNo: z.string(),
        poId: z.number(),
        supplierId: z.number(),
        warehouseBranchId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.createGRN(
        input.grnNo,
        input.poId,
        input.supplierId,
        input.warehouseBranchId,
        ctx.user.id,
        input.notes
      );
    }),

  /**
   * Add item to GRN
   */
  addGRNItem: protectedProcedure
    .input(
      z.object({
        grnId: z.number(),
        poItemId: z.number(),
        productId: z.number(),
        quantityReceived: z.number(),
        unitPrice: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.addGRNItem(
        input.grnId,
        input.poItemId,
        input.productId,
        input.quantityReceived,
        input.unitPrice
      );
    }),

  /**
   * Add landing cost to GRN
   */
  addLandingCost: protectedProcedure
    .input(
      z.object({
        grnId: z.number(),
        costType: z.string(),
        amount: z.number(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.addLandingCost(input.grnId, input.costType, input.amount, input.description);
    }),

  /**
   * Receive a GRN
   */
  receiveGRN: protectedProcedure
    .input(z.object({ grnId: z.number() }))
    .mutation(async ({ input }) => {
      return await db.receiveGRN(input.grnId);
    }),

  /**
   * Finalize a purchase
   */
  finalizePurchase: protectedProcedure
    .input(
      z.object({
        grnId: z.number(),
        poId: z.number(),
        supplierId: z.number(),
        warehouseBranchId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.finalizePurchase(
        input.grnId,
        input.poId,
        input.supplierId,
        input.warehouseBranchId,
        ctx.user.id,
        input.notes
      );
    }),
});

// ═════════════════════════════════════════════════════════════════════════════════════════════
// PAYMENT ALLOCATION ROUTER
// ═════════════════════════════════════════════════════════════════════════════════════════════

export const paymentRouter = router({
  /**
   * Create an invoice
   */
  createInvoice: protectedProcedure
    .input(
      z.object({
        invoiceNo: z.string(),
        invoiceType: z.enum(["Sales", "Purchase", "CreditNote", "DebitNote"]),
        referenceId: z.number(),
        branchId: z.number(),
        totalAmount: z.number(),
        supplierId: z.number().optional(),
        customerId: z.number().optional(),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createInvoice(
        input.invoiceNo,
        input.invoiceType,
        input.referenceId,
        input.branchId,
        input.totalAmount,
        input.supplierId,
        input.customerId,
        input.dueDate
      );
    }),

  /**
   * Issue an invoice
   */
  issueInvoice: protectedProcedure
    .input(z.object({ invoiceId: z.number() }))
    .mutation(async ({ input }) => {
      return await db.issueInvoice(input.invoiceId);
    }),

  /**
   * Record a payment for an invoice
   */
  recordPayment: protectedProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        paymentAmount: z.number(),
        paymentMethod: z.string(),
        reference: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.recordInvoicePayment(
        input.invoiceId,
        input.paymentAmount,
        input.paymentMethod,
        ctx.user.id,
        input.reference,
        input.notes
      );
    }),

  /**
   * Get invoice details with payment history
   */
  getInvoiceDetails: protectedProcedure
    .input(z.object({ invoiceId: z.number() }))
    .query(async ({ input }) => {
      return await db.getInvoiceDetails(input.invoiceId);
    }),

  /**
   * Update invoice aging
   */
  updateAging: protectedProcedure
    .input(z.object({ invoiceId: z.number() }))
    .mutation(async ({ input }) => {
      return await db.updateInvoiceAging(input.invoiceId);
    }),

  /**
   * Get supplier outstanding invoices
   */
  getSupplierOutstanding: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input }) => {
      return await db.getSupplierOutstandingInvoices(input.supplierId);
    }),

  /**
   * Get customer outstanding invoices
   */
  getCustomerOutstanding: protectedProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      return await db.getCustomerOutstandingInvoices(input.customerId);
    }),

  /**
   * Get supplier outstanding balances
   */
  getSupplierBalances: protectedProcedure.query(async () => {
    return await db.getSupplierOutstandingBalances();
  }),

  /**
   * Get invoice aging summary
   */
  getAgingSummary: protectedProcedure
    .input(z.object({ supplierId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await db.getInvoiceAgingSummary(input?.supplierId);
    }),
});

// ═════════════════════════════════════════════════════════════════════════════════════════════
// REPORTING ROUTER
// ═════════════════════════════════════════════════════════════════════════════════════════════

export const reportingRouter = router({
  /**
   * Get stock valuation report
   */
  stockValuation: protectedProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await db.getStockValuationByLocation(input?.branchId);
    }),

  /**
   * Get supplier outstanding balances report
   */
  supplierOutstandingBalances: protectedProcedure.query(async () => {
    return await db.getSupplierOutstandingBalances();
  }),

  /**
   * Get invoice aging summary report
   */
  invoiceAgingSummary: protectedProcedure
    .input(z.object({ supplierId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await db.getInvoiceAgingSummary(input?.supplierId);
    }),
});

// ═════════════════════════════════════════════════════════════════════════════════════════════
// PHASE-2 MAIN ROUTER
// ═════════════════════════════════════════════════════════════════════════════════════════════

export const phase2Router = router({
  stock: stockRouter,
  purchase: purchaseRouter,
  payment: paymentRouter,
  reporting: reportingRouter,
});
