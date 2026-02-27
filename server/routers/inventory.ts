/**
 * Inventory Router — Phase-3 Branch Data Isolation
 * 
 * Branch users only see their own branch's inventory.
 * Admin/SuperAdmin can view all branches.
 * POSUsers can view products but not costs.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { isPreviewMode } from "../_core/previewDb";
import {
  getEffectiveBranchFilter,
  enforceBranchAccess,
  hasGlobalAccess,
  requirePermission,
  filterProductForRole,
} from "../_core/permissions";
import {
  previewGetInventory as previewGetInventoryItems,
  previewGetInventoryItemBySerial,
  previewGetStockSummary as previewGetStockByBranch,
} from "../_core/previewDbAdapter";

export const inventoryRouter = router({
  /**
   * List inventory items — filtered by branch for non-admin users
   */
  list: protectedProcedure
    .input(z.object({
      branchId: z.number().optional(),
      productId: z.number().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      // Enforce branch access
      if (input?.branchId) {
        enforceBranchAccess(ctx.user, input.branchId);
      }

      // Determine effective branch filter
      const effectiveBranchId = input?.branchId ?? getEffectiveBranchFilter(ctx.user);
      const queryInput = { ...input, branchId: effectiveBranchId };

      if (isPreviewMode()) {
        const items = previewGetInventoryItems(queryInput);
        // Hide cost data from POSUsers
        if (ctx.user.role === "POSUser" || ctx.user.role === "cashier") {
          return items.map(({ landingCost, branchCost, ...item }: any) => item);
        }
        return items;
      }

      const { getInventoryItems } = await import("../db");
      const items = await getInventoryItems(queryInput);
      if (ctx.user.role === "POSUser" || ctx.user.role === "cashier") {
        return items.map(({ landingCost, branchCost, ...item }: any) => item);
      }
      return items;
    }),

  /**
   * Get item by serial number
   */
  getBySerial: protectedProcedure
    .input(z.object({ serialNo: z.string() }))
    .query(async ({ input, ctx }) => {
      if (isPreviewMode()) {
        const item = previewGetInventoryItemBySerial(input.serialNo);
        if (!item) return null;
        // Enforce branch access
        enforceBranchAccess(ctx.user, item.branchId);
        if (ctx.user.role === "POSUser" || ctx.user.role === "cashier") {
          const { landingCost, branchCost, ...publicItem } = item;
          return publicItem;
        }
        return item;
      }

      const { getInventoryItemBySerial } = await import("../db");
      const item = await getInventoryItemBySerial(input.serialNo);
      if (!item) return null;
      enforceBranchAccess(ctx.user, (item as any).branchId);
      if (ctx.user.role === "POSUser" || ctx.user.role === "cashier") {
        const { landingCost, branchCost, ...publicItem } = item as any;
        return publicItem;
      }
      return item;
    }),

  /**
   * Stock count by branch
   */
  stockByBranch: protectedProcedure
    .input(z.object({ branchId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const effectiveBranchId = input?.branchId ?? getEffectiveBranchFilter(ctx.user);
      if (input?.branchId) {
        enforceBranchAccess(ctx.user, input.branchId);
      }

      if (isPreviewMode()) {
        return previewGetStockByBranch(effectiveBranchId ?? undefined);
      }

      const { getStockCountByBranch } = await import("../db");
      return getStockCountByBranch(effectiveBranchId ?? 0);
    }),

  /**
   * Add single inventory item (Admin/BranchManager with receive permission)
   */
  addItem: protectedProcedure
    .input(z.object({
      serialNo: z.string().min(1),
      batchId: z.string().optional(),
      productId: z.number(),
      branchId: z.number(),
      landingCost: z.string(),
      branchCost: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canReceiveStock", "You do not have permission to add inventory");
      enforceBranchAccess(ctx.user, input.branchId);

      if (isPreviewMode()) {
        const { previewGetInventoryItemBySerial, previewCreateInventoryItem } = await import("../_core/previewDbAdapter");
        const existing = previewGetInventoryItemBySerial(input.serialNo);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Serial number already exists" });
        previewCreateInventoryItem(input);
        return { success: true };
      }

      const { getInventoryItemBySerial, createInventoryItem, checkAndCreateReorderAlerts, addAuditLog } = await import("../db");
      const existing = await getInventoryItemBySerial(input.serialNo);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Serial number already exists" });
      await createInventoryItem(input);
      await checkAndCreateReorderAlerts(input.branchId);
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "ADD_INVENTORY",
        entityType: "InventoryItem",
        entityId: input.serialNo,
        branchId: input.branchId,
        details: `Added item ${input.serialNo} to branch ${input.branchId}`,
      });
      return { success: true };
    }),

  /**
   * Bulk add inventory items
   */
  bulkAddItems: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        serialNo: z.string().min(1),
        batchId: z.string().optional(),
        productId: z.number(),
        branchId: z.number(),
        landingCost: z.string(),
        branchCost: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canReceiveStock", "You do not have permission to add inventory");

      // Enforce branch access for all items
      for (const item of input.items) {
        enforceBranchAccess(ctx.user, item.branchId);
      }

      if (isPreviewMode()) {
        const { previewGetInventoryItemBySerial, previewCreateInventoryItem } = await import("../_core/previewDbAdapter");
        const errors: string[] = [];
        for (const item of input.items) {
          const existing = previewGetInventoryItemBySerial(item.serialNo);
          if (existing) { errors.push(`Serial ${item.serialNo} already exists`); continue; }
          previewCreateInventoryItem(item);
        }
        return { success: true, errors };
      }

      const { getInventoryItemBySerial, createInventoryItem, checkAndCreateReorderAlerts, addAuditLog } = await import("../db");
      const errors: string[] = [];
      for (const item of input.items) {
        const existing = await getInventoryItemBySerial(item.serialNo);
        if (existing) { errors.push(`Serial ${item.serialNo} already exists`); continue; }
        await createInventoryItem(item);
      }
      if (input.items.length > 0) {
        await checkAndCreateReorderAlerts(input.items[0].branchId);
      }
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "BULK_ADD_INVENTORY",
        entityType: "InventoryItem",
        details: `Bulk added ${input.items.length} items`,
      });
      return { success: true, errors };
    }),

  /**
   * Update inventory item status (Admin only)
   */
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["Available", "Sold", "InTransit", "Reserved", "Damaged"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required to update inventory status" });
      }

      if (isPreviewMode()) {
        const { previewUpdateInventoryStatus } = await import("../_core/previewDbAdapter");
        previewUpdateInventoryStatus(input.id, input.status);
        return { success: true };
      }

      const { updateInventoryStatus, addAuditLog } = await import("../db");
      await updateInventoryStatus(input.id, input.status);
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "UPDATE_STATUS",
        entityType: "InventoryItem",
        entityId: String(input.id),
        details: `Status changed to ${input.status}`,
      });
      return { success: true };
    }),

  /**
   * Reorder alerts — filtered by branch for non-admin users
   */
  reorderAlerts: protectedProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const effectiveBranchId = input?.branchId ?? getEffectiveBranchFilter(ctx.user);

      if (isPreviewMode()) {
        const { previewGetReorderAlerts } = await import("../_core/previewDbAdapter");
        return previewGetReorderAlerts(effectiveBranchId);
      }

      const { getReorderAlerts } = await import("../db");
      return getReorderAlerts(effectiveBranchId);
    }),

  /**
   * Resolve reorder alert
   */
  resolveAlert: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      if (isPreviewMode()) {
        const { previewResolveReorderAlert } = await import("../_core/previewDbAdapter");
        previewResolveReorderAlert(input.id);
        return { success: true };
      }

      const { resolveReorderAlert } = await import("../db");
      await resolveReorderAlert(input.id);
      return { success: true };
    }),
});
