/**
 * useAuth Hook — Phase-3 Multi-Branch Access Control
 * Provides authentication state, role checks, and permission helpers.
 */
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export type UserRole = "SuperAdmin" | "Admin" | "BranchManager" | "POSUser" | "admin" | "manager" | "cashier" | "user";

export type PermissionFlags = {
  canSell: boolean;
  canTransferRequest: boolean;
  canReceiveStock: boolean;
  canViewLedger: boolean;
  canViewGlobalStock: boolean;
  canViewFinancials: boolean;
};

export type AuthUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: UserRole;
  branchId: number | null;
  branchName?: string | null;
  isActive: boolean;
  permissions?: PermissionFlags;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } = options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    // Never retry on failure — an UNAUTHORIZED error means the user is logged out.
    retry: false,
    // Do not re-fetch when the window regains focus.
    refetchOnWindowFocus: false,
    // Keep auth state fresh for 5 minutes. Once the first fetch completes,
    // subsequent mounts of useAuth() (DashboardLayout, page components, etc.)
    // will read from cache and NOT fire new requests until staleTime expires.
    // NOTE: refetchOnMount must remain true (the default) so the very first
    // mount actually fetches — setting it to false would cause an infinite
    // loading state when there is no cached data yet.
    staleTime: 5 * 60 * 1000,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    const user = meQuery.data as AuthUser | null | undefined;
    localStorage.setItem("manus-runtime-user-info", JSON.stringify(user));

    // Role helpers
    const role = user?.role as UserRole | undefined;
    const isSuperAdmin = role === "SuperAdmin";
    const isAdmin = role === "Admin" || role === "admin" || isSuperAdmin;
    const isBranchManager = role === "BranchManager" || role === "manager";
    const isPOSUser = role === "POSUser" || role === "cashier";
    const hasGlobalAccess = isAdmin;

    // Permission helpers
    const perms = user?.permissions;
    const can = {
      sell: perms?.canSell ?? isAdmin,
      transferRequest: perms?.canTransferRequest ?? isAdmin,
      receiveStock: perms?.canReceiveStock ?? isAdmin,
      viewLedger: perms?.canViewLedger ?? isAdmin,
      viewGlobalStock: perms?.canViewGlobalStock ?? isAdmin,
      viewFinancials: perms?.canViewFinancials ?? isAdmin,
    };

    return {
      user: user ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(user),
      // Role flags
      isSuperAdmin,
      isAdmin,
      isBranchManager,
      isPOSUser,
      hasGlobalAccess,
      // Permission flags
      can,
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, logoutMutation.isPending, meQuery.isLoading, state.user]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
