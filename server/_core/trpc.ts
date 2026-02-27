/**
 * tRPC Setup — Phase-3 Multi-Branch Access Control
 * Provides role-based middleware procedures for all routers.
 */
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ─── Require authenticated user ───────────────────────────────────────────────
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // Prevent disabled users from accessing the system
  if (!(ctx.user as any).isActive) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your account has been disabled. Please contact your administrator." });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// ─── Require Admin or SuperAdmin role ─────────────────────────────────────────
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    if (!(ctx.user as any).isActive) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Your account has been disabled." });
    }

    const role = ctx.user.role as string;
    if (role !== 'SuperAdmin' && role !== 'Admin' && role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// ─── Require SuperAdmin role ───────────────────────────────────────────────────
export const superAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    if (ctx.user.role !== 'SuperAdmin') {
      throw new TRPCError({ code: "FORBIDDEN", message: "SuperAdmin access required" });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

// ─── Require BranchManager or higher ─────────────────────────────────────────
export const managerProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    if (!(ctx.user as any).isActive) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Your account has been disabled." });
    }

    const role = ctx.user.role as string;
    const allowed = ['SuperAdmin', 'Admin', 'BranchManager', 'admin', 'manager'];
    if (!allowed.includes(role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Manager access required" });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
