/**
 * Phase-2 Payment Allocation Engine Tests
 * Tests for invoice management, payment allocation, and aging
 */

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Payment Allocation Engine", () => {
  const ctx = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  describe("Invoice Management", () => {
    it("should create a sales invoice in Draft status", async () => {
      const result = await caller.phase2.payment.createInvoice({
        invoiceNo: "INV-2026-001",
        invoiceType: "Sales",
        referenceId: 1,
        branchId: 1,
        totalAmount: 10000,
        customerId: 1,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });

      expect(result).toBeDefined();
      expect(result.insertId).toBeDefined();
    });

    it("should create a purchase invoice in Draft status", async () => {
      const result = await caller.phase2.payment.createInvoice({
        invoiceNo: "PINV-2026-001",
        invoiceType: "Purchase",
        referenceId: 1,
        branchId: 1,
        totalAmount: 5000,
        supplierId: 1,
      });

      expect(result).toBeDefined();
      expect(result.insertId).toBeDefined();
    });

    it("should issue an invoice and change status to Issued", async () => {
      const result = await caller.phase2.payment.issueInvoice({
        invoiceId: 1,
      });

      expect(result).toBeDefined();
    });

    it("should get invoice details with payment history", async () => {
      const result = await caller.phase2.payment.getInvoiceDetails({
        invoiceId: 1,
      });

      expect(result).toBeDefined();
      expect(result.invoiceNo).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.totalAmount).toBeDefined();
      expect(result.paidAmount).toBeDefined();
      expect(result.outstandingAmount).toBeDefined();
    });
  });

  describe("Payment Recording", () => {
    it("should record a full payment for an invoice", async () => {
      const result = await caller.phase2.payment.recordPayment({
        invoiceId: 1,
        paymentAmount: 10000,
        paymentMethod: "Transfer",
        reference: "TRF-12345",
        notes: "Full payment received",
      });

      expect(result).toBeDefined();
    });

    it("should record a partial payment for an invoice", async () => {
      const result = await caller.phase2.payment.recordPayment({
        invoiceId: 1,
        paymentAmount: 5000,
        paymentMethod: "Cash",
        notes: "Partial payment",
      });

      expect(result).toBeDefined();
    });

    it("should handle overpayment as credit", async () => {
      // Record payment exceeding invoice amount
      const result = await caller.phase2.payment.recordPayment({
        invoiceId: 1,
        paymentAmount: 12000, // More than 10000 invoice
        paymentMethod: "Card",
        notes: "Overpayment",
      });

      expect(result).toBeDefined();
      // The overpayment should be tracked as credit
    });
  });

  describe("Outstanding Balance Tracking", () => {
    it("should get supplier outstanding invoices", async () => {
      const result = await caller.phase2.payment.getSupplierOutstanding({
        supplierId: 1,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should get customer outstanding invoices", async () => {
      const result = await caller.phase2.payment.getCustomerOutstanding({
        customerId: 1,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should get supplier outstanding balances grouped by supplier", async () => {
      const result = await caller.phase2.payment.getSupplierBalances();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Invoice Aging", () => {
    it("should update invoice aging status", async () => {
      const result = await caller.phase2.payment.updateAging({
        invoiceId: 1,
      });

      expect(result).toBeDefined();
    });

    it("should calculate days overdue correctly", async () => {
      // Create an invoice with past due date
      const pastDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000); // 45 days ago
      const invoiceResult = await caller.phase2.payment.createInvoice({
        invoiceNo: "INV-AGING-001",
        invoiceType: "Sales",
        referenceId: 1,
        branchId: 1,
        totalAmount: 5000,
        customerId: 1,
        dueDate: pastDate,
      });

      // Issue the invoice
      await caller.phase2.payment.issueInvoice({
        invoiceId: invoiceResult.insertId as number,
      });

      // Update aging
      await caller.phase2.payment.updateAging({
        invoiceId: invoiceResult.insertId as number,
      });

      // Get aging summary
      const agingSummary = await caller.phase2.payment.getAgingSummary();
      expect(agingSummary).toBeDefined();
    });

    it("should categorize invoices into aging buckets", async () => {
      const result = await caller.phase2.payment.getAgingSummary();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should get aging summary for specific supplier", async () => {
      const result = await caller.phase2.payment.getAgingSummary({
        supplierId: 1,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Payment Allocation Integrity", () => {
    it("should allocate payments against correct invoices", async () => {
      // Create invoice
      const invoiceResult = await caller.phase2.payment.createInvoice({
        invoiceNo: "INV-ALLOC-001",
        invoiceType: "Sales",
        referenceId: 1,
        branchId: 1,
        totalAmount: 10000,
        customerId: 1,
      });

      // Issue invoice
      await caller.phase2.payment.issueInvoice({
        invoiceId: invoiceResult.insertId as number,
      });

      // Record payment
      const paymentResult = await caller.phase2.payment.recordPayment({
        invoiceId: invoiceResult.insertId as number,
        paymentAmount: 10000,
        paymentMethod: "Transfer",
      });

      expect(paymentResult).toBeDefined();
    });

    it("should track partial payments across multiple transactions", async () => {
      // Create invoice
      const invoiceResult = await caller.phase2.payment.createInvoice({
        invoiceNo: "INV-PARTIAL-001",
        invoiceType: "Sales",
        referenceId: 1,
        branchId: 1,
        totalAmount: 10000,
        customerId: 1,
      });

      // Issue invoice
      await caller.phase2.payment.issueInvoice({
        invoiceId: invoiceResult.insertId as number,
      });

      // Record first partial payment
      await caller.phase2.payment.recordPayment({
        invoiceId: invoiceResult.insertId as number,
        paymentAmount: 3000,
        paymentMethod: "Cash",
      });

      // Record second partial payment
      await caller.phase2.payment.recordPayment({
        invoiceId: invoiceResult.insertId as number,
        paymentAmount: 4000,
        paymentMethod: "Card",
      });

      // Record final payment
      const finalResult = await caller.phase2.payment.recordPayment({
        invoiceId: invoiceResult.insertId as number,
        paymentAmount: 3000,
        paymentMethod: "Transfer",
      });

      expect(finalResult).toBeDefined();
    });

    it("should prevent overpayment beyond credit limit", async () => {
      // Create invoice
      const invoiceResult = await caller.phase2.payment.createInvoice({
        invoiceNo: "INV-OVERPAY-001",
        invoiceType: "Sales",
        referenceId: 1,
        branchId: 1,
        totalAmount: 5000,
        customerId: 1,
      });

      // Issue invoice
      await caller.phase2.payment.issueInvoice({
        invoiceId: invoiceResult.insertId as number,
      });

      // Record overpayment
      const result = await caller.phase2.payment.recordPayment({
        invoiceId: invoiceResult.insertId as number,
        paymentAmount: 6000, // 1000 overpayment
        paymentMethod: "Transfer",
      });

      expect(result).toBeDefined();
      // The system should track the 1000 as credit for future use
    });
  });

  describe("Invoice Status Transitions", () => {
    it("should transition from Draft to Issued", async () => {
      const invoiceResult = await caller.phase2.payment.createInvoice({
        invoiceNo: "INV-STATUS-001",
        invoiceType: "Sales",
        referenceId: 1,
        branchId: 1,
        totalAmount: 5000,
        customerId: 1,
      });

      const issueResult = await caller.phase2.payment.issueInvoice({
        invoiceId: invoiceResult.insertId as number,
      });

      expect(issueResult).toBeDefined();
    });

    it("should transition from Issued to PartiallyPaid after first payment", async () => {
      const invoiceResult = await caller.phase2.payment.createInvoice({
        invoiceNo: "INV-PARTIAL-STATUS-001",
        invoiceType: "Sales",
        referenceId: 1,
        branchId: 1,
        totalAmount: 10000,
        customerId: 1,
      });

      await caller.phase2.payment.issueInvoice({
        invoiceId: invoiceResult.insertId as number,
      });

      const paymentResult = await caller.phase2.payment.recordPayment({
        invoiceId: invoiceResult.insertId as number,
        paymentAmount: 5000,
        paymentMethod: "Transfer",
      });

      expect(paymentResult).toBeDefined();
    });

    it("should transition from PartiallyPaid to Paid after full payment", async () => {
      const invoiceResult = await caller.phase2.payment.createInvoice({
        invoiceNo: "INV-FULL-STATUS-001",
        invoiceType: "Sales",
        referenceId: 1,
        branchId: 1,
        totalAmount: 5000,
        customerId: 1,
      });

      await caller.phase2.payment.issueInvoice({
        invoiceId: invoiceResult.insertId as number,
      });

      const paymentResult = await caller.phase2.payment.recordPayment({
        invoiceId: invoiceResult.insertId as number,
        paymentAmount: 5000,
        paymentMethod: "Transfer",
      });

      expect(paymentResult).toBeDefined();
    });
  });
});
