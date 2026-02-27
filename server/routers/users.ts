/**
 * Users Router — Phase-3 Multi-Branch Access Control
 * Handles user management with role-based access control.
 * SuperAdmin and Admin can manage all users.
 * BranchManager can only manage users in their own branch.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { isPreviewMode } from "../_core/previewDb";
import {
  previewGetUsers,
  previewGetUserById,
  previewCreateUser,
  previewUpdateUser,
  previewGetUserPermissions,
  previewUpdateUserPermissions,
  getDefaultPermissionsForRole,
} from "../_core/previewDbAdapter";

// ─── Role Helpers ─────────────────────────────────────────────────────────────
const ADMIN_ROLES = ["SuperAdmin", "Admin"] as const;
const MANAGER_ROLES = ["SuperAdmin", "Admin", "BranchManager"] as const;

function requireAdminRole(role: string) {
  if (!ADMIN_ROLES.includes(role as any)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Requires Admin or SuperAdmin role" });
  }
}

function requireManagerRole(role: string) {
  if (!MANAGER_ROLES.includes(role as any)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Requires BranchManager role or higher" });
  }
}

// ─── Permission Schema ────────────────────────────────────────────────────────
const permissionsSchema = z.object({
  canSell: z.boolean(),
  canTransferRequest: z.boolean(),
  canReceiveStock: z.boolean(),
  canViewLedger: z.boolean(),
  canViewGlobalStock: z.boolean(),
  canViewFinancials: z.boolean(),
});

// ─── Router ───────────────────────────────────────────────────────────────────
export const usersRouter = router({
  /**
   * List users — filtered by branch for BranchManagers
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    requireManagerRole(ctx.user.role);

    if (isPreviewMode()) {
      // BranchManager can only see their own branch's users
      const branchFilter = (ctx.user.role === "BranchManager" && ctx.user.branchId)
        ? { branchId: ctx.user.branchId }
        : {};
      const users = previewGetUsers(branchFilter);
      // Never expose password hashes
      return users.map(({ passwordHash, ...u }: any) => u);
    }

    // Production MySQL path
    const { getAllUsers, getUsersByBranch } = await import("../db");
    if (ctx.user.role === "BranchManager" && ctx.user.branchId) {
      return getUsersByBranch(ctx.user.branchId);
    }
    return getAllUsers();
  }),

  /**
   * Get a single user with permissions
   */
  getById: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      requireManagerRole(ctx.user.role);

      if (isPreviewMode()) {
        const user = previewGetUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });

        // BranchManager can only see users in their branch
        if (ctx.user.role === "BranchManager" && user.branchId !== ctx.user.branchId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const permissions = previewGetUserPermissions(input.userId);
        const { passwordHash, ...safeUser } = user;
        return { ...safeUser, permissions };
      }

      // Production path
      const { getUserById, getUserPermissions } = await import("../db");
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      const permissions = await getUserPermissions(input.userId);
      const { passwordHash, ...safeUser } = user as any;
      return { ...safeUser, permissions };
    }),

  /**
   * Create a new user
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["SuperAdmin", "Admin", "BranchManager", "POSUser"]),
      branchId: z.number().optional().nullable(),
      permissions: permissionsSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdminRole(ctx.user.role);

      // Only SuperAdmin can create SuperAdmin accounts
      if (input.role === "SuperAdmin" && ctx.user.role !== "SuperAdmin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only SuperAdmin can create SuperAdmin accounts" });
      }

      if (isPreviewMode()) {
        // Check for duplicate email
        const { previewGetUserByEmail } = await import("../_core/previewDbAdapter");
        const existing = previewGetUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
        }

        // Hash password using bcrypt (or simple hash for preview)
        const bcrypt = await import("bcryptjs").catch(() => null);
        const passwordHash = bcrypt
          ? await bcrypt.hash(input.password, 10)
          : `preview_hash_${input.password}`;

        const { userId } = previewCreateUser({
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
          branchId: input.branchId ?? null,
        });

        // Update permissions if provided
        if (input.permissions) {
          previewUpdateUserPermissions(userId, input.permissions);
        }

        return { success: true, userId };
      }

      // Production path
      const { createUser, addAuditLog } = await import("../db");
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(input.password, 10);
      const userId = await createUser({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        branchId: input.branchId ?? null,
      });
      if (input.permissions) {
        const { updateUserPermissions } = await import("../db");
        await updateUserPermissions(userId, input.permissions);
      }
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "CREATE_USER",
        entityType: "User",
        entityId: String(userId),
        details: `Created user ${input.email} with role ${input.role}`,
      });
      return { success: true, userId };
    }),

  /**
   * Update user details
   */
  update: protectedProcedure
    .input(z.object({
      userId: z.number(),
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      role: z.enum(["SuperAdmin", "Admin", "BranchManager", "POSUser"]).optional(),
      branchId: z.number().optional().nullable(),
      isActive: z.boolean().optional(),
      newPassword: z.string().min(6).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdminRole(ctx.user.role);

      // Only SuperAdmin can change roles to/from SuperAdmin
      if (input.role === "SuperAdmin" && ctx.user.role !== "SuperAdmin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only SuperAdmin can assign SuperAdmin role" });
      }

      if (isPreviewMode()) {
        const updateData: any = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.email !== undefined) updateData.email = input.email;
        if (input.role !== undefined) updateData.role = input.role;
        if (input.branchId !== undefined) updateData.branchId = input.branchId;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.newPassword) {
          const bcrypt = await import("bcryptjs").catch(() => null);
          updateData.passwordHash = bcrypt
            ? await bcrypt.hash(input.newPassword, 10)
            : `preview_hash_${input.newPassword}`;
        }
        previewUpdateUser(input.userId, updateData);
        return { success: true };
      }

      // Production path
      const { updateUser, addAuditLog } = await import("../db");
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.role !== undefined) updateData.role = input.role;
      if (input.branchId !== undefined) updateData.branchId = input.branchId;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.newPassword) {
        const bcrypt = await import("bcryptjs");
        updateData.passwordHash = await bcrypt.hash(input.newPassword, 10);
      }
      await updateUser(input.userId, updateData);
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "UPDATE_USER",
        entityType: "User",
        entityId: String(input.userId),
        details: JSON.stringify(Object.keys(updateData)),
      });
      return { success: true };
    }),

  /**
   * Update user permissions
   */
  updatePermissions: protectedProcedure
    .input(z.object({
      userId: z.number(),
      permissions: permissionsSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdminRole(ctx.user.role);

      if (isPreviewMode()) {
        previewUpdateUserPermissions(input.userId, input.permissions);
        return { success: true };
      }

      // Production path
      const { updateUserPermissions, addAuditLog } = await import("../db");
      await updateUserPermissions(input.userId, input.permissions);
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "UPDATE_PERMISSIONS",
        entityType: "User",
        entityId: String(input.userId),
        details: JSON.stringify(input.permissions),
      });
      return { success: true };
    }),

  /**
   * Get my own permissions
   */
  myPermissions: protectedProcedure.query(async ({ ctx }) => {
    if (isPreviewMode()) {
      const perms = previewGetUserPermissions(ctx.user.id);
      if (perms) return perms;
      // Return defaults based on role
      return getDefaultPermissionsForRole(ctx.user.role);
    }

    const { getUserPermissions } = await import("../db");
    const perms = await getUserPermissions(ctx.user.id);
    if (perms) return perms;
    return getDefaultPermissionsForRole(ctx.user.role);
  }),

  /**
   * Get default permissions for a role (used in UI)
   */
  defaultPermissionsForRole: protectedProcedure
    .input(z.object({ role: z.enum(["SuperAdmin", "Admin", "BranchManager", "POSUser"]) }))
    .query(async ({ input }) => {
      return getDefaultPermissionsForRole(input.role);
    }),
});
