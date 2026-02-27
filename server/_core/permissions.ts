/**
 * Permission Engine — Phase-3 Multi-Branch Access Control
 * 
 * This module provides helper functions for enforcing permissions
 * at the API level. It is used by all routers to check access.
 * 
 * Permission hierarchy:
 * - SuperAdmin: full control, all branches
 * - Admin: HO operations, all branches
 * - BranchManager: own branch only, most operations
 * - POSUser: own branch only, sales only
 */
import { TRPCError } from "@trpc/server";
import { isPreviewMode } from "./previewDb";
import { previewGetUserPermissions, getDefaultPermissionsForRole } from "./previewDbAdapter";

export type UserRole = "SuperAdmin" | "Admin" | "BranchManager" | "POSUser" | "user" | "admin" | "manager" | "cashier";

export type PermissionFlags = {
  canSell: boolean;
  canTransferRequest: boolean;
  canReceiveStock: boolean;
  canViewLedger: boolean;
  canViewGlobalStock: boolean;
  canViewFinancials: boolean;
};

/**
 * Check if a role has global (all-branch) access
 */
export function hasGlobalAccess(role: string): boolean {
  return role === "SuperAdmin" || role === "Admin" || role === "admin";
}

/**
 * Get the effective branch filter for a user.
 * Returns undefined for global access (no filter), or branchId for restricted access.
 */
export function getEffectiveBranchFilter(user: any): number | undefined {
  if (hasGlobalAccess(user.role)) return undefined;
  return user.branchId ?? undefined;
}

/**
 * Enforce that a user can only access data from their own branch.
 * Throws FORBIDDEN if the user tries to access another branch's data.
 */
export function enforceBranchAccess(user: any, requestedBranchId: number | undefined | null): void {
  if (hasGlobalAccess(user.role)) return; // Admins can access any branch
  if (!requestedBranchId) return; // No branch filter requested
  if (user.branchId !== requestedBranchId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this branch's data",
    });
  }
}

/**
 * Enforce that a branch is active before allowing operations
 */
export function enforceBranchActive(branch: any): void {
  if (!branch) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Branch not found" });
  }
  if (!branch.isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This branch is currently inactive. Operations are not allowed.",
    });
  }
}

/**
 * Get user permissions from database or defaults
 */
export async function getUserPermissions(userId: number, role: string): Promise<PermissionFlags> {
  if (isPreviewMode()) {
    const perms = previewGetUserPermissions(userId);
    if (perms) {
      return {
        canSell: Boolean(perms.canSell),
        canTransferRequest: Boolean(perms.canTransferRequest),
        canReceiveStock: Boolean(perms.canReceiveStock),
        canViewLedger: Boolean(perms.canViewLedger),
        canViewGlobalStock: Boolean(perms.canViewGlobalStock),
        canViewFinancials: Boolean(perms.canViewFinancials),
      };
    }
    return getDefaultPermissionsForRole(role) as PermissionFlags;
  }

  // Production path
  try {
    const { getUserPermissions: dbGetPerms } = await import("../db");
    const perms = await dbGetPerms(userId);
    if (perms) return perms as PermissionFlags;
  } catch {}
  return getDefaultPermissionsForRole(role) as PermissionFlags;
}

/**
 * Require a specific permission, throwing FORBIDDEN if not granted
 */
export async function requirePermission(
  user: any,
  permission: keyof PermissionFlags,
  errorMessage?: string
): Promise<void> {
  // SuperAdmin and Admin always have all permissions
  if (hasGlobalAccess(user.role)) return;

  const perms = await getUserPermissions(user.id, user.role);
  if (!perms[permission]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: errorMessage ?? `You do not have the '${permission}' permission`,
    });
  }
}

/**
 * Check if user can view financial data (costs, profits)
 */
export function canViewFinancials(user: any): boolean {
  if (hasGlobalAccess(user.role)) return true;
  return false; // Will be overridden by actual permission check
}

/**
 * Filter product data based on user role — hide cost fields from POSUsers
 */
export function filterProductForRole(product: any, role: string): any {
  if (hasGlobalAccess(role) || role === "BranchManager" || role === "manager") {
    return product;
  }
  // POSUser: hide cost fields
  const { landingCost, branchCost, ...publicFields } = product;
  return publicFields;
}

/**
 * Filter sale item data based on user role — hide profit fields from POSUsers
 */
export function filterSaleItemForRole(item: any, role: string): any {
  if (hasGlobalAccess(role) || role === "BranchManager" || role === "manager") {
    return item;
  }
  // POSUser: hide profit/cost breakdown
  const { profit, investor70, master30, cashDueHO, landingCost, branchCost, ...publicFields } = item;
  return publicFields;
}
