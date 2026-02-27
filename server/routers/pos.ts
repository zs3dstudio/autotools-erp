/**
 * POS Router — Phase-3 Branch Data Isolation & Permission Enforcement
 * 
 * POSUser: can create sales, view products in their branch only
 * POSUser CANNOT: edit costs, view company profit, transfer stock
 * Branch must be active to allow sales
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { isPreviewMode } from "../_core/previewDb";
import {
  enforceBranchAccess,
  enforceBranchActive,
  hasGlobalAccess,
  requirePermission,
  filterSaleItemForRole,
} from "../_core/permissions";
import {
  previewLookupSerial,
  previewCreateSale,
  previewGetSales,
  previewGetSaleById,
  previewGetBranchById,
} from "../_core/previewDbAdapter";

function generateReceiptNo(branchId: number): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `RCP-${branchId}-${date}-${rand}`;
}

export const posRouter = router({
  /**
   * Look up an inventory item by serial number for POS
   * Enforces branch access — POSUser can only look up items in their branch
   */
  lookupSerial: protectedProcedure
    .input(z.object({ serialNo: z.string(), branchId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Enforce branch access
      enforceBranchAccess(ctx.user, input.branchId);

      if (isPreviewMode()) {
        // Check branch is active
        const branch = previewGetBranchById(input.branchId);
        enforceBranchActive(branch);

        const item = previewLookupSerial(input.serialNo, input.branchId);
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found or not available in this branch" });

        // POSUser sees product info but not costs
        if (ctx.user.role === "POSUser" || ctx.user.role === "cashier") {
          const { landingCost, branchCost, ...publicItem } = item;
          return publicItem;
        }
        return item;
      }

      const { getInventoryItemBySerial, getProductById, getBranchById } = await import("../db");
      const branch = await getBranchById(input.branchId);
      enforceBranchActive(branch);

      const invItem = await getInventoryItemBySerial(input.serialNo);
      if (!invItem) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      if (invItem.status !== "Available") throw new TRPCError({ code: "BAD_REQUEST", message: `Item is ${invItem.status}` });
      if ((invItem as any).branchId !== input.branchId) throw new TRPCError({ code: "BAD_REQUEST", message: "Item not in this branch" });

      const product = await getProductById((invItem as any).productId);
      if (ctx.user.role === "POSUser" || ctx.user.role === "cashier") {
        const { landingCost, branchCost, ...publicItem } = invItem as any;
        return { ...publicItem, product };
      }
      return { ...invItem, product };
    }),

  /**
   * Create a sale (POS checkout)
   * Requires canSell permission
   * Branch must be active
   */
  createSale: protectedProcedure
    .input(z.object({
      branchId: z.number(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      discount: z.string().default("0.00"),
      paymentType: z.enum(["Cash", "Card", "Transfer", "Mixed"]),
      notes: z.string().optional(),
      isOfflineSale: z.boolean().default(false),
      items: z.array(z.object({
        serialNo: z.string(),
        retailPrice: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      // Permission check
      await requirePermission(ctx.user, "canSell", "You do not have permission to create sales");

      // Branch access check
      enforceBranchAccess(ctx.user, input.branchId);

      if (input.items.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No items in sale" });
      }

      if (isPreviewMode()) {
        // Check branch is active
        const branch = previewGetBranchById(input.branchId);
        enforceBranchActive(branch);

        const { previewGetInventoryItemBySerial, previewGetProductById } = await import("../_core/previewDbAdapter");

        // Validate items
        const resolvedItems: any[] = [];
        for (const saleItem of input.items) {
          const invItem = previewGetInventoryItemBySerial(saleItem.serialNo);
          if (!invItem) throw new TRPCError({ code: "NOT_FOUND", message: `Serial ${saleItem.serialNo} not found` });
          if (invItem.status !== "Available") throw new TRPCError({ code: "CONFLICT", message: `Item ${saleItem.serialNo} is ${invItem.status}` });
          if (invItem.branchId !== input.branchId) throw new TRPCError({ code: "BAD_REQUEST", message: `Item ${saleItem.serialNo} not in this branch` });

          const product = previewGetProductById(invItem.productId);
          const retailPrice = parseFloat(saleItem.retailPrice) || parseFloat(String(product?.retailPrice ?? 0));
          resolvedItems.push({ inventoryItem: invItem, product, retailPrice });
        }

        // Calculate totals
        const subtotal = resolvedItems.reduce((sum, i) => sum + i.retailPrice, 0);
        const discount = parseFloat(input.discount) || 0;
        const totalAmount = subtotal - discount;

        // Build sale items with profit calculations
        const saleItemsData = resolvedItems.map((ri) => {
          const landingCost = parseFloat(String(ri.inventoryItem.landingCost));
          const branchCost = parseFloat(String(ri.inventoryItem.branchCost));
          const profit = ri.retailPrice - landingCost;
          const investor70 = profit * 0.7;
          const master30 = profit * 0.3;
          const cashDueHO = ri.retailPrice - branchCost;
          return {
            inventoryItemId: ri.inventoryItem.id,
            productId: ri.inventoryItem.productId,
            serialNo: ri.inventoryItem.serialNo,
            landingCost: landingCost.toFixed(2),
            branchCost: branchCost.toFixed(2),
            retailPrice: ri.retailPrice.toFixed(2),
            profit: profit.toFixed(2),
            investor70: investor70.toFixed(2),
            master30: master30.toFixed(2),
            cashDueHO: cashDueHO.toFixed(2),
          };
        });

        const { saleId, receiptNo } = previewCreateSale({
          branchId: input.branchId,
          userId: ctx.user.id,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          subtotal: subtotal.toFixed(2),
          discount: discount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          paymentType: input.paymentType,
          notes: input.notes,
          items: saleItemsData,
        });

        return { success: true, saleId, receiptNo, totalAmount };
      }

      // Production path
      const {
        getInventoryItemBySerial, getProductById, getBranchById,
        createSale, createSaleItems, updateInventoryStatus,
        addBranchLedgerEntry, addLedgerEntry, checkAndCreateReorderAlerts, addAuditLog,
      } = await import("../db");

      const branch = await getBranchById(input.branchId);
      enforceBranchActive(branch);

      const resolvedItems: any[] = [];
      for (const saleItem of input.items) {
        const invItem = await getInventoryItemBySerial(saleItem.serialNo);
        if (!invItem) throw new TRPCError({ code: "NOT_FOUND", message: `Serial ${saleItem.serialNo} not found` });
        if (invItem.status !== "Available") throw new TRPCError({ code: "CONFLICT", message: `Item ${saleItem.serialNo} is ${invItem.status}` });
        if ((invItem as any).branchId !== input.branchId) throw new TRPCError({ code: "BAD_REQUEST", message: `Item ${saleItem.serialNo} not in this branch` });
        const product = await getProductById((invItem as any).productId);
        const retailPrice = parseFloat(saleItem.retailPrice) || parseFloat(String((product as any)?.retailPrice ?? 0));
        resolvedItems.push({ inventoryItem: invItem, product, retailPrice });
      }

      const subtotal = resolvedItems.reduce((sum, i) => sum + i.retailPrice, 0);
      const discount = parseFloat(input.discount) || 0;
      const totalAmount = subtotal - discount;

      const receiptNo = generateReceiptNo(input.branchId);
      const saleResult = await createSale({
        receiptNo, branchId: input.branchId, userId: ctx.user.id,
        customerName: input.customerName, customerPhone: input.customerPhone,
        subtotal: subtotal.toFixed(2), discount: discount.toFixed(2),
        totalAmount: totalAmount.toFixed(2), paymentType: input.paymentType,
        notes: input.notes, isOfflineSale: input.isOfflineSale,
      });
      const saleId = (saleResult[0] as any).insertId as number;

      const saleItemsData = resolvedItems.map((ri) => {
        const landingCost = parseFloat(String(ri.inventoryItem.landingCost));
        const branchCost = parseFloat(String(ri.inventoryItem.branchCost));
        const profit = ri.retailPrice - landingCost;
        return {
          saleId, inventoryItemId: ri.inventoryItem.id, productId: ri.inventoryItem.productId,
          serialNo: ri.inventoryItem.serialNo, landingCost: landingCost.toFixed(2),
          branchCost: branchCost.toFixed(2), retailPrice: ri.retailPrice.toFixed(2),
          profit: profit.toFixed(2), investor70: (profit * 0.7).toFixed(2),
          master30: (profit * 0.3).toFixed(2), cashDueHO: (ri.retailPrice - branchCost).toFixed(2),
        };
      });

      await createSaleItems(saleItemsData);
      for (const ri of resolvedItems) await updateInventoryStatus(ri.inventoryItem.id, "Sold");

      const totalBranchProfit = saleItemsData.reduce((sum, item) => sum + (parseFloat(item.retailPrice) - parseFloat(item.branchCost)), 0);
      if (totalBranchProfit > 0) {
        await addBranchLedgerEntry({ branchId: input.branchId, saleId, type: "sale_profit", amount: totalBranchProfit.toFixed(2), description: `Profit from sale ${receiptNo}` });
      }
      await addLedgerEntry({ branchId: input.branchId, entryType: "Sale", referenceId: saleId, referenceType: "Sale", description: `Sale ${receiptNo}`, credit: totalAmount });
      await checkAndCreateReorderAlerts(input.branchId);
      await addAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "CREATE_SALE", entityType: "Sale", entityId: String(saleId), branchId: input.branchId, details: `Sale ${receiptNo} for ${totalAmount.toFixed(2)}` });

      return { success: true, saleId, receiptNo, totalAmount };
    }),

  /**
   * Get a single sale — enforces branch access
   */
  getSale: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      if (isPreviewMode()) {
        const sale = previewGetSaleById(input.id);
        if (!sale) throw new TRPCError({ code: "NOT_FOUND" });
        enforceBranchAccess(ctx.user, sale.branchId);
        // Filter financial data for POSUsers
        const filteredItems = (sale.items ?? []).map((item: any) => filterSaleItemForRole(item, ctx.user.role));
        return { sale, items: filteredItems };
      }

      const { getSaleById, getSaleItems } = await import("../db");
      const sale = await getSaleById(input.id);
      if (!sale) throw new TRPCError({ code: "NOT_FOUND" });
      enforceBranchAccess(ctx.user, (sale as any).branchId);
      const items = await getSaleItems(input.id);
      const filteredItems = items.map((item: any) => filterSaleItemForRole(item, ctx.user.role));
      return { sale, items: filteredItems };
    }),

  /**
   * List sales — filtered by branch for non-admin users
   */
  listSales: protectedProcedure
    .input(z.object({
      branchId: z.number().optional(),
      from: z.date().optional(),
      to: z.date().optional(),
      status: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      // Enforce branch filter
      const effectiveBranchId = input?.branchId ?? (hasGlobalAccess(ctx.user.role) ? undefined : (ctx.user as any).branchId);
      if (input?.branchId) enforceBranchAccess(ctx.user, input.branchId);

      const queryInput = { ...input, branchId: effectiveBranchId };

      if (isPreviewMode()) {
        const sales = previewGetSales(queryInput);
        // POSUsers cannot see profit data
        if (ctx.user.role === "POSUser" || ctx.user.role === "cashier") {
          return sales.map(({ totalProfit, ...sale }: any) => sale);
        }
        return sales;
      }

      const { getSales } = await import("../db");
      const sales = await getSales(queryInput);
      if (ctx.user.role === "POSUser" || ctx.user.role === "cashier") {
        return (sales as any[]).map(({ totalProfit, ...sale }: any) => sale);
      }
      return sales;
    }),

  /**
   * Void a sale (Admin/SuperAdmin only)
   */
  voidSale: protectedProcedure
    .input(z.object({ saleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required to void sales" });
      }

      if (isPreviewMode()) {
        const sale = previewGetSaleById(input.saleId);
        if (!sale) throw new TRPCError({ code: "NOT_FOUND" });
        if (sale.status === "Voided") throw new TRPCError({ code: "BAD_REQUEST", message: "Already voided" });
        const { previewVoidSale, previewAddLedgerEntry } = await import("../_core/previewDbAdapter");
        previewVoidSale(input.saleId);
        previewAddLedgerEntry({ branchId: sale.branchId, entryType: "Adjustment", referenceId: input.saleId, referenceType: "Sale", description: `Void sale ${sale.receiptNo}`, debit: sale.totalAmount });
        return { success: true };
      }

      const { getSaleById, voidSale, addLedgerEntry, addAuditLog } = await import("../db");
      const sale = await getSaleById(input.saleId);
      if (!sale) throw new TRPCError({ code: "NOT_FOUND" });
      if (sale.status === "Voided") throw new TRPCError({ code: "BAD_REQUEST", message: "Already voided" });
      await voidSale(input.saleId);
      await addLedgerEntry({ branchId: (sale as any).branchId, entryType: "Adjustment", referenceId: input.saleId, referenceType: "Sale", description: `Void sale ${(sale as any).receiptNo}`, debit: parseFloat(String((sale as any).totalAmount)) });
      await addAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "VOID_SALE", entityType: "Sale", entityId: String(input.saleId), branchId: (sale as any).branchId, details: `Voided sale ${(sale as any).receiptNo}` });
      return { success: true };
    }),
});
