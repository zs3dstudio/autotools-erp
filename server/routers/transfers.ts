/**
 * Transfers Router — Phase-3 Branch Data Isolation & Permission Enforcement
 * 
 * canTransferRequest: required to create transfer requests
 * canReceiveStock: required to complete/receive transfers
 * POSUser: cannot transfer stock
 * Branch users can only see transfers involving their branch
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { isPreviewMode } from "../_core/previewDb";
import {
  hasGlobalAccess,
  requirePermission,
  enforceBranchAccess,
  getEffectiveBranchFilter,
} from "../_core/permissions";

function generateTransferNo(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `TRF-${date}-${rand}`;
}

export const transfersRouter = router({
  /**
   * List transfers — filtered by branch for non-admin users
   */
  list: protectedProcedure
    .input(z.object({ branchId: z.number().optional(), status: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      // POSUsers cannot view transfers
      await requirePermission(ctx.user, "canTransferRequest", "You do not have permission to view transfers");

      const effectiveBranchId = input?.branchId ?? getEffectiveBranchFilter(ctx.user);
      if (input?.branchId) enforceBranchAccess(ctx.user, input.branchId);

      if (isPreviewMode()) {
        const { previewGetTransfers } = await import("../_core/previewDbAdapter");
        return previewGetTransfers({ ...input, branchId: effectiveBranchId });
      }

      const { getTransfers } = await import("../db");
      return getTransfers({ ...input, branchId: effectiveBranchId });
    }),

  /**
   * Get transfer by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canTransferRequest", "You do not have permission to view transfers");

      if (isPreviewMode()) {
        const { previewGetTransferById, previewGetTransferItems } = await import("../_core/previewDbAdapter");
        const transfer = previewGetTransferById(input.id);
        if (!transfer) throw new TRPCError({ code: "NOT_FOUND" });
        // Enforce branch access — user must be in from or to branch
        if (!hasGlobalAccess(ctx.user.role)) {
          const userBranchId = (ctx.user as any).branchId;
          if (transfer.fromBranchId !== userBranchId && transfer.toBranchId !== userBranchId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this transfer" });
          }
        }
        const items = previewGetTransferItems(input.id);
        return { transfer, items };
      }

      const { getTransferById, getTransferItems } = await import("../db");
      const transfer = await getTransferById(input.id);
      if (!transfer) throw new TRPCError({ code: "NOT_FOUND" });
      if (!hasGlobalAccess(ctx.user.role)) {
        const userBranchId = (ctx.user as any).branchId;
        if ((transfer as any).fromBranchId !== userBranchId && (transfer as any).toBranchId !== userBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this transfer" });
        }
      }
      const items = await getTransferItems(input.id);
      return { transfer, items };
    }),

  /**
   * Create transfer request — requires canTransferRequest permission
   */
  create: protectedProcedure
    .input(z.object({
      fromBranchId: z.number(),
      toBranchId: z.number(),
      notes: z.string().optional(),
      items: z.array(z.object({ serialNo: z.string().min(1) })),
    }))
    .mutation(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canTransferRequest", "You do not have permission to request stock transfers");

      // Branch users can only transfer FROM their own branch
      enforceBranchAccess(ctx.user, input.fromBranchId);

      if (input.fromBranchId === input.toBranchId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "From and To branches must be different" });
      }
      if (input.items.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No items selected" });
      }

      if (isPreviewMode()) {
        const { previewResolveInventoryItemBySerial, previewCreateTransfer } = await import("../_core/previewDbAdapter");

        const resolvedItems: { inventoryItemId: number; serialNo: string; productId: number }[] = [];
        const notFound: string[] = [];
        const notAvailable: string[] = [];

        for (const item of input.items) {
          const inv = previewResolveInventoryItemBySerial(item.serialNo, input.fromBranchId);
          if (!inv) { notFound.push(item.serialNo); }
          else if (inv.status !== "Available") { notAvailable.push(item.serialNo); }
          else { resolvedItems.push({ inventoryItemId: inv.id, serialNo: inv.serialNo, productId: inv.productId }); }
        }

        if (notFound.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: `Serial numbers not found in branch: ${notFound.join(", ")}` });
        if (notAvailable.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: `Items not available for transfer: ${notAvailable.join(", ")}` });

        const transferNo = generateTransferNo();
        const transferId = previewCreateTransfer({ transferNo, fromBranchId: input.fromBranchId, toBranchId: input.toBranchId, requestedByUserId: ctx.user.id, notes: input.notes, items: resolvedItems });
        return { success: true, transferId, transferNo };
      }

      const { resolveInventoryItemBySerial, createTransfer, addAuditLog } = await import("../db");

      const resolvedItems: { inventoryItemId: number; serialNo: string; productId: number }[] = [];
      const notFound: string[] = [];
      const notAvailable: string[] = [];

      for (const item of input.items) {
        const inv = await resolveInventoryItemBySerial(item.serialNo, input.fromBranchId);
        if (!inv) { notFound.push(item.serialNo); }
        else if (inv.status !== "Available") { notAvailable.push(item.serialNo); }
        else { resolvedItems.push({ inventoryItemId: inv.id, serialNo: inv.serialNo, productId: inv.productId }); }
      }

      if (notFound.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: `Serial numbers not found in branch: ${notFound.join(", ")}` });
      if (notAvailable.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: `Items not available for transfer: ${notAvailable.join(", ")}` });

      const transferNo = generateTransferNo();
      const transferId = await createTransfer({ transferNo, fromBranchId: input.fromBranchId, toBranchId: input.toBranchId, requestedByUserId: ctx.user.id, notes: input.notes, items: resolvedItems });
      await addAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "CREATE_TRANSFER", entityType: "StockTransfer", entityId: String(transferId), branchId: input.fromBranchId, details: `Transfer ${transferNo}: ${resolvedItems.length} item(s)` });
      return { success: true, transferId, transferNo };
    }),

  /**
   * Approve transfer — Admin/SuperAdmin only
   */
  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required to approve transfers" });
      }

      if (isPreviewMode()) {
        const { previewGetTransferById, previewApproveTransfer } = await import("../_core/previewDbAdapter");
        const transfer = previewGetTransferById(input.id);
        if (!transfer) throw new TRPCError({ code: "NOT_FOUND" });
        if (transfer.status !== "Pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Transfer is not pending" });
        previewApproveTransfer(input.id, ctx.user.id);
        return { success: true };
      }

      const { getTransferById, approveTransfer, addAuditLog } = await import("../db");
      const transfer = await getTransferById(input.id);
      if (!transfer) throw new TRPCError({ code: "NOT_FOUND" });
      if (transfer.status !== "Pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Transfer is not pending" });
      await approveTransfer(input.id, ctx.user.id);
      await addAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "APPROVE_TRANSFER", entityType: "StockTransfer", entityId: String(input.id), details: `Approved transfer ${(transfer as any).transferNo}` });
      return { success: true };
    }),

  /**
   * Reject transfer — Admin/SuperAdmin only
   */
  reject: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      if (!hasGlobalAccess(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required to reject transfers" });
      }

      if (isPreviewMode()) {
        const { previewGetTransferById, previewRejectTransfer } = await import("../_core/previewDbAdapter");
        const transfer = previewGetTransferById(input.id);
        if (!transfer) throw new TRPCError({ code: "NOT_FOUND" });
        if (transfer.status !== "Pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Transfer is not pending" });
        previewRejectTransfer(input.id, ctx.user.id, input.reason);
        return { success: true };
      }

      const { getTransferById, rejectTransfer, addAuditLog } = await import("../db");
      const transfer = await getTransferById(input.id);
      if (!transfer) throw new TRPCError({ code: "NOT_FOUND" });
      if (transfer.status !== "Pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Transfer is not pending" });
      await rejectTransfer(input.id, ctx.user.id, input.reason);
      await addAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "REJECT_TRANSFER", entityType: "StockTransfer", entityId: String(input.id), details: `Rejected: ${input.reason}` });
      return { success: true };
    }),

  /**
   * Complete transfer — requires canReceiveStock permission
   */
  complete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requirePermission(ctx.user, "canReceiveStock", "You do not have permission to receive stock transfers");

      if (isPreviewMode()) {
        const { previewGetTransferById, previewCompleteTransfer } = await import("../_core/previewDbAdapter");
        const transfer = previewGetTransferById(input.id);
        if (!transfer) throw new TRPCError({ code: "NOT_FOUND" });
        if (transfer.status !== "InTransit") throw new TRPCError({ code: "BAD_REQUEST", message: "Transfer is not in transit" });
        // Branch users can only complete transfers TO their branch
        if (!hasGlobalAccess(ctx.user.role) && transfer.toBranchId !== (ctx.user as any).branchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only complete transfers to your own branch" });
        }
        previewCompleteTransfer(input.id);
        return { success: true };
      }

      const { getTransferById, completeTransfer, addAuditLog } = await import("../db");
      const transfer = await getTransferById(input.id);
      if (!transfer) throw new TRPCError({ code: "NOT_FOUND" });
      if (transfer.status !== "InTransit") throw new TRPCError({ code: "BAD_REQUEST", message: "Transfer is not in transit" });
      if (!hasGlobalAccess(ctx.user.role) && (transfer as any).toBranchId !== (ctx.user as any).branchId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only complete transfers to your own branch" });
      }
      await completeTransfer(input.id);
      await addAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "COMPLETE_TRANSFER", entityType: "StockTransfer", entityId: String(input.id), details: `Completed transfer ${(transfer as any).transferNo}` });
      return { success: true };
    }),
});
