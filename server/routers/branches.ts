/**
 * Branches Router — Phase-3 Multi-Branch Management
 * SuperAdmin and Admin can create/edit/disable branches.
 * All authenticated users can list branches.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { isPreviewMode } from "../_core/previewDb";
import {
  previewGetBranches,
  previewGetBranchById,
  previewCreateBranch,
  previewUpdateBranch,
} from "../_core/previewDbAdapter";
import { hasGlobalAccess } from "../_core/permissions";

function requireAdmin(role: string) {
  if (!hasGlobalAccess(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required to manage branches" });
  }
}

export const branchesRouter = router({
  /**
   * List all active branches (all roles can see branch list)
   */
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const includeInactive = input?.includeInactive && hasGlobalAccess(ctx.user.role);

      if (isPreviewMode()) {
        return previewGetBranches(includeInactive);
      }

      const { getAllBranches } = await import("../db");
      return getAllBranches(includeInactive);
    }),

  /**
   * Get branch by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (isPreviewMode()) {
        const branch = previewGetBranchById(input.id);
        if (!branch) throw new TRPCError({ code: "NOT_FOUND" });
        // Non-admin users can only view their own branch
        if (!hasGlobalAccess(ctx.user.role) && (ctx.user as any).branchId !== input.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own branch" });
        }
        return branch;
      }

      const { getBranchById } = await import("../db");
      const branch = await getBranchById(input.id);
      if (!branch) throw new TRPCError({ code: "NOT_FOUND" });
      if (!hasGlobalAccess(ctx.user.role) && (ctx.user as any).branchId !== input.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own branch" });
      }
      return branch;
    }),

  /**
   * Create a new branch (Admin/SuperAdmin only)
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      code: z.string().min(1).max(16),
      city: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      isWarehouse: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.role);

      if (isPreviewMode()) {
        const result = previewCreateBranch(input);
        return { success: true, branchId: result.branchId };
      }

      const { createBranch, addAuditLog } = await import("../db");
      const branchId = await createBranch(input);
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "CREATE",
        entityType: "Branch",
        entityId: String(branchId),
        details: `Created branch: ${input.name} (${input.code}) in ${input.city ?? "N/A"}`,
      });
      return { success: true, branchId };
    }),

  /**
   * Update branch details (Admin/SuperAdmin only)
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      code: z.string().optional(),
      city: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      isActive: z.boolean().optional(),
      isWarehouse: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.role);

      const { id, ...data } = input;

      if (isPreviewMode()) {
        previewUpdateBranch(id, data);
        return { success: true };
      }

      const { updateBranch, addAuditLog } = await import("../db");
      await updateBranch(id, data);
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "UPDATE",
        entityType: "Branch",
        entityId: String(id),
        details: `Updated branch ${id}: ${JSON.stringify(Object.keys(data))}`,
      });
      return { success: true };
    }),

  /**
   * Disable/enable a branch (Admin/SuperAdmin only)
   */
  setStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.role);

      if (isPreviewMode()) {
        previewUpdateBranch(input.id, { isActive: input.isActive });
        return { success: true };
      }

      const { updateBranch, addAuditLog } = await import("../db");
      await updateBranch(input.id, { isActive: input.isActive });
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: input.isActive ? "ENABLE" : "DISABLE",
        entityType: "Branch",
        entityId: String(input.id),
        details: `Branch ${input.id} ${input.isActive ? "enabled" : "disabled"}`,
      });
      return { success: true };
    }),
});
