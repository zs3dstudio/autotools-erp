import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addAuditLog,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const customersRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        isActive: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return getCustomers(input ?? {});
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const customer = await getCustomerById(input.id);
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      return customer;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128),
        phone: z.string().max(32).optional(),
        email: z.string().email().max(320).optional().or(z.literal("")),
        address: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await createCustomer(input);
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "CREATE_CUSTOMER",
        entityType: "Customer",
        details: `Created customer: ${input.name}`,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(128).optional(),
        phone: z.string().max(32).optional(),
        email: z.string().email().max(320).optional().or(z.literal("")),
        address: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const customer = await getCustomerById(id);
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      await updateCustomer(id, data);
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "UPDATE_CUSTOMER",
        entityType: "Customer",
        entityId: String(id),
        details: `Updated customer: ${customer.name}`,
      });
      return { success: true };
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const customer = await getCustomerById(input.id);
      if (!customer) throw new TRPCError({ code: "NOT_FOUND" });
      await updateCustomer(input.id, { isActive: false });
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "DEACTIVATE_CUSTOMER",
        entityType: "Customer",
        entityId: String(input.id),
        details: `Deactivated customer: ${customer.name}`,
      });
      return { success: true };
    }),
});
